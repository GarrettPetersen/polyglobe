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
