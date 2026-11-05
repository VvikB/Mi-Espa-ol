.PHONY: audit test browser reconstruct internal repair-test backup-test
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
