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

.PHONY: r6-internal r6-test r6-package
r6-internal:
	python -c 'import sys;sys.path.insert(0,"tools");from build import build;build(revision="R6")'
r6-test:
	python tools/course_review.py
	python tools/test_lessons.py
	python tools/test_r6_regressions.py
r6-package:
	python tools/package_r6.py

.PHONY: r6-reviewed-internal r6-reviewed-test r6-reviewed-package
VERIFY_DIR ?= audit/r6-quality-review/verification-2026-11-07
r6-reviewed-internal:
	python tools/build_r6_review.py
r6-reviewed-test:
	python tools/verify_r6_review.py
	python -m unittest tests/test_catalog.py -v
	node tools/test_storage_r6_review.cjs
r6-reviewed-package:
	python tools/package_r6_review.py --verification-dir $(VERIFY_DIR)
