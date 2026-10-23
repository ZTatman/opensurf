"""Build the national beach index from EPA's BEACH Act beach dataset.

Usage: python3 scripts/import-epa-beaches.py [path/to/beach.gpkg]
Without a path, downloads the dataset's GeoPackage (about 4 MB) to a temporary directory.
Writes src/data/catalog/beaches-epa.json. EPA data is a U.S. Government work with no reuse restrictions.
"""
import json
import math
import re
import sqlite3
import subprocess
import sys
import tempfile
import unicodedata
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'src/data/catalog/beaches-epa.json'
DATASET_URL = 'https://dmap-data-commons-ow.s3.amazonaws.com/data/beach/geospatial/beach_20240228_gpkg.zip'
# Segments of the same beach are merged when they share a base name and lie within this distance.
MERGE_KM = 5

STATES = {
    'AK': 'Alaska', 'AL': 'Alabama', 'AS': 'American Samoa', 'CA': 'California', 'CT': 'Connecticut',
    'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia', 'GU': 'Guam', 'HI': 'Hawaii', 'IL': 'Illinois',
    'IN': 'Indiana', 'LA': 'Louisiana', 'MA': 'Massachusetts', 'MD': 'Maryland', 'ME': 'Maine',
    'MI': 'Michigan', 'MN': 'Minnesota', 'MP': 'Northern Mariana Islands', 'MS': 'Mississippi',
    'NC': 'North Carolina', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NY': 'New York', 'OH': 'Ohio',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'PR': 'Puerto Rico', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'TX': 'Texas', 'VA': 'Virginia', 'VI': 'U.S. Virgin Islands', 'WA': 'Washington', 'WI': 'Wisconsin',
}
SMALL_WORDS = {'a', 'aka', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'the', 'to'}
UPPER_WORDS = {'ne', 'nw', 'se', 'sw', 'us', 'usa'}

# Active, publicly accessible beaches with coordinates.
QUERY = """
select beach_id, beach_name, beach_county, beach_state,
       start_latitude_measure, start_longitude_measure, end_latitude_measure, end_longitude_measure
from beach_attr
where historical_id_flag = 'N' and dormant_status is null and beach_access = 'Public'
  and start_latitude_measure is not null and start_longitude_measure is not null
order by beach_id
"""


def slug(value):
    ascii_value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', ascii_value.lower()).strip('-')


def title_case(value):
    """Title-cases ALL-CAPS names. In mixed-case names only capitalised words of four or more letters
    change (BLIND CREEK Beach -> Blind Creek Beach); shorter ones are kept as likely acronyms."""
    value = re.sub(r'\s+', ' ', value).strip()
    if value != value.upper():
        return re.sub(r"\b[A-Z]{4,}\b", lambda match: match.group(0).capitalize(), value)

    def word(match):
        text = match.group(0)
        if text in UPPER_WORDS:
            return text.upper()
        if match.start() and text in SMALL_WORDS:
            return text
        return text[:1].upper() + text[1:]
    # Words run between spaces, slashes, hyphens and brackets; apostrophes stay inside a word (Kaipapa'u).
    return re.sub(r"[^\s/\-()&@,.]+", word, value.lower())


def clean_name(value):
    """Display name for a single segment: title case without trailing parentheticals such as (DCR)."""
    return title_case(re.sub(r'\s*\([^)]*\)\s*$', '', value)).strip(' -,')


def base_name(value):
    """Name shared by monitoring segments of one beach, e.g. "Ocean City at 7th St" -> "Ocean City"."""
    name = clean_name(value)
    name = re.sub(r'\s+at\s+.*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r',\s*Beach\s+\d+$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+-\s+(field\s+\d+|bay|ocean|sound|north|south|east|west|[nsew])$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+(#?\d+|[nsew]|north|south|east|west)$', '', name, flags=re.IGNORECASE)
    return name.strip(' -,#') or clean_name(value)


def distance_km(a, b):
    radians = math.pi / 180
    d_lat, d_lon = (b[0] - a[0]) * radians, (b[1] - a[1]) * radians
    h = math.sin(d_lat / 2) ** 2 + math.cos(a[0] * radians) * math.cos(b[0] * radians) * math.sin(d_lon / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(min(1, h)))


def segments(db):
    skipped = 0
    for beach_id, name, county, state, lat1, lon1, lat2, lon2 in db.execute(QUERY):
        if state not in STATES or not name:
            skipped += 1
            continue
        lat2, lon2 = lat2 if lat2 is not None else lat1, lon2 if lon2 is not None else lon1
        yield {
            'epaId': beach_id, 'name': name, 'county': title_case(county) if county else None, 'state': state,
            'point': ((lat1 + lat2) / 2, (lon1 + lon2) / 2),
        }
    if skipped:
        print(f'skipped {skipped} segments with an unknown jurisdiction code', file=sys.stderr)


def group(rows):
    """Single-linkage clusters of segments with the same state, county and base name within MERGE_KM."""
    by_key = {}
    for row in rows:
        by_key.setdefault((row['state'], row['county'] or '', base_name(row['name']).lower()), []).append(row)
    clusters = []
    for members in by_key.values():
        pending = list(members)
        while pending:
            cluster = [pending.pop(0)]
            grew = True
            while grew:
                grew = False
                for row in list(pending):
                    if any(distance_km(row['point'], member['point']) <= MERGE_KM for member in cluster):
                        cluster.append(row)
                        pending.remove(row)
                        grew = True
            clusters.append(cluster)
    return clusters


def beach_records(rows):
    records = []
    for cluster in group(rows):
        first = min(cluster, key=lambda row: row['epaId'])
        records.append({
            'name': clean_name(first['name']) if len(cluster) == 1 else base_name(first['name']),
            'county': first['county'], 'region': STATES[first['state']],
            'latitude': round(sum(row['point'][0] for row in cluster) / len(cluster), 5),
            'longitude': round(sum(row['point'][1] for row in cluster) / len(cluster), 5),
            'epaIds': sorted(row['epaId'] for row in cluster),
        })
    records.sort(key=lambda record: (record['region'], record['county'] or '', record['name'], record['epaIds'][0]))
    # Stable IDs: name and state, then county, then a counter in EPA ID order for remaining collisions.
    counts = {}
    for record in records:
        counts[slug(record['name']), record['region']] = counts.get((slug(record['name']), record['region']), 0) + 1
    seen = set()
    for record in sorted(records, key=lambda record: record['epaIds'][0]):
        parts = [record['name']] + ([record['county']] if counts[slug(record['name']), record['region']] > 1 and record['county'] else []) + [record['region']]
        candidate = slug(' '.join(parts))
        suffix = 2
        unique = candidate
        while unique in seen:
            unique, suffix = f'{candidate}-{suffix}', suffix + 1
        seen.add(unique)
        record['id'] = unique
    return [{key: record[key] for key in ['id', 'name', 'county', 'region', 'latitude', 'longitude', 'epaIds'] if record[key] is not None} for record in records]


def download(directory):
    archive = Path(directory) / 'beach.zip'
    subprocess.check_call(['curl', '-fLsS', '--retry', '2', '--max-time', '120', '-o', str(archive), DATASET_URL])
    with zipfile.ZipFile(archive) as bundle:
        name = next(name for name in bundle.namelist() if name.endswith('.gpkg'))
        bundle.extract(name, directory)
    return Path(directory) / name


def main():
    with tempfile.TemporaryDirectory() as directory:
        path = Path(sys.argv[1]) if len(sys.argv) > 1 else download(directory)
        db = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
        rows = list(segments(db))
    records = beach_records(rows)
    OUTPUT.write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{len(rows)} segments -> {len(records)} beaches in {OUTPUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
