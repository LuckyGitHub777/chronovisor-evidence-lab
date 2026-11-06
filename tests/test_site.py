import json, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
class ChronovisorTests(unittest.TestCase):
    def test_fixed_illustrative_record(self):
        x=json.loads((ROOT/'sample-investigation.json').read_text(encoding='utf-8'))
        self.assertEqual(x['title'],'Pompeii \u2014 AD 79')
        self.assertIs(x['illustrative'],True)
        self.assertTrue(x['notice'])
    def test_local_source_files(self):
        html=(ROOT/'index.html').read_text(encoding='utf-8')
        self.assertIn('src="app.js"',html)
        self.assertIn('href="styles.css"',html)
        self.assertIn("NO LIVE DATA",html)
        self.assertIn("fetch('sample-investigation.json'",(ROOT/'app.js').read_text(encoding='utf-8'))
