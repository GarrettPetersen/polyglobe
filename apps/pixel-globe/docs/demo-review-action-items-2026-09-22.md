# Steam demo review action items — 22 September 2026

Source: the live Steam review feed for demo app `5029880`, read on
22 September 2026. The feed contained three reviews: three positive and zero
negative. This is useful qualitative evidence, but too small a sample for product
or localization conclusions by itself.

## What the reviews say

- An English reviewer recommended the demo after 238 minutes and said they were
  looking forward to the full release.
- A second English reviewer recommended it after 123 minutes, called it very fun,
  and specifically praised the different ways to play.
- A Japanese reviewer recommended it after seven minutes and saw the potential
  for an exceptional game, but described the current build as roughly
  Famicom-quality and said it did not yet feel ready to play. They wishlisted it
  to follow development.

The useful contrast is between two players who stayed for hours and one player
whose first seven minutes communicated promise without sufficient polish. The
Japanese wording does not identify graphics, controls, onboarding, performance,
or content as the cause, so it should not be converted into a speculative art
redesign.

## P0 — before the one-time Steam demo notification

- [ ] Run a recorded, clean-install Japanese first-session audit on the current
  Steam build.
  - Use the public Japanese build with no existing save or settings.
  - Exercise launch, captain selection, the opening dialogue, leaving the home
    port, sailing controls, the first destination, and one complete money-earning
    action.
  - Record every untranslated string, clipped or overlapping element, unclear
    objective, unresponsive input, long unexplained wait, and weak action result.
  - Completion: the entire route is understandable without consulting an English
    build, and every discovered defect has been fixed or explicitly triaged.

- [ ] Review first-session telemetry by language, platform, and input method.
  - Compare exits before voyage start, departure, first port arrival, first
    completed activity, ten minutes, and thirty minutes.
  - First audit whether those milestones already exist. Add bounded,
    non-identifying events only for missing decisions; do not infer a funnel from
    unrelated aggregate playtime.
  - Completion: produce a baseline that shows whether the seven-minute Japanese
    exit resembles a recurring first-session problem or one player's preference.

- [ ] Fix the concrete first-session polish defects found by the audit before
  pressing Steam's one-time demo notification button.
  - Prioritize broken or unclear input, startup friction, illegible UI,
    localization defects, missing feedback, and visible stalls.
  - Re-run the clean-install route in Japanese and English on the affected
    platforms and capture comparison screenshots or video.
  - Completion: no unresolved high-severity defect remains in the audited route.

## P1 — before October Next Fest

- [ ] Conduct three blind first-15-minute playtests, including at least one
  Japanese-speaking player.
  - Cover keyboard and mouse plus controller across the set.
  - Ask players to narrate what they believe their goal is, what each major
    control does, and what result they expect before selecting an action.
  - Completion: consolidate repeated friction into fixes; keep isolated taste
    comments separate from usability failures.

- [ ] Preserve and foreground the breadth that the longer English review praised.
  - Verify that a new demo captain can discover several viable activities through
    ordinary play without reading store copy or a manual.
  - Do not force every system into the opening minutes. Improve signposting where
    a play path exists but remains invisible.
  - Completion: the blind tests identify at least two distinct activities they
    could pursue after the opening task.

- [ ] Ask existing demo players for honest Steam reviews through an appropriate
  public support or update post after the next verified build.
  - Do not incentivize reviews or ask specifically for positive reviews.
  - Do not add an in-game review interruption until there is evidence that it
    would help more than it disrupts play.
  - Completion: gather enough written feedback to identify repeated themes rather
    than treating three reviews as a trend.

## Release guardrails

- Keep the current gameplay breadth. The only specific feature observation in
  the reviews is positive.
- Do not undertake a broad pixel-art replacement from “Famicom-quality” alone.
  Diagnose the first-session experience and act on reproducible defects.
- Do not use the 100% recommendation rate as proof that onboarding or polish is
  solved; the sample contains only three reviews.

## Public sources

- [Steam demo reviews](https://steamcommunity.com/app/5029880/reviews/?browsefilter=mostrecent)
- [Steam review feed](https://store.steampowered.com/appreviews/5029880?json=1&language=all&purchase_type=all&filter=recent&num_per_page=100&day_range=365)
- [Demo app record](https://steamdb.info/app/5029880/)
