#!/usr/bin/env python3
import argparse
import json
import math
import re
import subprocess
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as error:
    raise SystemExit("Pillow is not installed. Run: make pixel-globe-shorts-setup") from error


EVENT_KEYWORDS = {
    "weapon-fired": {"cannon", "cannons", "fire", "fired", "broadside", "arrow", "arrows", "combat", "battle"},
    "projectile-hit": {"hit", "hits", "damage", "damaged", "combat", "battle", "ram"},
    "ship-sunk": {"sink", "sank", "sunk", "destroy", "destroyed", "victory", "defeat"},
    "storm-damage": {"storm", "weather", "damage", "lightning"},
    "lightning": {"lightning", "storm", "thunder"},
    "discovery": {"discover", "discovered", "discovery", "explore", "landmark"},
    "interaction-opened": {"port", "city", "trade", "talk", "captain", "hail", "dock"},
    "position": {"sail", "ship", "wind", "ocean", "sea", "route", "world", "map"},
}

CAPTION_NATIVE_Y = 320
OUTPUT_SCALE = 4
CAPTION_FONT_SIZE = 16
CAPTION_MAX_WIDTH = 238
CAPTION_MAX_LINES = 2
CAPTION_MAX_WORDS = 7
CAPTION_MAX_DURATION = 3.2


def parse_args():
    parser = argparse.ArgumentParser(description="Build a captioned 9:16 Short from a gameplay take.")
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--narration", type=Path, required=True)
    parser.add_argument("--transcript", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--plan", type=Path, help="Use an edited decision list instead of automatic matching")
    parser.add_argument("--plan-out", type=Path)
    parser.add_argument("--game-volume", type=float, default=0.18)
    parser.add_argument(
        "--no-voice-processing",
        action="store_true",
        help="Bypass narration EQ, de-essing, and compression for A/B comparison",
    )
    return parser.parse_args()


def command_json(command):
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def probe(path):
    if not path.is_file():
        raise SystemExit(f"Input file does not exist: {path}")
    return command_json([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)
    ])


def media_duration(data, label):
    value = float(data.get("format", {}).get("duration", 0))
    if not math.isfinite(value) or value <= 0:
        raise SystemExit(f"Could not determine {label} duration")
    return value


def load_json(path, label):
    if not path.is_file():
        raise SystemExit(f"{label} does not exist: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise SystemExit(f"Invalid {label}: {error}") from error


def video_stream(data):
    streams = [stream for stream in data.get("streams", []) if stream.get("codec_type") == "video"]
    if len(streams) != 1:
        raise SystemExit(f"Gameplay take must have exactly one video stream, got {len(streams)}")
    return streams[0]


def require_audio(data, label):
    streams = [stream for stream in data.get("streams", []) if stream.get("codec_type") == "audio"]
    if not streams:
        raise SystemExit(f"{label} contains no audio stream")


def narration_filter(duration, process_voice):
    filters = ["aresample=48000"]
    if process_voice:
        filters.extend([
            "highpass=f=70",
            "bass=g=2.5:f=180:t=q:w=0.8",
            "equalizer=f=3200:t=q:w=1.2:g=-2",
            "deesser=i=0.12:m=0.35:f=0.55",
            "acompressor=threshold=0.125:ratio=2.5:attack=15:release=180:makeup=1.4",
        ])
    filters.extend(["apad", f"atrim=duration={duration}", "volume=1.0"])
    return ",".join(filters)


def words(text):
    return set(re.findall(r"[a-z]+", text.lower()))


def choose_event(text, events, used, fallback_time):
    tokens = words(text)
    scored = []
    for index, event in enumerate(events):
        if event.get("type") in {"capture-start", "capture-stop", "scenario-start"}:
            continue
        event_tokens = EVENT_KEYWORDS.get(event.get("type"), set())
        score = len(tokens & event_tokens) * 10
        if index not in used and event.get("type") != "position":
            score += 2
        if score > 0:
            scored.append((score, -abs(event["t"] / 1000 - fallback_time), index, event))
    if not scored:
        return None, fallback_time
    _, _, index, event = max(scored)
    used.add(index)
    return event, event["t"] / 1000


def build_plan(transcript, events_payload, video_duration, narration_duration):
    segments = transcript.get("segments")
    if not isinstance(segments, list) or not segments:
        raise SystemExit("Transcript contains no segments")
    events = events_payload.get("events")
    if not isinstance(events, list) or not events:
        raise SystemExit("Capture sidecar contains no events")
    transcript_end = float(segments[-1]["end"])
    if abs(transcript_end - narration_duration) > 4:
        raise SystemExit(
            f"Transcript ends at {transcript_end:.2f}s but narration is {narration_duration:.2f}s; retranscribe it"
        )

    blocks = []
    cursor = 0.0
    used = set()
    for index, segment in enumerate(segments):
        block_end = narration_duration if index == len(segments) - 1 else float(segment["end"])
        duration = block_end - cursor
        if duration <= 0:
            raise SystemExit(f"Transcript segment {index + 1} has a non-positive timeline block")
        fallback = (index + 0.5) / len(segments) * video_duration
        event, focus = choose_event(segment["text"], events, used, fallback)
        start = max(0, min(video_duration - duration, focus - duration * 0.42))
        end = start + duration
        blocks.append({
            "narrationStart": round(cursor, 3),
            "narrationEnd": round(block_end, 3),
            "videoStart": round(start, 3),
            "videoEnd": round(end, 3),
            "text": segment["text"],
            "matchedEvent": None if event is None else {
                "type": event["type"], "t": event["t"], "data": event.get("data", {})
            },
        })
        cursor = block_end
    return {"version": 1, "duration": narration_duration, "clips": blocks}


def validate_plan(plan, video_duration, narration_duration):
    if plan.get("version") != 1 or not isinstance(plan.get("clips"), list) or not plan["clips"]:
        raise SystemExit("Edit plan must be version 1 with at least one clip")
    if abs(float(plan.get("duration", 0)) - narration_duration) > 0.05:
        raise SystemExit("Edit plan duration does not match narration duration")
    cursor = 0.0
    for index, clip in enumerate(plan["clips"]):
        narration_start = float(clip.get("narrationStart", -1))
        narration_end = float(clip.get("narrationEnd", -1))
        video_start = float(clip.get("videoStart", -1))
        video_end = float(clip.get("videoEnd", -1))
        if abs(narration_start - cursor) > 0.05 or narration_end <= narration_start:
            raise SystemExit(f"Edit plan clip {index + 1} breaks the narration timeline")
        if video_start < 0 or video_end <= video_start or video_end > video_duration + 0.05:
            raise SystemExit(f"Edit plan clip {index + 1} is outside the gameplay take")
        if abs((video_end - video_start) - (narration_end - narration_start)) > 0.05:
            raise SystemExit(f"Edit plan clip {index + 1} changes speed; clips must remain real-time")
        cursor = narration_end
    if abs(cursor - narration_duration) > 0.05:
        raise SystemExit("Edit plan does not cover the complete narration")
    return plan


def wrap_caption(text, font, max_width, max_lines):
    tokens = text.split()
    if not tokens:
        raise SystemExit("Transcript contains an empty caption")
    lines = []
    current = tokens[0]
    for token in tokens[1:]:
        candidate = f"{current} {token}"
        if font.getlength(candidate) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = token
    lines.append(current)
    if len(lines) > max_lines or any(font.getlength(line) > max_width for line in lines):
        raise SystemExit(f"Caption cannot fit the native pixel grid: {text}")
    return lines


def caption_fits(text, font):
    tokens = text.split()
    lines = []
    current = ""
    for token in tokens:
        candidate = token if not current else f"{current} {token}"
        if font.getlength(candidate) <= CAPTION_MAX_WIDTH:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = token
    if current:
        lines.append(current)
    return (
        len(lines) <= CAPTION_MAX_LINES
        and all(font.getlength(line) <= CAPTION_MAX_WIDTH for line in lines)
    )


def timed_caption_chunks(transcript, font):
    chunks = []
    for segment_index, segment in enumerate(transcript.get("segments", [])):
        timed_words = segment.get("words")
        if not isinstance(timed_words, list) or not timed_words:
            raise SystemExit(f"Transcript segment {segment_index + 1} has no word timings")
        current = []
        for word_index, word in enumerate(timed_words):
            text = str(word.get("text", "")).strip()
            start = float(word.get("start", -1))
            end = float(word.get("end", -1))
            if not text or start < 0 or end < start:
                raise SystemExit(
                    f"Transcript segment {segment_index + 1}, word {word_index + 1} has invalid timing"
                )
            candidate = current + [(text, start, end)]
            candidate_text = " ".join(item[0] for item in candidate)
            too_long = candidate[-1][2] - candidate[0][1] > CAPTION_MAX_DURATION
            if current and (
                len(candidate) > CAPTION_MAX_WORDS
                or too_long
                or not caption_fits(candidate_text, font)
            ):
                chunks.append({
                    "text": " ".join(item[0] for item in current),
                    "start": current[0][1],
                    "end": current[-1][2],
                })
                current = [(text, start, end)]
            else:
                current = candidate
            if len(current) >= 4 and re.search(r"[.!?]$", current[-1][0]):
                chunks.append({
                    "text": " ".join(item[0] for item in current),
                    "start": current[0][1],
                    "end": current[-1][2],
                })
                current = []
        if current:
            chunks.append({
                "text": " ".join(item[0] for item in current),
                "start": current[0][1],
                "end": current[-1][2],
            })
    if not chunks:
        raise SystemExit("Transcript contains no timed caption words")
    return chunks


def harden_alpha(image):
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            pixels[x, y] = (r, g, b, 255 if a >= 128 else 0)


def write_caption_images(directory, transcript, font_path):
    font = ImageFont.truetype(str(font_path), CAPTION_FONT_SIZE)
    records = []
    for index, segment in enumerate(timed_caption_chunks(transcript, font)):
        lines = wrap_caption(
            segment["text"], font, CAPTION_MAX_WIDTH, CAPTION_MAX_LINES
        )
        native = Image.new("RGBA", (270, 60), (0, 0, 0, 0))
        draw = ImageDraw.Draw(native)
        line_height = 16
        total_height = len(lines) * line_height
        first_y = (native.height - total_height) // 2
        for line_index, line in enumerate(lines):
            width = round(font.getlength(line))
            x = (native.width - width) // 2
            bbox = draw.textbbox((0, 0), line, font=font)
            visible_y = first_y + line_index * line_height
            text_y = visible_y - bbox[1]
            draw.rectangle(
                (x - 4, visible_y - 3, x + width + 3, visible_y + bbox[3] - bbox[1] + 2),
                fill=(32, 22, 15, 208),
            )
            draw.text((x, text_y), line, font=font, fill=(247, 230, 190, 255))
        harden_alpha(native)
        output = directory / f"caption-{index:03}.png"
        native.resize((1080, 240), Image.Resampling.NEAREST).save(output)
        records.append((output, float(segment["start"]), float(segment["end"])))
    return records


def render(args, plan, transcript, video_duration):
    clips = plan["clips"]
    video_sources = "".join(f"[vsrc{index}]" for index in range(len(clips)))
    audio_sources = "".join(f"[asrc{index}]" for index in range(len(clips)))
    filters = [
        f"[0:v]split={len(clips)}{video_sources}",
        f"[2:a]aresample=48000,asetpts=N/SR/TB,asplit={len(clips)}{audio_sources}"
    ]
    concat_inputs = []
    for index, clip in enumerate(clips):
        start = clip["videoStart"]
        end = clip["videoEnd"]
        filters.append(
            f"[vsrc{index}]trim=start={start}:end={end},setpts=PTS-STARTPTS,"
            "scale=1080:1920:flags=neighbor,fps=30,format=yuv420p"
            f"[v{index}]"
        )
        filters.append(
            f"[asrc{index}]atrim=start={start}:end={end},asetpts=PTS-STARTPTS,"
            f"volume={args.game_volume}[a{index}]"
        )
        concat_inputs.append(f"[v{index}][a{index}]")
    filters.append("".join(concat_inputs) + f"concat=n={len(clips)}:v=1:a=1[vcat][gamea]")

    fonts_dir = Path(__file__).resolve().parents[2] / "public" / "assets" / "fonts"
    caption_font = fonts_dir / "born2bsporty-fs.otf"
    if not caption_font.is_file():
        raise SystemExit(f"Born2bSporty caption font is missing: {caption_font}")
    with tempfile.TemporaryDirectory(prefix="pixel-globe-short-") as temp_dir:
        temp_path = Path(temp_dir)
        game_video_path = temp_path / "game-video.mkv"
        game_audio_path = temp_path / "game-audio.wav"
        subprocess.run([
            "ffmpeg", "-v", "fatal", "-err_detect", "ignore_err", "-y", "-i", str(args.video),
            "-an", "-c:v", "libx264", "-preset", "ultrafast", "-qp", "0", str(game_video_path)
        ], check=True)
        subprocess.run([
            "ffmpeg", "-v", "fatal", "-err_detect", "ignore_err", "-y", "-i", str(args.video), "-vn",
            "-c:a", "pcm_s16le", "-ar", "48000", str(game_audio_path)
        ], check=True)
        repaired_video_duration = media_duration(probe(game_video_path), "repaired gameplay video")
        repaired_audio_duration = media_duration(probe(game_audio_path), "repaired gameplay audio")
        if repaired_video_duration < video_duration - 0.1 or repaired_audio_duration < video_duration - 0.1:
            raise SystemExit(
                "Gameplay WebM repair lost media: "
                f"source={video_duration:.3f}s video={repaired_video_duration:.3f}s audio={repaired_audio_duration:.3f}s"
            )
        caption_inputs = write_caption_images(temp_path, transcript, caption_font)
        previous_video = "vcat"
        for index, (_, start, end) in enumerate(caption_inputs):
            output_video = f"captioned{index}"
            filters.append(
                f"[{previous_video}][{index + 3}:v]"
                f"overlay=0:{CAPTION_NATIVE_Y * OUTPUT_SCALE}:enable='between(t,{start},{end})'"
                f"[{output_video}]"
            )
            previous_video = output_video
        voice_filters = narration_filter(plan["duration"], not args.no_voice_processing)
        filters.append(
            f"[1:a]{voice_filters}[voice];"
            "[gamea][voice]amix=inputs=2:duration=first:normalize=0[mixed];"
            "[mixed]loudnorm=I=-16:LRA=7:TP=-1.5,"
            "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[aout]"
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        command = [
            "ffmpeg", "-y", "-i", str(game_video_path), "-i", str(args.narration),
            "-i", str(game_audio_path),
        ]
        for caption_path, _, _ in caption_inputs:
            command.extend(["-loop", "1", "-i", str(caption_path)])
        command.extend([
            "-filter_complex", ";".join(filters),
            "-map", f"[{previous_video}]", "-map", "[aout]",
            "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
            "-r", "30", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-movflags", "+faststart", "-t", str(plan["duration"]), str(args.output)
        ])
        subprocess.run(command, check=True)


def main():
    args = parse_args()
    if not 0 <= args.game_volume <= 1:
        raise SystemExit("--game-volume must be 0..1")
    video_probe = probe(args.video)
    narration_probe = probe(args.narration)
    stream = video_stream(video_probe)
    require_audio(video_probe, "Gameplay take")
    require_audio(narration_probe, "Narration")
    width, height = int(stream["width"]), int(stream["height"])
    if width != 270 or height != 480:
        raise SystemExit(f"Gameplay take must be native 270x480, got {width}x{height}")
    video_duration = media_duration(video_probe, "gameplay take")
    narration_duration = media_duration(narration_probe, "narration")
    if narration_duration < 15 or narration_duration > 180:
        raise SystemExit(f"Narration must be 15..180 seconds, got {narration_duration:.2f}")
    transcript = load_json(args.transcript, "transcript")
    events = load_json(args.events, "capture sidecar")
    plan = load_json(args.plan, "edit plan") if args.plan else build_plan(
        transcript, events, video_duration, narration_duration
    )
    validate_plan(plan, video_duration, narration_duration)
    plan_path = args.plan_out or args.output.with_suffix(".edit.json")
    plan_path.parent.mkdir(parents=True, exist_ok=True)
    plan_path.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    render(args, plan, transcript, video_duration)
    print(plan_path)
    print(args.output)


if __name__ == "__main__":
    main()
