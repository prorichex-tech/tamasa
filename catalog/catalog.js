/* TAMASA MEBEL — карточки каталога и окно «Уточнить детали» */
const НОМЕР_WHATSAPP = ""; // Международный формат, только цифры
const apiUrl = new URL('../../api.php', document.currentScript.src).href;
const request = async (action, options = {}) => {
  const response = await fetch(`${apiUrl}?action=${action}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Ошибка запроса (${response.status})`);
  if (!data || typeof data !== 'object') throw new Error('Сервер вернул некорректный ответ');
  if (action === 'upload' && (typeof data.url !== 'string' || !data.url.trim())) throw new Error(data.error || 'Сервер не вернул адрес загруженной фотографии');
  return data;
};
const saveContent = (key, value, csrf) => request('save', {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({key, value, csrf})
});
const pageKey = location.pathname.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'catalog';
let isAdmin = false;
let csrfToken = '';
let contentStore = {};
let activeCard = null;
let activeIndex = -1;

const modal = document.createElement('section');
modal.className = 'tamasa-details-modal';
modal.hidden = true;
modal.innerHTML = `
  <div class="tamasa-details-backdrop" data-details-close></div>
  <div class="tamasa-details-dialog" role="dialog" aria-modal="true" aria-labelledby="detailsTitle" tabindex="-1">
    <button class="tamasa-details-close" type="button" aria-label="Закрыть" data-details-close>×</button>
    <div class="tamasa-details-kicker">Подробная информация</div>
    <h2 id="detailsTitle">Уточнить детали</h2>
    <div class="tamasa-details-description-wrap">
      <h3>Описание</h3>
      <p class="tamasa-details-description"></p>
    </div>
    <div class="tamasa-details-gallery-wrap" hidden>
      <h3>Фотографии</h3>
      <div class="tamasa-details-gallery"></div>
    </div>
    <div class="tamasa-details-admin-add" hidden><button type="button" class="tamasa-add-photo">＋ Добавить фотографию</button><span>До 3 фотографий · JPG, PNG или WebP · до 12 МБ</span></div>
  </div>`;
document.body.append(modal);
const dialog = modal.querySelector('.tamasa-details-dialog');
const descNode = modal.querySelector('.tamasa-details-description');
const galleryWrap = modal.querySelector('.tamasa-details-gallery-wrap');
const gallery = modal.querySelector('.tamasa-details-gallery');
const addPhotoButton = modal.querySelector('.tamasa-add-photo');
const addPhotoWrap = modal.querySelector('.tamasa-details-admin-add');
let lastFocus = null;

function detailsKey(index) { return `details:${pageKey}:${index}`; }
function getDetails(index, card) {
  const stored = contentStore[detailsKey(index)] || {};
  return {
    description: typeof stored.description === 'string' ? stored.description : (card.querySelector('.catalog-info > p')?.textContent.trim() || ''),
    photos: Array.isArray(stored.photos) ? stored.photos.filter(x => typeof x === 'string').slice(0,3) : []
  };
}
async function persistDetails() {
  await saveContent(detailsKey(activeIndex), activeCard._details, csrfToken);
  contentStore[detailsKey(activeIndex)] = activeCard._details;
}
function safeImageUrl(url) {
  try { const parsed = new URL(url, apiUrl); return parsed.origin === location.origin && /^https?:$/.test(parsed.protocol) ? parsed.href : ''; }
  catch { return ''; }
}
function renderDetails() {
  const details = activeCard._details;
  descNode.textContent = details.description || 'Подробности о модели можно уточнить у специалиста TAMASA MEBEL.';
  addPhotoWrap.hidden = !isAdmin || details.photos.length >= 3;
  galleryWrap.hidden = details.photos.length === 0;
  gallery.replaceChildren();
  details.photos.forEach((url, photoIndex) => {
    const safeUrl = safeImageUrl(url);
    if (!safeUrl) return;
    const figure = document.createElement('figure');
    figure.className = 'tamasa-detail-photo';
    const image = document.createElement('img');
    image.src = safeUrl; image.alt = `Фотография модели ${photoIndex + 1}`; image.loading = 'lazy';
    figure.append(image);
    if (isAdmin) {
      const tools = document.createElement('div'); tools.className = 'tamasa-detail-photo-tools';
      const replace = document.createElement('button'); replace.type='button'; replace.className='tamasa-photo-edit'; replace.title='Заменить фотографию'; replace.setAttribute('aria-label','Заменить фотографию'); replace.textContent='✎';
      const remove = document.createElement('button'); remove.type='button'; remove.className='tamasa-photo-delete'; remove.title='Удалить фотографию'; remove.setAttribute('aria-label','Удалить фотографию'); remove.textContent='⌫';
      replace.addEventListener('click', () => choosePhoto(photoIndex));
      remove.addEventListener('click', async () => {
        if (!confirm('Удалить эту фотографию?')) return;
        const old = [...details.photos]; details.photos.splice(photoIndex,1);
        try { await persistDetails(); renderDetails(); }
        catch (error) { details.photos = old; renderDetails(); alert(error.message); }
      });
      tools.append(replace, remove); figure.append(tools);
    }
    gallery.append(figure);
  });
}
async function openDetails(card) {
  try { await editorReady; } catch (_) {}
  activeCard = card;
  activeIndex = [...document.querySelectorAll('.catalog-grid .catalog-item')].indexOf(card);
  if (activeIndex < 0) return;
  activeCard._details = getDetails(activeIndex, card);
  modal.hidden = false; document.body.classList.add('tamasa-modal-open');
  lastFocus = document.activeElement; renderDetails(); dialog.focus();
}
function closeDetails() {
  if (modal.hidden) return;
  modal.hidden = true; document.body.classList.remove('tamasa-modal-open');
  if (lastFocus?.focus) lastFocus.focus();
}
modal.addEventListener('click', event => { if (event.target.closest('[data-details-close]')) closeDetails(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDetails(); });

document.addEventListener('click', event => {
  const button = event.target.closest('[data-details]');
  if (button) { event.preventDefault(); openDetails(button.closest('.catalog-item')); }
  const inquiry = event.target.closest('[data-заявка]');
  if (inquiry) {
    const title = inquiry.dataset.название || inquiry.closest('.catalog-item')?.querySelector('h2')?.textContent || 'мебель на заказ';
    const phone = НОМЕР_WHATSAPP.replace(/\D/g, '');
    if (!phone) { alert('Добавьте номер WhatsApp компании в файле catalog.js.'); return; }
    const message = `Здравствуйте! Хочу обсудить модель «${title}» в TAMASA MEBEL. Подскажите, пожалуйста, по размерам, материалам и срокам изготовления.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }
});

function choosePhoto(photoIndex = -1) {
  const input = document.createElement('input'); input.type='file'; input.accept='image/jpeg,image/png,image/webp';
  input.addEventListener('change', async () => {
    const file = input.files?.[0]; if (!file) return;
    if (file.size > 12*1024*1024) { alert('Максимальный размер фотографии — 12 МБ.'); return; }
    const form = new FormData(); form.append('image',file); form.append('key',`detail-photo:${pageKey}:${activeIndex}:${Date.now()}`); form.append('csrf',csrfToken);
    try {
      const result = await request('upload',{method:'POST',body:form});
      if (photoIndex >= 0) activeCard._details.photos[photoIndex] = result.url;
      else if (activeCard._details.photos.length < 3) activeCard._details.photos.push(result.url);
      await persistDetails(); renderDetails();
    } catch (error) { alert(error.message || 'Не удалось загрузить фотографию.'); }
  });
  input.click();
}
addPhotoButton.addEventListener('click', () => choosePhoto());
const editorReady = (async () => {
  const [detailsData, pageData, status] = await Promise.all([
    request('catalog_details&page=' + encodeURIComponent(pageKey)).catch(() => ({details:{}})),
    request('public_content&page=' + encodeURIComponent(pageKey)).catch(() => ({catalog:null})),
    request('status').catch(() => ({authenticated:false, csrf:''}))
  ]);
  contentStore = detailsData.details || {};
  isAdmin = !!status.authenticated;
  csrfToken = status.csrf || '';
  if (isAdmin) {
    const loaded = await request('load');
    contentStore = {...contentStore, ...(loaded.content || {})};
  } else if (Array.isArray(pageData.catalog)) {
    const grid = document.querySelector('.catalog-grid');
    const first = grid?.querySelector('.catalog-item');
    if (grid && first) {
      grid.replaceChildren();
      pageData.catalog.forEach((item, index) => {
        const card = first.cloneNode(true);
        const title = card.querySelector('h2');
        const desc = card.querySelector('.catalog-info > p');
        const price = card.querySelector('.catalog-price');
        const visual = card.querySelector('.catalog-visual');
        if (title) title.textContent = item.title;
        if (desc) desc.textContent = item.description;
        if (price) price.textContent = item.price || '0 ₸';
        card.querySelectorAll('[data-название]').forEach(button => button.dataset.название = item.title);
        if (visual && item.image) {
          const imageUrl = safeImageUrl(item.image);
          if (imageUrl) {
            visual.style.setProperty('background-image', `url("${imageUrl.replace(/["'()\\]/g, '')}")`, 'important');
            visual.style.setProperty('background-size', 'cover', 'important');
            visual.style.setProperty('background-position', 'center', 'important');
            visual.classList.add('has-custom-image');
            [...visual.children].forEach(child => { child.hidden = true; child.setAttribute('aria-hidden', 'true'); });
          }
        }
        grid.append(card);
      });
    }
  }
})();

const year = document.querySelector('[data-год]'); if (year) year.textContent = new Date().getFullYear();
const menuButton = document.querySelector('#menuButton'); const nav = document.querySelector('#siteNav');
if (menuButton && nav) {
  menuButton.addEventListener('click', () => { const open = nav.classList.toggle('open'); menuButton.setAttribute('aria-expanded',String(open)); });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); menuButton.setAttribute('aria-expanded','false'); }));
}
