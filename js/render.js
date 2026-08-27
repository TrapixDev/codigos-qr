const QR_RENDER = (() => {
  const LEVELS = ['L', 'M', 'Q', 'H'];
  const DARK = '#1c2333';
  const LIGHT = '#ffffff';
  const LOGO_WIDTH_RATIO = 0.18;
  const LOGO_PAD_RATIO = 0.015;
  const LOGO_RADIUS = 0.15;

  function normalizeEcc(level) {
    const value = String(level || 'M').toUpperCase();
    return LEVELS.includes(value) ? value : 'M';
  }

  function logoGeometry(w, aspect) {
    const logoW = w * LOGO_WIDTH_RATIO;
    const logoH = logoW * (aspect || 1);
    const pad = w * LOGO_PAD_RATIO;
    const boxW = logoW + pad * 2;
    const boxH = logoH + pad * 2;
    const radius = Math.min(boxW, boxH) * LOGO_RADIUS;
    return {
      x: (w - logoW) / 2,
      y: (w - logoH) / 2,
      logoW,
      logoH,
      bx: (w - boxW) / 2,
      by: (w - boxH) / 2,
      boxW,
      boxH,
      radius,
    };
  }

  function renderToCanvas(canvas, payload, { width = 720, ecc = 'M' } = {}) {
    return QRCode.toCanvas(canvas, payload, {
      width,
      margin: 4,
      errorCorrectionLevel: normalizeEcc(ecc),
      color: { dark: DARK, light: LIGHT },
    });
  }

  function buildSvg(payload, { width = 720, ecc = 'M' } = {}) {
    return Promise.resolve(
      QRCode.toString(payload, {
        type: 'svg',
        width,
        margin: 4,
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
    const aspect = image.naturalHeight / image.naturalWidth || 1;
    const g = logoGeometry(w, aspect);
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.fillStyle = LIGHT;
    roundRectPath(ctx, g.bx, g.by, g.boxW, g.boxH, g.radius);
    ctx.fill();
    ctx.drawImage(image, g.x, g.y, g.logoW, g.logoH);
    ctx.restore();
  }

  function addLogoToSvg(svg, dataUrl, aspect = 1) {
    const match = svg.match(/width="(\d+)"/);
    if (!match) return svg;
    const w = Number(match[1]);
    const g = logoGeometry(w, aspect);
    const radius = Math.round(g.radius * 10) / 10;
    const logo =
      `<rect x="${g.bx}" y="${g.by}" width="${g.boxW}" height="${g.boxH}" rx="${radius}" fill="${LIGHT}"/>` +
      `<image href="${dataUrl}" x="${g.x}" y="${g.y}" width="${g.logoW}" height="${g.logoH}" preserveAspectRatio="xMidYMid meet"/>`;
    return svg.replace('</svg>', logo + '</svg>');
  }

  return { normalizeEcc, renderToCanvas, buildSvg, drawLogo, addLogoToSvg };
})();