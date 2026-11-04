import importlib.util,json,tempfile,unittest,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from build import build,load_data
from audit import parse_html,STARTER
from extract_baseline import extract

class RestorationBuildTests(unittest.TestCase):
    def test_every_source_field_and_image_is_preserved(self):
        self.assertEqual(load_data(),parse_html(STARTER/'source_candidates/Mi_Espanol_LAST_TESTABLE.html')[2])
    def test_build_is_deterministic_and_no_network_dependencies_added(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'.audit') as tmp:
            a,_=build(Path(tmp)/'a.html');b,_=build(Path(tmp)/'b.html')
            self.assertEqual(a.read_bytes(),b.read_bytes())
            self.assertIn('INTERNAL',a.read_text())
            self.assertNotIn('<script src=',a.read_text())
    def test_extraction_refuses_to_overwrite_edited_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);(p/'user-file.txt').write_text('keep')
            with self.assertRaises(ValueError):extract(p)
            self.assertEqual((p/'user-file.txt').read_text(),'keep')
if __name__=='__main__':unittest.main()
