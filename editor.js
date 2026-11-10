(() => {
  const scriptUrl = document.currentScript.src;
  const apiUrl = new URL('api.php', scriptUrl).href;
  const pageKey = location.pathname.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'home';
  const request = async (action, options = {}) => {
    const response = await fetch(`${apiUrl}?action=${action}`, options);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || `Ошибка запроса (${response.status})`);
    if (!data || typeof data !== 'object') throw new Error('Сервер вернул некорректный ответ');
    if (action === 'upload' && typeof data.url !== 'string') throw new Error(data.error || 'Сервер не вернул адрес загруженной фотографии');
    return data;
  };
  const save = async (key, value, csrf) => request('save', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({key, value, csrf})
  });
  const toast = (message, bad = false) => {
    let node = document.querySelector('.tamasa-editor-toast');
    if (!node) { node = document.createElement('div'); node.className = 'tamasa-editor-toast'; document.body.append(node); }
    node.textContent = message; node.classList.toggle('is-error', bad);
    node.classList.add('is-visible');
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.classList.remove('is-visible'), 2300);
  };
  const escapeKey = value => String(value).replace(/[^a-zA-Z0-9_.:-]/g, '_');

  const publicPageKey = pageKey;
  const publicContentPromise = request('public_content&page=' + encodeURIComponent(publicPageKey)).catch(() => ({images:{}}));
  publicContentPromise.then(publicData => {
    const imageNodes = [...document.querySelectorAll('.hero-art-main, .square-placeholder, .material-tile, .project-placeholder')];
    imageNodes.forEach((el, index) => {
      const savedUrl = publicData.images?.[`image:${publicPageKey}:${index}`];
      if (savedUrl) applyImage(el, savedUrl);
    });
    const beforePhoto = document.querySelector('#beforePhoto');
    const afterPhoto = document.querySelector('#afterPhoto');
    if (beforePhoto && publicData.images?.[`image:${publicPageKey}:before`]) applyImage(beforePhoto, publicData.images[`image:${publicPageKey}:before`]);
    if (afterPhoto && publicData.images?.[`image:${publicPageKey}:after`]) applyImage(afterPhoto, publicData.images[`image:${publicPageKey}:after`]);
  });

  request('status').then(async status => {
    if (!status.authenticated) return;
    const loaded = await request('load');
    const content = loaded.content || {};
    const csrf = status.csrf;
    document.body.classList.add('tamasa-editor-active');

    // Image replacement: the file is stored on the server, then its URL is saved with the page.
    const imageNodes = [...document.querySelectorAll('.hero-art-main, .square-placeholder, .material-tile, .project-placeholder')];
    imageNodes.forEach((el, index) => {
      const key = `image:${pageKey}:${index}`;
      const stored = content[key];
      if (stored) applyImage(el, stored);
      el.classList.add('tamasa-image-editable');
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'tamasa-image-trigger'; button.textContent = 'Фото +'; button.title = 'Заменить изображение';
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.hidden = true;
      button.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); input.click(); });
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0]; if (!file) return;
        if (file.size > 12 * 1024 * 1024) { toast('Максимальный размер фото 12 МБ', true); return; }
        const form = new FormData(); form.append('image', file); form.append('key', key); form.append('csrf', csrf);
        try {
          const result = await request('upload', {method:'POST', body:form});
          applyImage(el, result.url);
          remove.hidden = false;
          toast('Фотография обновлена');
        } catch (e) { toast(e.message, true); }
        input.value = '';
      });
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'tamasa-image-delete';
      remove.textContent = 'Удалить фото'; remove.hidden = !stored;
      remove.addEventListener('click', async event => {
        event.preventDefault(); event.stopPropagation();
        if (!confirm('Удалить эту фотографию?')) return;
        try { await save(key, null, csrf); toast('Фотография удалена'); location.reload(); }
        catch (error) { toast(error.message, true); }
      });
      el.append(button, input, remove);
    });

    // Catalog administration is intentionally image-only.
    const grid = document.querySelector('.catalog-grid');
    if (grid) {
      const originalCards = [...grid.querySelectorAll('.catalog-item')];
      const collect = () => originalCards.map(card => ({
        title: card.querySelector('h2')?.textContent.trim() || 'Модель',
        description: card.querySelector('.catalog-info > p')?.textContent.trim() || '',
        price: card.querySelector('.catalog-price')?.textContent.trim() || '0 ₸',
        image: ''
      }));
      let items = Array.isArray(content[`catalog:${pageKey}`]) ? content[`catalog:${pageKey}`] : collect();
      const render = () => {
        const template = originalCards[0];
        if (!template) return;
        grid.replaceChildren();
        items.forEach((item, index) => {
          const card = template.cloneNode(true);
          const title = card.querySelector('h2');
          const desc = card.querySelector('.catalog-info > p');
          const price = card.querySelector('.catalog-price');
          const visual = card.querySelector('.catalog-visual');
          if (title) title.textContent = item.title || 'Модель';
          if (desc) desc.textContent = item.description || '';
          if (price) price.textContent = item.price || '0 ₸';
          card.querySelectorAll('[data-название]').forEach(btn => btn.dataset.название = item.title || 'мебель');
          if (visual) {
            if (item.image) applyImage(visual, item.image);
            else {
              visual.classList.remove('has-custom-image');
              visual.style.removeProperty('background-image');
              visual.replaceChildren();
              const frame = document.createElement('div'); frame.className = 'catalog-placeholder-frame';
              const mark = document.createElement('span'); mark.className = 'catalog-placeholder-mark'; mark.textContent = 'T.';
              const brand = document.createElement('b'); brand.textContent = 'TAMASA MEBEL';
              const caption = document.createElement('small'); caption.textContent = 'МЕСТО ДЛЯ ФОТО МОДЕЛИ';
              frame.append(mark, brand, caption); visual.append(frame);
            }
          }
          const tools = document.createElement('div');
          tools.className = 'tamasa-card-tools';
          const photo = document.createElement('button');
          photo.type = 'button';
          photo.className = 'tamasa-image-trigger';
          photo.textContent = item.image ? 'Заменить фото' : 'Добавить фото';
          photo.title = 'Изменить только фотографию';
          const input = document.createElement('input');
          input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.hidden = true;
          photo.addEventListener('click', () => input.click());
          input.addEventListener('change', async () => {
            const file = input.files?.[0]; if (!file) return;
            if (file.size > 12 * 1024 * 1024) { toast('Максимальный размер фото 12 МБ', true); return; }
            const form = new FormData();
            form.append('image', file);
            form.append('key', `catalog-image:${pageKey}:${index}`);
            form.append('csrf', csrf);
            try {
              const result = await request('upload', {method:'POST', body:form});
              items[index].image = result.url;
              await save(`catalog:${pageKey}`, items, csrf);
              render();
              toast('Фотография сохранена');
            } catch (error) { toast(error.message, true); }
          });
          const removePhoto = document.createElement('button');
          removePhoto.type = 'button'; removePhoto.className = 'tamasa-image-delete';
          removePhoto.textContent = 'Удалить фото'; removePhoto.hidden = !item.image;
          removePhoto.addEventListener('click', async () => {
            if (!confirm('Удалить фотографию этой модели?')) return;
            const previous = item.image; item.image = '';
            try { await save(`catalog:${pageKey}`, items, csrf); render(); toast('Фотография удалена'); }
            catch (error) { item.image = previous; toast(error.message, true); }
          });
          const priceEditor = document.createElement('label'); priceEditor.className = 'tamasa-price-editor';
          const priceLabel = document.createElement('span'); priceLabel.textContent = 'Цена для клиента';
          const priceInput = document.createElement('input'); priceInput.type = 'text'; priceInput.maxLength = 80;
          priceInput.value = item.price || '0 ₸'; priceInput.placeholder = 'Например: от 150 000 ₸';
          const savePrice = document.createElement('button'); savePrice.type = 'button';
          savePrice.className = 'tamasa-price-save'; savePrice.textContent = 'Сохранить цену';
          savePrice.addEventListener('click', async () => {
            const value = priceInput.value.trim();
            if (!value) { toast('Укажи цену или «По запросу»', true); return; }
            const previous = item.price; item.price = value;
            try { await save(`catalog:${pageKey}`, items, csrf); if (price) price.textContent = value; toast('Цена сохранена'); }
            catch (error) { item.price = previous; toast(error.message, true); }
          });
          priceEditor.append(priceLabel, priceInput, savePrice);
          tools.append(photo, input, removePhoto, priceEditor);
          card.append(tools);
          grid.append(card);
        });
      };
      render();
    }

    // Before/after upload controls are placed OUTSIDE the draggable comparison stage.
    // This prevents upload-button clicks from being interpreted as slider movement.
    const compareStage = document.querySelector('#compareStage');
    const compareBox = compareStage?.closest('.compare-box');
    if (compareStage && compareBox) {
      const tools = document.createElement('div');
      tools.className = 'tamasa-compare-admin-tools';
      const beforeAfter = [
        { selector: '#beforePhoto', key: `image:${pageKey}:before`, label: 'Добавить фото ДО' },
        { selector: '#afterPhoto', key: `image:${pageKey}:after`, label: 'Добавить фото ПОСЛЕ' }
      ];
      beforeAfter.forEach(({selector, key, label}) => {
        const target = document.querySelector(selector);
        if (!target) return;
        const stored = content[key];
        if (stored) applyImage(target, stored);
        const group = document.createElement('div');
        group.className = 'tamasa-compare-admin-group';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tamasa-compare-admin-button';
        button.textContent = label;
        button.title = label;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.hidden = true;
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          input.click();
        });
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) return;
          if (file.size > 12 * 1024 * 1024) {
            toast('Максимальный размер фото 12 МБ', true);
            input.value = '';
            return;
          }
          const form = new FormData();
          form.append('image', file);
          form.append('key', key);
          form.append('csrf', csrf);
          try {
            const result = await request('upload', {method:'POST', body:form});
            applyImage(target, result.url);
            remove.hidden = false;
            toast(label.replace('Добавить', 'Фото сохранено'));
          } catch (error) {
            toast(error.message, true);
          }
          input.value = '';
        });
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'tamasa-image-delete';
        remove.textContent = 'Удалить фото'; remove.hidden = !stored;
        remove.addEventListener('click', async event => {
          event.preventDefault(); event.stopPropagation();
          if (!confirm('Удалить эту фотографию?')) return;
          try { await save(key, null, csrf); toast('Фотография удалена'); location.reload(); }
          catch (error) { toast(error.message, true); }
        });
        group.append(button, input, remove);
        tools.append(group);
      });
      compareStage.insertAdjacentElement('afterend', tools);
    }
  }).catch(() => { /* Public site remains fully usable if editor API is unavailable. */ });

  function applyImage(element, url) {
    if (typeof url !== 'string' || !url.trim()) { toast('Не получен адрес фотографии', true); return; }
    const safe = new URL(url, apiUrl);
    if (safe.origin !== location.origin) return;
    element.style.setProperty('background-image', `url("${safe.href.replace(/["'()\\]/g, '')}")`, 'important');
    element.style.setProperty('background-size', 'cover', 'important');
    element.style.setProperty('background-position', 'center', 'important');
    element.classList.add('has-custom-image');
    const placeholder = element.querySelector('.placeholder-frame, .compare-placeholder');
    if (placeholder) { placeholder.hidden = true; placeholder.setAttribute('aria-hidden', 'true'); }
    [...element.children].forEach(child => {
      if (!child.classList.contains('tamasa-image-trigger') && !child.classList.contains('tamasa-image-delete') && child.type !== 'file') {
        child.hidden = true;
        child.setAttribute('aria-hidden', 'true');
      }
    });
  }
})();
