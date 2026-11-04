.PHONY: audit test browser reconstruct internal repair-test
# Audit reconstruction is byte-identical source recovery, not an application release.
audit:
	python tools/audit.py

test: audit
	python -m unittest discover -s tests -v

browser:
	python tools/browser_audit.py

reconstruct: audit
	@echo 'Audit-only reconstructions: .audit/reconstruction/ (not a final build)'

# Internal working artifact only. No final-release target exists.
internal:
	python tools/build.py

repair-test:
	python tools/test_restoration.py
