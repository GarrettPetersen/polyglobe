const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
