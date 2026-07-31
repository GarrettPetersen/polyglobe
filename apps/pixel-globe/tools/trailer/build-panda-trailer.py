#!/usr/bin/env python3

import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageFilter

from trailer_support import probe_duration, require_file, run


ROOT = Path(__file__).resolve().parents[4]
APP = ROOT / "apps" / "pixel-globe"
TOOL = Path(__file__).resolve().parent
CAPTURES = APP / ".captures" / "panda-trailer-clips-steam"
WORK = APP / ".captures" / "panda-trailer"
TEMP = WORK / "render"
SEGMENTS = TEMP / "segments"
PLAN_PATH = TOOL / "panda-trailer-plan.json"
OUTPUT = WORK / "marque-and-reprisal-panda-trailer.mp4"
TITLE_PATH = APP / "capsule_art" / "generated" / "capsule_title_english.png"
MUSIC_INTRO = APP / "public" / "assets" / "music" / "city-east-asian-intro.ogg"
MUSIC_LOOP = APP / "public" / "assets" / "music" / "city-east-asian-loop.ogg"
WIDTH = 1920
HEIGHT = 1080
FPS = 30
OUTRO_BLUR_SECONDS = 1.1
OUTRO_TITLE_START_SECONDS = 0.7


def positive_frame_count(value, label):
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise RuntimeError(f"{label} must be a positive integer")
    return value


def make_title_overlay():
    require_file(TITLE_PATH)
    title = Image.open(TITLE_PATH).convert("RGBA")
    bounds = title.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError(f"Panda trailer title has no opaque pixels: {TITLE_PATH}")
    title = title.crop(bounds)
    target_width = 1180
    target_height = round(title.height * target_width / title.width)
    title = title.resize((target_width, target_height), Image.Resampling.NEAREST)

    alpha = title.getchannel("A")
    shadow_alpha = alpha.filter(ImageFilter.GaussianBlur(7)).point(
        lambda value: min(238, round(value * 0.96))
    )
    shadow = Image.new("RGBA", title.size, (15, 9, 7, 0))
    shadow.putalpha(shadow_alpha)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    x = (WIDTH - title.width) // 2
    y = (HEIGHT - title.height) // 2
    overlay.alpha_composite(shadow, (x + 11, y + 13))
    overlay.alpha_composite(title, (x, y))
    output = TEMP / "panda-trailer-title.png"
    overlay.save(output)
    return output


def render_clip(source, start_frames, duration_frames, output):
    require_file(source)
    start = start_frames / FPS
    duration = duration_frames / FPS
    available = probe_duration(source)
    if start + duration > available + 0.04:
        raise RuntimeError(
            f"Panda trailer edit exceeds {source}: {start + duration:.3f}s > {available:.3f}s"
        )
    filters = (
        f"[0:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS,"
        f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=neighbor,setsar=1,format=yuv420p[video];"
        f"[0:a]atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS,"
        "aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[audio]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", source,
        "-filter_complex", filters,
        "-map", "[video]", "-map", "[audio]", "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "13", "-tune", "animation",
        "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", output,
    ])


def render_outro(source, source_frame, duration_frames, title_overlay, output):
    require_file(source)
    require_file(title_overlay)
    duration = duration_frames / FPS
    source_start = source_frame / FPS
    blur_mix = f"min(T/{OUTRO_BLUR_SECONDS},1)"
    blend = f"A*(1-{blur_mix})+B*{blur_mix}".replace(",", "\\,")
    filters = (
        f"[0:v]trim=start={source_start}:duration={1 / FPS},setpts=PTS-STARTPTS,"
        f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=neighbor,setsar=1,"
        f"tpad=stop_mode=clone:stop_duration={duration},trim=duration={duration}[motion];"
        "[motion]split=2[sharp][blur-source];"
        "[blur-source]gblur=sigma=20:steps=3[blurred];"
        f"[sharp][blurred]blend=all_expr='{blend}'[base];"
        f"[1:v]format=rgba,fade=t=in:st={OUTRO_TITLE_START_SECONDS}:d=0.55:alpha=1[title];"
        "[base][title]overlay=0:0:shortest=1:format=auto,format=yuv420p[video];"
        f"[2:a]atrim=duration={duration},asetpts=PTS-STARTPTS,"
        "aformat=sample_fmts=s16:channel_layouts=stereo[audio]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", source,
        "-loop", "1", "-framerate", str(FPS), "-i", title_overlay,
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-filter_complex", filters,
        "-map", "[video]", "-map", "[audio]", "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "13", "-tune", "animation",
        "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", output,
    ])


def main():
    for path in [PLAN_PATH, MUSIC_INTRO, MUSIC_LOOP]:
        require_file(path)
    plan = json.loads(PLAN_PATH.read_text())
    clips = plan.get("clips")
    if not isinstance(clips, list) or not clips:
        raise RuntimeError("Panda trailer plan requires clips")

    shutil.rmtree(TEMP, ignore_errors=True)
    SEGMENTS.mkdir(parents=True, exist_ok=True)
    segment_paths = []
    edit_clips = []
    total_frames = 0
    final_source = None
    final_source_end_frame = None
    for index, clip in enumerate(clips):
        source_name = clip.get("source")
        if not isinstance(source_name, str) or not source_name:
            raise RuntimeError(f"Panda trailer clip {index} has no source")
        start_frames = clip.get("startFrame", 0)
        if not isinstance(start_frames, int) or isinstance(start_frames, bool) or start_frames < 0:
            raise RuntimeError(f"Panda trailer clip {index} has invalid start frame")
        duration_frames = positive_frame_count(
            clip.get("durationFrames"), f"Panda trailer clip {index} duration"
        )
        source = CAPTURES / source_name
        output = SEGMENTS / f"{index:02d}.mkv"
        render_clip(source, start_frames, duration_frames, output)
        segment_paths.append(output)
        edit_clips.append({
            "source": str(source),
            "startFrame": start_frames,
            "durationFrames": duration_frames,
            "timelineStartFrame": total_frames,
        })
        total_frames += duration_frames
        final_source = source
        final_source_end_frame = start_frames + duration_frames

    outro_frames = positive_frame_count(plan.get("outroFrames"), "Panda trailer outro")
    outro = SEGMENTS / f"{len(segment_paths):02d}-outro.mkv"
    render_outro(final_source, final_source_end_frame - 1, outro_frames, make_title_overlay(), outro)
    segment_paths.append(outro)

    concat_path = TEMP / "segments.txt"
    concat_path.write_text("".join(f"file '{path.resolve()}'\n" for path in segment_paths))
    gameplay = TEMP / "gameplay.mkv"
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_path,
        "-c", "copy", gameplay,
    ])

    expected_frames = total_frames + outro_frames
    expected_duration = expected_frames / FPS
    actual_gameplay_duration = probe_duration(gameplay)
    if not math.isclose(actual_gameplay_duration, expected_duration, abs_tol=0.2):
        raise RuntimeError(
            f"Panda trailer timeline is {actual_gameplay_duration:.3f}s; expected {expected_duration:.3f}s"
        )

    music = TEMP / "music.wav"
    music_gain = float(plan.get("musicGain", 0.38))
    music_fade_start = max(0, expected_duration - 4)
    music_filters = (
        "[0:a]aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[intro];"
        "[1:a]aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo[loop];"
        f"[intro][loop]concat=n=2:v=0:a=1,atrim=duration={expected_duration},"
        f"asetpts=PTS-STARTPTS,volume={music_gain},afade=t=in:st=0:d=0.35,"
        f"afade=t=out:st={music_fade_start}:d=4[music]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", MUSIC_INTRO, "-stream_loop", "-1", "-i", MUSIC_LOOP,
        "-filter_complex", music_filters,
        "-map", "[music]", "-t", str(expected_duration),
        "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", music,
    ])

    WORK.mkdir(parents=True, exist_ok=True)
    game_gain = float(plan.get("gameAudioGain", 0.86))
    final_filters = (
        f"[0:a]aresample=48000,volume={game_gain}[game];"
        "[1:a]aresample=48000[music];"
        "[game][music]amix=inputs=2:duration=first:dropout_transition=0,"
        "alimiter=limit=0.92,loudnorm=I=-14:TP=-1.5:LRA=9[audio]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", gameplay, "-i", music,
        "-filter_complex", final_filters,
        "-map", "0:v:0", "-map", "[audio]",
        "-c:v", "libx264", "-preset", "slow", "-tune", "animation",
        "-b:v", "10M", "-minrate", "10M", "-maxrate", "10M", "-bufsize", "20M",
        "-x264-params", "nal-hrd=cbr:force-cfr=1", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", "-t", str(expected_duration), OUTPUT,
    ])

    final_duration = probe_duration(OUTPUT)
    if not math.isclose(final_duration, expected_duration, abs_tol=0.08):
        raise RuntimeError(
            f"Panda trailer is {final_duration:.3f}s; expected {expected_duration:.3f}s"
        )
    OUTPUT.with_suffix(".edit.json").write_text(json.dumps({
        "version": 1,
        "title": plan["title"],
        "format": {"width": WIDTH, "height": HEIGHT, "frameRate": FPS},
        "music": {
            "intro": str(MUSIC_INTRO),
            "loop": str(MUSIC_LOOP),
            "gain": music_gain,
        },
        "clips": edit_clips,
        "outro": {
            "durationFrames": outro_frames,
            "source": str(final_source),
            "sourceFrame": final_source_end_frame - 1,
            "blurSeconds": OUTRO_BLUR_SECONDS,
            "title": str(TITLE_PATH),
        },
        "durationSeconds": final_duration,
    }, indent=2) + "\n")
    print(f"Rendered {OUTPUT} ({final_duration:.2f}s)")


if __name__ == "__main__":
    main()
