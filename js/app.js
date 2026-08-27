(() => {
  const state = { type: 'url', ecc: 'M', size: 720, logo: true };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const previewBox = $('#preview-box');
  const previewNote = $('#preview-note');
  const sizeInput = $('#input-size');
  const sizeValue = $('#size-value');
  const logoInput = $('#input-logo');
  const themeToggle = $('#theme-toggle');
  const logoFileWrap = $('#logo-file-wrap');
  const logoFileInput = $('#input-logo-file');
  const logoFileHint = $('#logo-file-hint');
  const btnPng = $('#btn-png');
  const btnSvg = $('#btn-svg');
  const btnCopy = $('#btn-copy');

  let canvas = null;
  let renderTimer = null;
  let renderId = 0;
  let lastPayload = '';
  let logoImage = null;
  let logoDataUrl = '';
  let userLogoUploaded = false;

  const BASE_NOTE =
    'Nivel ECC: M · PNG para pantalla · SVG vectorial para imprenta.';

  const THEME_KEY = 'qr-theme';

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark' || theme === 'light') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved);
      return;
    }
    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light');
  }

  themeToggle.addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  initTheme();
  initDefaultLogo();

  async function trimTransparent(image) {
    const c = document.createElement('canvas');
    c.width = image.naturalWidth;
    c.height = image.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const w = c.width;
    const h = c.height;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;
    let found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }
    if (!found || (minX === 0 && minY === 0 && maxX === w - 1 && maxY === h - 1)) {
      return { image, dataUrl: c.toDataURL('image/png') };
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const side = Math.max(bw, bh);
    const out = document.createElement('canvas');
    out.width = side;
    out.height = side;
    out.getContext('2d').drawImage(
      c, minX, minY, bw, bh, (side - bw) / 2, (side - bh) / 2, bw, bh
    );
    const dataUrl = out.toDataURL('image/png');
    const trimmed = new Image();
    await new Promise((resolve, reject) => {
      trimmed.onload = resolve;
      trimmed.onerror = reject;
      trimmed.src = dataUrl;
    });
    return { image: trimmed, dataUrl };
  }

  function initDefaultLogo() {
    const image = new Image();
    image.onload = async () => {
      if (userLogoUploaded) return;
      const trimmed = await trimTransparent(image);
      logoImage = trimmed.image;
      logoDataUrl = trimmed.dataUrl;
      scheduleRender();
    };
    image.onerror = () => {
      logoFileHint.textContent =
        'No se pudo cargar el logo del colegio. Sube uno manualmente.';
      logoFileHint.classList.add('error');
    };
    image.src = 'assets/logo-colegio.png';
  }

  function effectiveEcc() {
    return state.logo ? 'H' : state.ecc;
  }

  function collectValues() {
    return {
      url: $('#input-url').value,
      text: $('#input-text').value,
      wifi: {
        ssid: $('#input-wifi-ssid').value,
        pass: $('#input-wifi-pass').value,
        cipher: $('#input-wifi-cipher').value,
        hidden: $('#input-wifi-hidden').checked,
      },
      vcard: {
        first: $('#input-vcard-first').value,
        last: $('#input-vcard-last').value,
        org: $('#input-vcard-org').value,
        phone: $('#input-vcard-phone').value,
        email: $('#input-vcard-email').value,
        url: $('#input-vcard-url').value,
      },
    };
  }

  function setActionsEnabled(enabled) {
    btnCopy.disabled = !enabled;
    btnPng.disabled = !enabled;
    btnSvg.disabled = !enabled;
  }

  function showPlaceholder(message) {
    canvas = null;
    previewBox.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'preview-placeholder';
    p.textContent = message;
    previewBox.appendChild(p);
  }

  function ensureCanvas() {
    if (!canvas) {
      previewBox.innerHTML = '';
      canvas = document.createElement('canvas');
      previewBox.appendChild(canvas);
    }
    return canvas;
  }

  async function render() {
    const id = ++renderId;
    const ecc = effectiveEcc();
    const result = QR_FORMAT.buildPayload(state.type, collectValues());

    if (result.error) {
      showPlaceholder(result.error);
      setActionsEnabled(false);
      previewNote.textContent = BASE_NOTE;
      return;
    }
    if (!result.payload) {
      showPlaceholder('La vista previa aparecerá aquí');
      setActionsEnabled(false);
      previewNote.textContent = BASE_NOTE;
      return;
    }

    const size = QR_FORMAT.maxBytes(result.payload, ecc);
    if (!size.ok) {
      showPlaceholder(
        `El contenido supera la capacidad del QR (${size.bytes} / ${size.limit} bytes para ECC ${ecc}). Acorta el texto o usa un ECC menor.`
      );
      setActionsEnabled(false);
      previewNote.textContent = BASE_NOTE;
      return;
    }

    lastPayload = result.payload;
    try {
      await QR_RENDER.renderToCanvas(ensureCanvas(), lastPayload, {
        width: state.size,
        ecc,
      });
      if (id !== renderId) return;
      if (state.logo && logoImage) {
        QR_RENDER.drawLogo(canvas, logoImage);
      }
      setActionsEnabled(true);
      previewNote.textContent =
        `Nivel ECC: ${ecc} · ${size.bytes} bytes · PNG para pantalla · SVG vectorial para imprenta.`;
    } catch (err) {
      if (id !== renderId) return;
      setActionsEnabled(false);
      showPlaceholder(
        `No se pudo generar el código: ${err.message || 'datos inválidos'}.`
      );
    }
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 250);
  }

  function flashCopy() {
    const original = btnCopy.textContent;
    btnCopy.textContent = '¡Copiado!';
    setTimeout(() => {
      btnCopy.textContent = original;
    }, 1500);
  }

  function fileBase() {
    const stamp = new Date().toISOString().slice(0, 10);
    return `qr-${state.type}-${stamp}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  btnPng.addEventListener('click', () => {
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = fileBase() + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  btnSvg.addEventListener('click', async () => {
    if (!lastPayload) return;
    try {
      let svg = await QR_RENDER.buildSvg(lastPayload, {
        width: state.size,
        ecc: effectiveEcc(),
      });
      if (state.logo && logoDataUrl) {
        svg = QR_RENDER.addLogoToSvg(svg, logoDataUrl);
      }
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), fileBase() + '.svg');
    } catch (err) {
      showPlaceholder(
        `No se pudo generar el SVG: ${err.message || 'error desconocido'}.`
      );
    }
  });

  btnCopy.addEventListener('click', async () => {
    if (!lastPayload) return;
    try {
      await navigator.clipboard.writeText(lastPayload);
      flashCopy();
    } catch {
      const ta = document.createElement('textarea');
      ta.value = lastPayload;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        flashCopy();
      } finally {
        ta.remove();
      }
    }
  });

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.type = tab.dataset.tab;
      $$('.tab').forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active);
      });
      $$('.tab-panel').forEach((panel) => {
        const active = panel.dataset.panel === state.type;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
      scheduleRender();
    });
  });

  $$('input[name="ecc"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) state.ecc = radio.value;
      scheduleRender();
    });
  });

  sizeInput.addEventListener('input', () => {
    state.size = Number(sizeInput.value);
    sizeValue.textContent = state.size;
    scheduleRender();
  });

  logoInput.addEventListener('change', () => {
    state.logo = logoInput.checked;
    logoFileWrap.hidden = !state.logo;
    if (state.logo && !logoImage) {
      initDefaultLogo();
    }
    scheduleRender();
  });

  logoFileInput.addEventListener('change', async () => {
    const file = logoFileInput.files[0];
    logoFileHint.classList.remove('error');
    if (!file) return;
    if (!/^image\/(png|jpe?g|svg\+xml)$/.test(file.type)) {
      logoFileHint.textContent = 'Formato no válido. Usa PNG, JPG o SVG.';
      logoFileHint.classList.add('error');
      logoFileInput.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      logoFileHint.textContent = 'La imagen supera los 2 MB. Elige una más ligera.';
      logoFileHint.classList.add('error');
      logoFileInput.value = '';
      return;
    }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = dataUrl;
      });
      const trimmed = await trimTransparent(image);
      userLogoUploaded = true;
      logoImage = trimmed.image;
      logoDataUrl = trimmed.dataUrl;
      logoFileHint.textContent = `Logo cargado: ${file.name}`;
      scheduleRender();    } catch {
      logoFileHint.textContent = 'No se pudo leer la imagen. Intenta con otra.';
      logoFileHint.classList.add('error');
      logoFileInput.value = '';
    }
  });

  $$('.tab-panel input, .tab-panel textarea, .tab-panel select').forEach((el) => {
    el.addEventListener('input', scheduleRender);
    el.addEventListener('change', scheduleRender);
  });
})();