#!/usr/bin/env python3

import hashlib
import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from trailer_support import draw_shadowed_text, require_file, run


ROOT = Path(__file__).resolve().parents[4]
APP = ROOT / "apps" / "pixel-globe"
TOOL = Path(__file__).resolve().parent
CAPTURES = APP / ".captures" / "trailer-clips-steam"
WORK = APP / ".captures" / "steam-page-teaser"
PLAN_PATH = TOOL / "steam-page-teaser-plan.json"
OUTPUT = WORK / "marque-and-reprisal-steam-page-teaser-v1.mp4"
EDIT_MANIFEST = OUTPUT.with_suffix(".edit.json")
OUTRO_IMAGE = WORK / "outro.png"
FONT_PATH = TOOL / "assets" / "PirataOne-Regular.ttf"
WIDTH = 1920
HEIGHT = 1080
FPS = 30


def require_positive_number(value, label):
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise RuntimeError(f"{label} must be a positive number")
    return number


def probe_media(path):
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,bit_rate",
            "-show_entries",
            "format=duration,size",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def validate_source(path):
    probe = probe_media(path)
    video = next(
        (stream for stream in probe["streams"] if stream["codec_type"] == "video"),
        None,
    )
    audio = next(
        (stream for stream in probe["streams"] if stream["codec_type"] == "audio"),
        None,
    )
    if video is None or audio is None:
        raise RuntimeError(f"Teaser source needs video and audio: {path}")
    if (
        video.get("width") != WIDTH
        or video.get("height") != HEIGHT
        or video.get("r_frame_rate") != f"{FPS}/1"
    ):
        raise RuntimeError(f"Teaser source must be {WIDTH}x{HEIGHT} at {FPS} fps: {path}")
    return float(probe["format"]["duration"])


def exclusive_windows(edit):
    windows = []
    for section_name in ("chapters", "montages"):
        for section in edit.get(section_name, []):
            for clip in section.get("clips", []):
                windows.append(
                    {
                        "source": Path(clip["source"]).resolve(),
                        "start": float(clip["start"]),
                        "duration": float(clip["duration"]),
                    }
                )
    return windows


def assert_no_exclusive_overlap(clips, exclusive_edit_path):
    require_file(exclusive_edit_path)
    exclusive = exclusive_windows(json.loads(exclusive_edit_path.read_text()))
    audits = []
    for clip in clips:
        matches = [
            window for window in exclusive
            if window["source"] == clip["source"].resolve()
        ]
        for window in matches:
            overlap = min(
                clip["start"] + clip["duration"],
                window["start"] + window["duration"],
            ) - max(clip["start"], window["start"])
            if overlap > 1 / FPS:
                raise RuntimeError(
                    "Steam teaser footage overlaps the IGN edit: "
                    f"{clip['source']} overlaps by {overlap:.3f}s"
                )
        audits.append(
            {
                "source": str(clip["source"]),
                "teaserWindow": [clip["start"], clip["start"] + clip["duration"]],
                "ignWindows": [
                    [window["start"], window["start"] + window["duration"]]
                    for window in matches
                ],
                "overlapSeconds": 0,
            }
        )
    return audits


def make_outro(plan):
    image_path = APP / plan["image"]
    require_file(image_path)
    require_file(FONT_PATH)
    source = Image.open(image_path).convert("RGB")
    if source.width * HEIGHT != source.height * WIDTH:
        raise RuntimeError(f"Teaser outro image must be 16:9: {image_path}")
    image = source.resize((WIDTH, HEIGHT), Image.Resampling.NEAREST).convert("RGBA")
    shade = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ImageDraw.Draw(shade).rectangle((0, 820, WIDTH, HEIGHT), fill=(17, 12, 20, 150))
    image.alpha_composite(shade)
    font = ImageFont.truetype(str(FONT_PATH), 116)
    draw_shadowed_text(
        image,
        plan["text"],
        font,
        (WIDTH // 2, 925),
        shadow_offset=(8, 10),
        shadow_blur=8,
    )
    image.convert("RGB").save(OUTRO_IMAGE, quality=95)
    return OUTRO_IMAGE


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_filter(clips, outro_duration, music_index, game_audio_gain, music_gain):
    filters = []
    concat_inputs = []
    for index, clip in enumerate(clips):
        start = clip["start"]
        duration = clip["duration"]
        filters.extend(
            [
                (
                    f"[{index}:v]trim=start={start}:duration={duration},"
                    "setpts=PTS-STARTPTS,"
                    f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=neighbor,"
                    "setsar=1,format=yuv420p"
                    f"[video-{index}]"
                ),
                (
                    f"[{index}:a]atrim=start={start}:duration={duration},"
                    "asetpts=PTS-STARTPTS,aresample=48000,"
                    "aformat=sample_fmts=fltp:sample_rates=48000:"
                    "channel_layouts=stereo"
                    f"[audio-{index}]"
                ),
            ]
        )
        concat_inputs.extend([f"[video-{index}]", f"[audio-{index}]"])

    outro_index = len(clips)
    filters.extend(
        [
            (
                f"[{outro_index}:v]trim=duration={outro_duration},"
                "setpts=PTS-STARTPTS,"
                f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=neighbor,"
                "setsar=1,format=yuv420p,"
                "fade=t=in:st=0:d=0.25,"
                f"fade=t=out:st={outro_duration - 0.35}:d=0.35"
                "[video-outro]"
            ),
            (
                "anullsrc=channel_layout=stereo:sample_rate=48000,"
                f"atrim=duration={outro_duration}[audio-outro]"
            ),
        ]
    )
    concat_inputs.extend(["[video-outro]", "[audio-outro]"])
    segment_count = len(clips) + 1
    filters.append(
        f"{''.join(concat_inputs)}concat=n={segment_count}:v=1:a=1"
        "[video][game-audio]"
    )
    total_duration = sum(clip["duration"] for clip in clips) + outro_duration
    filters.extend(
        [
            (
                f"[game-audio]volume={game_audio_gain}"
                "[game-audio-gain]"
            ),
            (
                f"[{music_index}:a]atrim=duration={total_duration},"
                "asetpts=PTS-STARTPTS,aresample=48000,"
                f"volume={music_gain},"
                "afade=t=in:st=0:d=0.5,"
                f"afade=t=out:st={total_duration - 1.5}:d=1.5"
                "[music]"
            ),
            (
                "[game-audio-gain][music]"
                "amix=inputs=2:duration=first:dropout_transition=0:normalize=0,"
                "alimiter=limit=0.90,"
                "loudnorm=I=-14:LRA=9:TP=-1.5"
                "[audio]"
            ),
        ]
    )
    return ";".join(filters), total_duration


def validate_output(path, expected_duration):
    probe = probe_media(path)
    video = next(
        stream for stream in probe["streams"] if stream["codec_type"] == "video"
    )
    audio = next(
        stream for stream in probe["streams"] if stream["codec_type"] == "audio"
    )
    duration = float(probe["format"]["duration"])
    if (
        video.get("codec_name") != "h264"
        or video.get("width") != WIDTH
        or video.get("height") != HEIGHT
        or video.get("r_frame_rate") != f"{FPS}/1"
    ):
        raise RuntimeError(f"Teaser video stream has unexpected properties: {path}")
    if int(video.get("bit_rate", 0)) < 5_000_000:
        raise RuntimeError(f"Teaser video bitrate is below Steam's 5 Mbps guidance: {path}")
    if (
        audio.get("codec_name") != "aac"
        or audio.get("sample_rate") != "48000"
        or audio.get("channels") != 2
    ):
        raise RuntimeError(f"Teaser audio stream has unexpected properties: {path}")
    if not math.isclose(duration, expected_duration, abs_tol=0.05):
        raise RuntimeError(
            f"Teaser is {duration:.3f}s; expected {expected_duration:.3f}s"
        )
    return probe


def load_plan():
    require_file(PLAN_PATH)
    plan = json.loads(PLAN_PATH.read_text())
    clips = plan.get("clips")
    if not isinstance(clips, list) or len(clips) < 4:
        raise RuntimeError("Steam teaser plan needs at least four gameplay clips")
    resolved = []
    for index, clip in enumerate(clips):
        source_name = clip.get("source")
        if (
            not isinstance(source_name, str)
            or Path(source_name).is_absolute()
            or ".." in Path(source_name).parts
        ):
            raise RuntimeError(f"Invalid teaser source at index {index}")
        source = CAPTURES / source_name
        require_file(source)
        start = require_positive_number(clip.get("start"), f"clip {index} start")
        duration = require_positive_number(
            clip.get("duration"),
            f"clip {index} duration",
        )
        source_duration = validate_source(source)
        if start + duration > source_duration + 0.01:
            raise RuntimeError(f"Teaser window exceeds its source: {source}")
        resolved.append({"source": source, "start": start, "duration": duration})
    outro = plan.get("outro")
    if not isinstance(outro, dict):
        raise RuntimeError("Steam teaser plan needs an outro")
    outro["duration"] = require_positive_number(
        outro.get("duration"),
        "outro duration",
    )
    plan["gameAudioGain"] = require_positive_number(
        plan.get("gameAudioGain"),
        "game audio gain",
    )
    plan["musicGain"] = require_positive_number(
        plan.get("musicGain"),
        "music gain",
    )
    return plan, resolved


def main():
    plan, clips = load_plan()
    WORK.mkdir(parents=True, exist_ok=True)
    exclusive_edit = WORK.parent / "trailer" / plan["exclusiveAgainst"]
    overlap_audit = assert_no_exclusive_overlap(clips, exclusive_edit)
    outro = make_outro(plan["outro"])
    music = APP / "public" / plan["music"]
    require_file(music)

    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for clip in clips:
        command.extend(["-i", clip["source"]])
    command.extend(
        [
            "-loop",
            "1",
            "-framerate",
            str(FPS),
            "-i",
            outro,
            "-i",
            music,
        ]
    )
    music_index = len(clips) + 1
    filters, expected_duration = build_filter(
        clips,
        plan["outro"]["duration"],
        music_index,
        plan["gameAudioGain"],
        plan["musicGain"],
    )
    command.extend(
        [
            "-filter_complex",
            filters,
            "-map",
            "[video]",
            "-map",
            "[audio]",
            "-t",
            str(expected_duration),
            "-c:v",
            "libx264",
            "-preset",
            "slow",
            "-b:v",
            "12M",
            "-maxrate",
            "18M",
            "-bufsize",
            "24M",
            "-tune",
            "animation",
            "-pix_fmt",
            "yuv420p",
            "-r",
            str(FPS),
            "-profile:v",
            "high",
            "-level",
            "4.2",
            "-colorspace",
            "bt709",
            "-color_primaries",
            "bt709",
            "-color_trc",
            "bt709",
            "-c:a",
            "aac",
            "-b:a",
            "320k",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-movflags",
            "+faststart",
            "-metadata",
            f"title={plan['title']}",
            "-metadata",
            "comment=Alternate Steam store teaser; submitted IGN trailer remains unreleased",
            OUTPUT,
        ]
    )
    run(command)
    probe = validate_output(OUTPUT, expected_duration)
    manifest = {
        "title": plan["title"],
        "output": str(OUTPUT),
        "durationSeconds": float(probe["format"]["duration"]),
        "bytes": int(probe["format"]["size"]),
        "sha256": sha256(OUTPUT),
        "music": str(music),
        "clips": [
            {
                "source": str(clip["source"]),
                "start": clip["start"],
                "duration": clip["duration"],
            }
            for clip in clips
        ],
        "outro": {
            "image": str(outro),
            "duration": plan["outro"]["duration"],
            "text": plan["outro"]["text"],
        },
        "exclusiveAgainst": str(exclusive_edit),
        "exclusiveOverlapAudit": overlap_audit,
    }
    EDIT_MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        f"Rendered {OUTPUT} ({expected_duration:.1f}s, "
        f"{int(probe['format']['size']) / 1024 / 1024:.1f} MB)"
    )


if __name__ == "__main__":
    main()
