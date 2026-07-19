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
OUTPUT = WORK / "marque-and-reprisal-steam-trailer-v4.mp4"
FONT_PATH = TOOL / "assets" / "PirataOne-Regular.ttf"
TITLE_PATH = APP / "public" / "assets" / "capsule" / "detailed_title.png"
SAILING_MUSIC_INTRO = APP / "public" / "assets" / "music" / "ship-theme-intro.ogg"
SAILING_MUSIC_LOOP = APP / "public" / "assets" / "music" / "ship-theme-loop.ogg"
COMBAT_MUSIC_INTRO = APP / "public" / "assets" / "music" / "combat-theme-intro.ogg"
COMBAT_MUSIC_LOOP = APP / "public" / "assets" / "music" / "combat-theme-loop.ogg"
WIDTH = 1920
HEIGHT = 1080
FPS = 30
HEADING_CENTER_Y = round(HEIGHT * 2 / 3)
HEADING_ENTER_SECONDS = 0.8
HEADING_EXIT_SECONDS = 0.8
HEADING_CRUISE_SPEED_PX_PER_SECOND = 28
MUSIC_CROSSFADE_SECONDS = 1.6
OUTRO_BLUR_SECONDS = 1.1
OUTRO_TITLE_START_SECONDS = 0.25


def run(command):
    print("+", " ".join(str(part) for part in command), flush=True)
    subprocess.run([str(part) for part in command], check=True)


def require_file(path):
    if not path.is_file():
        raise FileNotFoundError(f"Required trailer asset is missing: {path}")


def draw_centered_text(image, text, font, center, shadow_offset=(10, 12), shadow_blur=10):
    shadow = (20, 12, 9, 225)
    white = (255, 252, 238, 255)
    x, y = center
    shadow_mask = Image.new("L", image.size, 0)
    shadow_draw = ImageDraw.Draw(shadow_mask)
    shadow_draw.text(
        (x + shadow_offset[0], y + shadow_offset[1]),
        text,
        font=font,
        fill=shadow[3],
        anchor="mm",
    )
    blurred_mask = shadow_mask.filter(ImageFilter.GaussianBlur(shadow_blur))
    shadow_layer = Image.new("RGBA", image.size, shadow[:3] + (0,))
    shadow_layer.putalpha(blurred_mask)
    image.alpha_composite(shadow_layer)
    draw = ImageDraw.Draw(image)
    draw.text((x, y), text, font=font, fill=white, anchor="mm")


def make_heading_sprite(heading):
    overlay = Image.new("RGBA", (WIDTH, 360), (0, 0, 0, 0))
    font = ImageFont.truetype(str(FONT_PATH), 220)
    draw_centered_text(overlay, heading, font, (WIDTH // 2, overlay.height // 2))
    bounds = overlay.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError(f"Trailer heading has no opaque pixels: {heading}")
    overlay = overlay.crop(bounds)
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


def make_outro_sprite():
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
    draw_centered_text(
        overlay,
        subtitle,
        subtitle_font,
        (WIDTH // 2, title_y + title.height + gap + subtitle_height // 2),
        shadow_offset=(9, 11),
        shadow_blur=9,
    )
    bounds = overlay.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError("Trailer outro has no opaque pixels")
    overlay = overlay.crop(bounds)
    path = OVERLAYS / "outro-title.png"
    overlay.save(path)
    return path


def render_segment(
    source,
    start,
    duration,
    overlay,
    output,
    heading_timeline=None,
):
    require_file(source)
    require_file(overlay)
    overlay_filter = "[1:v]format=rgba"
    overlay_options = "x=0:y=0"
    if heading_timeline is not None:
        chapter_seconds, chapter_offset = heading_timeline
        if chapter_seconds <= HEADING_ENTER_SECONDS + HEADING_EXIT_SECONDS:
            raise RuntimeError(f"Chapter is too short for heading motion: {chapter_seconds}")
        global_time = f"(t+{chapter_offset})"
        exit_start = chapter_seconds - HEADING_EXIT_SECONDS
        middle_seconds = chapter_seconds - HEADING_ENTER_SECONDS - HEADING_EXIT_SECONDS
        middle_drift = HEADING_CRUISE_SPEED_PX_PER_SECOND * middle_seconds
        scale = (
            f"if(lt({global_time},{HEADING_ENTER_SECONDS}),"
            f"0.65+0.35*(0.08*({global_time}/{HEADING_ENTER_SECONDS})+"
            f"0.92*(1-pow(1-{global_time}/{HEADING_ENTER_SECONDS},3))),"
            f"if(gt({global_time},{exit_start}),"
            f"1+0.35*(0.08*(({global_time}-{exit_start})/{HEADING_EXIT_SECONDS})+"
            f"0.92*pow(({global_time}-{exit_start})/{HEADING_EXIT_SECONDS},3)),1))"
        )
        scale_width = f"max(2,trunc(iw*({scale})/2)*2)"
        scale_height = f"max(2,trunc(ih*({scale})/2)*2)"
        overlay_filter += (
            f",scale=w='{escape_filter_expression(scale_width)}':"
            f"h='{escape_filter_expression(scale_height)}':eval=frame"
        )
        centered_x = "(main_w-overlay_w)/2"
        middle_start_x = f"({centered_x}-{middle_drift / 2})"
        middle_end_x = f"({centered_x}+{middle_drift / 2})"
        enter_u = f"({global_time}/{HEADING_ENTER_SECONDS})"
        enter_distance = f"({middle_start_x}+overlay_w)"
        enter_min_rate = (
            f"({HEADING_CRUISE_SPEED_PX_PER_SECOND}*{HEADING_ENTER_SECONDS}/{enter_distance})"
        )
        enter_ease = (
            f"({enter_min_rate}*{enter_u}+(1-{enter_min_rate})*(1-pow(1-{enter_u},3)))"
        )
        middle_u = f"(({global_time}-{HEADING_ENTER_SECONDS})/{middle_seconds})"
        exit_u = f"(({global_time}-{exit_start})/{HEADING_EXIT_SECONDS})"
        exit_distance = f"(main_w-{middle_end_x})"
        exit_min_rate = (
            f"({HEADING_CRUISE_SPEED_PX_PER_SECOND}*{HEADING_EXIT_SECONDS}/{exit_distance})"
        )
        exit_ease = f"({exit_min_rate}*{exit_u}+(1-{exit_min_rate})*pow({exit_u},3))"
        x_position = (
            f"if(lt({global_time},{HEADING_ENTER_SECONDS}),"
            f"-overlay_w+{enter_distance}*{enter_ease},"
            f"if(gt({global_time},{exit_start}),"
            f"{middle_end_x}+(main_w-{middle_end_x})*{exit_ease},"
            f"{middle_start_x}+{middle_drift}*{middle_u}))"
        )
        overlay_options = (
            f"x='{escape_filter_expression(x_position)}':"
            f"y='{HEADING_CENTER_Y}-overlay_h/2'"
        )
    overlay_filter += "[overlay]"
    trim_filter = (
        f"[0:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS,"
        f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=neighbor,setsar=1[base]"
    )
    filters = (
        f"{trim_filter};"
        f"{overlay_filter};"
        f"[base][overlay]overlay={overlay_options}:shortest=1:format=auto,"
        "format=yuv420p[video];"
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


def render_outro_hold(source, frame_time, duration, overlay, output):
    require_file(source)
    require_file(overlay)
    frame_duration = 1 / FPS
    blur_mix = f"min(T/{OUTRO_BLUR_SECONDS},1)"
    blend_expression = f"A*(1-{blur_mix})+B*{blur_mix}"
    pop_time = f"(t-{OUTRO_TITLE_START_SECONDS})"
    title_scale = (
        f"if(lt(t,{OUTRO_TITLE_START_SECONDS}),0.2,"
        f"1-0.8*exp(-4*{pop_time})*cos(9*{pop_time}))"
    )
    scale_width = f"max(2,trunc(iw*({title_scale})/2)*2)"
    scale_height = f"max(2,trunc(ih*({title_scale})/2)*2)"
    filters = (
        f"[0:v]trim=start={frame_time}:duration={frame_duration},setpts=PTS-STARTPTS,"
        f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=neighbor,setsar=1,"
        f"tpad=stop_mode=clone:stop_duration={duration},trim=duration={duration}[hold];"
        "[hold]split=2[sharp][blur-source];"
        "[blur-source]gblur=sigma=18:steps=3[blurred];"
        f"[sharp][blurred]blend=all_expr='{escape_filter_expression(blend_expression)}'[base];"
        "[1:v]format=rgba,"
        f"scale=w='{escape_filter_expression(scale_width)}':"
        f"h='{escape_filter_expression(scale_height)}':eval=frame[overlay];"
        "[base][overlay]overlay=x='(main_w-overlay_w)/2':y='(main_h-overlay_h)/2':"
        f"enable='gte(t,{OUTRO_TITLE_START_SECONDS})':shortest=1:format=auto,"
        "format=yuv420p[video];"
        f"[2:a]atrim=duration={duration},asetpts=PTS-STARTPTS,"
        "aformat=sample_fmts=s16:channel_layouts=stereo[audio]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", source,
        "-loop", "1", "-framerate", str(FPS), "-i", overlay,
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-filter_complex", filters,
        "-map", "[video]", "-map", "[audio]",
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-tune", "animation",
        "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2",
        output,
    ])


def escape_filter_expression(value):
    return value.replace(",", "\\,")


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
    for required in (
        PLAN_PATH,
        FONT_PATH,
        TITLE_PATH,
        SAILING_MUSIC_INTRO,
        SAILING_MUSIC_LOOP,
        COMBAT_MUSIC_INTRO,
        COMBAT_MUSIC_LOOP,
    ):
        require_file(required)

    plan = json.loads(PLAN_PATH.read_text())
    chapters = plan.get("chapters")
    if not isinstance(chapters, list) or len(chapters) != 8:
        raise RuntimeError("Trailer plan must define exactly eight chapters")
    if any(len(chapter.get("clips", [])) < 2 for chapter in chapters):
        raise RuntimeError("Every trailer chapter requires at least two clips")
    fight_indices = [index for index, chapter in enumerate(chapters) if chapter.get("heading") == "Fight"]
    if len(fight_indices) != 1:
        raise RuntimeError("Trailer plan must define exactly one Fight chapter")
    fight_index = fight_indices[0]
    if fight_index == 0 or chapters[fight_index - 1].get("heading") != "Colonize":
        raise RuntimeError("Colonize must immediately precede Fight")
    chapter_durations = [
        sum(float(clip["duration"]) for clip in chapter["clips"])
        for chapter in chapters
    ]
    fight_start_seconds = sum(chapter_durations[:fight_index])

    shutil.rmtree(TEMP, ignore_errors=True)
    OVERLAYS.mkdir(parents=True)
    SEGMENTS.mkdir(parents=True)
    outro_seconds = float(plan["outroSeconds"])
    segment_paths = []
    edit = {
        "chapters": [],
        "outro": {},
        "music": {
            "beforeFight": "ship-theme",
            "fromFight": "combat-theme",
            "crossfadeSeconds": MUSIC_CROSSFADE_SECONDS,
            "fightStartSeconds": fight_start_seconds,
        },
        "output": str(OUTPUT),
    }

    segment_index = 0
    final_source = None
    final_source_end = None
    for chapter in chapters:
        heading = chapter["heading"]
        heading_overlay = make_heading_sprite(heading)
        chapter_seconds = sum(float(clip["duration"]) for clip in chapter["clips"])
        chapter_offset = 0.0
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
                heading_timeline=(chapter_seconds, chapter_offset),
            )
            segment_paths.append(segment_path)
            final_source = source
            final_source_end = start + duration
            edit_chapter["clips"].append({
                "source": str(source),
                "start": start,
                "duration": duration,
            })
            segment_index += 1
            chapter_offset += duration
        edit["chapters"].append(edit_chapter)

    if final_source is None or final_source_end is None:
        raise RuntimeError("Trailer has no final frame for its outro")
    final_source_duration = probe_duration(final_source)
    if final_source_end > final_source_duration + 0.04:
        raise RuntimeError("Final trailer clip exceeds its source")
    final_frame_time = max(0, final_source_end - 1 / FPS)
    outro_path = SEGMENTS / f"{segment_index:02d}-outro.mkv"
    render_outro_hold(
        final_source,
        final_frame_time,
        outro_seconds,
        make_outro_sprite(),
        outro_path,
    )
    segment_paths.append(outro_path)
    edit["outro"] = {
        "source": str(final_source),
        "heldFrameTime": final_frame_time,
        "duration": outro_seconds,
        "blurSeconds": OUTRO_BLUR_SECONDS,
        "titleAnimation": "damped-pop",
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
    sailing_music_duration = fight_start_seconds + MUSIC_CROSSFADE_SECONDS / 2
    combat_music_duration = expected_duration - fight_start_seconds + MUSIC_CROSSFADE_SECONDS / 2
    music_filters = (
        "[0:a]aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[sailing-intro];"
        "[1:a]aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[sailing-loop];"
        "[2:a]aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[combat-intro];"
        "[3:a]aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[combat-loop];"
        f"[sailing-intro][sailing-loop]concat=n=2:v=0:a=1,"
        f"atrim=duration={sailing_music_duration},asetpts=PTS-STARTPTS,"
        "afade=t=in:st=0:d=0.3[sailing];"
        f"[combat-intro][combat-loop]concat=n=2:v=0:a=1,"
        f"atrim=duration={combat_music_duration},asetpts=PTS-STARTPTS[combat];"
        f"[sailing][combat]acrossfade=d={MUSIC_CROSSFADE_SECONDS}:c1=tri:c2=tri,"
        f"afade=t=out:st={music_fade_start}:d=4,volume=0.52[music]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", SAILING_MUSIC_INTRO,
        "-stream_loop", "-1", "-i", SAILING_MUSIC_LOOP,
        "-i", COMBAT_MUSIC_INTRO,
        "-stream_loop", "-1", "-i", COMBAT_MUSIC_LOOP,
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
    (WORK / "marque-and-reprisal-steam-trailer-v4.edit.json").write_text(
        json.dumps(edit, indent=2) + "\n"
    )
    print(f"Rendered {OUTPUT} ({final_duration:.2f}s)")


if __name__ == "__main__":
    main()
