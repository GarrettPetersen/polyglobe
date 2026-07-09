#!/usr/bin/env python3
"""Headless Retro Diffusion-style palettizer.

This mirrors the extension's non-dithered palettize path: convert source colors
and target palette colors into Oklab, initialize a small SOM with the palette,
train it against the source image, snap the trained nodes back to palette
entries, then recolor the source with exact palette RGB values.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
from minisom import MiniSom
from PIL import Image


DEFAULT_ALPHA_THRESHOLD = 10
DEFAULT_ITERATIONS = 71


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Source PNG to palettize.")
    parser.add_argument("--palette", required=True, type=Path, help="Target palette: .hex text or image file.")
    parser.add_argument("--output", required=True, type=Path, help="Output PNG path.")
    parser.add_argument("--preview", type=Path, help="Optional side-by-side preview PNG.")
    parser.add_argument("--iterations", type=int, default=DEFAULT_ITERATIONS, help="SOM training iterations.")
    parser.add_argument("--alpha-threshold", type=int, default=DEFAULT_ALPHA_THRESHOLD, help="Visible alpha cutoff.")
    parser.add_argument("--preview-scale", type=int, default=8, help="Nearest-neighbor preview scale.")
    return parser.parse_args()


def read_palette(path: Path) -> np.ndarray:
    if not path.exists():
        raise FileNotFoundError(f"Palette file does not exist: {path}")

    if path.suffix.lower() in {".hex", ".txt"}:
        colors: list[tuple[int, int, int]] = []
        for line_no, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            line = raw_line.strip()
            if not line or line.startswith(";"):
                continue
            if line.startswith("#"):
                line = line[1:]
            if len(line) == 8:
                line = line[2:]
            if len(line) != 6:
                raise ValueError(f"Bad palette line {line_no} in {path}: {raw_line!r}")
            try:
                colors.append(tuple(int(line[i : i + 2], 16) for i in (0, 2, 4)))
            except ValueError as exc:
                raise ValueError(f"Bad palette hex on line {line_no} in {path}: {raw_line!r}") from exc
        if not colors:
            raise ValueError(f"Palette has no colors: {path}")
        return unique_rows(np.array(colors, dtype=np.uint8))

    image = Image.open(path).convert("RGBA")
    pixels = np.array(image, dtype=np.uint8).reshape(-1, 4)
    visible = pixels[pixels[:, 3] >= DEFAULT_ALPHA_THRESHOLD][:, :3]
    if visible.size == 0:
        raise ValueError(f"Palette image has no visible colors: {path}")
    return unique_rows(visible)


def unique_rows(values: np.ndarray) -> np.ndarray:
    unique = np.unique(values.reshape(-1, values.shape[-1]), axis=0)
    if len(unique) > 256:
        raise ValueError(f"Palette has {len(unique)} colors; expected 256 or fewer.")
    return unique.astype(np.uint8)


def srgb_to_oklab(rgb: np.ndarray) -> np.ndarray:
    srgb = rgb.astype(np.float64) / 255.0
    linear = np.where(
        srgb <= 0.04045,
        srgb / 12.92,
        np.power((srgb + 0.055) / 1.055, 2.4),
    )

    r = linear[..., 0]
    g = linear[..., 1]
    b = linear[..., 2]

    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

    l_ = np.cbrt(l)
    m_ = np.cbrt(m)
    s_ = np.cbrt(s)

    return np.stack(
        [
            0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
            1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
            0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
        ],
        axis=-1,
    )


def determine_som_grid(color_count: int) -> tuple[int, int]:
    if color_count <= 0:
        raise ValueError("Palette must contain at least one color.")
    rows = int(math.floor(math.sqrt(color_count))) or 1
    cols = int(math.ceil(color_count / rows))
    return rows, cols


def palettize(image: Image.Image, palette_rgb: np.ndarray, iterations: int, alpha_threshold: int) -> Image.Image:
    source = image.convert("RGBA")
    source_rgba = np.array(source, dtype=np.uint8)
    visible_mask = source_rgba[..., 3] >= alpha_threshold
    visible_rgb = source_rgba[..., :3][visible_mask]

    if visible_rgb.size == 0:
        raise ValueError("Input image has no visible pixels to palettize.")

    source_oklab = srgb_to_oklab(visible_rgb)
    palette_oklab = srgb_to_oklab(palette_rgb)
    rows, cols = determine_som_grid(len(palette_oklab))
    node_count = rows * cols

    init_weights = np.zeros((rows, cols, 3), dtype=np.float64)
    for index in range(node_count):
        init_weights[index // cols, index % cols] = palette_oklab[index % len(palette_oklab)]

    som = MiniSom(rows, cols, 3, sigma=0.22, learning_rate=0.2, random_seed=42)
    som._weights = init_weights.copy()
    som.train_random(source_oklab, iterations)

    trained = som._weights.reshape(node_count, 3)
    snapped_palette_indexes = nearest_indexes(trained, palette_oklab)
    node_indexes = nearest_indexes(source_oklab, trained)
    recolored_rgb = palette_rgb[snapped_palette_indexes[node_indexes]]

    result = source_rgba.copy()
    result[..., :3][visible_mask] = recolored_rgb
    result[..., :3][~visible_mask] = 0
    return Image.fromarray(result, mode="RGBA")


def nearest_indexes(values: np.ndarray, candidates: np.ndarray) -> np.ndarray:
    distances = np.sum((values[:, None, :] - candidates[None, :, :]) ** 2, axis=2)
    return np.argmin(distances, axis=1)


def make_preview(original: Image.Image, converted: Image.Image, output: Path, scale: int) -> None:
    if scale <= 0:
        raise ValueError("--preview-scale must be positive.")

    gap = max(2, original.width // 6)
    canvas = Image.new("RGBA", (original.width * 2 + gap, max(original.height, converted.height)), (0, 0, 0, 0))
    paste_with_checker(canvas, original.convert("RGBA"), (0, 0))
    paste_with_checker(canvas, converted.convert("RGBA"), (original.width + gap, 0))
    preview = canvas.resize((canvas.width * scale, canvas.height * scale), Image.Resampling.NEAREST)
    output.parent.mkdir(parents=True, exist_ok=True)
    preview.save(output)


def paste_with_checker(canvas: Image.Image, image: Image.Image, xy: tuple[int, int]) -> None:
    checker = Image.new("RGBA", image.size, (0, 0, 0, 0))
    pixels = checker.load()
    for y in range(image.height):
        for x in range(image.width):
            shade = 54 if ((x // 4) + (y // 4)) % 2 == 0 else 86
            pixels[x, y] = (shade, shade, shade, 255)
    canvas.alpha_composite(checker, xy)
    canvas.alpha_composite(image, xy)


def main() -> None:
    args = parse_args()
    if args.iterations <= 0:
        raise ValueError("--iterations must be positive.")
    if not args.input.exists():
        raise FileNotFoundError(f"Input image does not exist: {args.input}")

    source = Image.open(args.input).convert("RGBA")
    palette = read_palette(args.palette)
    converted = palettize(source, palette, args.iterations, args.alpha_threshold)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    converted.save(args.output)

    if args.preview:
        make_preview(source, converted, args.preview, args.preview_scale)

    print(args.output)
    if args.preview:
        print(args.preview)


if __name__ == "__main__":
    main()
