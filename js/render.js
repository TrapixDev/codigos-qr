const QR_RENDER = (() => {
  const LEVELS = ['L', 'M', 'Q', 'H'];
  const DARK = '#1c2333';
  const LIGHT = '#ffffff';
  const LOGO_RATIO = 0.13;
  const LOGO_BG_RATIO = 0.16;
  const LOGO_RADIUS = 0.15;

  function normalizeEcc(level) {
    const value = String(level || 'M').toUpperCase();
    return LEVELS.includes(value) ? value : 'M';
  }

  function renderToCanvas(canvas, payload, { width = 720, ecc = 'M' } = {}) {
    return QRCode.toCanvas(canvas, payload, {
      width,
      margin: 2,
      errorCorrectionLevel: normalizeEcc(ecc),
      color: { dark: DARK, light: LIGHT },
    });
  }

  function buildSvg(payload, { width = 720, ecc = 'M' } = {}) {
    return Promise.resolve(
      QRCode.toString(payload, {
        type: 'svg',
        width,
        margin: 2,
        errorCorrectionLevel: normalizeEcc(ecc),
        color: { dark: DARK, light: LIGHT },
      })
    );
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  function drawLogo(canvas, image) {
    const w = canvas.width;
    const size = w * LOGO_RATIO;
    const bg = w * LOGO_BG_RATIO;
    const x = (w - size) / 2;
    const y = (w - size) / 2;
    const bx = (w - bg) / 2;
    const by = (w - bg) / 2;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.fillStyle = LIGHT;
    roundRectPath(ctx, bx, by, bg, bg, bg * LOGO_RADIUS);
    ctx.fill();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
  }

  function addLogoToSvg(svg, dataUrl) {
    const match = svg.match(/width="(\d+)"/);
    if (!match) return svg;
    const w = Number(match[1]);
    const size = w * LOGO_RATIO;
    const bg = w * LOGO_BG_RATIO;
    const x = (w - size) / 2;
    const y = (w - size) / 2;
    const bx = (w - bg) / 2;
    const by = (w - bg) / 2;
    const radius = Math.round(bg * LOGO_RADIUS * 10) / 10;
    const logo =
      `<rect x="${bx}" y="${by}" width="${bg}" height="${bg}" rx="${radius}" fill="${LIGHT}"/>` +
      `<image href="${dataUrl}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
    return svg.replace('</svg>', logo + '</svg>');
  }

  return { normalizeEcc, renderToCanvas, buildSvg, drawLogo, addLogoToSvg };
})();