SHELL := /bin/bash

.PHONY: urbanization-sources
urbanization-sources:
	mkdir -p public/datasets/urbanization-stadester-1/raw
	curl -L "https://zenodo.org/api/records/17172245/files/metro_adjusted_rasters_and_json.zip/content" -o "public/datasets/urbanization-stadester-1/raw/metro_adjusted_rasters_and_json.zip"
	unzip -o "public/datasets/urbanization-stadester-1/raw/metro_adjusted_rasters_and_json.zip" -d "public/datasets/urbanization-stadester-1/raw/"
	npm run build-urbanization-stadester -- --input "public/datasets/urbanization-stadester-1/raw/metro_adjusted/stadester.json"
	npm run merge-urbanization-stadester
	npm run build-urbanization-dominance-pruned -- 7
