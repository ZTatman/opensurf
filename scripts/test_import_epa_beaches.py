"""Offline tests for import-epa-beaches.py using a small in-memory copy of the EPA attribute table."""
import importlib.util
import sqlite3
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('import_epa_beaches', Path(__file__).resolve().parent / 'import-epa-beaches.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)

COLUMNS = ['beach_id', 'beach_name', 'beach_county', 'beach_state', 'historical_id_flag', 'dormant_status', 'beach_access',
           'start_latitude_measure', 'start_longitude_measure', 'end_latitude_measure', 'end_longitude_measure']


def fixture(rows):
    db = sqlite3.connect(':memory:')
    db.execute(f'create table beach_attr ({", ".join(COLUMNS)})')
    defaults = {'historical_id_flag': 'N', 'dormant_status': None, 'beach_access': 'Public', 'end_latitude_measure': None, 'end_longitude_measure': None}
    for row in rows:
        values = {**defaults, **row}
        db.execute(f'insert into beach_attr values ({", ".join("?" * len(COLUMNS))})', [values[column] for column in COLUMNS])
    return db


def segment(beach_id, name, county, state, lat, lon, **extra):
    return {'beach_id': beach_id, 'beach_name': name, 'beach_county': county, 'beach_state': state,
            'start_latitude_measure': lat, 'start_longitude_measure': lon, **extra}


class NameTest(unittest.TestCase):
    def test_title_cases_capitals_and_keeps_mixed_case(self):
        self.assertEqual(importer.clean_name('FORT PIERCE INLET/NORTH JETTY PARK'), 'Fort Pierce Inlet/North Jetty Park')
        self.assertEqual(importer.clean_name('DEERFIELD BEACH SE 10TH STREET'), 'Deerfield Beach SE 10th Street')
        self.assertEqual(importer.clean_name("KAIPAPA'U BEACH"), "Kaipapa'u Beach")
        self.assertEqual(importer.clean_name('Salisbury Beach Star of the Sea (DCR)'), 'Salisbury Beach Star of the Sea')
        self.assertEqual(importer.clean_name('Pipeline, The'), 'Pipeline, The')
        self.assertEqual(importer.clean_name('EDISON BEACH (Nicks Beach)'), 'Edison Beach')
        self.assertEqual(importer.clean_name('BLIND CREEK Beach - South'), 'Blind Creek Beach - South')
        self.assertEqual(importer.clean_name('Rogers Beach DCR Lot'), 'Rogers Beach DCR Lot')

    def test_strips_segment_qualifiers_for_grouping(self):
        self.assertEqual(importer.base_name('Ocean City at 7th St'), 'Ocean City')
        self.assertEqual(importer.base_name('Hoko River, Beach 428'), 'Hoko River')
        self.assertEqual(importer.base_name('ROBERT MOSES STATE PARK - LONG ISLAND - FIELD 5'), 'Robert Moses State Park - Long Island')
        self.assertEqual(importer.base_name('Ocean City Beach 1'), 'Ocean City Beach')
        self.assertEqual(importer.base_name('Blind Sucker River # 2'), 'Blind Sucker River')
        self.assertEqual(importer.base_name('Samuel H. Boardman State Scenic Corridor - Whaleshead Beach'), 'Samuel H. Boardman State Scenic Corridor - Whaleshead Beach')


class RecordTest(unittest.TestCase):
    def records(self, rows):
        return importer.beach_records(list(importer.segments(fixture(rows))))

    def test_merges_nearby_segments_of_one_beach(self):
        records = self.records([
            segment('NJ1', 'Ocean City at 7th St', 'CAPE MAY', 'NJ', 39.27, -74.57),
            segment('NJ2', 'Ocean City at 40th St', 'CAPE MAY', 'NJ', 39.24, -74.60),
            segment('NJ3', 'Ocean City at 9th St', 'CAPE MAY', 'NJ', 40.50, -74.00),
            segment('NJ4', 'Ocean City at 10th St', 'CAPE MAY', 'NJ', 40.51, -74.00),
            segment('NJ5', 'Ocean City at 1st St', 'CAPE MAY', 'NJ', 41.50, -74.00),
        ])
        # Far-apart clusters stay separate; a lone segment keeps its full name.
        self.assertEqual([(record['name'], record['epaIds']) for record in records],
                         [('Ocean City', ['NJ1', 'NJ2']), ('Ocean City', ['NJ3', 'NJ4']), ('Ocean City at 1st St', ['NJ5'])])
        self.assertEqual([record['id'] for record in records], ['ocean-city-cape-may-new-jersey', 'ocean-city-cape-may-new-jersey-2', 'ocean-city-at-1st-st-new-jersey'])
        self.assertEqual(records[0]['county'], 'Cape May')
        self.assertAlmostEqual(records[0]['latitude'], 39.255)

    def test_skips_inactive_private_and_unknown_jurisdictions(self):
        records = self.records([
            segment('FL1', 'Old Beach', 'X', 'FL', 27, -80, historical_id_flag='Y'),
            segment('FL2', 'Dormant Beach', 'X', 'FL', 27, -80, dormant_status='Dormant'),
            segment('FL3', 'Club Beach', 'X', 'FL', 27, -80, beach_access='Private'),
            segment('ST1', 'Tribal Beach', 'SKAGIT', 'ST', 48, -122),
            segment('FL4', 'JETTY PARK BEACH', 'ST. LUCIE', 'FL', 27.46, -80.29, end_latitude_measure=27.48, end_longitude_measure=-80.29),
        ])
        self.assertEqual(records, [{'id': 'jetty-park-beach-florida', 'name': 'Jetty Park Beach', 'county': 'St. Lucie', 'region': 'Florida',
                                    'latitude': 27.47, 'longitude': -80.29, 'epaIds': ['FL4']}])

    def test_uses_county_to_tell_apart_beaches_with_the_same_name(self):
        records = self.records([
            segment('MA1', 'TOWN BEACH', 'ESSEX', 'MA', 42.6, -70.7),
            segment('MA2', 'TOWN BEACH', 'BARNSTABLE', 'MA', 41.7, -70.3),
        ])
        self.assertEqual(sorted(record['id'] for record in records), ['town-beach-barnstable-massachusetts', 'town-beach-essex-massachusetts'])


if __name__ == '__main__':
    unittest.main()
