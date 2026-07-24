#!/usr/bin/env python3

from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[4]
APP = ROOT / "apps" / "pixel-globe"
SITE = ROOT / "apps" / "marque-and-reprisal-site"
BACKGROUND_PATH = (
    SITE
    / "src"
    / "assets"
    / "press"
    / "screenshots"
    / "03-fish-the-reef.png"
)
TITLE_PATH = APP / "capsule_art" / "generated" / "capsule_title_english.png"
OUTPUT_DIR = APP / ".captures" / "trailer"
MASTER_OUTPUT = OUTPUT_DIR / "marque-and-reprisal-gameplay-trailer-thumbnail.png"
UPLOAD_OUTPUT = OUTPUT_DIR / "marque-and-reprisal-gameplay-trailer-thumbnail.jpg"

WIDTH = 1920
HEIGHT = 1080
GAMEPLAY_UI_RECTS = (
    (18, 18, 716, 231),  # Ship status.
    (1793, 18, 1902, 126),  # Menu button.
    (556, 306, 1366, 362),  # Active action message.
    (645, 946, 1273, 1062),  # Action prompt.
    (1574, 949, 1906, 1066),  # Minimap.
)


def require_image(path):
    if not path.is_file():
        raise FileNotFoundError(f"Missing thumbnail source image: {path}")
    return Image.open(path)


def fit_canvas(image):
    if image.size == (WIDTH, HEIGHT):
        return image.copy()
    source_ratio = image.width / image.height
    target_ratio = WIDTH / HEIGHT
    if source_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        image = image.crop((left, 0, left + crop_width, image.height))
    else:
        crop_height = round(image.width / target_ratio)
        top = (image.height - crop_height) // 2
        image = image.crop((0, top, image.width, top + crop_height))
    return image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def lower_left_scrim():
    horizontal_mask = Image.new("L", (WIDTH, 1))
    horizontal_values = []
    for x in range(WIDTH):
        if x <= 480:
            alpha = 178
        elif x < 1260:
            alpha = round(178 * (1260 - x) / 780)
        else:
            alpha = 0
        horizontal_values.append(alpha)
    horizontal_mask.putdata(horizontal_values)
    horizontal_mask = horizontal_mask.resize((WIDTH, HEIGHT))

    vertical_mask = Image.new("L", (1, HEIGHT))
    vertical_values = []
    for y in range(HEIGHT):
        if y <= 400:
            alpha = 0
        elif y < 560:
            alpha = round(255 * (y - 400) / 160)
        else:
            alpha = 255
        vertical_values.append(alpha)
    vertical_mask.putdata(vertical_values)
    vertical_mask = vertical_mask.resize((WIDTH, HEIGHT))

    mask = ImageChops.multiply(horizontal_mask, vertical_mask)
    scrim = Image.new("RGBA", (WIDTH, HEIGHT), (15, 13, 24, 255))
    scrim.putalpha(mask)
    return scrim


def prepare_title():
    title = require_image(TITLE_PATH).convert("RGBA")
    bounds = title.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError(f"Title image has no opaque pixels: {TITLE_PATH}")
    title = title.crop(bounds)
    target_width = 700
    target_height = round(title.height * target_width / title.width)
    return title.resize((target_width, target_height), Image.Resampling.LANCZOS)


def add_title(canvas):
    title = prepare_title()
    x = 54
    y = 585

    alpha = title.getchannel("A")
    shadow_alpha = alpha.filter(ImageFilter.GaussianBlur(18))
    shadow_alpha = shadow_alpha.point(lambda value: round(value * 0.88))
    shadow = Image.new("RGBA", title.size, (5, 4, 10, 0))
    shadow.putalpha(shadow_alpha)
    canvas.alpha_composite(shadow, (x + 12, y + 18))
    canvas.alpha_composite(title, (x, y))


def restore_gameplay_ui(canvas, source):
    for bounds in GAMEPLAY_UI_RECTS:
        canvas.paste(source.crop(bounds), bounds[:2])


def verify_gameplay_ui(canvas, source):
    for bounds in GAMEPLAY_UI_RECTS:
        source_region = source.crop(bounds)
        output_region = canvas.crop(bounds).convert("RGB")
        if ImageChops.difference(source_region, output_region).getbbox():
            raise RuntimeError(f"Thumbnail altered gameplay UI within {bounds}")


def build_thumbnail():
    background = fit_canvas(require_image(BACKGROUND_PATH).convert("RGB"))

    canvas = background.convert("RGBA")
    canvas.alpha_composite(lower_left_scrim())
    add_title(canvas)
    restore_gameplay_ui(canvas, background)
    verify_gameplay_ui(canvas, background)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    canvas.save(MASTER_OUTPUT, optimize=True)
    canvas.convert("RGB").save(
        UPLOAD_OUTPUT,
        quality=92,
        optimize=True,
        progressive=True,
        subsampling=0,
    )

    with Image.open(MASTER_OUTPUT) as master:
        if master.size != (WIDTH, HEIGHT):
            raise RuntimeError(f"Unexpected master thumbnail size: {master.size}")
    if UPLOAD_OUTPUT.stat().st_size >= 2_000_000:
        raise RuntimeError(
            f"Upload thumbnail exceeds 2 MB: {UPLOAD_OUTPUT.stat().st_size} bytes"
        )

    print(MASTER_OUTPUT)
    print(UPLOAD_OUTPUT)


if __name__ == "__main__":
    build_thumbnail()
