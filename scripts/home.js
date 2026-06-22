(function () {
  "use strict";

  const START = 14807;
  const DIGITS = 6;
  const TICK_MS = 3500;

  const FLIGHTS = [
    { id: "AF201", route: "Neon Transit", code: "NT·01", time: "22:30", status: "boarding" },
    { id: "AF221", route: "Memory District", code: "MD·02", time: "21:00", status: "departed" },
    { id: "AF308", route: "Signal Void", code: "SV·03", time: "23:15", status: "boarding" },
    { id: "AF404", route: "Night Loop", code: "NL·04", time: "00:00", status: "delayed" },
  ];

  const STATUS = {
    boarding: "посадка",
    departed: "в пути",
    delayed: "задержка",
  };

  const counterRoot = document.getElementById("boardCounter");
  const rowsRoot = document.getElementById("boardRows");
  const clock = document.getElementById("boardClock");
  const sub = document.getElementById("boardSub");

  if (!counterRoot || !rowsRoot || counterRoot.dataset.ready === "true") return;

  counterRoot.dataset.ready = "true";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let count = START;
  const digitCells = [];

  function pad(n) {
    return String(n).padStart(DIGITS, "0");
  }

  function buildDigit(char) {
    const el = document.createElement("span");
    el.className = "board__digit";
    el.textContent = char;
    counterRoot.appendChild(el);
    return { el, value: char };
  }

  function setDigit(cell, next) {
    if (cell.value === next) return;

    cell.value = next;
    cell.el.textContent = next;

    if (reducedMotion) return;

    cell.el.classList.remove("is-tick");
    void cell.el.offsetWidth;
    cell.el.classList.add("is-tick");
    window.setTimeout(() => cell.el.classList.remove("is-tick"), 320);
  }

  function renderCount() {
    pad(count)
      .split("")
      .forEach((ch, i) => setDigit(digitCells[i], ch));
  }

  function initCounter() {
    counterRoot.replaceChildren();
    digitCells.length = 0;
    pad(count)
      .split("")
      .forEach((ch) => digitCells.push(buildDigit(ch)));
  }

  function formatTime(value) {
    return String(value).padStart(2, "0");
  }

  function tickClock() {
    if (!clock) return;
    const now = new Date();
    clock.textContent = `${formatTime(now.getHours())}:${formatTime(now.getMinutes())}`;
  }

  function setActive(index) {
    rowsRoot.querySelectorAll(".board__row--btn").forEach((row, i) => {
      row.classList.toggle("is-active", i === index);
    });

    const f = FLIGHTS[index];
    if (sub && f) {
      sub.textContent = `${f.code} · ${f.route.toUpperCase()}`;
    }
  }

  function renderRows() {
    rowsRoot.replaceChildren();

    FLIGHTS.forEach((f, i) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "board__row board__row--btn";
      row.dataset.index = String(i);

      row.innerHTML =
        `<span class="board__flight">${f.id}</span>` +
        `<span class="board__route">${f.route}</span>` +
        `<span class="board__time">${f.time}</span>` +
        `<span class="board__status board__status--${f.status}">${STATUS[f.status]}</span>`;

      rowsRoot.appendChild(row);
    });
  }

  rowsRoot.addEventListener("click", (e) => {
    const row = e.target.closest(".board__row--btn");
    if (!row) return;
    setActive(Number(row.dataset.index) || 0);
  });

  initCounter();
  renderRows();
  setActive(0);
  tickClock();

  window.setInterval(tickClock, 15000);

  window.setInterval(() => {
    count += 1;
    renderCount();
  }, TICK_MS);
})();
