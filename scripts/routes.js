(function () {
  "use strict";

  const LOOP_MS = [720000, 780000, 660000, 840000];

  const ROUTES = [
    {
      focus: [55.762, 37.612],
      zoom: 15,
      coords: [
        [55.7648, 37.6085],
        [55.7638, 37.6105],
        [55.7625, 37.612],
        [55.7612, 37.6135],
        [55.7598, 37.6145],
        [55.7588, 37.613],
        [55.7602, 37.611],
        [55.762, 37.6095],
      ],
    },
    {
      focus: [55.756, 37.638],
      zoom: 15,
      coords: [
        [55.7585, 37.634],
        [55.7575, 37.6365],
        [55.756, 37.6385],
        [55.7545, 37.6405],
        [55.753, 37.642],
        [55.752, 37.64],
        [55.7535, 37.6375],
        [55.7555, 37.635],
      ],
    },
    {
      focus: [55.738, 37.608],
      zoom: 15,
      coords: [
        [55.7405, 37.604],
        [55.7395, 37.6065],
        [55.7385, 37.609],
        [55.7375, 37.6115],
        [55.7365, 37.614],
        [55.7355, 37.612],
        [55.7368, 37.609],
        [55.7388, 37.606],
      ],
    },
    {
      focus: [55.748, 37.582],
      zoom: 15,
      coords: [
        [55.7505, 37.578],
        [55.7495, 37.5805],
        [55.748, 37.5825],
        [55.7465, 37.5845],
        [55.745, 37.586],
        [55.744, 37.584],
        [55.7455, 37.581],
        [55.7475, 37.579],
      ],
    },
  ];

  function loopPath(coords) {
    return coords.concat(coords.slice(0, -1).reverse());
  }

  function segLen(a, b) {
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  }

  function pointAt(coords, t) {
    const total = coords.slice(1).reduce((sum, c, i) => sum + segLen(coords[i], c), 0);
    let dist = t * total;

    for (let i = 0; i < coords.length - 1; i += 1) {
      const len = segLen(coords[i], coords[i + 1]);
      if (dist <= len) {
        const r = len ? dist / len : 0;
        return [
          coords[i][0] + (coords[i + 1][0] - coords[i][0]) * r,
          coords[i][1] + (coords[i + 1][1] - coords[i][1]) * r,
        ];
      }
      dist -= len;
    }

    return coords[coords.length - 1];
  }

  function bearingDeg(from, to) {
    const dLon = (to[1] - from[1]) * Math.cos(((from[0] + to[0]) / 2) * (Math.PI / 180));
    const dLat = to[0] - from[0];
    return (Math.atan2(dLon, dLat) * 180) / Math.PI;
  }

  function initMap() {
    const mapEl = document.getElementById("routesMap");
    if (!mapEl || typeof L === "undefined") return;

    const trackCoords = document.getElementById("trackCoords");
    const trackSpot = document.getElementById("trackSpot");
    const trackDeck = document.getElementById("trackDeck");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const paths = ROUTES.map((route, i) => ({
      path: loopPath(route.coords),
      t: 0.15 + i * 0.06,
      loopMs: LOOP_MS[i],
    }));

    const map = L.map(mapEl, {
      center: ROUTES[0].focus,
      zoom: ROUTES[0].zoom,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    const navIcon = L.divIcon({
      className: "routes-map__nav",
      html:
        '<span class="routes-map__nav-rot">' +
        '<span class="routes-map__nav-cone"></span></span>' +
        '<span class="routes-map__nav-dot"></span>',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    let activeIdx = 0;
    let rafId = null;
    let lastTs = 0;

    const marker = L.marker(pointAt(paths[0].path, paths[0].t), {
      icon: navIcon,
      interactive: false,
      zIndexOffset: 600,
    }).addTo(map);

    function setHeading(deg) {
      const rot = marker.getElement()?.querySelector(".routes-map__nav-rot");
      if (rot) rot.style.transform = `rotate(${deg}deg)`;
    }

    function setHud(lat, lon) {
      if (trackCoords) {
        trackCoords.textContent = `${lat.toFixed(4)}° N · ${lon.toFixed(4)}° E`;
      }
    }

    function setSpot(lat, lon) {
      if (!trackSpot) return;
      const pt = map.latLngToContainerPoint([lat, lon]);
      const size = map.getSize();
      if (!size.x || !size.y) return;
      trackSpot.style.setProperty("--spot-x", `${(pt.x / size.x) * 100}%`);
      trackSpot.style.setProperty("--spot-y", `${(pt.y / size.y) * 100}%`);
    }

    function syncPosition() {
      const { path, t } = paths[activeIdx];
      const pos = pointAt(path, t);
      const ahead = pointAt(path, (t + 0.003) % 1);
      marker.setLatLng(pos);
      setHeading(bearingDeg(pos, ahead));
      setHud(pos[0], pos[1]);
      setSpot(pos[0], pos[1]);
    }

    function setDeckActive(idx) {
      trackDeck?.querySelectorAll(".routes-track__deck-btn").forEach((btn, i) => {
        btn.classList.toggle("is-active", i === idx);
      });
    }

    function activateRoute(idx, fly = true) {
      activeIdx = idx;
      setDeckActive(idx);
      syncPosition();

      const { focus, zoom } = ROUTES[idx];
      if (fly && !reducedMotion) {
        map.flyTo(focus, zoom, { duration: 2.8, easeLinearity: 0.22 });
      } else {
        map.setView(focus, zoom);
      }
    }

    function animate(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(ts - lastTs, 50);
      lastTs = ts;

      const unit = paths[activeIdx];
      unit.t += dt / unit.loopMs;
      if (unit.t >= 1) unit.t -= 1;

      syncPosition();
      rafId = window.requestAnimationFrame(animate);
    }

    if (!reducedMotion) {
      rafId = window.requestAnimationFrame(animate);
    } else {
      syncPosition();
    }

    trackDeck?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-route]");
      if (!btn) return;
      const idx = Number(btn.dataset.route);
      if (Number.isNaN(idx) || idx === activeIdx) return;
      activateRoute(idx);
    });

    map.on("move zoom", syncPosition);

    window.addEventListener("beforeunload", () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    });

    window.setTimeout(() => {
      map.invalidateSize();
      syncPosition();
    }, 120);
  }

  function initTickets() {
    const carousel = document.getElementById("ticketCarousel");
    if (!carousel) return;

    const dots = document.getElementById("ticketDots");
    const counter = document.getElementById("ticketCounter");
    const prevBtn = document.getElementById("ticketPrev");
    const nextBtn = document.getElementById("ticketNext");
    const gate = document.getElementById("boardingGate");
    const gatePhase = document.getElementById("gatePhase");
    const gateRoute = document.getElementById("gateRoute");
    const gateSub = document.getElementById("gateSub");
    const gateBar = document.getElementById("gateBar");
    const gateLog = document.getElementById("gateLog");
    const gateCount = document.getElementById("gateCount");
    const gateSkip = document.getElementById("gateSkip");
    const ctaBtn = document.getElementById("openBoardingFromCta");

    const passes = Array.from(carousel.querySelectorAll(".pass"));
    const total = passes.length;
    const TICKET_DESIGN_W = 1482;
    let active = 0;
    let animating = false;
    let gateTimer = null;
    let redirectTimer = null;
    let gateDone = false;

    function passData(index) {
      const pass = passes[index];
      return {
        label: pass?.dataset.label || "",
        slug: pass?.dataset.slug || "neon",
      };
    }

    function syncTicketScale() {
      document.querySelectorAll(".pass__frame").forEach((frame) => {
        const width = frame.clientWidth;
        if (width > 0) {
          frame.style.setProperty("--pass-scale", String(width / TICKET_DESIGN_W));
        }
      });
    }

    function layout(index) {
      passes.forEach((pass, i) => {
        pass.classList.remove("is-active", "is-prev", "is-next", "is-hidden");

        if (i === index) pass.classList.add("is-active");
        else if (i === index - 1 || (index === 0 && i === total - 1)) pass.classList.add("is-prev");
        else if (i === index + 1 || (index === total - 1 && i === 0)) pass.classList.add("is-next");
        else pass.classList.add("is-hidden");
      });

      dots?.querySelectorAll(".ticket-dots__item").forEach((item, i) => {
        item.classList.toggle("is-active", i === index);
        item.setAttribute("aria-selected", i === index ? "true" : "false");
        item.tabIndex = i === index ? 0 : -1;
      });

      requestAnimationFrame(syncTicketScale);
    }

    function updateMeta(index) {
      const pass = passes[index];
      if (!pass) return;

      counter?.classList.add("is-switching");

      window.setTimeout(() => {
        if (counter) counter.textContent = pass.dataset.label || "";
        counter?.classList.remove("is-switching");
      }, 160);
    }

    function goTo(index) {
      if (animating && index === active) return;
      if (index < 0) index = total - 1;
      if (index >= total) index = 0;
      if (index === active) return;

      animating = true;
      active = index;
      layout(active);
      updateMeta(active);
      window.setTimeout(() => {
        animating = false;
      }, 720);
    }

    function logLine(text) {
      if (!gateLog) return;
      const li = document.createElement("li");
      li.textContent = `› ${text}`;
      gateLog.appendChild(li);
      if (gateLog.children.length > 5) gateLog.removeChild(gateLog.firstChild);
    }

    function closeGate() {
      if (!gate) return;
      gate.hidden = true;
      gate.setAttribute("aria-hidden", "true");
      gate.classList.remove("is-open");
      document.body.classList.remove("is-boarding");
      if (gateTimer) window.clearInterval(gateTimer);
      if (redirectTimer) window.clearTimeout(redirectTimer);
      gateTimer = null;
      redirectTimer = null;
      gateDone = false;
      if (gateLog) gateLog.innerHTML = "";
      if (gateBar) gateBar.style.width = "0%";
    }

    function finishGate(slug) {
      if (gateDone) return;
      gateDone = true;
      if (gateTimer) window.clearInterval(gateTimer);

      if (gateBar) gateBar.style.width = "100%";
      if (gatePhase) gatePhase.textContent = "допуск получен";
      if (gateSub) gateSub.textContent = "переход на оформление билета";
      logLine("переход на оформление");

      redirectTimer = window.setTimeout(() => {
        window.location.href = `./tickets.html?route=${encodeURIComponent(slug)}`;
      }, 900);
    }

    function openGate(data) {
      if (!gate) return;

      const { label, slug } = data || passData(active);
      closeGate();

      gate.hidden = false;
      gate.setAttribute("aria-hidden", "false");
      gate.classList.add("is-open");
      document.body.classList.add("is-boarding");

      if (gateRoute) gateRoute.textContent = label;
      if (gatePhase) gatePhase.textContent = "инициализация";
      if (gateSub) gateSub.textContent = "синхронизация с ночным городом";

      const steps = [
        { t: 400, phase: "подключение", sub: "сканирование маршрутной сети", log: "сигнал маршрута найден", bar: 18 },
        { t: 1100, phase: "калибровка", sub: "настройка света и звука в салоне", log: "салон синхронизирован", bar: 42 },
        { t: 1800, phase: "посадка", sub: `маршрут ${label} активирован`, log: "посадочный пропуск подтверждён", bar: 68 },
        { t: 2600, phase: "допуск", sub: "двери закрываются — поездка начинается", log: "допуск получен", bar: 88 },
      ];

      steps.forEach(({ t, phase, sub, log, bar }) => {
        window.setTimeout(() => {
          if (gatePhase) gatePhase.textContent = phase;
          if (gateSub) gateSub.textContent = sub;
          if (gateBar) gateBar.style.width = `${bar}%`;
          logLine(log);
        }, t);
      });

      let count = 3;
      if (gateCount) gateCount.textContent = String(count);

      gateTimer = window.setInterval(() => {
        count -= 1;
        if (gateCount) gateCount.textContent = String(Math.max(count, 0));
        if (count <= 0) finishGate(slug);
      }, 1000);
    }

    prevBtn?.addEventListener("click", () => goTo(active - 1));
    nextBtn?.addEventListener("click", () => goTo(active + 1));

    dots?.querySelectorAll(".ticket-dots__item").forEach((item, i) => {
      item.addEventListener("click", () => goTo(i));
    });

    const viewport = document.getElementById("ticketViewport");
    let touchStartX = 0;

    viewport?.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true }
    );

    viewport?.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(dx) < 52) return;
        if (dx < 0) goTo(active + 1);
        else goTo(active - 1);
      },
      { passive: true }
    );

    ctaBtn?.addEventListener("click", () => openGate());
    gateSkip?.addEventListener("click", () => finishGate(passData(active).slug));

    window.addEventListener("keydown", (e) => {
      if (gate && !gate.hidden && e.key === "Escape") closeGate();
    });

    layout(0);
    updateMeta(0);
    syncTicketScale();

    document.querySelectorAll(".pass__frame").forEach((frame) => {
      new ResizeObserver(syncTicketScale).observe(frame);
    });
    window.addEventListener("resize", syncTicketScale);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initMap();
      initTickets();
    });
  } else {
    initMap();
    initTickets();
  }
})();
