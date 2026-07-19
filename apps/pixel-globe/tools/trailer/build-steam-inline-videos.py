#!/usr/bin/env python3

import json
import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from trailer_support import draw_shadowed_text, probe_duration, require_file, run


ROOT = Path(__file__).resolve().parents[4]
APP = ROOT / "apps" / "pixel-globe"
CAPTURES = APP / ".captures" / "trailer-clips-steam"
TOOL = Path(__file__).resolve().parent
PLAN_PATH = TOOL / "steam-inline-video-plan.json"
OUTPUT = APP / ".captures" / "steam-inline-videos"
OVERLAYS = OUTPUT / "overlays"
FONT_PATH = TOOL / "assets" / "PirataOne-Regular.ttf"
EXPECTED_HEADINGS = (
    "Explore",
    "Trade",
    "Fish",
    "Whale",
    "Colonize",
    "Fight",
    "Pillage",
    "Survive",
)
SOURCE_WIDTH = 480
SOURCE_HEIGHT = 270
FPS = 30
USER_MAX_ANIMATION_SECONDS = 10


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


def make_heading_overlay(heading, width, height):
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    font = ImageFont.truetype(str(FONT_PATH), 154)
    position = (44, height // 2)
    bounds = ImageDraw.Draw(overlay).textbbox(position, heading, font=font, anchor="lm")
    if bounds[0] < 0 or bounds[1] < 0 or bounds[2] > width or bounds[3] > height:
        raise RuntimeError(f"Steam inline heading does not fit its canvas: {heading}")
    draw_shadowed_text(
        overlay,
        heading,
        font,
        position,
        anchor="lm",
        shadow_offset=(8, 10),
        shadow_blur=8,
    )
    path = OVERLAYS / f"{heading.lower()}.png"
    overlay.save(path)
    return path


def render_clip(spec, dimensions, crop):
    heading = spec["heading"]
    output_path = OUTPUT / spec["output"]
    segments = spec["segments"]
    total_duration = sum(float(segment["duration"]) for segment in segments)
    if not 0 < total_duration < USER_MAX_ANIMATION_SECONDS:
        raise RuntimeError(
            f"Steam inline video must be under {USER_MAX_ANIMATION_SECONDS}s: "
            f"{heading} is {total_duration}s"
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

    overlay = make_heading_overlay(heading, dimensions["width"], dimensions["height"])
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
    return output_path, int(probe["format"]["size"]), duration


def main():
    require_file(PLAN_PATH)
    require_file(FONT_PATH)
    plan = json.loads(PLAN_PATH.read_text())
    dimensions = {"width": int(plan["width"]), "height": int(plan["height"])}
    crop = {key: int(value) for key, value in plan["sourceCrop"].items()}
    if dimensions != {"width": 1170, "height": 270}:
        raise RuntimeError("Steam inline output must remain 1170x270")
    if crop != {"x": 45, "y": 90, "width": 390, "height": 90}:
        raise RuntimeError("Steam inline crop must remain the pixel-perfect middle band")

    specs = plan.get("clips")
    if not isinstance(specs, list) or tuple(spec.get("heading") for spec in specs) != EXPECTED_HEADINGS:
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
    rendered = [render_clip(spec, dimensions, crop) for spec in specs]
    total_size = sum(size for _, size, _ in rendered)
    manifest = {
        "width": dimensions["width"],
        "height": dimensions["height"],
        "format": "VP9 WebM, silent, BT.709",
        "files": [
            {"path": path.name, "bytes": size, "durationSeconds": duration}
            for path, size, duration in rendered
        ],
        "totalBytes": total_size,
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Rendered {len(rendered)} Steam inline videos ({total_size / 1024 / 1024:.1f} MB total)")


if __name__ == "__main__":
    main()
