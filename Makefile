DEMO_DIR := examples/globe-demo
RAILWAYS_DIR := apps/railways
PIXEL_GLOBE_DIR := apps/pixel-globe
PIXEL_GLOBE_PORT ?= 5184
PIXEL_GLOBE_CAPTURE_SCENARIO ?= turtle-ship-war
PIXEL_GLOBE_SHORTS_PYTHON := $(PIXEL_GLOBE_DIR)/.venv-shorts/bin/python

.PHONY: help demo-dev demo-rivers demo-build demo-preview demo-download-data demo-setup-data demo-build-cache demo-clean railways-dev railways-join railways-server railways-build railways-preview pixel-globe-dev pixel-globe-demo-itch pixel-globe-capture pixel-globe-benchmark pixel-globe-trailer-clips pixel-globe-steam-trailer-clips pixel-globe-steam-trailer pixel-globe-steam-trailer-no-chapter-text pixel-globe-steam-inline-videos pixel-globe-shorts-setup pixel-globe-transcribe pixel-globe-short pixel-globe-normalize-sfx pixel-globe-render-ship pixel-globe-render-unity-ships pixel-globe-render-capsules

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
	@echo "  make pixel-globe-demo-itch Build the two-hour HTML5 demo ZIP for itch.io"
	@echo "  make pixel-globe-capture Run a disposable 9:16 capture scenario"
	@echo "  make pixel-globe-benchmark Run the deterministic busy-world performance benchmark"
	@echo "  make pixel-globe-trailer-clips Record all scripted 9:16 trailer clips"
	@echo "  make pixel-globe-steam-trailer-clips Record all scripted 16:9 Steam trailer clips"
	@echo "  make pixel-globe-steam-trailer Build the 16:9 Steam trailer from captured clips"
	@echo "  make pixel-globe-steam-trailer-no-chapter-text Build the Steam trailer without feature headings"
	@echo "  make pixel-globe-steam-inline-videos Build About This Game feature videos"
	@echo "  make pixel-globe-shorts-setup Install the local Whisper environment"
	@echo "  make pixel-globe-transcribe AUDIO=... OUT=... Transcribe narration"
	@echo "  make pixel-globe-short VIDEO=... EVENTS=... NARRATION=... TRANSCRIPT=... OUTPUT=..."
	@echo "  make pixel-globe-normalize-sfx      Normalize source SFX to runtime OGG files"
	@echo "  make pixel-globe-render-ship        Rebuild the default ship sprite lighting sheets"
	@echo "  make pixel-globe-render-unity-ships Rebuild imported Unity ship sprite lighting sheets"
	@echo "  make pixel-globe-render-capsules    Rebuild storefront and library capsule art"

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

pixel-globe-demo-itch:
	npm --prefix $(PIXEL_GLOBE_DIR) run package:demo:itch

pixel-globe-capture:
	@echo "Capture URL: http://127.0.0.1:$(PIXEL_GLOBE_PORT)/?capture=$(PIXEL_GLOBE_CAPTURE_SCENARIO)"
	PORT=$(PIXEL_GLOBE_PORT) npm --prefix $(PIXEL_GLOBE_DIR) run dev

pixel-globe-benchmark:
	npm --prefix $(PIXEL_GLOBE_DIR) run benchmark:busy

pixel-globe-trailer-clips:
	npm --prefix $(PIXEL_GLOBE_DIR) run capture:trailer -- --base-url http://127.0.0.1:$(PIXEL_GLOBE_PORT)

pixel-globe-steam-trailer-clips:
	npm --prefix $(PIXEL_GLOBE_DIR) run capture:trailer -- --base-url http://127.0.0.1:$(PIXEL_GLOBE_PORT) --format steam --output .captures/trailer-clips-steam

pixel-globe-steam-trailer:
	npm --prefix $(PIXEL_GLOBE_DIR) run build:steam-trailer

pixel-globe-steam-trailer-no-chapter-text:
	npm --prefix $(PIXEL_GLOBE_DIR) run build:steam-trailer:no-chapter-text

pixel-globe-steam-inline-videos:
	npm --prefix $(PIXEL_GLOBE_DIR) run build:steam-inline-videos

pixel-globe-shorts-setup:
	python3 -m venv $(PIXEL_GLOBE_DIR)/.venv-shorts
	$(PIXEL_GLOBE_DIR)/.venv-shorts/bin/pip install -r $(PIXEL_GLOBE_DIR)/tools/shorts/requirements.txt

pixel-globe-transcribe:
	@test -n "$(AUDIO)" || (echo "AUDIO is required" && exit 2)
	@test -n "$(OUT)" || (echo "OUT is required" && exit 2)
	@test -x "$(PIXEL_GLOBE_SHORTS_PYTHON)" || (echo "Run make pixel-globe-shorts-setup first" && exit 2)
	$(PIXEL_GLOBE_SHORTS_PYTHON) $(PIXEL_GLOBE_DIR)/tools/shorts/transcribe.py "$(AUDIO)" --output-dir "$(OUT)"

pixel-globe-short:
	@test -n "$(VIDEO)" || (echo "VIDEO is required" && exit 2)
	@test -n "$(EVENTS)" || (echo "EVENTS is required" && exit 2)
	@test -n "$(NARRATION)" || (echo "NARRATION is required" && exit 2)
	@test -n "$(TRANSCRIPT)" || (echo "TRANSCRIPT is required" && exit 2)
	@test -n "$(OUTPUT)" || (echo "OUTPUT is required" && exit 2)
	@test -x "$(PIXEL_GLOBE_SHORTS_PYTHON)" || (echo "Run make pixel-globe-shorts-setup first" && exit 2)
	$(PIXEL_GLOBE_SHORTS_PYTHON) $(PIXEL_GLOBE_DIR)/tools/shorts/build_short.py \
		--video "$(VIDEO)" --events "$(EVENTS)" --narration "$(NARRATION)" \
		--transcript "$(TRANSCRIPT)" --output "$(OUTPUT)" $(if $(PLAN),--plan "$(PLAN)",) \
		$(if $(filter 0,$(VOICE_PROCESSING)),--no-voice-processing,)

pixel-globe-normalize-sfx:
	npm --prefix $(PIXEL_GLOBE_DIR) run normalize:sfx

pixel-globe-render-ship:
	npm --prefix $(PIXEL_GLOBE_DIR) run render:ship

pixel-globe-render-unity-ships:
	npm --prefix $(PIXEL_GLOBE_DIR) run render:unity-ships

pixel-globe-render-capsules:
	npm --prefix $(PIXEL_GLOBE_DIR) run render:capsules
