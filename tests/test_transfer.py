import importlib.util,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('parts',Path(__file__).resolve().parents[1]/'tools/transfer_parts.py')
parts=importlib.util.module_from_spec(spec);spec.loader.exec_module(parts)
class TransferTests(unittest.TestCase):
    def test_roundtrip_and_corrupt_part_rejection_without_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);original=p/'source.zip';original.write_bytes(bytes(range(256))*5000)
            parts.split(original,p/'parts',mib=1)
            parts.join(p/'parts/parts.json',p/'restored.zip')
            self.assertEqual(original.read_bytes(),(p/'restored.zip').read_bytes())
            with self.assertRaises(FileExistsError):parts.join(p/'parts/parts.json',p/'restored.zip')
            (p/'parts/part-0000.bin').write_bytes(b'broken')
            with self.assertRaises(ValueError):parts.join(p/'parts/parts.json',p/'must-not-exist.zip')
            self.assertFalse((p/'must-not-exist.zip').exists())
if __name__=='__main__':unittest.main()
