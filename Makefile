DEMO_DIR := examples/globe-demo
RAILWAYS_DIR := apps/railways
PIXEL_GLOBE_DIR := apps/pixel-globe
PIXEL_GLOBE_PORT ?= 5184

.PHONY: help demo-dev demo-rivers demo-build demo-preview demo-download-data demo-setup-data demo-build-cache demo-clean railways-dev railways-join railways-server railways-build railways-preview pixel-globe-dev pixel-globe-normalize-sfx pixel-globe-render-ship pixel-globe-render-unity-ships

help:
	@echo "Targets:"
	@echo "  make demo-dev           Run the full globe demo (npm run dev)"
	@echo "  make demo-rivers        Open river-hex viewer only (npm run dev:rivers)"
	@echo "  make demo-build         Build the globe demo"
	@echo "  make demo-preview       Preview the built globe demo"
	@echo "  make demo-download-data Download demo assets into public/"
	@echo "  make demo-setup-data    Download and build demo data assets"
	@echo "  make demo-build-cache     Build earth-globe-cache (default: subdiv 6 + legacy .json)"
	@echo "  make demo-build-cache-all Build caches for subdivisions 6 and 7"
	@echo "  make demo-clean         Remove demo build output"
	@echo "  make railways-dev       Run Railways host+client locally"
	@echo "  make railways-join      Run Railways join-client locally"
	@echo "  make railways-server    Run Railways server locally"
	@echo "  make railways-build     Build Railways app"
	@echo "  make railways-preview   Preview built Railways app"
	@echo "  make pixel-globe-dev    Run Pixel Globe locally on PIXEL_GLOBE_PORT (default: 5184)"
	@echo "  make pixel-globe-normalize-sfx      Normalize source SFX to runtime OGG files"
	@echo "  make pixel-globe-render-ship        Rebuild the default ship sprite lighting sheets"
	@echo "  make pixel-globe-render-unity-ships Rebuild imported Unity ship sprite lighting sheets"

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

demo-build-cache-all:
	cd $(DEMO_DIR) && npm run build-earth-globe-cache-all

demo-clean:
	rm -rf $(DEMO_DIR)/dist

railways-dev:
	cd $(RAILWAYS_DIR) && npm run dev:host

railways-join:
	cd $(RAILWAYS_DIR) && npm run dev:join

railways-server:
	cd $(RAILWAYS_DIR) && npm run server

railways-build:
	cd $(RAILWAYS_DIR) && npm run build

railways-preview:
	cd $(RAILWAYS_DIR) && npm run preview

pixel-globe-dev:
	PORT=$(PIXEL_GLOBE_PORT) npm --prefix $(PIXEL_GLOBE_DIR) run dev

pixel-globe-normalize-sfx:
	npm --prefix $(PIXEL_GLOBE_DIR) run normalize:sfx

pixel-globe-render-ship:
	npm --prefix $(PIXEL_GLOBE_DIR) run render:ship

pixel-globe-render-unity-ships:
	npm --prefix $(PIXEL_GLOBE_DIR) run render:unity-ships
