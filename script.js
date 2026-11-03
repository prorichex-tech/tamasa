/* TAMASA MEBEL | client-side interactions
   IMPORTANT: this is a static frontend. Never put API keys, passwords or private tokens here. */
const CONFIG = {
  whatsapp: "", // country code + number, digits only. Example: 77011234567
  // Demonstration rates only. Replace with the company's approved pricing model.
  rates: {
    kitchen: { basePerRunningMeter: 180000, materials: { basic: 1, mdf: 1.33, premium: 1.78 } },
    other: { basePerSquareMeter: 95000, materials: { basic: 1, mdf: 1.36, premium: 1.84 } },
    fittings: { standard: 1, improved: 1.12, premium: 1.25 },
    installation: 0.10
  }
};

// Add the actual photo URLs after the client provides approved project photos.
// Keep empty to show the branded placeholders.
const COMPARE_PHOTOS = { before: "", after: "" };

const one = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
one("#year").textContent = new Date().getFullYear();

// Mobile navigation
const menuButton = one("#menuButton");
const siteNav = one("#siteNav");
menuButton.addEventListener("click", () => {
  const opened = siteNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(opened));
});
all("#siteNav a").forEach(link => link.addEventListener("click", () => {
  siteNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}));

// One calculator form: desktop inline, mobile inside the bottom sheet.
const sheet = one("#calculatorSheet");
const backdrop = one("#sheetBackdrop");
const mobileTrigger = one("#mobileCalcTrigger");
const closeSheetButton = one("#closeSheet");
const form = one("#estimateForm");
const desktopSlot = one("#desktopCalculatorSlot");
const mobileSlot = one("#mobileCalculatorSlot");
const mobileMode = window.matchMedia("(max-width: 560px)");
const focusableSelector = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])' ;
let lastFocused = null;

function syncCalculatorPlacement() {
  if (mobileMode.matches) {
    if (form.parentElement !== mobileSlot) mobileSlot.appendChild(form);
  } else {
    closeSheet();
    if (form.parentElement !== desktopSlot) desktopSlot.appendChild(form);
  }
}
syncCalculatorPlacement();

if (mobileMode.addEventListener) mobileMode.addEventListener("change", syncCalculatorPlacement);
else mobileMode.addListener(syncCalculatorPlacement);

function openSheet() {
  if (!mobileMode.matches) {
    one("#calculator").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  lastFocused = document.activeElement;
  sheet.classList.add("open");
  backdrop.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("sheet-open");
  window.setTimeout(() => one("#furnitureType").focus(), 120);
}

function closeSheet() {
  if (!sheet.classList.contains("open")) return;
  sheet.classList.remove("open");
  backdrop.classList.remove("open");
  sheet.setAttribute("aria-hidden", "true");
  document.body.classList.remove("sheet-open");
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
}

all("[data-open-calculator]").forEach(button => button.addEventListener("click", openSheet));
mobileTrigger.addEventListener("click", openSheet);
closeSheetButton.addEventListener("click", closeSheet);
backdrop.addEventListener("click", closeSheet);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && sheet.classList.contains("open")) closeSheet();
  if (event.key === "Tab" && sheet.classList.contains("open")) {
    const focusable = all(focusableSelector, sheet).filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

// Estimator. Rates/formula are placeholders until the furniture maker confirms them.
const resultBox = one("#estimateResult");
const formatMoney = amount => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(amount)) + " ₸";
function validateEstimate() {
  const fields = [
    ["#width", 30, 2000, "Ширина должна быть от 30 до 2000 см."],
    ["#height", 30, 1000, "Высота должна быть от 30 до 1000 см."],
    ["#depth", 10, 500, "Глубина должна быть от 10 до 500 см."]
  ];
  for (const [selector, min, max, message] of fields) {
    const field = one(selector);
    const value = Number(field.value);
    if (!Number.isFinite(value) || value < min || value > max) {
      field.setCustomValidity(message);
      field.reportValidity();
      field.setCustomValidity("");
      field.focus();
      return false;
    }
  }
  const name = one("#clientName");
  if (!name.value.trim() || name.value.trim().length > 70) { name.focus(); name.reportValidity(); return false; }
  const phone = one("#clientPhone");
  const digits = phone.value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    phone.setCustomValidity("Введите корректный номер телефона.");
    phone.reportValidity(); phone.setCustomValidity(""); phone.focus(); return false;
  }
  return true;
}
function calculateEstimate() {
  const type = one("#furnitureType").value;
  const width = Number(one("#width").value);
  const height = Number(one("#height").value);
  const materialValue = one("#material").value;
  const fittingsValue = one("#fittings").value;
  const materialKey = materialValue === "ЛДСП / базовый" ? "basic" : materialValue === "МДФ" ? "mdf" : materialValue === "Премиальный" ? "premium" : "basic";
  const fittingKey = fittingsValue === "Улучшенная" ? "improved" : fittingsValue === "Премиальная" ? "premium" : "standard";
  const isKitchen = type === "Кухня";
  const base = isKitchen
    ? (width / 100) * CONFIG.rates.kitchen.basePerRunningMeter
    : (width * height / 10000) * CONFIG.rates.other.basePerSquareMeter;
  let total = base * (isKitchen ? CONFIG.rates.kitchen.materials[materialKey] : CONFIG.rates.other.materials[materialKey]);
  total *= CONFIG.rates.fittings[fittingKey];
  if (one("#installation").checked) total *= 1 + CONFIG.rates.installation;
  return total;
}
form.addEventListener("submit", event => {
  event.preventDefault();
  // Honeypot reduces basic bot submissions, but is not server-side spam protection.
  if (form.elements.website.value) return;
  if (!validateEstimate()) return;

  const total = calculateEstimate();
  const estimateText = formatMoney(total);
  resultBox.innerHTML = `<span>Предварительный ориентир</span><strong>${estimateText}</strong><span>Итог зависит от конструкции, наполнения, замера и выбранных комплектующих.</span>`;
  resultBox.classList.add("show");

  const data = {
    name: one("#clientName").value.trim(),
    phone: one("#clientPhone").value.trim(),
    type: one("#furnitureType").value,
    width: one("#width").value,
    height: one("#height").value,
    depth: one("#depth").value,
    material: one("#material").value,
    fittings: one("#fittings").value,
    installation: one("#installation").checked ? "Нужна" : "Не нужна",
    estimate: estimateText
  };
  const message = [
    "Здравствуйте! Хочу оставить заявку в TAMASA MEBEL.",
    `Имя: ${data.name}`,
    `Телефон: ${data.phone}`,
    `Мебель: ${data.type}`,
    `Размеры (Ш × В × Г): ${data.width} × ${data.height} × ${data.depth} см`,
    `Материал: ${data.material}`,
    `Фурнитура: ${data.fittings}`,
    `Доставка и установка: ${data.installation}`,
    `Предварительный расчёт: ${data.estimate}`,
    "Прошу связаться со мной для уточнения деталей."
  ].join("\n");

  const phoneNumber = String(CONFIG.whatsapp).replace(/\D/g, "");
  if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
    alert("Форма проверена, расчёт выполнен. Для отправки заявок добавьте номер WhatsApp в CONFIG.whatsapp в файле script.js.");
    return;
  }
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  // Fixed WhatsApp origin + encoded message; no user-controlled destination URL.
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
});

// Before / after slider
const compareStage = one("#compareStage");
const beforePhoto = one("#beforePhoto");
const afterPhoto = one("#afterPhoto");
const grip = one("#compareGrip");
const compareSlider = one("#compareSlider");
let position = 50;
let isDragging = false;

function setPosition(value) {
  position = Math.min(100, Math.max(0, Number(value)));
  afterPhoto.style.clipPath = `inset(0 0 0 ${position}%)`;
  grip.style.left = `${position}%`;
  grip.setAttribute("aria-valuenow", String(Math.round(position)));
  compareSlider.value = String(position);
  all(".compare-choice").forEach(button => button.classList.toggle("active", Number(button.dataset.compare) === position));
}
function pointerPosition(event) {
  const rect = compareStage.getBoundingClientRect();
  setPosition(((event.clientX - rect.left) / rect.width) * 100);
}
compareStage.addEventListener("pointerdown", event => {
  if (event.target.closest(".expand-compare")) return;
  isDragging = true;
  compareStage.setPointerCapture(event.pointerId);
  pointerPosition(event);
});
compareStage.addEventListener("pointermove", event => { if (isDragging) pointerPosition(event); });
compareStage.addEventListener("pointerup", () => { isDragging = false; });
compareStage.addEventListener("pointercancel", () => { isDragging = false; });
compareSlider.addEventListener("input", event => setPosition(event.target.value));
all(".compare-choice").forEach(button => button.addEventListener("click", () => setPosition(button.dataset.compare)));
one("#resetCompare").addEventListener("click", () => setPosition(50));
grip.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") { event.preventDefault(); setPosition(position - 2); }
  if (event.key === "ArrowRight") { event.preventDefault(); setPosition(position + 2); }
  if (event.key === "Home") { event.preventDefault(); setPosition(0); }
  if (event.key === "End") { event.preventDefault(); setPosition(100); }
});

// Optional actual photos. Only allow ordinary same-site/HTTPS image URLs.
function setApprovedImage(element, url) {
  if (!url) return;
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol !== "https:" && parsed.origin !== window.location.origin) return;
    element.style.backgroundImage = `url("${parsed.href.replace(/["'()\\]/g, "")}")`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    const placeholder = element.querySelector(".compare-placeholder");
    if (placeholder) placeholder.hidden = true;
  } catch { /* Keep branded placeholder if URL is invalid. */ }
}
setApprovedImage(beforePhoto, COMPARE_PHOTOS.before);
setApprovedImage(afterPhoto, COMPARE_PHOTOS.after);

// Fullscreen comparison moves the same live stage into a modal and restores it on close.
const fullscreen = one("#fullscreenCompare");
const fullscreenMount = one("#fullscreenCompareMount");
let stageParent = null;
let stageNext = null;
function openFullscreen() {
  stageParent = compareStage.parentNode;
  stageNext = compareStage.nextSibling;
  fullscreenMount.appendChild(compareStage);
  fullscreen.classList.add("open");
  fullscreen.setAttribute("aria-hidden", "false");
  document.body.classList.add("fullscreen-open");
}
function closeFullscreen() {
  if (!fullscreen.classList.contains("open")) return;
  if (stageParent) stageNext ? stageParent.insertBefore(compareStage, stageNext) : stageParent.appendChild(compareStage);
  fullscreen.classList.remove("open");
  fullscreen.setAttribute("aria-hidden", "true");
  document.body.classList.remove("fullscreen-open");
}
one("#expandCompare").addEventListener("click", openFullscreen);
one("#closeFullscreen").addEventListener("click", closeFullscreen);
fullscreen.addEventListener("click", event => { if (event.target === fullscreen) closeFullscreen(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeFullscreen(); });
setPosition(50);