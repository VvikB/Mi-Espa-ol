import json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from audit import canonical,sha
from build import load_data
class CatalogTests(unittest.TestCase):
    def test_all_catalog_sources_match_and_ids_are_unique(self):
        db=load_data();catalog=json.loads((ROOT/'data/catalog.json').read_text());ids=[]
        for kind in ['words','exercises','schemes','tables','images','schemeExercises']:
            for record in catalog[kind]:
                ids.append(record['id']);value=db
                for part in record['pointer'].strip('/').split('/'):value=value[int(part)] if isinstance(value,list) else value[part]
                self.assertEqual(record['contentHash'],sha(canonical(value).encode()))
        self.assertEqual(len(ids),261);self.assertEqual(len(ids),len(set(ids)))
    def test_84_plans_have_explicit_source_refs_and_gaps(self):
        catalog=json.loads((ROOT/'data/catalog.json').read_text());routes=json.loads((ROOT/'data/routes.json').read_text())['routes']
        ids={r['id'] for kind in ['words','exercises','schemes','tables','images','schemeExercises'] for r in catalog[kind]}
        self.assertEqual(len(routes),12);days=[]
        for route in routes:
            self.assertTrue(route['contentGaps']);self.assertEqual(len(route['dayPlans']),7)
            for day in route['dayPlans']:
                days.append(day['id']);self.assertTrue(day['goal'])
                refs=[id for kind in ['tableIds','schemeIds','exerciseIds'] for id in day[kind]]
                self.assertTrue(refs);self.assertTrue(all(id in ids for id in refs))
                self.assertEqual(day['status'],'TECHNICAL_PLAN_WITH_DECLARED_CONTENT_GAPS')
        self.assertEqual(len(days),84);self.assertEqual(len(set(days)),84)
    def test_recovered_scheme_tasks_are_separate_from_main_quiz(self):
        db=load_data();catalog=json.loads((ROOT/'data/catalog.json').read_text())
        self.assertEqual(len(db['quiz']),10);self.assertEqual(len(catalog['schemeExercises']),14)
        self.assertTrue(all(s['sourceImageId'] is None and s['sourceLinkStatus']=='UNVERIFIED' for s in catalog['schemes']))
if __name__=='__main__':unittest.main()
