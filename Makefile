.PHONY: audit test browser reconstruct internal repair-test backup-test journey-test
# Audit reconstruction is byte-identical source recovery, not an application release.
audit:
	python tools/audit.py

test: audit
	python -m unittest discover -s tests -v
	node tests/storage.test.cjs

browser:
	python tools/browser_audit.py

reconstruct: audit
	@echo 'Audit-only reconstructions: .audit/reconstruction/ (not a final build)'

# Internal working artifact only. No final-release target exists.
internal:
	python tools/build.py

repair-test:
	python tools/test_restoration.py

backup-test:
	python tools/test_backup.py

journey-test:
	python tools/test_journey.py

.PHONY: r4-internal r4-test r4-package
r4-internal:
	python -c 'import sys;sys.path.insert(0,"tools");from build import build;build(revision="R4")'
r4-test:
	python tools/test_r4.py
	python tools/test_r4_regressions.py
r4-package:
	python tools/package_r4.py

.PHONY: r5-internal r5-test r5-package
r5-internal:
	python -c 'import sys;sys.path.insert(0,"tools");from build import build;build(revision="R5")'
r5-test:
	python tools/test_r5.py
	python tools/test_r5_regressions.py
r5-package:
	python tools/package_r5.py
