(function () {
  "use strict";

  const ROUTES = {
    neon: {
      code: "NT·01",
      name: "Neon Transit",
      price: 2400,
      defaultTime: "22:30",
      serial: "AL 190 021",
    },
    memory: {
      code: "MD·02",
      name: "Memory District",
      price: 2100,
      defaultTime: "21:00",
      serial: "AL 221 045",
    },
    signal: {
      code: "SV·03",
      name: "Signal Void",
      price: 2600,
      defaultTime: "23:15",
      serial: "AL 308 117",
    },
    loop: {
      code: "NL·04",
      name: "Night Loop",
      price: 2200,
      defaultTime: "00:00",
      serial: "AL 404 088",
    },
  };

  const ROWS = ["A", "B", "C", "D", "E", "F"];
  const TAKEN_BY_ROUTE = {
    neon: ["B2", "C3", "D1", "E4"],
    memory: ["A1", "B3", "C2", "F4"],
    signal: ["A3", "B1", "D4", "E2"],
    loop: ["C1", "D3", "E1", "F2"],
  };

  const routePick = document.getElementById("routePick");
  const seatGrid = document.getElementById("seatGrid");
  const dateInput = document.getElementById("dateInput");
  const timeSlots = document.getElementById("timeSlots");
  const guestInput = document.getElementById("guestInput");
  const payBtn = document.getElementById("payBtn");
  const payOverlay = document.getElementById("payOverlay");
  const payBar = document.getElementById("payBar");
  const payStatus = document.getElementById("payStatus");
  const seatsNeeded = document.getElementById("seatsNeeded");
  const orderCard = document.getElementById("orderCard");

  const orderCode = document.getElementById("orderCode");
  const orderRoute = document.getElementById("orderRoute");
  const orderDate = document.getElementById("orderDate");
  const orderTime = document.getElementById("orderTime");
  const orderSeat = document.getElementById("orderSeat");
  const orderGuests = document.getElementById("orderGuests");
  const orderTotal = document.getElementById("orderTotal");
  const checkoutSub = document.getElementById("checkoutSub");
  const orderSerial = document.getElementById("orderSerial");

  let activeSlug = "neon";
  let activeTime = "22:30";
  let pickedSeats = [];

  function formatPrice(n) {
    return `${n.toLocaleString("ru-RU")} ₽`;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  function seatId(row, col) {
    return `${row}${col}`;
  }

  function guestCount() {
    return Math.min(4, Math.max(1, Number(guestInput.value) || 1));
  }

  function routeFromQuery() {
    const slug = new URLSearchParams(window.location.search).get("route");
    return ROUTES[slug] ? slug : null;
  }

  function selectRoute(slug) {
    if (!ROUTES[slug]) return;
    activeSlug = slug;
    const data = ROUTES[slug];

    routePick.querySelectorAll(".route-pick__item").forEach((btn) => {
      const on = btn.dataset.slug === slug;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });

    activeTime = data.defaultTime;
    timeSlots.querySelectorAll(".time-slots__btn").forEach((btn) => {
      const on = btn.dataset.time === activeTime;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    pickedSeats = [];
    buildSeats();
    updateSummary();

    if (checkoutSub) {
      checkoutSub.textContent = `маршрут ${data.name} · выберите дату и место`;
    }

    if (orderSerial) {
      orderSerial.textContent = data.serial || "";
    }
  }

  function buildSeats() {
    if (!seatGrid) return;
    seatGrid.innerHTML = "";
    const taken = new Set(TAKEN_BY_ROUTE[activeSlug] || []);

    ROWS.forEach((row) => {
      for (let col = 1; col <= 4; col += 1) {
        const id = seatId(row, col);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "seat";
        btn.textContent = id;
        btn.dataset.seat = id;

        if (taken.has(id)) {
          btn.classList.add("is-taken");
          btn.disabled = true;
          btn.setAttribute("aria-label", `Место ${id}, занято`);
        } else {
          btn.setAttribute("aria-label", `Место ${id}`);
          btn.addEventListener("click", () => toggleSeat(id, btn));
        }

        seatGrid.appendChild(btn);
      }
    });
  }

  function toggleSeat(id, btn) {
    const max = guestCount();
    const idx = pickedSeats.indexOf(id);

    if (idx >= 0) {
      pickedSeats.splice(idx, 1);
      btn.classList.remove("is-picked");
    } else if (pickedSeats.length < max) {
      pickedSeats.push(id);
      btn.classList.add("is-picked");
    } else if (max === 1) {
      seatGrid.querySelectorAll(".seat.is-picked").forEach((el) => el.classList.remove("is-picked"));
      pickedSeats = [id];
      btn.classList.add("is-picked");
    } else {
      orderCard?.classList.add("is-invalid");
      window.setTimeout(() => orderCard?.classList.remove("is-invalid"), 400);
      return;
    }

    updateSummary();
  }

  function updateSummary() {
    const data = ROUTES[activeSlug];
    const guests = guestCount();

    orderCode.textContent = data.code;
    orderRoute.textContent = data.name;
    orderDate.textContent = formatDate(dateInput.value);
    orderTime.textContent = activeTime;
    orderSeat.textContent = pickedSeats.length ? pickedSeats.join(", ") : "—";
    orderGuests.textContent = String(guests);
    orderTotal.textContent = formatPrice(data.price * guests);

    if (seatsNeeded) {
      seatsNeeded.textContent = guests === 1 ? "1" : String(guests);
    }
  }

  function validate() {
    let ok = true;

    if (!dateInput.value) {
      dateInput.classList.add("is-invalid");
      ok = false;
    } else {
      dateInput.classList.remove("is-invalid");
    }

    if (pickedSeats.length !== guestCount()) {
      orderCard?.classList.add("is-invalid");
      ok = false;
    }

    return ok;
  }

  function runPaymentGate() {
    if (!validate()) return;

    payOverlay.hidden = false;
    payOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const steps = [
      { t: 0, bar: 12, text: "инициализация платёжного канала…" },
      { t: 600, bar: 38, text: "проверка пропуска…" },
      { t: 1200, bar: 62, text: "синхронизация с шлюзом…" },
      { t: 1800, bar: 88, text: "перенаправление…" },
      { t: 2400, bar: 100, text: "сигнал потерян" },
    ];

    steps.forEach(({ t, bar, text }) => {
      window.setTimeout(() => {
        if (payBar) payBar.style.width = `${bar}%`;
        if (payStatus) payStatus.textContent = text;
      }, t);
    });

    window.setTimeout(() => {
      window.location.href = "./404.html";
    }, 2800);
  }

  function initDateMin() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    dateInput.min = `${y}-${m}-${d}`;
  }

  routePick?.addEventListener("click", (e) => {
    const btn = e.target.closest(".route-pick__item");
    if (btn?.dataset.slug) selectRoute(btn.dataset.slug);
  });

  timeSlots?.addEventListener("click", (e) => {
    const btn = e.target.closest(".time-slots__btn");
    if (!btn) return;
    activeTime = btn.dataset.time;
    timeSlots.querySelectorAll(".time-slots__btn").forEach((el) => {
      const on = el === btn;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
    updateSummary();
  });

  dateInput?.addEventListener("change", updateSummary);
  guestInput?.addEventListener("input", () => {
    if (pickedSeats.length > guestCount()) {
      pickedSeats = pickedSeats.slice(0, guestCount());
      seatGrid?.querySelectorAll(".seat").forEach((el) => {
        el.classList.toggle("is-picked", pickedSeats.includes(el.dataset.seat));
      });
    }
    updateSummary();
  });

  payBtn?.addEventListener("click", runPaymentGate);

  initDateMin();
  selectRoute(routeFromQuery() || "neon");
})();
