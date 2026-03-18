DEMO_DIR := examples/globe-demo

.PHONY: help demo-dev demo-rivers demo-build demo-preview demo-download-data demo-setup-data demo-build-cache demo-clean

help:
	@echo "Targets:"
	@echo "  make demo-dev           Run the full globe demo (npm run dev)"
	@echo "  make demo-rivers        Open river-hex viewer only (npm run dev:rivers)"
	@echo "  make demo-build         Build the globe demo"
	@echo "  make demo-preview       Preview the built globe demo"
	@echo "  make demo-download-data Download demo assets into public/"
	@echo "  make demo-setup-data    Download and build demo data assets"
	@echo "  make demo-build-cache   Build earth-globe-cache.json (precomputed tiles/rivers)"
	@echo "  make demo-clean         Remove demo build output"

demo-dev:
	cd $(DEMO_DIR) && npm run dev

demo-rivers:
	cd $(DEMO_DIR) && npm run dev:rivers

demo-build:
	cd $(DEMO_DIR) && npm run build

demo-preview:
	cd $(DEMO_DIR) && npm run preview

demo-download-data:
	cd $(DEMO_DIR) && npm run download-data

demo-setup-data:
	cd $(DEMO_DIR) && npm run setup-data

demo-build-cache:
	cd $(DEMO_DIR) && npm run build-earth-globe-cache

demo-clean:
	rm -rf $(DEMO_DIR)/dist
