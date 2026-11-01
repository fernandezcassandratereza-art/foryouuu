(() => {
  "use strict";

  const screens = Array.from(document.querySelectorAll(".screen"));
  const navigationButtons = document.querySelectorAll("[data-go]");
  const announcement = document.getElementById("screenAnnouncement");
  const particleField = document.getElementById("particleField");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const photoData = [
    { src: "images/photo1.jpg", caption: "i wish i could go back to this day, even just for a little while.", alt: "Memory photograph one" },
    { src: "images/photo2.jpg", caption: "we probably didn’t know these little moments would mean this much someday.", alt: "Memory photograph two" },
    { src: "images/photo3.jpg", caption: "if only memories could keep people a little closer.", alt: "Memory photograph three" }
  ];

  let activeScreen = "intro";
  let activePhoto = 0;
  let lastFocusedElement = null;

  function showScreen(name) {
    const target = document.getElementById(`screen-${name}`);
    if (!target || !screens.includes(target)) return;

    screens.forEach((screen) => {
      const isTarget = screen === target;
      screen.classList.toggle("is-active", isTarget);
      screen.setAttribute("aria-hidden", String(!isTarget));
    });

    activeScreen = name;
    announcement.textContent = `${name} section`;
    if (!prefersReducedMotion) window.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo(0, 0);
    observeReveals(target);
  }

  navigationButtons.forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.go));
  });

  document.getElementById("restartButton").addEventListener("click", () => showScreen("intro"));

  // Decorative particles are created locally; no external animation library is needed.
  if (particleField && !prefersReducedMotion) {
    const symbols = ["✧", "·", "♡", "✦", "°"];
    for (let i = 0; i < 28; i += 1) {
      const particle = document.createElement("span");
      particle.className = "particle";
      particle.textContent = symbols[i % symbols.length];
      particle.style.left = `${(i * 37 + 11) % 100}%`;
      particle.style.top = `${(i * 53 + 7) % 100}%`;
      particle.style.fontSize = `${8 + (i % 4) * 3}px`;
      particle.style.setProperty("--duration", `${9 + (i % 7) * 1.7}s`);
      particle.style.animationDelay = `${-(i % 9) * 1.3}s`;
      particleField.appendChild(particle);
    }
  }

  // Reveal cards only when their screen is entered / scrolled into view.
  let revealObserver;
  function observeReveals(scope = document) {
    const elements = scope.querySelectorAll(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
    }
    elements.forEach((element) => revealObserver.observe(element));
  }
  observeReveals();

  // Photo fallback handling and accessible lightbox.
  const photoCards = Array.from(document.querySelectorAll(".photo-card"));
  photoCards.forEach((card, index) => {
    const image = card.querySelector("img");
    image.addEventListener("error", () => card.classList.add("image-missing"));
    image.addEventListener("load", () => card.classList.remove("image-missing"));
    card.addEventListener("click", () => openLightbox(index));
  });

  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxFallback = document.getElementById("lightboxFallback");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxCounter = document.getElementById("lightboxCounter");
  const closeButton = document.getElementById("lightboxClose");

  function renderLightboxPhoto() {
    const photo = photoData[activePhoto];
    lightboxImage.hidden = false;
    lightboxFallback.hidden = true;
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.alt;
    lightboxCaption.textContent = photo.caption;
    lightboxCounter.textContent = `${String(activePhoto + 1).padStart(2, "0")} / ${String(photoData.length).padStart(2, "0")}`;
  }

  lightboxImage.addEventListener("error", () => {
    lightboxImage.hidden = true;
    lightboxFallback.hidden = false;
  });
  lightboxImage.addEventListener("load", () => {
    lightboxImage.hidden = false;
    lightboxFallback.hidden = true;
  });

  function openLightbox(index) {
    activePhoto = (index + photoData.length) % photoData.length;
    lastFocusedElement = document.activeElement;
    renderLightboxPhoto();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeButton.focus();
  }

  function closeLightbox() {
    if (!lightbox.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
  }

  function movePhoto(direction) {
    activePhoto = (activePhoto + direction + photoData.length) % photoData.length;
    renderLightboxPhoto();
  }

  closeButton.addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrev").addEventListener("click", () => movePhoto(-1));
  document.getElementById("lightboxNext").addEventListener("click", () => movePhoto(1));
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") movePhoto(-1);
    if (event.key === "ArrowRight") movePhoto(1);
  });

  // Keep the audio element alive while screens change; playback is always user-initiated.
  const audio = document.getElementById("backgroundMusic");
  const musicToggle = document.getElementById("musicToggle");
  const musicState = document.getElementById("musicState");
  const musicPlayer = document.querySelector(".music-player");
  const volumeControl = document.getElementById("volumeControl");
  audio.volume = Number(volumeControl.value);

  musicToggle.addEventListener("click", async () => {
    if (audio.paused) {
      try {
        await audio.play();
        musicPlayer.classList.add("is-playing");
        musicToggle.setAttribute("aria-pressed", "true");
        musicToggle.setAttribute("aria-label", "Pause background music");
        musicState.textContent = "now playing";
      } catch (error) {
        musicState.textContent = "add music/song.mp3";
        musicToggle.setAttribute("aria-label", "Play background music");
      }
    } else {
      audio.pause();
      musicPlayer.classList.remove("is-playing");
      musicToggle.setAttribute("aria-pressed", "false");
      musicToggle.setAttribute("aria-label", "Play background music");
      musicState.textContent = "play a little music";
    }
  });

  audio.addEventListener("pause", () => {
    musicPlayer.classList.remove("is-playing");
    musicToggle.setAttribute("aria-pressed", "false");
    musicToggle.setAttribute("aria-label", "Play background music");
    if (audio.currentTime > 0) musicState.textContent = "play a little music";
  });
  audio.addEventListener("play", () => {
    musicPlayer.classList.add("is-playing");
    musicToggle.setAttribute("aria-pressed", "true");
    musicToggle.setAttribute("aria-label", "Pause background music");
    musicState.textContent = "now playing";
  });
  audio.addEventListener("error", () => {
    musicState.textContent = "add music/song.mp3";
  });
  volumeControl.addEventListener("input", () => {
    audio.volume = Number(volumeControl.value);
  });

  // Final keepsake is revealed on demand; no redirects or reloads.
  const keepsakeButton = document.getElementById("keepsakeButton");
  const keepsakeMessage = document.getElementById("keepsakeMessage");
  keepsakeButton.addEventListener("click", () => {
    keepsakeMessage.hidden = false;
    keepsakeButton.textContent = "kept with love ♡";
    keepsakeButton.disabled = true;
    keepsakeButton.setAttribute("aria-describedby", "keepsakeMessage");
  });

  // Swipe left/right in the lightbox on touch screens.
  let touchStartX = null;
  lightbox.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  lightbox.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 45) movePhoto(delta > 0 ? -1 : 1);
    touchStartX = null;
  }, { passive: true });

  // Ensure the initial screen has its reveal states ready.
  showScreen(activeScreen);
})();
