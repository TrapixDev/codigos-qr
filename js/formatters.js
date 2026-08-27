const QR_FORMAT = (() => {
  const BYTE_LIMITS = { L: 2953, M: 2331, Q: 1663, H: 1273 };

  function normalizeUrl(value) {
    const raw = value.trim();
    if (!raw) return { payload: '', error: '' };
    const candidate = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
    try {
      const parsed = new URL(candidate);
      if (!parsed.hostname) return { payload: '', error: 'La URL no es válida.' };
      return { payload: candidate, error: '' };
    } catch {
      return { payload: '', error: 'La URL no es válida.' };
    }
  }

  function escapeWifi(value) {
    return value.replace(/([\\;,:"])/g, '\\$1');
  }

  function wifiPayload({ ssid, pass, cipher, hidden }) {
    const cleanSsid = ssid.trim();
    if (!cleanSsid) {
      return { payload: '', error: 'Indica el nombre de la red (SSID).' };
    }
    const hiddenFlag = hidden ? ';H:true' : '';
    if (cipher === 'nopass') {
      return {
        payload: `WIFI:T:nopass;S:${escapeWifi(cleanSsid)};${hiddenFlag};`,
        error: '',
      };
    }
    return {
      payload:
        `WIFI:T:${cipher};S:${escapeWifi(cleanSsid)};` +
        `P:${escapeWifi(pass)};${hiddenFlag};`,
      error: '',
    };
  }

  function cleanVcard(value) {
    return value.replace(/[\r\n]+/g, ' ').replace(/([\\;,])/g, '\\$1');
  }

  function vcardPayload({ first, last, org, phone, email, url }) {
    const fields = [first, last, org, phone, email, url];
    if (!fields.some((f) => f.trim())) return { payload: '', error: '' };
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    if (last || first) lines.push(`N:${cleanVcard(last)};${cleanVcard(first)};;;`);
    if (first || last) {
      lines.push(`FN:${cleanVcard([first, last].filter(Boolean).join(' '))}`);
    }
    if (org) lines.push(`ORG:${cleanVcard(org)}`);
    if (phone) lines.push(`TEL:${cleanVcard(phone)}`);
    if (email) lines.push(`EMAIL:${cleanVcard(email)}`);
    if (url) lines.push(`URL:${cleanVcard(url)}`);
    lines.push('END:VCARD');
    return { payload: lines.join('\n'), error: '' };
  }

  function maxBytes(payload, ecc) {
    const limit = BYTE_LIMITS[ecc] || BYTE_LIMITS.M;
    const bytes = new TextEncoder().encode(payload).length;
    return { ok: bytes <= limit, bytes, limit };
  }

  function buildPayload(type, values) {
    switch (type) {
      case 'url':
        return normalizeUrl(values.url);
      case 'text':
        return { payload: values.text.trim(), error: '' };
      case 'wifi':
        return wifiPayload(values.wifi);
      case 'vcard':
        return vcardPayload(values.vcard);
      default:
        return { payload: '', error: '' };
    }
  }

  return { buildPayload, maxBytes };
})();