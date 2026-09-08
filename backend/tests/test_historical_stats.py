import unittest
import json
from unittest.mock import patch
from tempfile import TemporaryDirectory
from pathlib import Path

from app.services import data


class HistoricalStatsTests(unittest.TestCase):
    def test_generation_one_source_special_is_mirrored(self):
        # Actual pokedb Gen 1 payload shape; it has no split Special fields.
        stats = data._normalize_historical_stats(
            {"hp": 45, "attack": 49, "defense": 49, "speed": 45, "special": 65}, 1
        )
        self.assertEqual(stats["special-attack"], 65)
        self.assertEqual(stats["special-defense"], 65)

    def test_legacy_split_payloads_still_work(self):
        stats = data._normalize_historical_stats({"special_attack": 85, "special_defense": 0}, 1)
        self.assertEqual(stats["special-attack"], 85)
        self.assertEqual(stats["special-defense"], 85)
        stats = data._normalize_historical_stats({"special_attack": 109, "special_defense": 85}, 2)
        self.assertEqual(stats["special-attack"], 109)
        self.assertEqual(stats["special-defense"], 85)

    def test_fetched_generation_one_record_is_cached_correctly(self):
        with TemporaryDirectory() as directory:
            runtime = Path(directory) / "runtime.json"
            runtime.write_text(json.dumps({"charizard": {"1": {
                "hp": 78, "attack": 84, "defense": 78, "speed": 100,
                "special-attack": 0, "special-defense": 0,
            }}}), encoding="utf-8")
            with patch.object(data, "CACHE_PATH", runtime), patch.object(
                data, "BUNDLED_CACHE_PATH", Path(directory) / "missing.json"
            ), patch.object(data._SESSION, "get") as request:
                request.return_value.status_code = 200
                request.return_value.json.return_value = {"stats": {
                    "hp": 78, "attack": 84, "defense": 78, "speed": 100, "special": 85,
                }}
                result = data.get_historical_base_stats("charizard", 1)
                self.assertEqual(result["special-attack"], 85)
                self.assertEqual(data.get_historical_base_stats("charizard", 1), result)
                self.assertEqual(request.call_count, 1)


if __name__ == "__main__":
    unittest.main()
