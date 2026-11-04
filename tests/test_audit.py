"""Audit guarantees, not a substitute for product QA."""
import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('audit',Path(__file__).resolve().parents[1]/'tools/audit.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)

class EvidenceIntegrity(unittest.TestCase):
    def test_all_supplied_artifacts_match_transfer_hashes(self):
        rows=audit.verify_transfer()
        self.assertEqual(sum(x['status']=='PASS' for x in rows),20)
        self.assertFalse(any(x['status']=='FAIL' for x in rows))
        self.assertEqual({Path(x['file']).name for x in rows if x['status']=='NOT_DELIVERED_IN_STARTER'}, {'Mi_Espanol_4_4_REBUILT_iPhone.html','Mi_Espanol_Integrated_Review_2026-11-02.html','Mi_Espanol_Personal_Complete_Review.html'})
    def test_reconstruction_preserves_exact_original_bytes(self):
        for p in (audit.STARTER/'source_candidates').glob('*.html'):
            with tempfile.TemporaryDirectory() as t:
                audit.reconstruct(p,Path(t));self.assertEqual(p.read_bytes(),(Path(t)/'reconstructed-audit-only.html').read_bytes())
    def test_candidate_data_are_identical_not_additive(self):
        sources=list((audit.STARTER/'source_candidates').glob('*.html'))
        a=audit.parse_html(sources[0])[2];b=audit.parse_html(sources[1])[2]
        self.assertEqual(a,b)
        self.assertEqual(len(a['vocab']),131)
        self.assertEqual(len(a['quiz']),10)
        self.assertEqual(sum(len(s[1]) for s in a['atlas']),73)
        self.assertEqual(len({audit.sha(__import__('base64').b64decode(x['src'].split(',')[1])) for x in a['images']}),25)
    def test_frozen_sources_unchanged_since_first_git_commit(self):
        import subprocess
        changed=subprocess.run(['git','diff','--exit-code','16e50e2','--','originals'],cwd=audit.ROOT,capture_output=True,text=True)
        self.assertEqual(changed.returncode,0,changed.stdout+changed.stderr)
if __name__=='__main__':unittest.main()
