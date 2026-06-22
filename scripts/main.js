(function () {
  "use strict";

  const tickerTemplates = new WeakMap();
  const tickerRuns = new WeakMap();
  const TICKER_SPEED = 200;

  function ensureTrailingDot(template) {
    const last = template[template.length - 1];
    if (last?.classList?.contains("ticker__dot")) return template;

    const dot = document.createElement("span");
    dot.className = "ticker__dot";
    dot.setAttribute("aria-hidden", "true");
    dot.textContent = "•";
    return template.concat(dot);
  }

  function buildSegment(template) {
    const segment = document.createElement("span");
    segment.className = "ticker__segment";
    template.forEach((node) => segment.appendChild(node.cloneNode(true)));
    return segment;
  }

  function fillGroup(group, template, minWidth) {
    while (group.offsetWidth < minWidth) {
      group.appendChild(buildSegment(template));
    }
  }

  function stopTicker(track) {
    const runId = tickerRuns.get(track);
    if (runId) window.cancelAnimationFrame(runId);
    tickerRuns.delete(track);
  }

  function startTicker(track, shift) {
    stopTicker(track);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      track.style.transform = "translate3d(0, 0, 0)";
      return;
    }

    let offset = 0;
    let lastTime = performance.now();

    function frame(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      offset += TICKER_SPEED * dt;

      if (offset >= shift) {
        offset -= shift;
      }

      track.style.transform = `translate3d(${-Math.round(offset)}px, 0, 0)`;
      tickerRuns.set(track, window.requestAnimationFrame(frame));
    }

    tickerRuns.set(track, window.requestAnimationFrame(frame));
  }

  function initTicker() {
    document.querySelectorAll(".ticker__track").forEach((track) => {
      if (track.dataset.tickerReady === "true") return;

      let template = tickerTemplates.get(track);
      if (!template) {
        template = Array.from(track.children)
          .filter((node) => node.matches(".ticker__text, .ticker__dot"))
          .map((node) => node.cloneNode(true));
        if (!template.length) return;
        template = ensureTrailingDot(template);
        tickerTemplates.set(track, template);
      }

      stopTicker(track);
      track.replaceChildren();

      const minWidth = window.innerWidth + 120;
      const groupA = document.createElement("div");
      groupA.className = "ticker__group";
      track.appendChild(groupA);
      fillGroup(groupA, template, minWidth);

      const shift = Math.round(groupA.offsetWidth);
      track.appendChild(groupA.cloneNode(true));

      track.dataset.tickerShift = String(shift);
      track.dataset.tickerReady = "true";
      startTicker(track, shift);
    });
  }

  function resetTickers() {
    document.querySelectorAll(".ticker__track[data-ticker-ready]").forEach((track) => {
      stopTicker(track);
      delete track.dataset.tickerReady;
      delete track.dataset.tickerShift;
      track.style.removeProperty("transform");
    });
    initTicker();
  }

  function init() {
    initTicker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("load", resetTickers);

  let resizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resetTickers, 200);
  });
})();
