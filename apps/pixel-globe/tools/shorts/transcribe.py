#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Transcribe Short narration with word timestamps.")
    parser.add_argument("audio", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--model", default="base.en")
    return parser.parse_args()


def timestamp(seconds):
    millis = max(0, round(seconds * 1000))
    hours, remainder = divmod(millis, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


def main():
    args = parse_args()
    if not args.audio.is_file():
        raise SystemExit(f"Narration file does not exist: {args.audio}")
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise SystemExit(
            "faster-whisper is not installed. Run: make pixel-globe-shorts-setup"
        ) from error

    args.output_dir.mkdir(parents=True, exist_ok=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    raw_segments, info = model.transcribe(
        str(args.audio),
        beam_size=5,
        vad_filter=True,
        word_timestamps=True,
    )
    segments = []
    for raw in raw_segments:
        words = [
            {"start": word.start, "end": word.end, "text": word.word}
            for word in (raw.words or [])
            if word.start is not None and word.end is not None
        ]
        segments.append({
            "start": raw.start,
            "end": raw.end,
            "text": raw.text.strip(),
            "words": words,
        })
    if not segments:
        raise SystemExit("Whisper returned no speech segments")

    payload = {
        "version": 1,
        "source": str(args.audio.resolve()),
        "language": info.language,
        "languageProbability": info.language_probability,
        "duration": segments[-1]["end"],
        "segments": segments,
    }
    stem = args.audio.stem
    json_path = args.output_dir / f"{stem}.transcript.json"
    text_path = args.output_dir / f"{stem}.transcript.txt"
    srt_path = args.output_dir / f"{stem}.transcript.srt"
    json_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    text_path.write_text("\n".join(segment["text"] for segment in segments) + "\n", encoding="utf-8")
    with srt_path.open("w", encoding="utf-8") as output:
        for index, segment in enumerate(segments, 1):
            output.write(
                f"{index}\n{timestamp(segment['start'])} --> {timestamp(segment['end'])}\n"
                f"{segment['text']}\n\n"
            )
    print(json_path)
    print(text_path)
    print(srt_path)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
