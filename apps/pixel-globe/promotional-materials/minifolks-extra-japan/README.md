# MiniFolks Extra: Japan release kit

- `package/`: row-per-action PNGs and editable Aseprite sources
- `dist/`: upload-ready 7z archives
- `promo/`: 315x250 itch cover and one 64x64 action preview GIF per unit
- `itch-page.md`: short itch copy and upload fields
- `export_strips.lua`: single-process Aseprite exporter used by the release builder

Rebuild from the tracked Aseprite files:

```sh
python3 build_release.py \
  --aseprite "/Users/garrettpetersen/Library/Application Support/Steam/steamapps/common/Aseprite/Aseprite.app/Contents/MacOS/aseprite"
```
