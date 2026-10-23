"""Offline tests for the catalog merge step of import-cameras.py. Never fetches listings."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / 'src/data/catalog'
spec = importlib.util.spec_from_file_location('import_cameras', ROOT / 'scripts/import-cameras.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


def load(name):
    return json.loads((CATALOG / name).read_text())


def listings_from_catalog(beaches, cameras):
    """Rebuild the flat rows fetch_listing would return for the current Live Beach Cams cameras."""
    by_id = {beach['id']: beach for beach in beaches}
    rows = []
    for camera in cameras:
        if camera['sourceId'] != importer.SOURCE_ID:
            continue
        beach = by_id[camera['beachId']]
        rows.append({
            'id': camera['id'], 'name': camera['name'], 'beach': beach['name'], 'region': beach['region'],
            'country': beach['country'], 'path': camera['path'], 'previewUrl': camera['previewUrl'],
            'latitude': camera.get('latitude', beach['latitude']), 'longitude': camera.get('longitude', beach['longitude']),
        })
    return rows


class MergeTest(unittest.TestCase):
    def setUp(self):
        self.beaches = load('beaches.json')
        self.cameras = load('cameras.json')
        self.listings = listings_from_catalog(self.beaches, self.cameras)

    def merge(self, listings, checked_at):
        return importer.merge(listings, copy.deepcopy(self.beaches), copy.deepcopy(self.cameras), checked_at)

    def test_reimporting_unchanged_listings_reproduces_the_catalog(self):
        checked = {camera['checkedAt'] for camera in self.cameras if camera['sourceId'] == importer.SOURCE_ID}
        self.assertEqual(len(checked), 1)
        beaches, cameras = self.merge(self.listings, checked.pop())
        self.assertEqual(beaches, self.beaches)
        self.assertEqual(cameras, self.cameras)

    def test_keeps_other_sources_and_updates_check_date(self):
        _, cameras = self.merge(self.listings, '2030-01-01')
        others = [camera for camera in self.cameras if camera['sourceId'] != importer.SOURCE_ID]
        self.assertEqual([camera for camera in cameras if camera['sourceId'] != importer.SOURCE_ID], others)
        self.assertTrue(all(camera['checkedAt'] == '2030-01-01' for camera in cameras if camera['sourceId'] == importer.SOURCE_ID))

    def test_adds_new_beaches_and_keeps_moved_cameras_on_their_beach(self):
        moved = dict(self.listings[0], latitude=self.listings[0]['latitude'] + 0.01)
        new = dict(self.listings[0], id='new-cam', beach='Néw Béach', region='Hawaii', path='usa/hawaii/new-cam')
        beaches, cameras = self.merge([moved, new], '2030-01-01')
        self.assertEqual(len(beaches), len(self.beaches) + 1)
        self.assertEqual(beaches[-1]['id'], 'new-beach-hawaii')
        first = next(camera for camera in cameras if camera['id'] == moved['id'])
        self.assertEqual((first['beachId'], first['latitude']), (self.cameras[0]['beachId'], moved['latitude']))
        self.assertNotIn(self.listings[1]['id'], {camera['id'] for camera in cameras}, 'seeds are the full list for this source')


if __name__ == '__main__':
    unittest.main()
