# Regional warrior portraits

Generated with the built-in OpenAI image tool, September 2026. The two full-resolution
source sheets are `regional-warriors-1522-a.png` and `regional-warriors-1522-b.png`.
Production files are in the eight directories declared by
`tools/regionalWarriorPortraits.mjs`. Each row supplies four independent characters;
all have the `warrior` role, rather than being added to civilian or player pools.
Existing portrait IDs and assets are unchanged.

## Final art specifications

Both sheets: a strict square 4-by-4 grid of sixteen circa-1522 military men, head and
upper shoulders, slightly left-facing three-quarter views, diverse mature faces and
ages, full helmets inside the cells. Native target is 64-by-64 per character. Use
simple solid pixel clusters, broad dark outlines, a few flat shading planes, and
readable facial features. No painterly microtexture, stippling, gradients, tiny
highlights, labels, or frames. Use a solid magenta chroma background, with no
checkerboard. The existing regional portrait contact sheet supplied the style
reference during refinement.

Sheet A rows:

1. Ottoman/Persian men in conical ribbed steel turban helmets, mail neck protection
   and mail-and-plate shoulders. Steel turban-shaped helmets, not cloth turbans.
2. Ming Chinese soldiers with compact red-plumed conical steel helmets and lamellar
   neck/shoulder protection. No Qing court hats, queues, or Japanese kabuto.
3. South Asian men in mail armour and rounded/conical steel helmets, varied brown
   complexions and moustaches. No later colonial uniforms.
4. Malay/Javanese soldiers with simple iron skullcaps and practical mail/lamellar
   protection. No European plate or fantasy crowns.

Sheet B rows:

1. Sahel military leaders in quilted protective clothing, padded caps and simple
   iron skullcaps; no modern or colonial uniforms.
2. Indigenous American warriors with simple woven/leather headbands, small feathers,
   hide/cotton garments and restrained face paint; no huge Plains war bonnets or
   fantasy costumes.
3. Polynesian warrior leaders in fiber/barkcloth, woven headbands and restrained
   tattoos; no metal helmets or imported Asian armour.
4. Joseon soldiers in iron military helmets with small red tassels and lamellar or
   studded protection; no Japanese kabuto or Qing court hats.

These are game-region illustrations, not evidence that every culture in a broad
portrait region wore identical equipment. More specific cultural packs can replace
individual regional pools as they become available.

Turban-helmet shape reference: [The Metropolitan Museum of Art, sixteenth-century
Turban Helmet](https://www.metmuseum.org/art/collection/search/22012).

## Processing

Use `tools/process-generated-character-sheet.mjs` with `magenta --retro-diffusion`
to shrink each source cell using Retro Diffusion's free `k_centroid_downscale` tool.
The script verifies a zero-cost estimate before submission. An explicit chroma
background preserves the silhouette through the API's RGB output. Final cleanup
quantizes the result to Resurrect 64 with binary alpha. No credentials are stored
with the assets.

[Retro Diffusion editing API](https://github.com/Retro-Diffusion/api-examples/blob/main/README.md#edit-tools-api)

The native sheets retained beside these sources permit offline reproduction: pass
them through the same processor without the Retro Diffusion option, then copy rows
into the directories declared by `tools/regionalWarriorPortraits.mjs` and run
`npm run generate:characters`. Portrait tests check native dimensions, palette,
alpha, complete regional authority selection, and stable repeat assignment.
