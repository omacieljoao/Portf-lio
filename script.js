(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const header = document.querySelector("[data-header]");
  const year = document.querySelector("[data-year]");
  const navLinks = document.querySelectorAll(".nav__link");
  const sections = document.querySelectorAll("main section[id]");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const updateHeader = () => {
    header.classList.toggle("header--scrolled", window.scrollY > 8);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((link) => {
            const active = link.getAttribute("href") === `#${id}`;
            if (active) {
              link.setAttribute("aria-current", "true");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    sections.forEach((section) => spy.observe(section));
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const states = new WeakMap();

  const stop = (viewport) => {
    const state = states.get(viewport);
    if (state && state.frame) {
      cancelAnimationFrame(state.frame);
      state.frame = 0;
    }
    if (state && state.timer) {
      clearTimeout(state.timer);
      state.timer = 0;
    }
  };

  const glide = (viewport, to, duration, done) => {
    stop(viewport);
    const state = states.get(viewport);
    const from = viewport.scrollTop;
    const distance = to - from;

    if (Math.abs(distance) < 1) {
      if (done) done();
      return;
    }

    const start = performance.now();

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      viewport.scrollTop = from + distance * ease(progress);
      if (progress < 1) {
        state.frame = requestAnimationFrame(step);
      } else {
        state.frame = 0;
        if (done) done();
      }
    };

    state.frame = requestAnimationFrame(step);
  };

  const maxScroll = (viewport) => viewport.scrollHeight - viewport.clientHeight;

  const downDuration = (distance) => Math.min(12000, Math.max(3500, distance * 9));

  const projects = document.querySelectorAll("[data-project]");

  projects.forEach((project) => {
    const viewport = project.querySelector("[data-viewport]");
    if (!viewport) return;

    states.set(viewport, { frame: 0, timer: 0, manual: false });

    const takeControl = () => {
      states.get(viewport).manual = true;
      stop(viewport);
    };

    viewport.addEventListener("wheel", takeControl, { passive: true });
    viewport.addEventListener("touchstart", takeControl, { passive: true });

    if (reduceMotion) return;

    const enter = () => {
      const state = states.get(viewport);
      if (state.manual) return;
      const distance = maxScroll(viewport);
      glide(viewport, distance, downDuration(distance));
    };

    const leave = () => {
      const state = states.get(viewport);
      state.manual = false;
      glide(viewport, 0, 1100);
    };

    if (canHover) {
      project.addEventListener("pointerenter", enter);
      project.addEventListener("pointerleave", leave);
    }

    project.addEventListener("focusin", enter);
    project.addEventListener("focusout", leave);
  });

  const tour = document.querySelector("[data-tour] [data-viewport]");

  if (tour && !reduceMotion) {
    const run = () => {
      const state = states.get(tour);
      const distance = maxScroll(tour);
      if (distance < 1) return;
      glide(tour, distance, downDuration(distance), () => {
        state.timer = setTimeout(() => glide(tour, 0, 2200), 900);
      });
    };

    const begin = () => {
      const state = states.get(tour);
      state.timer = setTimeout(run, 900);
    };

    const image = tour.querySelector("img");

    if (image && !image.complete) {
      image.addEventListener("load", begin, { once: true });
    } else {
      begin();
    }

    ["pointerdown", "wheel", "touchstart"].forEach((type) => {
      tour.addEventListener(type, () => stop(tour), { passive: true });
    });
  }
})();
