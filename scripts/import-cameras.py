"""Refresh the Live Beach Cams listings in the catalog. One request/second; never fetch streams."""
import json
import re
import subprocess
import time
import unicodedata
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / 'src/data/catalog'
SOURCE_ID = 'worldbeachcams'


def slug(value):
    ascii_value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', ascii_value.lower()).strip('-')


def beach_id(name, region):
    return f'{slug(name)}-{slug(region)}'


def fetch_listing(seed):
    url = 'https://worldbeachcams.com/en/' + seed['path']
    page = subprocess.check_output(['curl', '-fLsS', '--retry', '2', '--max-time', '25', url]).decode()
    for block in re.findall(r'<script>self.__next_f.push\((.*?)\)</script>', page):
        payload = json.loads(block)
        if len(payload) < 2 or not isinstance(payload[1], str):
            continue
        marker = payload[1].find('"cam":')
        if marker >= 0:
            cam, _ = json.JSONDecoder().raw_decode(payload[1][marker + 6:])
            break
    else:
        raise ValueError('No public camera metadata: ' + url)
    return {
        'id': seed['id'], 'name': seed.get('name', cam['name']),
        'beach': seed.get('beach') or cam.get('city') or cam['name'],
        'region': seed.get('region', cam['region']['name']),
        'country': seed.get('country') or {'usa': 'USA', 'italy': 'Italy', 'brazil': 'Brazil'}.get(cam['country']['name'], cam['country']['name']), 'path': seed['path'],
        'previewUrl': cam['imagePreview'],
        'latitude': cam['lat'], 'longitude': cam['lon'],
    }


def merge(listings, beaches, cameras, checked_at):
    """Replace this source's cameras. Beaches are shared with other sources, so only missing ones are added."""
    known = {beach['id']: beach for beach in beaches}
    records = []
    for row in listings:
        key = beach_id(row['beach'], row['region'])
        beach = known.get(key)
        if not beach:
            beach = {'id': key, 'name': row['beach'], 'region': row['region'], 'country': row['country'], 'latitude': row['latitude'], 'longitude': row['longitude']}
            known[key] = beach
            beaches.append(beach)
        record = {'id': row['id'], 'sourceId': SOURCE_ID, 'beachId': key, 'name': row['name'], 'path': row['path'], 'previewUrl': row['previewUrl']}
        if (beach['latitude'], beach['longitude']) != (row['latitude'], row['longitude']):
            record |= {'latitude': row['latitude'], 'longitude': row['longitude']}
        record['checkedAt'] = checked_at
        records.append(record)
    return beaches, records + [camera for camera in cameras if camera['sourceId'] != SOURCE_ID]


def write(name, rows):
    (CATALOG / name).write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')


def main():
    seeds = json.loads((ROOT / 'scripts/camera-seeds.json').read_text())
    listings = []
    for seed in seeds:
        listings.append(fetch_listing(seed))
        row = listings[-1]
        print(seed['id'], row['beach'], row['region'], row['latitude'], row['longitude'], flush=True)
        time.sleep(1)
    beaches = json.loads((CATALOG / 'beaches.json').read_text())
    cameras = json.loads((CATALOG / 'cameras.json').read_text())
    beaches, cameras = merge(listings, beaches, cameras, date.today().isoformat())
    write('beaches.json', beaches)
    write('cameras.json', cameras)


if __name__ == '__main__':
    main()
