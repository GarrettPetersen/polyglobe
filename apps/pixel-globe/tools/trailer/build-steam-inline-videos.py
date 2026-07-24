#!/usr/bin/env python3

import json
import math
import os
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from trailer_support import draw_shadowed_text, probe_duration, require_file, run


ROOT = Path(__file__).resolve().parents[4]
APP = ROOT / "apps" / "pixel-globe"
CAPTURES = APP / ".captures" / "trailer-clips-steam"
TOOL = Path(__file__).resolve().parent
PLAN_PATH = TOOL / "steam-inline-video-plan.json"
LOCALES_PATH = TOOL / "steam-inline-video-locales.json"
OUTPUT = APP / ".captures" / "steam-inline-videos"
OVERLAYS = OUTPUT / "overlays"
FONT_PATHS = {
    "pirata": TOOL / "assets" / "PirataOne-Regular.ttf",
    "yeseva": APP / "tools" / "capsule" / "fonts" / "YesevaOne-Regular.ttf",
    "ma-shan-zheng": APP / "tools" / "capsule" / "fonts" / "MaShanZheng-Regular.ttf",
    "yuji-boku": APP / "tools" / "capsule" / "fonts" / "YujiBoku-Regular.ttf",
    "masa": APP / "tools" / "capsule" / "fonts" / "MasaFont-Regular.ttf",
    "nanum-brush": APP / "tools" / "capsule" / "fonts" / "NanumBrushScript-Regular.ttf",
}
FONT_MAX_SIZES = {
    "pirata": 154,
    "yeseva": 154,
    "ma-shan-zheng": 154,
    "yuji-boku": 165,
    "masa": 173,
    "nanum-brush": 173,
}
EXPECTED_HEADING_IDS = (
    "explore",
    "trade",
    "fish",
    "whale",
    "colonize",
    "fight",
    "pillage",
    "survive",
)
EXPECTED_LOCALES = (
    ("en", "english"),
    ("zh-Hans", "schinese"),
    ("ru", "russian"),
    ("es", "spanish"),
    ("pt-BR", "brazilian"),
    ("ja", "japanese"),
    ("de", "german"),
    ("fr", "french"),
    ("pl", "polish"),
    ("zh-Hant", "tchinese"),
    ("ko", "koreana"),
)
SOURCE_WIDTH = 480
SOURCE_HEIGHT = 270
FPS = 30
USER_MAX_ANIMATION_SECONDS = 10
MAX_WORKERS = max(1, min(4, os.cpu_count() or 1))


def probe_video(path):
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries",
            "stream=codec_name,width,height,pix_fmt,r_frame_rate,color_space",
            "-show_entries", "format=duration,size", "-of", "json", str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def make_heading_overlay(heading_id, heading, locale, width, height):
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    position = (44, height // 2)
    font_path = FONT_PATHS[locale["font"]]
    font = fitted_heading_font(
        overlay,
        heading,
        font_path,
        FONT_MAX_SIZES[locale["font"]],
        position,
        max_right=width - 36,
        max_height=height - 24,
    )
    assert_font_has_glyphs(font, heading, font_path)
    bounds = ImageDraw.Draw(overlay).textbbox(
        position,
        heading,
        font=font,
        anchor="lm",
    )
    if bounds[0] < 0 or bounds[1] < 0 or bounds[2] > width or bounds[3] > height:
        raise RuntimeError(
            f"Steam inline heading does not fit its canvas: "
            f"{locale['steamCode']} {heading}"
        )
    draw_shadowed_text(
        overlay,
        heading,
        font,
        position,
        anchor="lm",
        shadow_offset=(8, 10),
        shadow_blur=8,
    )
    locale_overlay_root = OVERLAYS / locale["steamCode"]
    locale_overlay_root.mkdir(parents=True, exist_ok=True)
    path = locale_overlay_root / f"{heading_id}.png"
    overlay.save(path)
    return path


def fitted_heading_font(
    image,
    heading,
    font_path,
    maximum_size,
    position,
    *,
    max_right,
    max_height,
):
    draw = ImageDraw.Draw(image)
    for size in range(maximum_size, 47, -1):
        font = ImageFont.truetype(str(font_path), size)
        bounds = draw.textbbox(position, heading, font=font, anchor="lm")
        if bounds[2] <= max_right and bounds[3] - bounds[1] <= max_height:
            return font
    raise RuntimeError(f"Steam inline heading cannot fit at a legible size: {heading}")


def assert_font_has_glyphs(font, text, font_path):
    missing = glyph_signature(font, "\U0010ffff")
    for character in set(text):
        if character.isspace():
            continue
        if glyph_signature(font, character) == missing:
            raise RuntimeError(
                f"Steam inline font has no glyph for {character!r}: {font_path}"
            )


def glyph_signature(font, character):
    mask = font.getmask(character)
    return mask.size, bytes(mask)


def render_clip(job, dimensions, crop):
    locale, spec = job
    heading_id = Path(spec["output"]).stem
    heading = locale["headings"][heading_id]
    output_path = OUTPUT / f"{heading_id}_{locale['steamCode']}.webm"
    segments = spec["segments"]
    total_duration = sum(float(segment["duration"]) for segment in segments)
    if not 0 < total_duration < USER_MAX_ANIMATION_SECONDS:
        raise RuntimeError(
            f"Steam inline video must be under {USER_MAX_ANIMATION_SECONDS}s: "
            f"{locale['steamCode']} {heading} is {total_duration}s"
        )

    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    filters = []
    clip_labels = []
    for index, segment in enumerate(segments):
        source = CAPTURES / segment["source"]
        require_file(source)
        start = float(segment["start"])
        duration = float(segment["duration"])
        source_duration = probe_duration(source)
        if start < 0 or duration <= 0 or start + duration > source_duration + 0.04:
            raise RuntimeError(
                f"Steam inline window exceeds source: {source} starts {start}s for "
                f"{duration}s but source is {source_duration}s"
            )
        source_probe = probe_video(source)["streams"][0]
        if source_probe["width"] != SOURCE_WIDTH or source_probe["height"] != SOURCE_HEIGHT:
            raise RuntimeError(
                f"Steam inline source must be {SOURCE_WIDTH}x{SOURCE_HEIGHT}: {source}"
            )
        command.extend(["-i", source])
        label = f"clip-{index}"
        clip_labels.append(f"[{label}]")
        filters.append(
            f"[{index}:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS,"
            f"fps={FPS},crop={crop['width']}:{crop['height']}:{crop['x']}:{crop['y']},"
            f"scale={dimensions['width']}:{dimensions['height']}:flags=neighbor,"
            f"setsar=1[{label}]"
        )

    if len(clip_labels) == 1:
        filters.append(f"{clip_labels[0]}null[base]")
    else:
        filters.append(f"{''.join(clip_labels)}concat=n={len(clip_labels)}:v=1:a=0[base]")

    overlay = make_heading_overlay(
        heading_id,
        heading,
        locale,
        dimensions["width"],
        dimensions["height"],
    )
    overlay_input = len(segments)
    command.extend(["-loop", "1", "-framerate", str(FPS), "-i", overlay])
    filters.extend([
        f"[{overlay_input}:v]format=rgba[heading]",
        "[base][heading]overlay=0:0:shortest=1:format=auto,format=yuv420p[video]",
    ])
    command.extend([
        "-filter_complex", ";".join(filters),
        "-map", "[video]", "-t", str(total_duration),
        "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "29",
        "-deadline", "good", "-cpu-used", "2", "-row-mt", "1",
        "-pix_fmt", "yuv420p", "-r", str(FPS), "-an",
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        output_path,
    ])
    run(command)

    probe = probe_video(output_path)
    stream = probe["streams"][0]
    duration = float(probe["format"]["duration"])
    if stream["codec_name"] != "vp9":
        raise RuntimeError(f"Steam inline video is not VP9: {output_path}")
    if stream["width"] != dimensions["width"] or stream["height"] != dimensions["height"]:
        raise RuntimeError(f"Steam inline video has incorrect dimensions: {output_path}")
    if stream["r_frame_rate"] != f"{FPS}/1" or stream["pix_fmt"] != "yuv420p":
        raise RuntimeError(f"Steam inline video has incorrect frame format: {output_path}")
    if stream.get("color_space") != "bt709":
        raise RuntimeError(f"Steam inline video is missing BT.709 metadata: {output_path}")
    if not math.isclose(duration, total_duration, abs_tol=0.08):
        raise RuntimeError(
            f"Steam inline video is {duration:.3f}s; expected {total_duration:.3f}s: {output_path}"
        )
    return {
        "appLocale": locale["appLocale"],
        "steamCode": locale["steamCode"],
        "headingId": heading_id,
        "heading": heading,
        "path": output_path,
        "bytes": int(probe["format"]["size"]),
        "durationSeconds": duration,
    }


def write_heading_review(locales, dimensions):
    thumbnail_width = 260
    thumbnail_height = 60
    label_width = 170
    row_height = 78
    sheet = Image.new(
        "RGB",
        (label_width + thumbnail_width * len(EXPECTED_HEADING_IDS), row_height * len(locales)),
        (24, 17, 13),
    )
    draw = ImageDraw.Draw(sheet)
    label_font = ImageFont.truetype(str(FONT_PATHS["yeseva"]), 18)
    for row, locale in enumerate(locales):
        y = row * row_height
        draw.text(
            (12, y + row_height // 2),
            locale["steamCode"],
            font=label_font,
            fill=(240, 221, 177),
            anchor="lm",
        )
        for column, heading_id in enumerate(EXPECTED_HEADING_IDS):
            overlay = Image.open(
                OVERLAYS / locale["steamCode"] / f"{heading_id}.png"
            ).convert("RGBA")
            overlay.thumbnail((thumbnail_width, thumbnail_height), Image.Resampling.LANCZOS)
            x = label_width + column * thumbnail_width
            image_y = y + (row_height - overlay.height) // 2
            sheet.paste(overlay, (x, image_y), overlay)
    path = OUTPUT / "localized-headings-review.png"
    sheet.save(path)
    return path


def validate_locales(locales):
    if not isinstance(locales, list):
        raise RuntimeError("Steam inline locales must be a list")
    actual = tuple((locale.get("appLocale"), locale.get("steamCode")) for locale in locales)
    if actual != EXPECTED_LOCALES:
        raise RuntimeError("Steam inline locales must match every supported language in order")
    if len({locale["steamCode"] for locale in locales}) != len(locales):
        raise RuntimeError("Steam inline locale codes must be unique")
    for locale in locales:
        if locale.get("font") not in FONT_PATHS:
            raise RuntimeError(f"Unknown Steam inline font: {locale.get('font')}")
        if tuple(locale.get("headings", {}).keys()) != EXPECTED_HEADING_IDS:
            raise RuntimeError(
                f"Steam inline locale has incomplete headings: {locale['steamCode']}"
            )
        if any(not isinstance(text, str) or not text.strip() for text in locale["headings"].values()):
            raise RuntimeError(
                f"Steam inline locale has an empty heading: {locale['steamCode']}"
            )


def main():
    require_file(PLAN_PATH)
    require_file(LOCALES_PATH)
    for font_path in FONT_PATHS.values():
        require_file(font_path)
    plan = json.loads(PLAN_PATH.read_text())
    locales = json.loads(LOCALES_PATH.read_text()).get("locales")
    validate_locales(locales)
    dimensions = {"width": int(plan["width"]), "height": int(plan["height"])}
    crop = {key: int(value) for key, value in plan["sourceCrop"].items()}
    if dimensions != {"width": 1170, "height": 270}:
        raise RuntimeError("Steam inline output must remain 1170x270")
    if crop != {"x": 45, "y": 90, "width": 390, "height": 90}:
        raise RuntimeError("Steam inline crop must remain the pixel-perfect middle band")

    specs = plan.get("clips")
    if not isinstance(specs, list) or tuple(
        Path(spec.get("output", "")).stem for spec in specs
    ) != EXPECTED_HEADING_IDS:
        raise RuntimeError("Steam inline plan must define all eight gameplay headings in order")
    if any(not isinstance(spec.get("segments"), list) or not spec["segments"] for spec in specs):
        raise RuntimeError("Every Steam inline video requires at least one source segment")
    output_names = [spec.get("output") for spec in specs]
    if any(Path(name).name != name or not name.endswith(".webm") for name in output_names):
        raise RuntimeError("Steam inline output names must be plain .webm filenames")
    if len(set(output_names)) != len(output_names):
        raise RuntimeError("Steam inline output names must be unique")

    shutil.rmtree(OUTPUT, ignore_errors=True)
    OVERLAYS.mkdir(parents=True)
    jobs = [(locale, spec) for locale in locales for spec in specs]
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        rendered = list(executor.map(
            lambda job: render_clip(job, dimensions, crop),
            jobs,
        ))
    for heading_id in EXPECTED_HEADING_IDS:
        english = OUTPUT / f"{heading_id}_english.webm"
        shutil.copy2(english, OUTPUT / f"{heading_id}.webm")
    review_path = write_heading_review(locales, dimensions)
    total_size = sum(item["bytes"] for item in rendered)
    manifest = {
        "width": dimensions["width"],
        "height": dimensions["height"],
        "format": "VP9 WebM, silent, BT.709",
        "localeCount": len(locales),
        "headingCount": len(EXPECTED_HEADING_IDS),
        "reviewPath": review_path.name,
        "locales": [
            {
                "appLocale": locale["appLocale"],
                "steamCode": locale["steamCode"],
                "label": locale["label"],
                "files": [
                    {
                        "headingId": item["headingId"],
                        "heading": item["heading"],
                        "path": item["path"].name,
                        "bytes": item["bytes"],
                        "durationSeconds": item["durationSeconds"],
                    }
                    for item in rendered
                    if item["steamCode"] == locale["steamCode"]
                ],
            }
            for locale in locales
        ],
        "totalBytes": total_size,
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        f"Rendered {len(rendered)} localized Steam inline videos "
        f"({total_size / 1024 / 1024:.1f} MB total)"
    )


if __name__ == "__main__":
    main()
