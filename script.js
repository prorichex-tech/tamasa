/* TAMASA MEBEL | Интерактивные элементы сайта
   Важно: это статический сайт. Не храните здесь пароли и секретные ключи. */
const CONFIG = {
  // Номер компании в международном формате, только цифры. Например: 77011234567
  whatsapp: ""
};

// Add the actual photo URLs after the client provides approved project photos.
// Keep empty to show the branded placeholders.
const COMPARE_PHOTOS = { before: "", after: "" };

const one = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
one("#year").textContent = new Date().getFullYear();

// Мобильная навигация
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

// Одна форма калькулятора: на компьютере встроена в страницу, на телефоне открывается в нижней панели.
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

// Проверка формы и подготовка заявки. Стоимость уточняется после замера.

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
  const consent = one("#personalDataConsent");
  if (!consent || !consent.checked) {
    consent?.focus();
    consent?.reportValidity();
    return false;
  }
  const phone = one("#clientPhone");
  const digits = phone.value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    phone.setCustomValidity("Введите корректный номер телефона.");
    phone.reportValidity(); phone.setCustomValidity(""); phone.focus(); return false;
  }
  return true;
}
form.addEventListener("submit", event => {
  event.preventDefault();
  // Honeypot reduces basic bot submissions, but is not server-side spam protection.
  if (form.elements.website.value) return;
  if (!validateEstimate()) return;


  const data = {
    name: one("#clientName").value.trim(),
    phone: one("#clientPhone").value.trim(),
    type: one("#furnitureType").value,
    width: one("#width").value,
    height: one("#height").value,
    depth: one("#depth").value,
    material: one("#material").value,
    fittings: one("#fittings").value,
    installation: one("#installation").checked ? "Нужна" : "Не нужна"
  };
  const isKk = window.TAMASA_I18N?.getLang() === "kk";
  const message = isKk ? [
    "Сәлеметсіз бе! TAMASA MEBEL компаниясына өтінім қалдырғым келеді.",
    `Аты-жөні: ${data.name}`,
    `Телефон: ${data.phone}`,
    `Жиһаз түрі: ${{"Кухня":"Асүй","Шкаф":"Шкаф","Стол":"Үстел","Другая мебель":"Басқа жиһаз"}[data.type] || data.type}`,
    `Өлшемдері (Е × Б × Т): ${data.width} × ${data.height} × ${data.depth} см`,
    `Материал: ${{"ЛДСП / базовый":"ЛДСП / негізгі","МДФ":"МДФ","Премиальный":"Премиум","Нужна консультация":"Кеңес қажет"}[data.material] || data.material}`,
    `Фурнитура: ${{"Стандартная":"Стандартты","Улучшенная":"Жақсартылған","Премиальная":"Премиум","Нужна консультация":"Кеңес қажет"}[data.fittings] || data.fittings}`,
    `Жеткізу және орнату: ${data.installation === "Нужна" ? "Қажет" : "Қажет емес"}`,
    "Мәліметтерді нақтылау үшін хабарласуыңызды сұраймын."
  ].join("\\n") : [
    "Здравствуйте! Хочу оставить заявку в TAMASA MEBEL.",
    `Имя: ${data.name}`,
    `Телефон: ${data.phone}`,
    `Мебель: ${data.type}`,
    `Размеры (Ш × В × Г): ${data.width} × ${data.height} × ${data.depth} см`,
    `Материал: ${data.material}`,
    `Фурнитура: ${data.fittings}`,
    `Доставка и установка: ${data.installation}`,
    "Прошу связаться со мной для уточнения деталей."
  ].join("\\n");

  const phoneNumber = String(CONFIG.whatsapp).replace(/\D/g, "");
  if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
    alert("Форма заполнена. Для отправки заявок добавьте номер WhatsApp компании в CONFIG.whatsapp в файле script.js.");
    return;
  }
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  // Fixed WhatsApp origin + encoded message; no user-controlled destination URL.
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
});

// Ползунок сравнения «До / После»
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