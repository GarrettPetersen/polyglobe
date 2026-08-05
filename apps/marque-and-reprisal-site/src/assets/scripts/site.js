const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const websiteLanguage = document.querySelector("[data-website-language]");
if (websiteLanguage instanceof HTMLSelectElement) {
  const requestedLanguage = new URLSearchParams(window.location.search).get("l");
  if (requestedLanguage) {
    const normalized = requestedLanguage.trim().toLocaleLowerCase("en-US");
    const requestedOption = [...websiteLanguage.options].find((option) =>
      (option.dataset.languageAliases ?? "").split("|").some(
        (alias) => alias.toLocaleLowerCase("en-US") === normalized
      )
    );
    if (requestedOption) {
      window.location.replace(requestedOption.value + window.location.hash);
    } else {
      console.warn(`Unknown website language: ${requestedLanguage}`);
    }
  }
  websiteLanguage.addEventListener("change", () => {
    window.location.assign(websiteLanguage.value);
  });
}

for (const year of document.querySelectorAll("[data-current-year]")) {
  year.textContent = String(new Date().getFullYear());
}

const revealTargets = [...document.querySelectorAll(".reveal")];
if (reducedMotion || !("IntersectionObserver" in window)) {
  for (const target of revealTargets) target.classList.add("is-visible");
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  for (const target of revealTargets) revealObserver.observe(target);
}

const lazyVideos = [...document.querySelectorAll(".feature-video")];
const loadVideo = (video) => {
  const source = video.querySelector("source[data-src]");
  if (!source) return;
  source.src = source.dataset.src;
  source.removeAttribute("data-src");
  video.load();
  if (!reducedMotion) {
    video.play().catch((error) => {
      video.dataset.playback = "blocked";
      console.warn("Muted feature video could not autoplay:", error);
    });
  }
};

if ("IntersectionObserver" in window) {
  const videoObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      loadVideo(entry.target);
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "320px 0px", threshold: 0 });
  for (const video of lazyVideos) videoObserver.observe(video);
} else {
  for (const video of lazyVideos) loadVideo(video);
}

const shipTurntables = [...document.querySelectorAll("[data-ship-turntable]")];
const SHIP_TURN_FRAME_MS = 300;

const loadTurntableImage = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", () => resolve(image), { once: true });
  image.addEventListener("error", () => reject(new Error(`Could not load ${source}`)), { once: true });
  image.src = source;
});

const imagePixels = (image) => {
  const buffer = document.createElement("canvas");
  buffer.width = image.naturalWidth;
  buffer.height = image.naturalHeight;
  const context = buffer.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, buffer.width, buffer.height);
};

const turntableInteger = (canvas, key) => {
  const value = Number.parseInt(canvas.dataset[key] ?? "", 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Ship turntable has invalid ${key}`);
  }
  return value;
};

const turntableNumber = (canvas, key) => {
  const value = Number.parseFloat(canvas.dataset[key] ?? "");
  if (!Number.isFinite(value)) throw new Error(`Ship turntable has invalid ${key}`);
  return value;
};

const turntableString = (canvas, key) => {
  const value = canvas.dataset[key];
  if (!value) throw new Error(`Ship turntable has invalid ${key}`);
  return value;
};

const turntableMaskPoints = (state, kind, frameIndex) => {
  const cached = state.maskPoints[kind][frameIndex];
  if (cached) return cached;

  const mask = state.masks[kind];
  const cellColumn = frameIndex % state.sheetCols;
  const cellRow = Math.floor(frameIndex / state.sheetCols);
  const rowCount = Math.ceil(state.headings / state.sheetCols);
  const cellX = cellColumn * mask.frameSize;
  const cellY = (state.lightElevation * rowCount + cellRow) * mask.frameSize;
  const channel = state.lightAzimuth < 8 ? 0 : 1;
  const bit = 1 << (state.lightAzimuth & 7);
  const points = [];

  for (let y = 0; y < mask.frameSize; y += 1) {
    for (let x = 0; x < mask.frameSize; x += 1) {
      const pixelOffset = ((cellY + y) * mask.pixels.width + cellX + x) * 4;
      if ((mask.pixels.data[pixelOffset + channel] & bit) !== 0) points.push(x, y);
    }
  }
  const packedPoints = Uint8Array.from(points);
  state.maskPoints[kind][frameIndex] = packedPoints;
  return packedPoints;
};

const precomputeTurntableMaskPoints = (state) => {
  for (const kind of ["light", "shade", "shadow"]) {
    for (let frameIndex = 0; frameIndex < state.headings; frameIndex += 1) {
      turntableMaskPoints(state, kind, frameIndex);
    }
    delete state.masks[kind].pixels;
  }
};

const drawTurntableMask = (state, kind, frameIndex, offsetX, offsetY, color) => {
  const points = turntableMaskPoints(state, kind, frameIndex);
  state.context.fillStyle = color;
  for (let index = 0; index < points.length; index += 2) {
    state.context.fillRect(points[index] + offsetX, points[index + 1] + offsetY, 1, 1);
  }
};

const drawShipTurntable = (state, frameIndex) => {
  const frame = frameIndex % state.headings;
  const frameX = (frame % state.sheetCols) * state.frameSize;
  const frameY = Math.floor(frame / state.sheetCols) * state.frameSize;
  const canvasCenter = state.shadowFrameSize / 2;
  const defaultShipOffset = (state.shadowFrameSize - state.frameSize) / 2;
  const shipOffsetX = Math.round(canvasCenter - state.anchor.x);
  const shipOffsetY = Math.round(canvasCenter - state.anchor.y);
  const shadowOffsetX = shipOffsetX - defaultShipOffset;
  const shadowOffsetY = shipOffsetY - defaultShipOffset;
  const context = state.context;

  context.clearRect(0, 0, state.canvas.width, state.canvas.height);
  context.globalCompositeOperation = "source-over";
  drawTurntableMask(
    state,
    "shadow",
    frame,
    shadowOffsetX,
    shadowOffsetY,
    state.lighting.shadow
  );
  context.drawImage(
    state.sprite,
    frameX,
    frameY,
    state.frameSize,
    state.frameSize,
    shipOffsetX,
    shipOffsetY,
    state.frameSize,
    state.frameSize
  );
  context.globalCompositeOperation = state.lighting.surfaceBlend;
  drawTurntableMask(
    state,
    "shade",
    frame,
    shipOffsetX,
    shipOffsetY,
    state.lighting.shade
  );
  drawTurntableMask(
    state,
    "light",
    frame,
    shipOffsetX,
    shipOffsetY,
    state.lighting.highlight
  );
  state.canvas.dataset.turntableFrame = String(frame);
};

const prepareShipTurntable = async (state) => {
  if (state.status !== "idle") return;
  state.status = "loading";
  state.canvas.dataset.turntableState = "loading";
  try {
    const [sprite, light, shade, shadow] = await Promise.all([
      loadTurntableImage(state.canvas.dataset.spriteSheet),
      loadTurntableImage(state.canvas.dataset.lightSheet),
      loadTurntableImage(state.canvas.dataset.shadeSheet),
      loadTurntableImage(state.canvas.dataset.shadowSheet)
    ]);
    const rowCount = Math.ceil(state.headings / state.sheetCols);
    const expectedSpriteWidth = state.frameSize * state.sheetCols;
    const expectedSpriteHeight = state.frameSize * rowCount;
    if (
      sprite.naturalWidth !== expectedSpriteWidth || sprite.naturalHeight !== expectedSpriteHeight ||
      light.naturalWidth !== expectedSpriteWidth || light.naturalHeight !== expectedSpriteHeight * 2 ||
      shade.naturalWidth !== expectedSpriteWidth || shade.naturalHeight !== expectedSpriteHeight * 2 ||
      shadow.naturalWidth !== state.shadowFrameSize * state.sheetCols ||
      shadow.naturalHeight !== state.shadowFrameSize * rowCount * 2
    ) {
      throw new Error("Ship turntable atlas dimensions do not match its manifest");
    }

    state.sprite = sprite;
    state.masks = {
      light: { frameSize: state.frameSize, pixels: imagePixels(light) },
      shade: { frameSize: state.frameSize, pixels: imagePixels(shade) },
      shadow: { frameSize: state.shadowFrameSize, pixels: imagePixels(shadow) }
    };
    precomputeTurntableMaskPoints(state);
    state.context.imageSmoothingEnabled = false;
    state.context.globalCompositeOperation = state.lighting.surfaceBlend;
    if (state.context.globalCompositeOperation !== state.lighting.surfaceBlend) {
      throw new Error("Ship turntables require soft-light canvas blending");
    }
    state.context.globalCompositeOperation = "source-over";
    state.status = "ready";
    state.canvas.dataset.turntableState = "ready";
    drawShipTurntable(state, reducedMotion ? 4 : Math.floor(performance.now() / SHIP_TURN_FRAME_MS));
    startShipTurntableAnimation();
  } catch (error) {
    state.status = "error";
    state.canvas.dataset.turntableState = "error";
    console.error("Could not prepare ship turntable:", error);
  }
};

const shipTurntableStates = new Map(shipTurntables.map((canvas) => {
  const frameSize = turntableInteger(canvas, "frameSize");
  const anchor = Object.freeze({
    x: turntableNumber(canvas, "anchorX"),
    y: turntableNumber(canvas, "anchorY")
  });
  if (anchor.x < 0 || anchor.x >= frameSize || anchor.y < 0 || anchor.y >= frameSize) {
    throw new Error("Ship turntable anchor lies outside its frame");
  }
  const state = {
    canvas,
    context: canvas.getContext("2d"),
    frameSize,
    anchor,
    shadowFrameSize: turntableInteger(canvas, "shadowFrameSize"),
    headings: turntableInteger(canvas, "headings"),
    sheetCols: turntableInteger(canvas, "sheetCols"),
    lightAzimuth: turntableInteger(canvas, "lightAzimuth"),
    lightElevation: turntableInteger(canvas, "lightElevation"),
    lighting: Object.freeze({
      shadow: turntableString(canvas, "shadowColor"),
      shade: turntableString(canvas, "shadeColor"),
      highlight: turntableString(canvas, "highlightColor"),
      surfaceBlend: turntableString(canvas, "surfaceLightingBlend")
    }),
    maskPoints: {
      light: Array(turntableInteger(canvas, "headings")),
      shade: Array(turntableInteger(canvas, "headings")),
      shadow: Array(turntableInteger(canvas, "headings"))
    },
    status: "idle"
  };
  return [canvas, state];
}));
const activeShipTurntables = new Set();
let shipTurntableAnimationFrame = null;
let lastShipTurntableFrame = -1;

function startShipTurntableAnimation() {
  if (reducedMotion || shipTurntableAnimationFrame !== null || activeShipTurntables.size === 0) return;
  shipTurntableAnimationFrame = window.requestAnimationFrame(animateShipTurntables);
}

function animateShipTurntables(timestamp) {
  shipTurntableAnimationFrame = null;
  if (activeShipTurntables.size === 0) return;
  const frameIndex = Math.floor(timestamp / SHIP_TURN_FRAME_MS);
  if (frameIndex !== lastShipTurntableFrame) {
    lastShipTurntableFrame = frameIndex;
    for (const state of activeShipTurntables) {
      if (state.status === "ready") drawShipTurntable(state, frameIndex);
    }
  }
  shipTurntableAnimationFrame = window.requestAnimationFrame(animateShipTurntables);
}

if (shipTurntables.length > 0 && "IntersectionObserver" in window) {
  const shipTurntableObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const state = shipTurntableStates.get(entry.target);
      if (!state) continue;
      if (entry.isIntersecting) {
        activeShipTurntables.add(state);
        prepareShipTurntable(state);
      } else {
        activeShipTurntables.delete(state);
      }
    }
    startShipTurntableAnimation();
  }, { rootMargin: "360px 0px", threshold: 0 });
  for (const canvas of shipTurntables) shipTurntableObserver.observe(canvas);
} else {
  for (const state of shipTurntableStates.values()) {
    activeShipTurntables.add(state);
    prepareShipTurntable(state);
  }
}

for (const button of document.querySelectorAll("[data-copy-text]")) {
  button.addEventListener("click", async () => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.copyText);
      button.textContent = "Copied";
    } catch (error) {
      button.textContent = "Copy failed";
      console.error("Could not copy press description:", error);
    }
    window.setTimeout(() => {
      button.textContent = original;
    }, 1800);
  });
}

for (const gallery of document.querySelectorAll("[data-screenshot-gallery]")) {
  const section = gallery.closest(".press-assets");
  if (!section) throw new Error("Screenshot language picker is outside its press section");
  const buttons = [...gallery.querySelectorAll("[data-screenshot-language]")];
  const cards = [...section.querySelectorAll("[data-screenshot-card]")];
  const currentLanguage = gallery.querySelector("[data-current-screenshot-language]");
  const languageDownload = gallery.querySelector("[data-screenshot-language-download]");
  if (buttons.length === 0 || cards.length === 0 || !currentLanguage || !languageDownload) {
    throw new Error("Screenshot language picker is incomplete");
  }

  const selectScreenshotLanguage = (selected) => {
    const code = selected.dataset.localeCode;
    const label = selected.dataset.localeLabel;
    const appLocale = selected.dataset.localeApp;
    const archive = selected.dataset.localeArchive;
    if (!code || !label || !appLocale || !archive) {
      throw new Error("Screenshot language metadata is incomplete");
    }
    for (const button of buttons) {
      button.setAttribute("aria-pressed", button === selected ? "true" : "false");
    }
    currentLanguage.textContent = label;
    languageDownload.href = `/downloads/${archive}`;
    languageDownload.textContent = `Download all ${cards.length} in ${label}`;

    for (const card of cards) {
      const prefix = card.dataset.screenshotPrefix;
      const alt = card.dataset.screenshotAlt;
      const image = card.querySelector("[data-screenshot-image]");
      const preview = card.querySelector("[data-lightbox-src]");
      const download = card.querySelector("[data-screenshot-download]");
      if (!prefix || !alt || !image || !preview || !download) {
        throw new Error("Localized screenshot card is incomplete");
      }
      const source = `/assets/press/screenshots/${prefix}_${code}.png`;
      const localizedAlt = `${alt} Interface language: ${label}.`;
      image.src = source;
      image.alt = localizedAlt;
      image.lang = appLocale;
      preview.dataset.lightboxSrc = source;
      preview.dataset.lightboxAlt = localizedAlt;
      download.href = source;
    }
  };

  for (const button of buttons) {
    button.addEventListener("click", () => selectScreenshotLanguage(button));
  }
}

const lightbox = document.querySelector(".lightbox");
if (lightbox instanceof HTMLDialogElement) {
  const image = lightbox.querySelector("img");
  const close = lightbox.querySelector("[data-lightbox-close]");
  for (const trigger of document.querySelectorAll("[data-lightbox-src]")) {
    trigger.addEventListener("click", () => {
      image.src = trigger.dataset.lightboxSrc;
      image.alt = trigger.dataset.lightboxAlt;
      lightbox.showModal();
    });
  }
  close.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener("close", () => {
    image.removeAttribute("src");
    image.alt = "";
  });
}
