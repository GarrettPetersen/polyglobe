# Marque & Reprisal Marketing Plan

Last updated: **September 2, 2026**.

## Dated marketing calendar

- **August 19–30:** The first daily YouTube Short run is complete. Reconcile
  the published status in
  [youtube-shorts-release-log.md](youtube-shorts-release-log.md), then schedule
  the next batch and cross-post it to X.
- **September 2:** Follow up on Galaxies Autumn; its August 24 selection-notice
  date has passed without a recorded result. Also confirm whether the submitted
  SCHMOOVEMENT application was accepted before its September 22 start.
- **September 2:** Indie Game Award 2027 pre-selection materials submitted.
- **September 7:** IGF 2027 fee-waiver request deadline. Steam also pulls the
  current base-game trailer for possible inclusion in its official Next Fest
  trailer, if Valve has notified us that the game is under consideration.
- **September 13:** IGF 2027 application and build deadline.
- **September 21:** Submit the Next Fest demo build and store page for review
  to be ready for the press preview.
- **September 22–29:** SCHMOOVEMENT Festival.
- **September 28:** Galaxies Autumn trailer deadline, if selected.
- **October 5:** Submit all Next Fest materials. The Atlantic Canada Game
  Celebration also begins, so the demo should already be public and its
  logged-out install flow verified.
- **October 5–12:** Atlantic Canada Game Celebration.
- **October 15:** Galaxies Autumn showcase, if selected.
- **October 19 at 10:00 a.m. PDT:** Absolute Next Fest deadline for the public
  demo. Our operational target is earlier than October 5 because of ACGC.
- **October 19–26:** Steam Next Fest.
- **After October 26:** Review wishlists, demo conversion, creator coverage and
  build stability, then make the release go/no-go decision for the working
  **December 1** launch date.
- **December 1:** Working release date. If confirmed after Next Fest, launch
  with the planned introductory discount and a coordinated creator, press,
  Steam, X, Reddit and YouTube campaign. A December 1 release is still within
  Steam's 30-day release cooldown when the Winter Sale begins December 17, so
  the game cannot be discounted in that sale.

The coordinated public demo launch does not have a date yet. Set it only after
the release-blocking demo checks below pass, then work backward one to two weeks
for creator access and prepare the Steam, X, Reddit, Japanese-press and
GamesPress posts for the same launch beat.

## Store and build

- [x] **Get the Steam page up**
  - Status: Launched.
  - Store page: https://store.steampowered.com/app/4516500/Marque__Reprisal/

- [ ] **Make the approved Steam demo public**
  - Status: Valve approved the demo page and build. The associated demo has
    been marked ready in Steamworks. As of September 2, its public page still
    says **Coming soon**, and the base-game page has no demo install control.
    The public launch and logged-out install flow still need to be completed
    and verified.
  - Steam App: `5029880`.
  - The demo has no timer and retains the full feature set, but its voyages are
    centered on the family-debt quest and limited to the Mediterranean, Black
    Sea and connected rivers.
  - After releasing the demo, republish the base-game store page so Steam adds
    the demo install button. Verify the associated-demo prominence setting and
    both logged-in and logged-out install flows.
  - Use Steam's one-time demo wishlist notification for the coordinated launch
    beat. It can be sent within two weeks after the demo first becomes playable;
    do not spend it on an unannounced soft launch.

- [ ] **Update the main-game and demo Steam descriptions for the larger world**
  - As of September 2, the public English pages still describe a 164k-hex
    world. Update all 11 store localizations to the current **655,362-tile
    Earth with 277 cities**, matching the website and current build.

- [x] **Get the full build approved on Steam**
  - Status: Valve approved the corrected full build on August 13.
  - Keep the build private until release, apart from keys provided for coverage
    and testing.

- [ ] **Connect Steam Stats and Steam Cloud**
  - Test stats, achievements and cloud saves on Windows, macOS and Linux.
  - Test upgrading from the demo to the full game without losing settings or saves.

## Trailer

- [x] **End the IGN exclusivity wait and launch with a trailer on Steam**
  - The campaign is no longer holding the trailer for an exclusive.
  - Steam has a trailer, and the current 39.7-second gameplay trailer and
    thumbnail are available in the press kit.

- [ ] **Publish the current trailer cut publicly on YouTube**
  - Confirm that YouTube and Steam both use the final recut rather than an older
    draft.
  - Link the public upload from the website and future press pitches.

## BiteMe Games checklist audit

Rechecked **August 19, 2026** against BiteMe Games' live public
[Steam Store Page Checklist](https://bmg.yt/steampage) and
[Steam Demo Checklist](https://bmg.yt/demo).
These are useful QA lists, not Steam requirements. Apply the recommendations
that remove friction or make the game easier to understand; do not change the
game merely to tick every box.

### Already covered

- [x] The public Steam page has a clear genre, goal and player verbs in its
  short description.
- [x] The page has a gameplay trailer, 14 gameplay screenshots with the UI
  visible, 20 tags, 11 localized store languages, a website and a press kit.
- [x] The current trailer is within BiteMe's recommended 30–50-second range.
- [x] The demo is also available on itch.io.
- [x] The demo has a main menu and localization rather than launching directly
  into an unexplained game state.

### Complete before the public demo beat

- [ ] **Pass the BiteMe release-blocker audit on a clean installation.**
  - Confirm the demo is a stable slice rather than a public playtest: no known
    crashes, progression blockers, dead ends or broken save states.
  - Confirm the pause menu actually pauses play and provides access to the
    necessary settings.
  - Test `Shift+Tab`: opening the Steam Overlay should pause the game.
  - Put the core sailing loop in front of a new player within the first three
    minutes. Do not make the player sit through an opening cinematic or lore
    dump before reaching it.
  - Give the demo a clear endpoint and wishlist call to action even though it
    has no timer.
  - Make Quit behave like Quit. Do not force-open Steam or a browser as the
    price of leaving the game.

- [ ] **Pass the BiteMe onboarding audit with a new player.**
  - Start at a functioning main menu.
  - Provide enough tutorial guidance for the player to understand the goal and
    first actions without outside instructions.
  - Display the required controls through prompts or a clear input diagram.
  - Test mouse, keyboard and Xbox-style controller input throughout the menu,
    tutorial, pause screen and core loop.
  - Test AZERTY and QWERTZ layouts so a non-QWERTY player cannot be soft-locked.
  - Make support or Steam Discussions easy to reach from the main menu.

- [ ] **Pass an audio and settings audit.**
  - Confirm music, wind/sea ambience and sound effects cover every major
    interaction without abrupt cutoffs or important silent actions.
  - Check default mix levels on headphones and speakers; do not adopt an
    arbitrary 50% default if a different mix is better.
  - Confirm master, music, effects and ambient controls behave correctly where
    those channels are exposed.
  - Verify windowed/fullscreen behaviour, resolution or window resizing, VSync
    and frame limiting on the packaged Windows, macOS and Linux builds. Add
    options that solve real packaged-build problems rather than copying a
    generic settings menu verbatim.
  - Recheck all 11 localizations in the packaged demo.

- [ ] **Add a low-friction wishlist call to action.**
  - Put a Steam wishlist button in the demo's main menu and at its natural
    endpoint. Use the Steam Overlay when available and a UTM-tagged fallback
    link when it is not.
  - Do not interrupt normal play or hijack the Quit button with the call to
    action.

- [ ] **Make support and community destinations easy to find.**
  - Link Steam Discussions or another support channel from the main menu.
  - Add the public YouTube channel once the final trailer is live.
  - Create a Discord only if Garrett wants to maintain and moderate it; an
    unattended server is not a checklist win.

- [ ] **Run one final store-asset audit.**
  - Confirm every capsule follows Valve's current template, preserves the
    artwork's aspect ratio, has strong contrast and contains no copy other than
    the game title.
  - Confirm the first screenshot immediately communicates globe sailing, the
    main mechanic, and the real in-game HUD.
  - Confirm the trailer cold-open shows four or five distinct highlights in
    the first 15 seconds, individual shots stay under roughly six seconds, and
    the final five to eight seconds have a clear Steam call to action.
  - Confirm the Steam developer/publisher link leads to an Iron Pagoda developer
    homepage and follow the game's Steam Community discussion board.

- [ ] **Give selected creators advance access one to two weeks before the
  coordinated public demo beat.**
  - Prefer full-build review keys because they provide more to show. If the full
    build is not approved in time, use demo release-state override keys for the
    highest-priority creators.
  - Do not mass-send all 2,837 contacts before measuring the first batches.

- [ ] **Prepare the demo-release trailer and external launch package.**
  - Use a clean current-build trailer with a clear **Play the demo** call to
    action. Do not create another cut if the current trailer only needs a new
    end card.
  - Confirm the itch.io demo is current and under its platform limits.
  - Prepare Steam, X, Reddit, Japanese-press, creator and GamesPress copy using
    campaign-specific UTM links.

### Recommendations not adopted automatically

- Keep the substantial localized About This Game section. Do not cut it to an
  arbitrary character count while it is doing useful work explaining a complex
  game; judge it by store-page conversion data.
- Treat animated menus, hover sounds, button scaling/squish, tweened windows,
  universally randomized sound pitch, a fixed 50% starting volume, every
  frame-cap option and every display-mode variant as product-polish
  suggestions. Add them when playtesting or packaged-build QA identifies a
  real problem, not solely because they appear on a generic checklist.
- Do not add Discord, extra social accounts or more store languages without a
  plan to support them well.

## Japanese press outreach

The first Japanese press pass was completed on **August 2, 2026**, following
Indie Freaks' July 30 coverage. The pitches use that post as social proof without
describing it as an endorsement. Full outlet-specific copy, submission details and
sender guidance are kept in [japanese-media-outreach.md](japanese-media-outreach.md).

- [x] Prepare the reusable Japanese campaign links.
  - Indie Freaks coverage: https://x.com/Indie_FreaksJP/status/2082949368362238267
  - Steam in Japanese: https://store.steampowered.com/app/4516500/Marque__Reprisal/?l=japanese
  - Japanese website and browser demo: https://marque-and-reprisal.com/ja/
  - Japanese press kit: https://marque-and-reprisal.com/ja/press/
  - Link to the press kit instead of attaching large files.

- [x] Send the first seven pitches individually from `garrett.m.petersen@gmail.com`.
  - AUTOMATON: sent to `press@automaton.am`.
  - 電ファミニコゲーマー: sent to `release@mare-inc.net`.
  - Game*Spark: submitted through the IID media form as **ゲームスパーク → リリース送付**.
  - 4Gamer: submitted through **パブリッシャーおよびデベロッパーの皆様 → ニュースリリースの送付について**.
  - ファミ通.com: sent to `kgl-famitsu-release@ml.kadokawa.jp`.
  - IGN Japan: sent to `ign_japan@ign.com`.
  - もぐらゲームス: submitted through its official Google form as a self-submitted game and press release.

- [ ] Monitor replies and coverage from the first Japanese press pass.
  - August 2 inbox check: no replies from the seven outlets yet.
  - Respond promptly with requested assets, a review build or a Steam key.
  - 4Gamer's form says it may reply with a dedicated release-submission address;
    send the complete release there when it arrives.
  - Record coverage and useful editorial feedback before planning a second wave.
  - Avoid sending a generic follow-up unless there is a material new beat, such as
    the Steam demo launch, a major trailer, Next Fest or the release date.

## Streamer outreach

- [x] Add **Marque & Reprisal** to IGDB so it can receive a Twitch game category.
  - Submitted August 2 under Garrett's `econdetective` account.
  - IGDB game ID: `412123`; contribution change: `2982132`.
  - The contribution includes the cover, four screenshots, store and website
    links, Windows/macOS/Linux release entries, categorization and all 11
    interface languages.
  - Moderation is pending. Developer-account verification is optional and is
    not blocking the contribution.
  - Verify the category appears on Twitch after the IGDB submission is approved.
  - Use the category to monitor for new streams and notify Garrett.

- [ ] Set up a proper campaign sender at `marque-and-reprisal.com`, including
  SPF, DKIM and DMARC, before the first large creator-outreach batch.

- [ ] Prepare the first creator-outreach wave.
  - The CSV now contains 2,837 contacts; finding more names is not the current
    bottleneck.
  - Recheck and personalize the first 25–50 priority A and B contacts before
    scaling up.
  - Keep the initial batches small enough to compare delivery, replies, key
    redemption, coverage and wishlist results.

- [ ] Send full-build Steam keys to streamers.
  - The first five personalized English-language drafts are ready in
    [streamer-outreach-batch-01-drafts.md](streamer-outreach-batch-01-drafts.md).
  - Work through `streamer-outreach.csv` in small batches, starting with priority A and B.
  - Recheck each creator's public email, recent activity and relevant game before sending.
  - Write a short, genuinely personalized email for each creator:
    - “Because you played {game}, I think you'd like Marque & Reprisal.”
  - Do not pretend to have watched content that we have not actually reviewed.
  - Track the key, send date, response, follow-up and resulting coverage in the CSV.
  - Honour opt-outs and the `do_not_contact` field.
  - Compare results between batches before scaling up.

## Public promotion

- [x] Prepare the GamesPress demo-launch release.
  - The email-ready plain-text release is in
    [gamespress-demo-launch-release.txt](gamespress-demo-launch-release.txt).
  - GamesPress accepts free submissions at `inbox@gamespress.com`. Put the
    release in the email body or attach it as plain text, attach publication
    images separately, and link the full press kit. Do not send a PDF.
  - Send only after the Steam demo is publicly playable and its install flow
    has been verified. Replace the release-date placeholder immediately before
    sending.
  - Attach the five selected English gameplay screenshots and transparent logo
    listed in the release file.

- [ ] Submit the demo-launch release to GamesPress.
  - Treat publication as useful press infrastructure rather than guaranteed
    editorial coverage. Record the published GamesPress URL and any resulting
    enquiries or coverage.

- [ ] Prepare the coordinated Steam-demo launch package before making the demo public.
  - Draft the Steam announcement, X post, subreddit-specific posts, Japanese
    press update and first creator email batch now.
  - Use the current final trailer as the demo-release video, or make a short
    demo-specific cut only if its end card needs a clearer **Play the demo**
    call to action.
  - Publish them only after the Steam demo is live and its install flow has been
    verified from a logged-out account.

- [ ] Use campaign-specific UTM links for every external Steam link.
  - Separate at least X, Reddit, Japanese press, the website, festivals and each
    streamer batch so Steamworks can attribute visits and wishlists.
  - Record the UTM naming scheme with the outreach materials and use it
    consistently.

- [ ] Direct players to the demo.
  - The public call to action is to play the demo and wishlist the game.
  - Be clear that the demo has no timer and includes the full feature set within the Mediterranean, Black Sea, and connected rivers, centered on the family-debt quest.

- [ ] Post on Reddit without getting banned for self-promotion.
  - Read each subreddit's current rules before posting.
  - Disclose that I am the developer.
  - Participate normally rather than using the account only to promote the game.
  - Tailor each post to the subreddit instead of copying the same pitch everywhere.
  - Ask moderators first when the rules are unclear.
  - Prefer interesting development stories, historical details and unusual mechanics over advertisements.

- [ ] Keep posting development material on X.
  - Use `@garrettpetersen`.
  - Point interested players to the Steam page and demo.

## Steam Next Fest: October 2026

- [x] Register by **August 31 at 11:59 PM PDT**.
  - Registered August 2 with Strategy and Simulation as the event categories
    and Garrett as the press contact.
- [ ] Submit the demo build and store page for review by **September 21** if we want to be ready for the press preview.
- [ ] Submit all required materials for review by **October 5**.
- [ ] Make the demo public before **October 19 at 10:00 AM PDT**.
- [ ] Participate in Next Fest from **October 19–26**.

The game can only participate in one Steam Next Fest and must remain unreleased until this one ends. During the festival, watch wishlist growth, demo activations, playtime, feedback, bugs and streamer interest.

Steam documentation: https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/2026october

## Release decision

Working release date: **December 1, 2026**.

Make the release decision after Next Fest. There is no universal wishlist number that means a game is ready. Set our threshold from the number of launch sales the game needs, then use the following as the go/no-go check:

- The full build is stable and ready.
- Steam Stats and Cloud saves are tested.
- The demo is converting attention into wishlists.
- Wishlist total and daily wishlist growth make the sales target plausible.
- Streamer outreach is producing responses or scheduled coverage.
- The game is no longer changing so quickly that another development window would materially improve it.

If those conditions are not met, delay the release instead of forcing the 2026 window. Do not slip from December 1 into the Steam Winter Sale or Christmas week; move into January instead.

## Festival and showcase application plan

Research checked **August 2, 2026**, using the [How To Market A Game festival directory](https://howtomarketagame.com/festivals/) for discovery and the organizers' own pages for verification. Time-sensitive application statuses were updated on **August 4, 2026**.

### Apply

These are free, accept unreleased games and provide a plausible audience for Marque & Reprisal.

- [ ] **Anime Game Festival, 3rd Edition — July 30 deadline missed**
  - Event: Early September 2026.
  - Why: The eligibility rules accept games that have Japanese anime/manga-style visual design, even if they do not meet the event's other anime-culture or narrative criteria. The character portraits give us an honest visual fit.
  - Pitch: A historical sailing roguelike with anime-influenced character art.
  - Prepare: Promotional images that prominently feature the characters, plus the Steam page, demo and press-kit assets.
  - Do not add an Anime Steam tag solely for this application.
  - Application: https://docs.google.com/forms/d/e/1FAIpQLScljMrlt5fnKW7k3l9SNiY_Par1qKdlwCl9F_-vJHZpda_Ssg/viewform

- [ ] **Fall Epic RPG Adventure Festival — July 31 deadline missed**
  - Why: The game has RPG characters, quests, goals and progression, and the application explicitly accepts genre-bending RPGs.
  - Effort: Very low; it only asks for the game name, Steam App ID, store link, engine and contact information.
  - Application: https://docs.google.com/forms/d/12XU5Y-DW_MYq-CnWyw-ao4XGlOuQWgvhZLev7n8PuNI/viewform

- [ ] **ENDIX Expo Fall 2026 — July 31 deadline missed**
  - Event: November 2026.
  - Why: A playable online expo with a Steam event, content creators and press. It accepts existing trailers and public demos, so it does not need another exclusive.
  - Prepare: Steam page, two review keys or a playable build, demo link, trailer and a release-window or demo announcement.
  - Application: https://docs.google.com/forms/d/e/1FAIpQLScDvtE9Sk40Kvk_FXODPa-Z_EcwsW5SbqxdVvxeJMyPCBbeNw/viewform

- [x] **Galaxies Autumn 2026 — submitted August 2**
  - Google Forms confirmed that the response was recorded. Application answers
    are recorded in
    [festival-application-workbench-2026.md](festival-application-workbench-2026.md).
  - Showcase: October 15.
  - Why: Free slots are reserved for self-published indie teams, with media partners including IGN and GameSpot.
  - Pitch: A new look at gameplay or the Steam demo, not the trailer already pitched to IGN.
  - If selected: Supply a new 30- or 60-second trailer by September 28.
  - Selection notices are due by August 24.
  - Application: https://docs.google.com/forms/d/e/1FAIpQLSe8x1tqzdZ0uUqF8gbcamoh8S49S9rHXKcNepI1HyT_yjaU9w/viewform

- [x] **Atlantic Canada Game Celebration — accepted August 4**
  - The organizer confirmed that Marque & Reprisal is included. Steam has
    approved the event page.
  - Event: October 5–12, 2026 Steam event.
  - Visibility: Steam's standard automatic event visibility; no additional
    curated homepage featuring.
  - Have the Steam demo public and verify its install flow before October 5.
  - Watch Steamworks for the event invitation shortly before the event and opt
    in when it appears.
  - The discount recommendation applies to released games. Marque & Reprisal
    should remain unreleased for October Next Fest, so no ACGC discount is
    needed.
  - Why: The eligibility rules accept games that feature Atlantic Canada as a
    substantial playable location. Marque & Reprisal includes St. John's and
    Newfoundland waters, the Grand Banks fishery, Newfoundland whaling grounds,
    Port Royal and Acadian and Mi'kmaq history.
  - Cost: Free.
  - Pitch: A playable, historically grounded Atlantic Canada within the larger
    1522 world, with trade, fishing, whaling and colonization voyages.
  - Prepare one regional announcement for Steam and X rather than treating this
    as a major homepage-featured beat.
  - Application: https://docs.google.com/forms/d/e/1FAIpQLSdQJouPQDivmRTGnJ8iLA-ip55fFXVR4XztNrA-9h3O5ZN87A/viewform

- [x] **GWB Game Awards 2026 — submitted August 2**
  - The application was submitted through the official portal and included four
    screenshots, the public Steam page, the itch demo and an accurate AI-use
    declaration.
  - Entered as a one-person developer in the Industry channel, with PC as the
    platform and the relevant small-team eligibility declarations completed.
  - Monitor the application account and email for judging access requests or
    requests for additional keys.
  - Why: Free international competition for games released in 2026 or still in development. It includes a small-team award, relevant categories such as Gameplay Innovation and Touch the World, cash prizes and possible Steam-event promotion.
  - No travel is required.
  - Application: https://gameinstitute.tencent.com/awards2026

- [x] **Steam Next Fest: October 2026 — registered August 2**
  - This is the highest-priority festival application.
  - Complete the separate Next Fest workback plan above.
  - Registration: https://partner.steamgames.com/optin/sale/nextfest_october_2026/4516500

- [x] **Indie X 2026 — submitted August 4**
  - The submission was acknowledged and the materials are recorded in
    [festival-application-workbench-2026.md](festival-application-workbench-2026.md).
  - Why: Free international indie competition with approximately 50 finalists, livestreamed showcases, awards and a Steam event.
  - Application: https://indiex.online/submitgame/

- [x] **SCHMOOVEMENT Festival — submitted August 2**
  - Google Forms confirmed that the response was recorded under Movement
    Underground with the public Steam demo.
  - Event: September 22–29, 2026 Steam event. The organizer's form gives an
    August 22 at 11:59 p.m. Pacific deadline; the directory currently says
    August 21, so submit by August 21 to be safe.
  - Why: Sailing well requires deliberate mastery of movement through wind,
    tacking, sail trim, momentum and narrow-channel navigation. Apply honestly
    under Movement Underground without presenting the game as an action
    platformer.
  - Cost: Free; demos and upcoming games are accepted.
  - Application: https://docs.google.com/forms/d/e/1FAIpQLSckJ8MkHT7maY5DWd58cjXLmbsVUbeYQrN6TrlxzB_pMfd7lw/viewform

- [x] **Indie Game Award 2027 — materials submitted September 2**
  - Registration and the pre-selection material upload are complete. Preserve
    the confirmation and monitor email for judging questions, build-access
    problems or requests for replacement material.
  - Enter the developer as **Iron Pagoda**, with Garrett Petersen identified as
    the solo developer and contact.
  - Use https://marque-and-reprisal.com/ as the official game/team website and
    `@garrettpetersen` as the official team social profile.
  - Taipei Game Show's INDIE HOUSE and B2B registrations are separate decisions;
    do not treat the award registration as an exhibition booking.
  - Schedule: https://tgs.tca.org.tw/indie_award_e.php

- [ ] **Independent Games Festival 2027 — apply by September 13**
  - Status: Submissions opened August 10. Start the application now and prepare
    the strongest stable full build for the final entry.
  - Why: The most prestigious general indie competition in this application
    cycle and a strong venue for the game's distinctive world simulation,
    historical scope and interconnected systems.
  - Cost: US$75. A full fee waiver can be requested by September 7.
  - Eligibility: Early and demo builds are accepted only if substantially
    feature-complete. Submit the strongest stable full build available by the
    deadline; later uploads are allowed, but judges are only guaranteed to see
    the first deadline build.
  - Application: https://submit.igf.com/
  - Rules and dates: https://igf.com/submission-info/

### Conditional

- [ ] **The MIX Fall 2026 Online Showcase — decide by August 10**
  - Recommendation: Skip by default.
  - It costs **$600 if selected** and prioritizes video that debuts during its October showcase. We already have IGN, Galaxies and Next Fest beats competing for new footage.
  - Apply only if we approve the $600 spend and have a separate exclusive gameplay clip worth premiering there.
  - Application: https://form.jotform.com/261796804933974

- [ ] **Demospree 2027 — apply by October 5 only if release moves into 2027**
  - It is a January streaming chain for demos of games releasing in 2027.
  - Do not apply if we are still planning to release in November or December 2026.
  - Application: https://docs.google.com/forms/d/e/1FAIpQLSdGrnysMKMtik7Hng6Of2qDfVa3_lJKKTjYlJZhQOoKl9PbvA/viewform

### Do not apply this cycle

- **Roguelike Celebration:** Strong audience fit, but its Steam event requires the full game to be available by September 17. Releasing then would make the game ineligible for October Next Fest.
- **Choose Wisely Festival:** It prioritizes branching narrative games whose story changes permanently with player choices. Marque & Reprisal has player choice, but that is not its central narrative structure.
- **Creative Sandbox Festival:** It is for games where players build or design their own worlds, not sandbox games in the broader open-ended sense.
- **EVA Play:** The directory describes a worldwide virtual option, but the official event page describes the playable selection as games from Argentina and Latin America. Do not spend time on it unless the organizer confirms that a Canadian game is eligible for remote showcasing.
- **AI Game Festival:** It publicly frames participants as games generated with AI, even when AI was only used for programming, testing, localization or marketing. AI is not the player-facing identity or selling point of Marque & Reprisal, so the likely reputational anti-signal outweighs the prospective exposure.
- **The remaining official 2026 Steam themed festivals:** None cleanly fit the game. Do not distort the store tags to enter an unrelated event.
- **Regional, horror, NSFW, cozy and other theme-specific events:** Not eligible or not a credible audience fit.

### Reusable festival application kit

- [ ] Keep the following ready in one folder:
  - One-sentence pitch.
  - Short and long descriptions.
  - Public Steam page and App ID.
  - Press-kit link.
  - Unlisted gameplay trailer.
  - 30-second and 60-second gameplay cuts.
  - Five strong screenshots.
  - Capsule art.
  - Demo link and review keys.
  - Supported platforms and languages.
  - Tentative release window.
  - Iron Pagoda and Garrett's contact information.

### Ongoing festival research

- [ ] Check the [How To Market A Game festival directory](https://howtomarketagame.com/festivals/) weekly for new deadlines.
- [ ] Verify every promising listing against the organizer's own eligibility and submission page.
- [ ] Track event, audience, fit, deadline, cost, required assets, exclusivity, application date and result.
- [ ] Prioritize free or inexpensive digital showcases with Steam featuring, a Steam event page or relevant creator coverage.
- [ ] Watch for future strategy, simulation, historical, roguelike, trading, exploration, sailing and pirate events.
- [ ] If the game slips into 2027, watch for the next Tacticon, Tiny Teams, Simfest, PixElated, Vancouver Game Garden and Seattle Indies Expo application windows.

## Current critical path

In parallel now: submit IGF by September 13; follow up on Galaxies and confirm
SCHMOOVEMENT selection; complete the BiteMe demo
release-blocker, onboarding, audio/settings and store-asset audits; add the
in-demo wishlist call to action; update both Steam descriptions for the larger
world; set up the authenticated campaign sender; finish the demo-launch package
and UTM links; verify the first 25–50 creator contacts; schedule the next batch
of Shorts and X cross-posts.

Generate and test full-build review keys → give selected creators advance access
→ make the approved demo public and verify its logged-out install flow → publish
the coordinated demo-launch package and GamesPress release → measure store
conversion and creator results → prepare October Next Fest → release decision
