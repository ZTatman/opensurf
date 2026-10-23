"""Refresh the curated public listing snapshot. One request/second; never fetch streams."""
import json
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
seeds = json.loads((ROOT / 'scripts/camera-seeds.json').read_text())
rows = []
for seed in seeds:
    url = 'https://worldbeachcams.com/en/' + seed['path']
    page = subprocess.check_output(['curl', '-fLsS', '--retry', '2', '--max-time', '25', url]).decode()
    cam = None
    for block in re.findall(r'<script>self.__next_f.push\((.*?)\)</script>', page):
        payload = json.loads(block)
        if len(payload) < 2 or not isinstance(payload[1], str):
            continue
        marker = payload[1].find('"cam":')
        if marker >= 0:
            cam, _ = json.JSONDecoder().raw_decode(payload[1][marker + 6:])
            break
    if not cam:
        raise ValueError('No public camera metadata: ' + url)
    rows.append({
        'id': seed['id'], 'name': seed.get('name', cam['name']),
        'beach': seed.get('beach') or cam.get('city') or cam['name'],
        'region': seed.get('region', cam['region']['name']),
        'country': seed.get('country') or {'usa': 'USA', 'italy': 'Italy', 'brazil': 'Brazil'}.get(cam['country']['name'], cam['country']['name']), 'path': seed['path'],
        'previewUrl': cam['imagePreview'],
        'latitude': cam['lat'], 'longitude': cam['lon'],
    })
    print(seed['id'], rows[-1]['beach'], rows[-1]['region'], cam['lat'], cam['lon'], flush=True)
    time.sleep(1)
(ROOT / 'src/data/cameras.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
