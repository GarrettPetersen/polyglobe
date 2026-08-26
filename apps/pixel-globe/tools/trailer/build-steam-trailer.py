#!/usr/bin/env python3

import argparse
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from trailer_support import draw_shadowed_text, probe_duration, require_file, run


ROOT = Path(__file__).resolve().parents[4]
APP = ROOT / "apps" / "pixel-globe"
CAPTURES = APP / ".captures" / "trailer-clips-steam"
TOOL = Path(__file__).resolve().parent
WORK = APP / ".captures" / "trailer"
PLAN_PATH = TOOL / "steam-trailer-plan.json"
TEMP = WORK / "render"
OVERLAYS = TEMP / "overlays"
SEGMENTS = TEMP / "segments"
OUTPUT = WORK / "marque-and-reprisal-steam-trailer-v9.mp4"
FONT_PATH = TOOL / "assets" / "PirataOne-Regular.ttf"
TITLE_PATH = APP / "capsule_art" / "generated" / "capsule_title_with_ship_english.png"
SAILING_MUSIC_INTRO = APP / "public" / "assets" / "music" / "ship-theme-intro.ogg"
SAILING_MUSIC_LOOP = APP / "public" / "assets" / "music" / "ship-theme-loop.ogg"
COMBAT_MUSIC_INTRO = APP / "public" / "assets" / "music" / "combat-theme-intro.ogg"
COMBAT_MUSIC_LOOP = APP / "public" / "assets" / "music" / "combat-theme-loop.ogg"
SAIL_DEPLOY_SFX = "assets/sfx/isaac200000-sail-deploy-sfx.ogg"
FEATURED_SFX = {
    "cannon": "assets/sfx/universfield-cannon-shot-352459.ogg",
    "coin": "assets/sfx/floraphonic-coin-and-money-bag-3-185264.mp3",
    "fishingNet": "assets/sfx/alex_jauk-water-splash-147014.mp3",
    "whaleHarpoon": "assets/sfx/bow-fire.ogg",
    "whaleKill": "assets/sfx/universfield-wet-squelch-impact-352302.ogg",
}
SFX_DURATION_CACHE = {}
WIDTH = 1920
HEIGHT = 1080
FPS = 30
OUTRO_BLUR_SECONDS = 1.1
OUTRO_TITLE_START_SECONDS = 0.25
OUTRO_TITLE_SETTLE_SECONDS = 7 * math.pi / 18
OUTRO_SOURCE_MAX_SECONDS = 5.0
MINIMUM_FEATURE_CLIP_FRAMES = 24
MINIMUM_MONTAGE_CLIP_FRAMES = 10


def shadowed_image(image):
    alpha = image.getchannel("A")
    blurred = alpha.filter(ImageFilter.GaussianBlur(5))
    shadow_alpha = blurred.point(lambda value: min(240, int(value * 0.95)))
    shadow = Image.new("RGBA", image.size, (20, 12, 9, 0))
    shadow.putalpha(shadow_alpha)
    return shadow


def make_outro_sprite(subtitle):
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    title = Image.open(TITLE_PATH).convert("RGBA")
    bounds = title.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError(f"Capsule title has no opaque pixels: {TITLE_PATH}")
    title = title.crop(bounds)
    target_width = 1200
    target_height = round(title.height * target_width / title.width)
    title = title.resize((target_width, target_height), Image.Resampling.NEAREST)

    subtitle_font = ImageFont.truetype(str(FONT_PATH), 136)
    probe = ImageDraw.Draw(overlay)
    subtitle_bounds = probe.textbbox((0, 0), subtitle, font=subtitle_font, anchor="lt")
    subtitle_height = subtitle_bounds[3] - subtitle_bounds[1]
    gap = 54
    group_height = title.height + gap + subtitle_height
    title_x = (WIDTH - title.width) // 2
    title_y = (HEIGHT - group_height) // 2

    overlay.alpha_composite(shadowed_image(title), (title_x + 10, title_y + 12))
    overlay.alpha_composite(title, (title_x, title_y))
    draw_shadowed_text(
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
    output,
):
    require_file(source)
    filters = (
        f"[0:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS,"
        f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=neighbor,setsar=1,"
        "format=yuv420p[video];"
        f"[0:a]atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS,"
        "aresample=48000,volume=0,"
        "aformat=sample_fmts=s16:channel_layouts=stereo[audio]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", source,
        "-filter_complex", filters,
        "-map", "[video]", "-map", "[audio]",
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-tune", "animation",
        "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2",
        output,
    ])


def render_outro_motion(source, source_start, source_duration, duration, overlay, output):
    require_file(source)
    require_file(overlay)
    video_stretch = duration / source_duration
    blur_mix = f"min(T/{OUTRO_BLUR_SECONDS},1)"
    blend_expression = f"A*(1-{blur_mix})+B*{blur_mix}"
    pop_time = f"(t-{OUTRO_TITLE_START_SECONDS})"
    title_scale = (
        f"if(lt(t,{OUTRO_TITLE_START_SECONDS}),0.2,"
        f"if(lt({pop_time},{OUTRO_TITLE_SETTLE_SECONDS}),"
        f"1-0.8*exp(-4*{pop_time})*cos(9*{pop_time}),1))"
    )
    scale_width = f"max(2,trunc(iw*({title_scale})/2)*2)"
    scale_height = f"max(2,trunc(ih*({title_scale})/2)*2)"
    filters = (
        f"[0:v]trim=start={source_start}:duration={source_duration},"
        f"setpts=(PTS-STARTPTS)*{video_stretch},fps={FPS},"
        f"scale={WIDTH}:{HEIGHT}:flags=neighbor,setsar=1,trim=duration={duration}[motion];"
        "[motion]split=2[sharp][blur-source];"
        "[blur-source]gblur=sigma=18:steps=3[blurred];"
        f"[sharp][blurred]blend=all_expr='{escape_filter_expression(blend_expression)}'[base];"
        "[1:v]format=rgba,"
        f"scale=w='{escape_filter_expression(scale_width)}':"
        f"h='{escape_filter_expression(scale_height)}':eval=frame[overlay];"
        "[base][overlay]overlay=x='(main_w-overlay_w)/2':y='(main_h-overlay_h)/2':"
        f"enable='gte(t,{OUTRO_TITLE_START_SECONDS})':shortest=1:format=auto,"
        "format=yuv420p[video];"
        f"anullsrc=r=48000:cl=stereo,atrim=duration={duration},"
        "asetpts=PTS-STARTPTS[audio]"
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


def escape_filter_expression(value):
    return value.replace(",", "\\,")


def required_frame_count(value, label, minimum=1):
    if not isinstance(value, int) or isinstance(value, bool) or value < minimum:
        raise RuntimeError(f"{label} must be an integer of at least {minimum} frames")
    return value


def required_positive_number(value, label):
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise RuntimeError(f"{label} must be positive")
    return number


def load_capture_sidecar(source):
    sidecar_path = source.with_suffix(".json")
    require_file(sidecar_path)
    sidecar = json.loads(sidecar_path.read_text())
    events = sidecar.get("events")
    if not isinstance(events, list):
        raise RuntimeError(f"Capture sidecar has no event list: {sidecar_path}")
    return sidecar


def clip_sfx_events(sidecar, start, duration):
    events = sidecar["events"]
    start_ms = round(start * 1000)
    end_ms = round((start + duration) * 1000)
    return [
        event for event in events
        if event.get("type") == "capture-sfx"
        and start_ms <= event.get("t", -1) < end_ms
    ]


def validate_clip_sfx(source, sidecar, start, duration, required_sfx):
    window_sfx = clip_sfx_events(sidecar, start, duration)
    sail_deploys = [
        event for event in window_sfx
        if event.get("data", {}).get("assetPath") == SAIL_DEPLOY_SFX
    ]
    if sail_deploys:
        raise RuntimeError(
            f"Clip window contains the removed sail-deploy SFX: {source}"
        )
    if required_sfx is None:
        return
    if not isinstance(required_sfx, dict):
        raise RuntimeError(f"requiredSfx must be an object: {source}")
    kind = required_sfx.get("kind")
    if kind not in FEATURED_SFX:
        raise RuntimeError(f"Unknown required SFX kind for {source}: {kind}")
    minimum = required_frame_count(
        required_sfx.get("minimum"),
        f"{source} required {kind} SFX count",
    )
    actual = sum(
        event.get("data", {}).get("assetPath") == FEATURED_SFX[kind]
        for event in window_sfx
    )
    if actual < minimum:
        raise RuntimeError(
            f"{source} needs at least {minimum} {kind} cues in its edit window; found {actual}"
        )


def validate_clip_portraits(source, sidecar, clip):
    scenario = sidecar.get("scenario")
    if not isinstance(scenario, dict):
        raise RuntimeError(f"Capture sidecar has no scenario object: {source}")
    sequence = scenario.get("sequence")
    player = scenario.get("player")
    expected_factor = clip.get("requiredFactorPortraitSourceId")
    if expected_factor is not None:
        if not isinstance(expected_factor, str) or not expected_factor:
            raise RuntimeError(f"Invalid required factor portrait source: {source}")
        actual_factor = sequence.get("factorPortraitSourceId") if isinstance(sequence, dict) else None
        if actual_factor != expected_factor:
            raise RuntimeError(
                f"{source} factor portrait is {actual_factor}; expected {expected_factor}"
            )
        portrait_events = [
            event for event in sidecar["events"]
            if event.get("type") == "capture-portrait"
            and event.get("data", {}).get("role") == "factor"
        ]
        if len(portrait_events) != 1 or portrait_events[0].get("data", {}).get("sourceId") != expected_factor:
            raise RuntimeError(f"{source} did not render the required factor portrait")

    expected_player = clip.get("requiredPlayerPortraitSourceId")
    if expected_player is not None:
        if not isinstance(expected_player, str) or not expected_player:
            raise RuntimeError(f"Invalid required player portrait source: {source}")
        actual_player = player.get("characterPortraitSourceId") if isinstance(player, dict) else None
        if actual_player != expected_player:
            raise RuntimeError(
                f"{source} player portrait is {actual_player}; expected {expected_player}"
            )


def validate_clip_broadside(source, sidecar, start, duration, required_broadside):
    if required_broadside is None:
        return
    if not isinstance(required_broadside, dict):
        raise RuntimeError(f"requiredBroadside must be an object: {source}")
    side = required_broadside.get("side")
    if side not in {"port", "starboard"}:
        raise RuntimeError(f"Invalid required broadside side for {source}: {side}")
    player_volleys = [
        event for event in sidecar["events"]
        if event.get("type") == "weapon-fired"
        and event.get("data", {}).get("ownerId") == "player"
        and event.get("data", {}).get("weapon") == "cannon"
    ]
    if len(player_volleys) != 1:
        raise RuntimeError(f"{source} must contain exactly one player cannon volley; found {len(player_volleys)}")
    volley = player_volleys[0]
    if volley.get("data", {}).get("side") != side:
        raise RuntimeError(f"{source} fired the wrong broadside")
    start_ms = round(start * 1000)
    end_ms = round((start + duration) * 1000)
    if not start_ms <= volley.get("t", -1) < end_ms:
        raise RuntimeError(f"{source} player broadside falls outside its edit window")

    target_id = required_broadside.get("targetId")
    target_prefix = required_broadside.get("targetIdPrefix")
    if (target_id is None) == (target_prefix is None):
        raise RuntimeError(f"{source} broadside needs exactly one target id or target prefix")
    hits = []
    for event in sidecar["events"]:
        data = event.get("data", {})
        if event.get("type") != "projectile-hit" or data.get("ownerId") != "player" or data.get("weapon") != "cannon":
            continue
        if not start_ms <= event.get("t", -1) < end_ms:
            continue
        event_target = data.get("targetId")
        if target_id is not None and event_target != target_id:
            continue
        if target_prefix is not None and (not isinstance(event_target, str) or not event_target.startswith(target_prefix)):
            continue
        hits.append(event)
    minimum_hits = required_frame_count(
        required_broadside.get("minimumHits"),
        f"{source} required cannon hit count",
    )
    if len(hits) < minimum_hits:
        raise RuntimeError(
            f"{source} needs at least {minimum_hits} visible player cannon hits; found {len(hits)}"
        )


def sfx_duration(asset):
    key = str(asset)
    if key not in SFX_DURATION_CACHE:
        SFX_DURATION_CACHE[key] = probe_duration(asset)
    return SFX_DURATION_CACHE[key]


def resolve_sfx_event(source, event):
    event_time_ms = event.get("t")
    if not isinstance(event_time_ms, (int, float)) or isinstance(event_time_ms, bool):
        raise RuntimeError(f"Capture SFX event has no numeric timestamp: {source}")
    if not math.isfinite(event_time_ms) or event_time_ms < 0:
        raise RuntimeError(f"Capture SFX event has an invalid timestamp: {source}")
    data = event.get("data")
    if not isinstance(data, dict):
        raise RuntimeError(f"Capture SFX event has no data object: {source}")
    asset_path = data.get("assetPath")
    if not isinstance(asset_path, str) or not asset_path.startswith("assets/sfx/"):
        raise RuntimeError(f"Capture SFX event has an invalid asset path: {source}")
    public_root = (APP / "public").resolve()
    asset = (public_root / asset_path).resolve()
    try:
        asset.relative_to(public_root)
    except ValueError as error:
        raise RuntimeError(f"Capture SFX asset escapes the public directory: {asset_path}") from error
    require_file(asset)
    volume = required_positive_number(data.get("volume"), f"{source} SFX volume")
    playback_rate = required_positive_number(
        data.get("playbackRate"),
        f"{source} SFX playback rate",
    )
    if not 0.5 <= playback_rate <= 2:
        raise RuntimeError(f"{source} SFX playback rate is unsupported: {playback_rate}")
    return {
        "assetPath": asset_path,
        "asset": str(asset),
        "eventTime": event_time_ms / 1000,
        "effectDuration": sfx_duration(asset) / playback_rate,
        "volume": volume,
        "playbackRate": playback_rate,
    }


def layered_sfx_cues(
    source,
    sidecar,
    start,
    duration,
    timeline_start,
    audio_gain,
    carry_sfx,
):
    resolved_events = [
        resolve_sfx_event(source, event)
        for event in sidecar["events"]
        if event.get("type") == "capture-sfx"
    ]
    if carry_sfx is not None:
        if not isinstance(carry_sfx, dict):
            raise RuntimeError(f"carrySfx must be an object: {source}")
        kind = carry_sfx.get("kind")
        if kind not in FEATURED_SFX:
            raise RuntimeError(f"Unknown carried SFX kind for {source}: {kind}")
        matches = [
            resolved for resolved in resolved_events
            if start <= resolved["eventTime"] < start + duration
            and resolved["assetPath"] == FEATURED_SFX[kind]
        ]
        if len(matches) != 1:
            raise RuntimeError(
                f"{source} needs exactly one {kind} cue to cross its cut; found {len(matches)}"
            )
        match = matches[0]
        tail_duration = match["eventTime"] + match["effectDuration"] - (start + duration)
        if tail_duration <= 0.1:
            raise RuntimeError(f"{source} {kind} cue does not cross the following cut")

    cues = []
    clip_end = start + duration
    timeline_cut = timeline_start + duration
    for resolved in resolved_events:
        effect_start = resolved["eventTime"]
        if effect_start < start or effect_start >= clip_end:
            continue
        cue_start = timeline_start + effect_start - start
        cue_duration = resolved["effectDuration"]
        cues.append({
            **resolved,
            "source": str(source),
            "sourceClipStart": start,
            "sourceClipEnd": clip_end,
            "timelineStart": cue_start,
            "timelineEnd": cue_start + cue_duration,
            "clipCut": timeline_cut,
            "volume": resolved["volume"] * audio_gain,
            "crossesCut": cue_start + cue_duration > timeline_cut + 0.001,
        })
    return cues


def render_timeline_sfx(cues, duration, output):
    if not cues:
        run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:d={duration}",
            "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", output,
        ])
        return

    inputs = []
    filters = []
    labels = []
    for index, cue in enumerate(cues):
        inputs.extend(["-i", cue["asset"]])
        label = f"cue-{index}"
        delay_ms = round(cue["timelineStart"] * 1000)
        filters.append(
            f"[{index}:a]aresample=48000,"
            "aformat=sample_fmts=flt:channel_layouts=stereo,"
            f"atempo={cue['playbackRate']},volume={cue['volume']},"
            f"asetpts=PTS-STARTPTS,adelay=delays={delay_ms}:all=1[{label}]"
        )
        labels.append(f"[{label}]")
    filters.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={duration}[silence]")
    filters.append(
        f"[silence]{''.join(labels)}"
        f"amix=inputs={len(labels) + 1}:duration=first:dropout_transition=0:normalize=0,"
        f"alimiter=limit=0.92,atrim=duration={duration}[audio]"
    )
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        *inputs,
        "-filter_complex", ";".join(filters),
        "-map", "[audio]", "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2",
        output,
    ])


def montage_boundary_frames(montage, music):
    track = montage.get("track")
    bpm_key = "shipBpm" if track == "ship" else "combatBpm" if track == "combat" else None
    if bpm_key is None:
        raise RuntimeError(f"Unknown montage music track: {track}")
    bpm = required_positive_number(music.get(bpm_key), bpm_key)
    subdivisions = required_frame_count(
        montage.get("subdivisionsPerBeat"),
        f"{montage.get('id', 'montage')} subdivisions per beat",
    )
    start_subdivision = required_frame_count(
        montage.get("startSubdivision"),
        f"{montage.get('id', 'montage')} start subdivision",
        minimum=0,
    )
    clips = montage.get("clips")
    if not isinstance(clips, list) or len(clips) != 4:
        raise RuntimeError(f"{montage.get('id', 'montage')} must contain exactly four beat cuts")
    origin_frame = 0
    if track == "combat":
        origin_frame = music["fightStartFrame"] - music["crossfadeFrames"] // 2
    frames_per_subdivision = FPS * 60 / bpm / subdivisions
    return [
        origin_frame + round((start_subdivision + index) * frames_per_subdivision)
        for index in range(len(clips) + 1)
    ]


def build_timeline(plan):
    chapters = plan["chapters"]
    music = plan["music"]
    montages = plan.get("montages")
    if not isinstance(montages, list) or len(montages) != 2:
        raise RuntimeError("Trailer plan must define exactly two beat-cut montages")
    montages_by_chapter = {}
    for montage in montages:
        montage_id = montage.get("id")
        if not isinstance(montage_id, str) or not montage_id:
            raise RuntimeError("Every montage needs an id")
        after_chapter = montage.get("afterChapter")
        if after_chapter in montages_by_chapter:
            raise RuntimeError(f"Multiple montages follow {after_chapter}")
        montages_by_chapter[after_chapter] = montage

    sections = []
    cursor_frame = 0
    cut_frames = []
    seen_montages = set()
    for chapter in chapters:
        heading = chapter["heading"]
        section_start_frame = cursor_frame
        planned_clips = []
        for clip in chapter["clips"]:
            duration_frames = required_frame_count(
                clip.get("durationFrames"),
                f"{heading} clip duration",
                MINIMUM_FEATURE_CLIP_FRAMES,
            )
            planned_clips.append({**clip, "durationFrames": duration_frames})
            cursor_frame += duration_frames
            cut_frames.append(cursor_frame)
        sections.append({
            "kind": "chapter",
            "heading": heading,
            "timelineStartFrame": section_start_frame,
            "clips": planned_clips,
        })

        montage = montages_by_chapter.get(heading)
        if not montage:
            continue
        boundaries = montage_boundary_frames(montage, music)
        if boundaries[0] != cursor_frame:
            raise RuntimeError(
                f"{montage['id']} begins at frame {boundaries[0]}, but the edit is at frame {cursor_frame}"
            )
        planned_clips = []
        for index, clip in enumerate(montage["clips"]):
            duration_frames = boundaries[index + 1] - boundaries[index]
            required_frame_count(
                duration_frames,
                f"{montage['id']} beat-cut duration",
                MINIMUM_MONTAGE_CLIP_FRAMES,
            )
            planned_clips.append({**clip, "durationFrames": duration_frames})
            cursor_frame += duration_frames
            cut_frames.append(cursor_frame)
        sections.append({
            "kind": "montage",
            "id": montage["id"],
            "track": montage["track"],
            "timelineStartFrame": boundaries[0],
            "clips": planned_clips,
            "beatBoundariesFrames": boundaries,
        })
        seen_montages.add(montage["id"])

    if seen_montages != {montage.get("id") for montage in montages}:
        raise RuntimeError("Every montage must follow a named trailer chapter")
    if cut_frames != music.get("syncCutFrames"):
        raise RuntimeError(f"Trailer cut frames do not match the reviewed music sync: {cut_frames}")
    return sections, cursor_frame, cut_frames


def resolve_app_path(value):
    path = Path(value)
    return path if path.is_absolute() else (APP / path).resolve()


def parse_args():
    parser = argparse.ArgumentParser(description="Build a Marque & Reprisal Steam trailer")
    parser.add_argument("--plan", default=str(PLAN_PATH))
    parser.add_argument("--captures", default=str(CAPTURES))
    parser.add_argument("--output", default=str(OUTPUT))
    parser.add_argument("--subtitle", default="Wishlist on Steam")
    return parser.parse_args()


def main():
    args = parse_args()
    plan_path = resolve_app_path(args.plan)
    captures = resolve_app_path(args.captures)
    output = resolve_app_path(args.output)
    if not args.subtitle.strip():
        raise RuntimeError("Trailer outro subtitle cannot be empty")
    for required in (
        plan_path,
        FONT_PATH,
        TITLE_PATH,
        SAILING_MUSIC_INTRO,
        SAILING_MUSIC_LOOP,
        COMBAT_MUSIC_INTRO,
        COMBAT_MUSIC_LOOP,
    ):
        require_file(required)

    plan = json.loads(plan_path.read_text())
    chapters = plan.get("chapters")
    validation = plan.get("validation")
    if not isinstance(validation, dict):
        raise RuntimeError("Trailer plan must define validation rules")
    chapter_count = required_frame_count(
        validation.get("chapterCount"),
        "trailer chapter count",
    )
    if not isinstance(chapters, list) or len(chapters) != chapter_count:
        raise RuntimeError(f"Trailer plan must define exactly {chapter_count} chapters")
    if any(len(chapter.get("clips", [])) < 2 for chapter in chapters):
        raise RuntimeError("Every trailer chapter requires at least two clips")
    music = plan.get("music")
    if not isinstance(music, dict):
        raise RuntimeError("Trailer plan must define music synchronization")
    transition_heading = music.get("transitionHeading")
    if not isinstance(transition_heading, str) or not transition_heading:
        raise RuntimeError("Trailer music must name its transition chapter")
    fight_indices = [
        index for index, chapter in enumerate(chapters)
        if chapter.get("heading") == transition_heading
    ]
    if len(fight_indices) != 1:
        raise RuntimeError(
            f"Trailer plan must define exactly one {transition_heading} transition chapter"
        )
    fight_index = fight_indices[0]
    required_previous_heading = music.get("requiredPreviousHeading")
    if not isinstance(required_previous_heading, str) or not required_previous_heading:
        raise RuntimeError("Trailer music must name the chapter before its transition")
    if fight_index == 0 or chapters[fight_index - 1].get("heading") != required_previous_heading:
        raise RuntimeError(
            f"{required_previous_heading} must immediately precede {transition_heading}"
        )
    fight_start_frame = required_frame_count(music.get("fightStartFrame"), "fight start frame")
    crossfade_frames = required_frame_count(music.get("crossfadeFrames"), "crossfade frames")
    if crossfade_frames % 2 != 0:
        raise RuntimeError("Music crossfade must have an even frame count")
    if music.get("combatSyncAttackFrame") != crossfade_frames // 2:
        raise RuntimeError("The combat sync attack must land at the crossfade midpoint")
    sections, gameplay_frames, cut_frames = build_timeline(plan)
    fight_section = next(
        section for section in sections
        if section.get("heading") == transition_heading
    )
    if fight_section["timelineStartFrame"] != fight_start_frame:
        raise RuntimeError(
            f"Fight begins at frame {fight_section['timelineStartFrame']}, expected {fight_start_frame}"
        )
    fight_start_seconds = fight_start_frame / FPS
    crossfade_seconds = crossfade_frames / FPS

    shutil.rmtree(TEMP, ignore_errors=True)
    OVERLAYS.mkdir(parents=True)
    SEGMENTS.mkdir(parents=True)
    outro_frames = required_frame_count(plan.get("outroFrames"), "outro frames")
    outro_seconds = outro_frames / FPS
    segment_paths = []
    edit = {
        "chapters": [],
        "montages": [],
        "timeline": [],
        "layeredSfx": [],
        "outro": {},
        "music": {
            "beforeFight": "ship-theme",
            "fromFight": "combat-theme",
            "crossfadeSeconds": crossfade_seconds,
            "fightStartSeconds": fight_start_seconds,
            "crossfadeStartFrame": fight_start_frame - crossfade_frames // 2,
            "combatSyncAttackFrame": music["combatSyncAttackFrame"],
            "shipBpm": music["shipBpm"],
            "combatBpm": music["combatBpm"],
            "syncCutFrames": cut_frames,
        },
        "output": str(output),
    }

    segment_index = 0
    timeline_cursor_frame = 0
    layered_sfx = []
    final_source = None
    final_source_end = None
    for section in sections:
        if section["timelineStartFrame"] != timeline_cursor_frame:
            raise RuntimeError(
                f"Timeline cursor is {timeline_cursor_frame}, but section begins at "
                f"{section['timelineStartFrame']}"
            )
        is_chapter = section["kind"] == "chapter"
        heading = section.get("heading")
        edit_section = {
            "kind": section["kind"],
            "timelineStartFrame": section["timelineStartFrame"],
            "clips": [],
        }
        if is_chapter:
            edit_section["heading"] = heading
        else:
            edit_section.update({
                "id": section["id"],
                "track": section["track"],
                "beatBoundariesFrames": section["beatBoundariesFrames"],
            })
        for clip in section["clips"]:
            source = captures / clip["source"]
            start_frame = required_frame_count(clip.get("startFrame"), f"{source} start frame", minimum=0)
            duration_frames = clip["durationFrames"]
            start = start_frame / FPS
            duration = duration_frames / FPS
            audio_gain = required_positive_number(
                clip.get("audioGain", 1),
                f"{source} audio gain",
            )
            source_duration = probe_duration(source)
            if start < 0 or start + duration > source_duration + 0.04:
                raise RuntimeError(
                    f"Clip window exceeds source: {source} starts {start}s for {duration}s "
                    f"but source is {source_duration}s"
                )
            sidecar = load_capture_sidecar(source)
            validate_clip_sfx(
                source,
                sidecar,
                start,
                duration,
                clip.get("requiredSfx"),
            )
            validate_clip_portraits(source, sidecar, clip)
            validate_clip_broadside(
                source,
                sidecar,
                start,
                duration,
                clip.get("requiredBroadside"),
            )
            clip_sfx = layered_sfx_cues(
                source,
                sidecar,
                start,
                duration,
                timeline_cursor_frame / FPS,
                audio_gain,
                clip.get("carrySfx"),
            )
            layered_sfx.extend(clip_sfx)
            label = heading.lower() if is_chapter else section["id"]
            segment_path = SEGMENTS / f"{segment_index:02d}-{label}.mkv"
            render_segment(
                source,
                start,
                duration,
                segment_path,
            )
            segment_paths.append(segment_path)
            final_source = source
            final_source_end = start + duration
            edit_clip = {
                "source": str(source),
                "start": start,
                "duration": duration,
                "startFrame": start_frame,
                "durationFrames": duration_frames,
                "audioGain": audio_gain,
                "sourceAudioMuted": True,
                "layeredSfxCount": len(clip_sfx),
            }
            edit_section["clips"].append(edit_clip)
            segment_index += 1
            timeline_cursor_frame += duration_frames
        edit["timeline"].append(edit_section)
        if is_chapter:
            edit["chapters"].append(edit_section)
        else:
            edit["montages"].append(edit_section)

    if timeline_cursor_frame != gameplay_frames:
        raise RuntimeError(
            f"Rendered timeline has {timeline_cursor_frame} frames; expected {gameplay_frames}"
        )
    edit["layeredSfx"] = layered_sfx

    if final_source is None or final_source_end is None:
        raise RuntimeError("Trailer has no final frame for its outro")
    final_source_duration = probe_duration(final_source)
    if final_source_end > final_source_duration + 0.04:
        raise RuntimeError("Final trailer clip exceeds its source")
    outro_source_start = max(0, final_source_end - 1 / FPS)
    outro_source_duration = min(
        OUTRO_SOURCE_MAX_SECONDS,
        final_source_duration - outro_source_start,
    )
    if outro_source_duration <= 0:
        raise RuntimeError("Final trailer clip has no footage available for its moving outro")
    outro_path = SEGMENTS / f"{segment_index:02d}-outro.mkv"
    render_outro_motion(
        final_source,
        outro_source_start,
        outro_source_duration,
        outro_seconds,
        make_outro_sprite(args.subtitle.strip()),
        outro_path,
    )
    segment_paths.append(outro_path)
    edit["outro"] = {
        "source": str(final_source),
        "sourceStart": outro_source_start,
        "sourceDuration": outro_source_duration,
        "playbackRate": outro_source_duration / outro_seconds,
        "duration": outro_seconds,
        "blurSeconds": OUTRO_BLUR_SECONDS,
        "titleAnimation": "two-rebound-pop",
        "titleSettlesAfterSeconds": OUTRO_TITLE_START_SECONDS + OUTRO_TITLE_SETTLE_SECONDS,
        "titleSource": str(TITLE_PATH),
        "subtitle": args.subtitle.strip(),
    }

    concat_path = TEMP / "segments.txt"
    concat_path.write_text("".join(f"file '{path.resolve()}'\n" for path in segment_paths))
    gameplay_path = TEMP / "gameplay.mkv"
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_path,
        "-c", "copy", gameplay_path,
    ])

    expected_frames = gameplay_frames + outro_frames
    expected_duration = expected_frames / FPS
    actual_duration = probe_duration(gameplay_path)
    if not math.isclose(actual_duration, expected_duration, abs_tol=0.2):
        raise RuntimeError(
            f"Concatenated trailer is {actual_duration:.3f}s; expected {expected_duration:.3f}s"
        )

    music_path = TEMP / "music.wav"
    sfx_path = TEMP / "sfx.wav"
    render_timeline_sfx(layered_sfx, expected_duration, sfx_path)
    music_fade_start = max(0.0, expected_duration - 4.0)
    sailing_music_duration = fight_start_seconds + crossfade_seconds / 2
    combat_music_duration = expected_duration - fight_start_seconds + crossfade_seconds / 2
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
        f"[sailing][combat]acrossfade=d={crossfade_seconds}:c1=tri:c2=tri,"
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

    final_inputs = ["-i", gameplay_path, "-i", music_path, "-i", sfx_path]
    final_filter_parts = [
        "[1:a]aresample=48000[music]",
        f"[2:a]aresample=48000,volume=0.82,"
        f"afade=t=out:st={expected_duration - 1.5}:d=1.5[game]",
    ]
    final_filter_parts.append(
        "[game][music]amix=inputs=2:duration=first:dropout_transition=0,"
        "alimiter=limit=0.92,loudnorm=I=-14:TP=-1.5:LRA=9[audio]"
    )
    final_filters = ";".join(final_filter_parts)
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        *final_inputs,
        "-filter_complex", final_filters,
        "-map", "0:v:0", "-map", "[audio]",
        "-c:v", "libx264", "-preset", "slow", "-tune", "animation",
        "-b:v", "10M", "-minrate", "10M", "-maxrate", "10M", "-bufsize", "20M",
        "-x264-params", "nal-hrd=cbr:force-cfr=1",
        "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", "-t", str(expected_duration), output,
    ])

    final_duration = probe_duration(output)
    if not math.isclose(final_duration, expected_duration, abs_tol=0.08):
        raise RuntimeError(
            f"Final trailer is {final_duration:.3f}s; expected {expected_duration:.3f}s"
        )
    edit["durationSeconds"] = final_duration
    output.with_suffix(".edit.json").write_text(
        json.dumps(edit, indent=2) + "\n"
    )
    print(f"Rendered {output} ({final_duration:.2f}s)")


if __name__ == "__main__":
    main()
