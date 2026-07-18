#!/usr/bin/env python3

import json
import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[4]
APP = ROOT / "apps" / "pixel-globe"
CAPTURES = APP / ".captures" / "trailer-clips-steam"
TOOL = Path(__file__).resolve().parent
WORK = APP / ".captures" / "trailer"
PLAN_PATH = TOOL / "steam-trailer-plan.json"
TEMP = WORK / "render"
OVERLAYS = TEMP / "overlays"
SEGMENTS = TEMP / "segments"
OUTPUT = WORK / "marque-and-reprisal-steam-trailer-v2.mp4"
FONT_PATH = TOOL / "assets" / "PirataOne-Regular.ttf"
TITLE_PATH = APP / "public" / "assets" / "capsule" / "detailed_title.png"
MUSIC_INTRO = APP / "public" / "assets" / "music" / "ship-theme-intro.ogg"
MUSIC_LOOP = APP / "public" / "assets" / "music" / "ship-theme-loop.ogg"
WIDTH = 1920
HEIGHT = 1080
FPS = 30


def run(command):
    print("+", " ".join(str(part) for part in command), flush=True)
    subprocess.run([str(part) for part in command], check=True)


def require_file(path):
    if not path.is_file():
        raise FileNotFoundError(f"Required trailer asset is missing: {path}")


def text_center(draw, text, font, center, shadow_offset=(14, 18)):
    shadow = (20, 12, 9, 245)
    white = (255, 252, 238, 255)
    x, y = center
    draw.text(
        (x + shadow_offset[0], y + shadow_offset[1]),
        text,
        font=font,
        fill=shadow,
        anchor="mm",
    )
    draw.text((x, y), text, font=font, fill=white, anchor="mm")


def make_heading_overlay(heading):
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = ImageFont.truetype(str(FONT_PATH), 220)
    text_center(draw, heading, font, (WIDTH // 2, HEIGHT // 4))
    path = OVERLAYS / f"heading-{heading.lower()}.png"
    overlay.save(path)
    return path


def shadowed_image(image):
    alpha = image.getchannel("A")
    blurred = alpha.filter(ImageFilter.GaussianBlur(5))
    shadow_alpha = blurred.point(lambda value: min(240, int(value * 0.95)))
    shadow = Image.new("RGBA", image.size, (20, 12, 9, 0))
    shadow.putalpha(shadow_alpha)
    return shadow


def make_outro_overlay():
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    title = Image.open(TITLE_PATH).convert("RGBA")
    bounds = title.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError(f"Capsule title has no opaque pixels: {TITLE_PATH}")
    title = title.crop(bounds)
    target_width = 1200
    target_height = round(title.height * target_width / title.width)
    title = title.resize((target_width, target_height), Image.Resampling.LANCZOS)

    subtitle_font = ImageFont.truetype(str(FONT_PATH), 136)
    subtitle = "Wishlist on Steam"
    probe = ImageDraw.Draw(overlay)
    subtitle_bounds = probe.textbbox((0, 0), subtitle, font=subtitle_font, anchor="lt")
    subtitle_height = subtitle_bounds[3] - subtitle_bounds[1]
    gap = 54
    group_height = title.height + gap + subtitle_height
    title_x = (WIDTH - title.width) // 2
    title_y = (HEIGHT - group_height) // 2

    overlay.alpha_composite(shadowed_image(title), (title_x + 10, title_y + 12))
    overlay.alpha_composite(title, (title_x, title_y))
    draw = ImageDraw.Draw(overlay)
    text_center(
        draw,
        subtitle,
        subtitle_font,
        (WIDTH // 2, title_y + title.height + gap + subtitle_height // 2),
        shadow_offset=(12, 16),
    )
    path = OVERLAYS / "outro-title.png"
    overlay.save(path)
    return path


def render_segment(
    source,
    start,
    duration,
    overlay,
    output,
    fade_overlay=False,
):
    require_file(source)
    require_file(overlay)
    overlay_filter = "[1:v]format=rgba"
    if fade_overlay:
        overlay_filter += ",fade=t=in:st=0:d=0.65:alpha=1"
    overlay_filter += "[overlay]"
    trim_filter = (
        f"[0:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS,"
        f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=neighbor,setsar=1[base]"
    )
    filters = (
        f"{trim_filter};"
        f"{overlay_filter};"
        "[base][overlay]overlay=0:0:shortest=1:format=auto,format=yuv420p[video];"
        f"[0:a]atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS,"
        "aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[audio]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", source,
        "-loop", "1", "-framerate", str(FPS), "-i", overlay,
        "-filter_complex", filters,
        "-map", "[video]", "-map", "[audio]",
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-tune", "animation",
        "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2",
        output,
    ])


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


def main():
    for required in (PLAN_PATH, FONT_PATH, TITLE_PATH, MUSIC_INTRO, MUSIC_LOOP):
        require_file(required)

    plan = json.loads(PLAN_PATH.read_text())
    chapters = plan.get("chapters")
    if not isinstance(chapters, list) or len(chapters) != 8:
        raise RuntimeError("Trailer plan must define exactly eight chapters")
    if any(len(chapter.get("clips", [])) < 2 for chapter in chapters):
        raise RuntimeError("Every trailer chapter requires at least two clips")

    shutil.rmtree(TEMP, ignore_errors=True)
    OVERLAYS.mkdir(parents=True)
    SEGMENTS.mkdir(parents=True)
    outro_seconds = float(plan["outroSeconds"])
    segment_paths = []
    edit = {"chapters": [], "outro": {}, "music": "ship-theme", "output": str(OUTPUT)}

    segment_index = 0
    for chapter in chapters:
        heading = chapter["heading"]
        heading_overlay = make_heading_overlay(heading)
        edit_chapter = {"heading": heading, "clips": []}
        for clip in chapter["clips"]:
            source = CAPTURES / clip["source"]
            start = float(clip["start"])
            duration = float(clip["duration"])
            if duration < 2:
                raise RuntimeError(f"Trailer clips must remain readable for at least 2 seconds: {source}")
            source_duration = probe_duration(source)
            if start < 0 or start + duration > source_duration + 0.04:
                raise RuntimeError(
                    f"Clip window exceeds source: {source} starts {start}s for {duration}s "
                    f"but source is {source_duration}s"
                )
            segment_path = SEGMENTS / f"{segment_index:02d}-{heading.lower()}.mkv"
            render_segment(
                source,
                start,
                duration,
                heading_overlay,
                segment_path,
            )
            segment_paths.append(segment_path)
            edit_chapter["clips"].append({
                "source": str(source),
                "start": start,
                "duration": duration,
            })
            segment_index += 1
        edit["chapters"].append(edit_chapter)

    outro = plan["outro"]
    outro_source = CAPTURES / outro["source"]
    outro_start = float(outro["start"])
    if outro_start + outro_seconds > probe_duration(outro_source) + 0.04:
        raise RuntimeError("Outro window exceeds its source clip")
    outro_path = SEGMENTS / f"{segment_index:02d}-outro.mkv"
    render_segment(
        outro_source,
        outro_start,
        outro_seconds,
        make_outro_overlay(),
        outro_path,
        fade_overlay=True,
    )
    segment_paths.append(outro_path)
    edit["outro"] = {
        "source": str(outro_source),
        "start": outro_start,
        "duration": outro_seconds,
    }

    concat_path = TEMP / "segments.txt"
    concat_path.write_text("".join(f"file '{path.resolve()}'\n" for path in segment_paths))
    gameplay_path = TEMP / "gameplay.mkv"
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_path,
        "-c", "copy", gameplay_path,
    ])

    expected_duration = sum(
        sum(float(clip["duration"]) for clip in chapter["clips"])
        for chapter in chapters
    ) + outro_seconds
    actual_duration = probe_duration(gameplay_path)
    if not math.isclose(actual_duration, expected_duration, abs_tol=0.2):
        raise RuntimeError(
            f"Concatenated trailer is {actual_duration:.3f}s; expected {expected_duration:.3f}s"
        )

    music_path = TEMP / "music.wav"
    music_fade_start = max(0.0, expected_duration - 4.0)
    music_filters = (
        "[0:a]aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[intro];"
        "[1:a]aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[loop];"
        f"[intro][loop]concat=n=2:v=0:a=1,atrim=duration={expected_duration},"
        f"asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.3,"
        f"afade=t=out:st={music_fade_start}:d=4,volume=0.52[music]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", MUSIC_INTRO,
        "-stream_loop", "-1", "-i", MUSIC_LOOP,
        "-filter_complex", music_filters,
        "-map", "[music]", "-t", str(expected_duration),
        "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", music_path,
    ])

    final_filters = (
        f"[0:a]aresample=48000,volume=0.82,"
        f"afade=t=out:st={expected_duration - 1.5}:d=1.5[game];"
        "[1:a]aresample=48000[music];"
        "[game][music]amix=inputs=2:duration=first:dropout_transition=0,"
        "alimiter=limit=0.92,loudnorm=I=-14:TP=-1.5:LRA=9[audio]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", gameplay_path, "-i", music_path,
        "-filter_complex", final_filters,
        "-map", "0:v:0", "-map", "[audio]",
        "-c:v", "libx264", "-preset", "slow", "-tune", "animation",
        "-b:v", "10M", "-minrate", "10M", "-maxrate", "10M", "-bufsize", "20M",
        "-x264-params", "nal-hrd=cbr:force-cfr=1",
        "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", "-t", str(expected_duration), OUTPUT,
    ])

    final_duration = probe_duration(OUTPUT)
    if not math.isclose(final_duration, expected_duration, abs_tol=0.08):
        raise RuntimeError(
            f"Final trailer is {final_duration:.3f}s; expected {expected_duration:.3f}s"
        )
    edit["durationSeconds"] = final_duration
    (WORK / "marque-and-reprisal-steam-trailer-v2.edit.json").write_text(
        json.dumps(edit, indent=2) + "\n"
    )
    print(f"Rendered {OUTPUT} ({final_duration:.2f}s)")


if __name__ == "__main__":
    main()
