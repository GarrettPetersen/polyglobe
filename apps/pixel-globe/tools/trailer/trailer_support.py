import subprocess

from PIL import Image, ImageDraw, ImageFilter


def run(command):
    print("+", " ".join(str(part) for part in command), flush=True)
    subprocess.run([str(part) for part in command], check=True)


def require_file(path):
    if not path.is_file():
        raise FileNotFoundError(f"Required trailer asset is missing: {path}")


def probe_duration(path):
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=nw=1:nk=1", str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def draw_shadowed_text(
    image,
    text,
    font,
    position,
    *,
    anchor="mm",
    shadow_offset=(10, 12),
    shadow_blur=10,
):
    shadow = (20, 12, 9, 225)
    white = (255, 252, 238, 255)
    x, y = position
    shadow_mask = Image.new("L", image.size, 0)
    shadow_draw = ImageDraw.Draw(shadow_mask)
    shadow_draw.text(
        (x + shadow_offset[0], y + shadow_offset[1]),
        text,
        font=font,
        fill=shadow[3],
        anchor=anchor,
    )
    blurred_mask = shadow_mask.filter(ImageFilter.GaussianBlur(shadow_blur))
    shadow_layer = Image.new("RGBA", image.size, shadow[:3] + (0,))
    shadow_layer.putalpha(blurred_mask)
    image.alpha_composite(shadow_layer)
    draw = ImageDraw.Draw(image)
    draw.text(position, text, font=font, fill=white, anchor=anchor)
