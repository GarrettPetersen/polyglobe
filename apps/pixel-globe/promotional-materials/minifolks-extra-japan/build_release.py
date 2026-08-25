#!/usr/bin/env python3
"""Build the MiniFolks Extra: Japan release kit from the tracked Aseprite files."""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


UNITS = (
    "MiniSamurai",
    "MiniRonin",
    "MiniNinja",
    "MiniYariAshigaru",
    "MiniTeppoAshigaru",
    "MiniYumiSamurai",
    "MiniHorseSamurai",
)
CELL_SIZE = 32
PROMO_SIZE = 64
ITCH_COVER_SIZE = (315, 250)
BACKGROUND = (128, 128, 153, 255)
MIN_ACTION_PREVIEW_MS = 1_100


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--aseprite", type=Path, required=True)
    parser.add_argument("--seven-zip", type=Path, default=Path("/usr/local/bin/7z"))
    return parser.parse_args()


def run_checked(command: list[str], cwd: Path | None = None) -> None:
    # Aseprite's crash reporter can inherit pipe descriptors after Aseprite exits,
    # so real files are required here; capture_output can wait forever on those pipes.
    with tempfile.TemporaryFile(mode="w+") as stdout, tempfile.TemporaryFile(mode="w+") as stderr:
        result = subprocess.run(
            command,
            cwd=cwd,
            check=False,
            stdout=stdout,
            stderr=stderr,
            text=True,
        )
        if result.returncode != 0:
            stdout.seek(0)
            stderr.seek(0)
            raise RuntimeError(
                f"Command failed ({result.returncode}): {' '.join(command)}\n"
                f"stdout:\n{stdout.read()}\nstderr:\n{stderr.read()}"
            )


def require_file(path: Path) -> Path:
    if not path.is_file():
        raise FileNotFoundError(path)
    return path


def render_text_mask(text: str, font: ImageFont.FreeTypeFont) -> Image.Image:
    left, top, right, bottom = font.getbbox(text)
    width = right - left
    height = bottom - top
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).text((-left, -top), text, font=font, fill=255)
    return mask.point(lambda pixel: 255 if pixel >= 128 else 0)


def paste_pixel_text(
    image: Image.Image,
    text: str,
    font: ImageFont.FreeTypeFont,
    xy: tuple[int, int],
    color: tuple[int, int, int, int],
    shadow: tuple[int, int, int, int] | None = None,
    shadow_offset: tuple[int, int] = (1, 1),
) -> tuple[int, int]:
    mask = render_text_mask(text, font)
    x, y = xy
    if shadow is not None:
        image.paste(shadow, (x + shadow_offset[0], y + shadow_offset[1]), mask)
    image.paste(color, (x, y), mask)
    return mask.size


def fit_font(font_path: Path, text: str, max_width: int, start_size: int) -> ImageFont.FreeTypeFont:
    for size in range(start_size, 3, -1):
        font = ImageFont.truetype(font_path, size)
        if render_text_mask(text, font).width <= max_width:
            return font
    raise ValueError(f"Could not fit {text!r} within {max_width}px")


def export_all_strips(
    aseprite: Path,
    script: Path,
    source_dir: Path,
    temp_dir: Path,
) -> dict[str, dict]:
    run_checked(
        [
            str(aseprite),
            "--noinapp",
            "-b",
            "--script-param",
            f"sourceDir={source_dir}",
            "--script-param",
            f"outputDir={temp_dir}",
            "--script",
            str(script),
        ]
    )
    return json.loads((temp_dir / "metadata.json").read_text())


def validate_metadata(source: Path, metadata: dict, strip: Image.Image) -> None:
    frames = metadata["frames"]
    tags = metadata["meta"]["frameTags"]
    if not frames or not tags:
        raise ValueError(f"Missing frames or animation tags in {source.name}")
    if strip.size != (CELL_SIZE * len(frames), CELL_SIZE):
        raise ValueError(f"Unexpected strip dimensions for {source.name}: {strip.size}")

    covered_frames: list[int] = []
    for tag in tags:
        covered_frames.extend(range(tag["from"], tag["to"] + 1))
    if covered_frames != list(range(len(frames))):
        raise ValueError(f"Animation tags do not cover every frame in {source.name}")

    for frame in frames:
        frame_box = frame["frame"]
        source_size = frame["sourceSize"]
        if frame["trimmed"] or frame["rotated"]:
            raise ValueError(f"Trimmed or rotated frame found in {source.name}")
        if (frame_box["w"], frame_box["h"]) != (CELL_SIZE, CELL_SIZE):
            raise ValueError(f"Non-32x32 frame found in {source.name}")
        if (source_size["w"], source_size["h"]) != (CELL_SIZE, CELL_SIZE):
            raise ValueError(f"Non-32x32 source canvas found in {source.name}")


def frame_image(strip: Image.Image, index: int) -> Image.Image:
    left = index * CELL_SIZE
    return strip.crop((left, 0, left + CELL_SIZE, CELL_SIZE))


def build_action_rows(strip: Image.Image, tags: list[dict]) -> Image.Image:
    columns = max(tag["to"] - tag["from"] + 1 for tag in tags)
    sheet = Image.new("RGBA", (columns * CELL_SIZE, len(tags) * CELL_SIZE))
    for row, tag in enumerate(tags):
        for column, frame_index in enumerate(range(tag["from"], tag["to"] + 1)):
            sheet.alpha_composite(frame_image(strip, frame_index), (column * CELL_SIZE, row * CELL_SIZE))
    return sheet


def promo_frame(
    source_frame: Image.Image,
    label: str,
    font: ImageFont.FreeTypeFont,
) -> Image.Image:
    image = Image.new("RGBA", (PROMO_SIZE, PROMO_SIZE), BACKGROUND)
    scaled = source_frame.resize((PROMO_SIZE, PROMO_SIZE), Image.Resampling.NEAREST)
    image.alpha_composite(scaled)

    mask = render_text_mask(label.upper(), font)
    x = (PROMO_SIZE - mask.width) // 2
    y = 2
    ImageDraw.Draw(image).rectangle((x - 1, y - 1, x + mask.width, y + mask.height), fill=(35, 35, 44, 255))
    paste_pixel_text(image, label.upper(), font, (x, y), (247, 247, 247, 255))
    return image


def save_promo_gif(
    path: Path,
    strip: Image.Image,
    metadata: dict,
    font: ImageFont.FreeTypeFont,
) -> None:
    frames: list[Image.Image] = []
    durations: list[int] = []
    frame_data = metadata["frames"]

    for tag in metadata["meta"]["frameTags"]:
        indices = list(range(tag["from"], tag["to"] + 1))
        action_duration = sum(frame_data[index]["duration"] for index in indices)
        if tag["name"].lower() == "death":
            repeats = 1
        else:
            repeats = max(1, math.ceil(MIN_ACTION_PREVIEW_MS / action_duration))

        for _ in range(repeats):
            for index in indices:
                frames.append(promo_frame(frame_image(strip, index), tag["name"], font))
                durations.append(frame_data[index]["duration"])

        if tag["name"].lower() == "death" and action_duration < MIN_ACTION_PREVIEW_MS:
            frames.append(promo_frame(frame_image(strip, indices[-1]), tag["name"], font))
            durations.append(MIN_ACTION_PREVIEW_MS - action_duration)

    palette_source = Image.new("RGB", (PROMO_SIZE, PROMO_SIZE * len(frames)))
    for index, frame in enumerate(frames):
        palette_source.paste(frame.convert("RGB"), (0, index * PROMO_SIZE))
    palette = palette_source.quantize(
        colors=256,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    )
    paletted_frames = [
        frame.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE)
        for frame in frames
    ]
    paletted_frames[0].save(
        path,
        save_all=True,
        append_images=paletted_frames[1:],
        duration=durations,
        disposal=2,
        loop=0,
        optimize=False,
    )


def tag_frame_index(metadata: dict, tag_name: str, offset: int) -> int:
    for tag in metadata["meta"]["frameTags"]:
        if tag["name"] == tag_name:
            return min(tag["from"] + offset, tag["to"])
    raise ValueError(f"Missing tag {tag_name!r}")


def create_itch_cover(
    path: Path,
    strips: dict[str, Image.Image],
    metadata_by_unit: dict[str, dict],
    font_path: Path,
) -> None:
    cover = Image.new("RGBA", ITCH_COVER_SIZE, BACKGROUND)
    shadow = (36, 36, 46, 255)

    title_font = fit_font(font_path, "MiniFolks", 286, 29)
    title_mask = render_text_mask("MiniFolks", title_font)
    paste_pixel_text(
        cover,
        "MiniFolks",
        title_font,
        ((ITCH_COVER_SIZE[0] - title_mask.width) // 2, 13),
        (247, 247, 247, 255),
        shadow,
        (2, 2),
    )

    extra_font = fit_font(font_path, "Extra", 76, 12)
    extra_mask = render_text_mask("Extra", extra_font)
    paste_pixel_text(
        cover,
        "Extra",
        extra_font,
        (ITCH_COVER_SIZE[0] - extra_mask.width - 34, 43),
        (255, 235, 70, 255),
        shadow,
    )

    japan_font = fit_font(font_path, "JAPAN", 190, 21)
    japan_mask = render_text_mask("JAPAN", japan_font)
    paste_pixel_text(
        cover,
        "JAPAN",
        japan_font,
        ((ITCH_COVER_SIZE[0] - japan_mask.width) // 2, 61),
        (255, 86, 91, 255),
        shadow,
        (2, 2),
    )

    poses = {
        "MiniSamurai": ("idle", 0),
        "MiniRonin": ("idle", 0),
        "MiniNinja": ("idle", 0),
        "MiniYariAshigaru": ("idle", 0),
        "MiniTeppoAshigaru": ("idle", 0),
        "MiniYumiSamurai": ("idle", 0),
        "MiniHorseSamurai": ("idle", 0),
    }
    positions = {
        "MiniSamurai": (12, 94),
        "MiniRonin": (89, 94),
        "MiniNinja": (166, 94),
        "MiniYariAshigaru": (239, 94),
        "MiniTeppoAshigaru": (50, 163),
        "MiniYumiSamurai": (126, 163),
        "MiniHorseSamurai": (203, 163),
    }
    for unit in UNITS:
        tag_name, offset = poses[unit]
        index = tag_frame_index(metadata_by_unit[unit], tag_name, offset)
        sprite = frame_image(strips[unit], index).resize((64, 64), Image.Resampling.NEAREST)
        cover.alpha_composite(sprite, positions[unit])

    cover.save(path, optimize=True)


def write_manifest(path: Path, metadata_by_unit: dict[str, dict]) -> None:
    units = []
    for unit in UNITS:
        metadata = metadata_by_unit[unit]
        units.append(
            {
                "name": unit,
                "canvas": [CELL_SIZE, CELL_SIZE],
                "animations": [
                    {
                        "name": tag["name"],
                        "row": row,
                        "frames": tag["to"] - tag["from"] + 1,
                    }
                    for row, tag in enumerate(metadata["meta"]["frameTags"])
                ],
            }
        )
    path.write_text(json.dumps({"pack": "MiniFolks Extra: Japan", "units": units}, indent=2) + "\n")


def create_archives(seven_zip: Path, root: Path, package_dir: Path, aseprite_dir: Path) -> None:
    dist_dir = root / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)
    png_archive = dist_dir / "MiniFolksExtraJapan.7z"
    source_archive = dist_dir / "MiniFolksExtraJapan-Aseprite.7z"
    for archive in (png_archive, source_archive):
        archive.unlink(missing_ok=True)

    common = [str(seven_zip), "a", "-t7z", "-mx=9", "-mmt=off", "-mtm=off", "-mta=off", "-mtc=off"]
    run_checked(common + [str(png_archive), "Outline", "Without Outline", "LICENSE.txt"], cwd=package_dir)
    run_checked(common + [str(source_archive), *[f"{unit}.aseprite" for unit in UNITS], "LICENSE.txt"], cwd=aseprite_dir)


def main() -> None:
    args = parse_args()
    aseprite = require_file(args.aseprite.resolve())
    seven_zip = require_file(args.seven_zip.resolve())
    release_root = Path(__file__).resolve().parent
    pixel_globe_root = release_root.parents[1]
    source_dir = pixel_globe_root / "public" / "assets" / "minifolks"
    font_path = require_file(pixel_globe_root / "public" / "assets" / "fonts" / "dogicapixel.ttf")
    license_path = require_file(release_root / "LICENSE.txt")
    export_script = require_file(release_root / "export_strips.lua")

    package_dir = release_root / "package"
    promo_dir = release_root / "promo"
    dist_dir = release_root / "dist"
    for generated_dir in (package_dir, promo_dir, dist_dir):
        if generated_dir.exists():
            shutil.rmtree(generated_dir)
        generated_dir.mkdir(parents=True)

    outline_dir = package_dir / "Outline"
    without_outline_dir = package_dir / "Without Outline"
    aseprite_dir = package_dir / "Aseprite"
    for directory in (outline_dir, without_outline_dir, aseprite_dir):
        directory.mkdir()
    shutil.copy2(license_path, package_dir / "LICENSE.txt")
    shutil.copy2(license_path, aseprite_dir / "LICENSE.txt")

    metadata_by_unit: dict[str, dict] = {}
    outline_strips: dict[str, Image.Image] = {}
    promo_font = fit_font(font_path, "DAMAGE", 60, 9)

    with tempfile.TemporaryDirectory(prefix="minifolks-extra-") as temp:
        temp_dir = Path(temp)
        exported_metadata = export_all_strips(
            aseprite,
            export_script,
            source_dir,
            temp_dir,
        )
        for unit in UNITS:
            source = require_file(source_dir / f"{unit}.aseprite")
            metadata = exported_metadata[unit]
            outline = Image.open(temp_dir / f"{unit}-outline.png").convert("RGBA")
            without_outline = Image.open(temp_dir / f"{unit}-without-outline.png").convert("RGBA")
            if outline.size != without_outline.size:
                raise ValueError(f"Outline export size mismatch for {source.name}")
            if outline.tobytes() == without_outline.tobytes():
                raise ValueError(f"Outline layer did not change {source.name}")
            validate_metadata(source, metadata, outline)
            metadata_by_unit[unit] = metadata
            outline_strips[unit] = outline
            tags = metadata["meta"]["frameTags"]

            build_action_rows(outline, tags).save(outline_dir / f"{unit}.png", optimize=True)
            build_action_rows(without_outline, tags).save(
                without_outline_dir / f"{unit}.png", optimize=True
            )
            shutil.copy2(source, aseprite_dir / source.name)
            save_promo_gif(promo_dir / f"{unit}.gif", outline, metadata, promo_font)

    create_itch_cover(
        promo_dir / "itch-cover.png",
        outline_strips,
        metadata_by_unit,
        font_path,
    )
    write_manifest(package_dir / "manifest.json", metadata_by_unit)
    create_archives(seven_zip, release_root, package_dir, aseprite_dir)


if __name__ == "__main__":
    main()
