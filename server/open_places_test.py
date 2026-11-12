import unittest
from open_places import map_restaurant


class OpenPlaceTests(unittest.TestCase):
    def row(self, **changes):
        return {"id": "example-place", "names": {"primary": "Example Kitchen"},
                "bbox": {"xmin": -73.96, "ymin": 40.715}, "confidence": 0.9,
                "taxonomy": {"primary": "italian_restaurant", "hierarchy": ["restaurant", "italian_restaurant"]},
                "websites": ["https://restaurant.example/menu"], **changes}

    def test_real_source_fields_map_without_invented_ratings_or_hours(self):
        result = map_restaurant(self.row())
        self.assertEqual(result["id"], "overture-example-place")
        self.assertEqual(result["cuisine"], ["Italian"])
        self.assertEqual(result["sourceUrl"], "https://restaurant.example/menu")
        self.assertFalse(result["priceLevelKnown"])
        self.assertNotIn("openNow", result)

    def test_excludes_closed_low_confidence_and_non_restaurants(self):
        self.assertIsNone(map_restaurant(self.row(operating_status="permanently_closed")))
        self.assertIsNone(map_restaurant(self.row(confidence=0.2)))
        self.assertIsNone(map_restaurant(self.row(taxonomy={"primary": "clothing_store"})))

    def test_missing_location_and_unusable_websites_are_not_claimed(self):
        self.assertIsNone(map_restaurant(self.row(bbox={})))
        self.assertIsNone(map_restaurant(self.row(bbox={"xmin": float("nan"), "ymin": 40})))
        result = map_restaurant(self.row(websites=["javascript:alert(1)"]))
        self.assertIsNone(result["sourceUrl"])


if __name__ == "__main__":
    unittest.main()
