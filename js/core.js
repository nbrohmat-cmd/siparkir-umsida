/* =====================================================================
   core.js — utilitas, state, klien API (fetch + cache SWR), router, pemuat pustaka
   Strategi "tanpa jeda": data tampil seketika dari cache (memori/localStorage),
   lalu diperbarui di belakang layar bila versi data server (dv) berubah.
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const ribu = (n) => String(Math.abs(Math.round(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fmt = {
    n: (v) => (v === null || v === undefined || v === '' ? '-' : (Number(v) < 0 ? '-' : '') + ribu(v)),
    rp: (v) => (v === null || v === undefined || v === '' ? '-' : (Number(v) < 0 ? '-Rp' : 'Rp') + ribu(v)),
    rps: (v) => { const n = Math.abs(Number(v) || 0), s = Number(v) < 0 ? '-' : ''; if (n >= 1e9) return s + 'Rp' + (n / 1e9).toFixed(1).replace('.', ',') + ' M'; if (n >= 1e6) return s + 'Rp' + (n / 1e6).toFixed(1).replace('.', ',') + ' jt'; if (n >= 1e3) return s + 'Rp' + Math.round(n / 1e3) + ' rb'; return s + 'Rp' + n; },
    tgl: (s) => { if (!s) return '-'; const p = String(s).slice(0, 10).split('-'); return p.length < 3 ? s : Number(p[2]) + ' ' + BLN3[Number(p[1]) - 1] + ' ' + p[0]; },
    tglw: (s) => { if (!s) return '-'; const t = String(s); return fmt.tgl(t) + (t.length > 10 ? ', ' + t.slice(11, 16).replace(':', '.') : ''); },
    per: (s) => { if (!s) return '-'; const p = String(s).split('-'); return BLN[Number(p[1]) - 1] + ' ' + p[0]; },
    pct: (v, d) => (v === null || v === undefined ? '-' : String(Number(v).toFixed(d || 0)).replace('.', ',') + '%'),
    jam: (s) => (s ? String(s).slice(11, 16).replace(':', '.') : '-')
  };
  const today = () => { const d = new Date(Date.now() + 7 * 3600000); return d.toISOString().slice(0, 10); };
  const nowLocal = () => { const d = new Date(Date.now() + 7 * 3600000); return d.toISOString().slice(0, 16).replace('T', ' '); };
  const periodeNow = () => today().slice(0, 7);
  const addMonth = (per, n) => { const [y, m] = per.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const inisial = (n) => String(n || '?').replace(/^(dr\.|ns\.|ir\.)\s*/i, '').split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase();
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 250); }; };

  // ---------------- Penyimpanan lokal (aman bila diblokir) ----------------
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { try { LS.prune(); localStorage.setItem(k, JSON.stringify(v)); } catch (x) { } } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } },
    prune() { try { Object.keys(localStorage).filter((k) => k.indexOf('sp_c_') === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { } }
  };

  // ---------------- State aplikasi ----------------
  const S = {
    token: LS.get('sp_token', ''), viewAs: sessionStorage.getItem('sp_viewas') || '', boot: null, user: null,
    periode: sessionStorage.getItem('sp_per') || periodeNow(), lokasi: sessionStorage.getItem('sp_lok') || 'SEMUA',
    dv: LS.get('sp_dv', ''), online: navigator.onLine
  };
  const Bus = { h: {}, on(e, f) { (this.h[e] = this.h[e] || []).push(f); }, emit(e, d) { (this.h[e] || []).forEach((f) => { try { f(d); } catch (x) { console.error(x); } }); } };

  // ---------------- Cache (memori + localStorage) ----------------
  const Cache = {
    mem: new Map(),
    key: (a, p) => a + '|' + JSON.stringify(p || {}) + '|' + (S.viewAs || ''),
    get(k) { if (this.mem.has(k)) return this.mem.get(k); const v = LS.get('sp_c_' + k, null); if (v) this.mem.set(k, v); return v; },
    set(k, d, persist) { const v = { d, t: Date.now(), dv: S.dv }; this.mem.set(k, v); if (persist) LS.set('sp_c_' + k, v); },
    drop(prefix) { for (const k of Array.from(this.mem.keys())) if (k.indexOf(prefix) === 0) this.mem.delete(k); try { Object.keys(localStorage).forEach((k) => { if (k.indexOf('sp_c_' + prefix) === 0) localStorage.removeItem(k); }); } catch (e) { } },
    clear() { this.mem.clear(); LS.prune(); }
  };

  // ---------------- Klien API ----------------
  class ApiError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
  const inflight = new Map();
  const API = {
    async raw(action, payload, timeout) {
      if (!window.CONFIG || /GANTI_DENGAN/.test(CONFIG.GAS_URL)) throw new ApiError('CONFIG', 'URL backend belum diisi di js/config.js');
      const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), timeout || 45000);
      let res;
      try {
        res = await fetch(CONFIG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', signal: ctrl.signal,
          body: JSON.stringify({ action, payload: payload || {}, token: S.token || undefined, viewAs: S.viewAs || undefined }) });
      } catch (e) {
        throw new ApiError('NETWORK', e.name === 'AbortError' ? 'Server tidak merespons (waktu habis). Coba lagi.' : 'Koneksi bermasalah. Periksa internet Anda.');
      } finally { clearTimeout(t); }
      let j;
      try { j = await res.json(); } catch (e) { throw new ApiError('NETWORK', 'Respons server tidak valid (cek URL & deployment Web App).'); }
      if (j.meta) {
        if (j.meta.token) { S.token = j.meta.token; LS.set('sp_token', S.token); }
        if (j.meta.dv && j.meta.dv !== S.dv) { S.dv = j.meta.dv; LS.set('sp_dv', S.dv); }
      }
      if (!j.ok) {
        const er = new ApiError(j.error.code, j.error.message);
        if (er.code === 'UNAUTHORIZED') Bus.emit('unauth', er);
        if (er.code === 'MUST_CHANGE_PASSWORD') Bus.emit('mustchange', er);
        if (er.code === 'MAINTENANCE') Bus.emit('maintenance', er);
        throw er;
      }
      return j.data;
    },
    /** Panggilan tulis / sekali baca tanpa cache */
    async call(action, payload, opt) {
      const d = await this.raw(action, payload, opt && opt.timeout);
      if (!opt || !opt.keepCache) Bus.emit('written', action);
      return d;
    },
    /** Baca dengan cache: kembalikan cache bila segar; selain itu ambil (dedupe permintaan yang sama) */
    async get(action, payload, opt) {
      opt = opt || {};
      const k = Cache.key(action, payload), c = Cache.get(k);
      const ttl = opt.ttl === undefined ? 30000 : opt.ttl;
      if (c && !opt.force && c.dv === S.dv && Date.now() - c.t < ttl) return c.d;
      if (inflight.has(k)) return inflight.get(k);
      const p = this.raw(action, payload).then((d) => { Cache.set(k, d, opt.persist); return d; }).finally(() => inflight.delete(k));
      inflight.set(k, p);
      return p;
    },
    /**
     * Stale-while-revalidate: render(data, isFresh) dipanggil SEGERA dari cache (bila ada),
     * lalu sekali lagi dengan data segar bila berbeda. Mengembalikan Promise data segar.
     */
    swr(action, payload, render, opt) {
      opt = opt || {};
      const k = Cache.key(action, payload), c = Cache.get(k);
      let shown = null;
      if (c) { shown = JSON.stringify(c.d); try { render(c.d, false); } catch (e) { console.error(e); } }
      const ttl = opt.ttl === undefined ? 15000 : opt.ttl;
      if (c && c.dv === S.dv && Date.now() - c.t < ttl) return Promise.resolve(c.d);
      return this.get(action, payload, Object.assign({}, opt, { force: true })).then((d) => {
        if (JSON.stringify(d) !== shown) render(d, true);
        return d;
      }).catch((e) => { if (!c && opt.onError) opt.onError(e); else if (!c) throw e; else if (e.code !== 'UNAUTHORIZED') console.warn(e.message); });
    },
    prefetch(action, payload, opt) { const k = Cache.key(action, payload); if (!Cache.get(k) && !inflight.has(k)) this.get(action, payload, opt).catch(() => { }); }
  };

  // ---------------- Pemuat pustaka (lazy) ----------------
  const loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = () => { delete loaded[src]; no(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); });
    return loaded[src];
  }
  const Lib = {
    chart: () => window.Chart ? Promise.resolve(window.Chart) : loadScript('vendor/chart.umd.js').then(() => window.Chart),
    xlsx: () => window.XLSX ? Promise.resolve(window.XLSX) : loadScript(CONFIG.XLSX_CDN).catch(() => loadScript('vendor/xlsx.full.min.js')).then(() => window.XLSX),
    qr: () => window.qrcode ? Promise.resolve(window.qrcode) : loadScript('vendor/qrcode.js').then(() => window.qrcode),
    pdf: () => window.html2pdf ? Promise.resolve(window.html2pdf) : loadScript('vendor/html2pdf.bundle.min.js').then(() => window.html2pdf)
  };

  // ---------------- Berkas ----------------
  const Files = {
    toB64: (file) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(file); }),
    /** kompres gambar di browser: lebar maks 1280 px, JPEG */
    compress: (file, maxW, q) => new Promise((ok, no) => {
      if (!/^image\//.test(file.type)) return Files.toB64(file).then((d) => ok({ data: d, mime: file.type, nama: file.name }), no);
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, (maxW || 1280) / img.width), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        const d = c.toDataURL('image/jpeg', q || 0.8);
        ok({ data: d.split(',')[1], mime: 'image/jpeg', nama: file.name.replace(/\.\w+$/, '') + '.jpg', preview: d });
      };
      img.onerror = () => no(new Error('Gambar tidak dapat dibaca'));
      img.src = url;
    }),
    sha256: async (buf) => { const h = await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join(''); },
    download(data, nama, mime) {
      const blob = data instanceof Blob ? data : (typeof data === 'string' && /^[A-Za-z0-9+/=]+$/.test(data.slice(0, 100)) && mime
        ? new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type: mime }) : new Blob([data], { type: mime || 'text/plain' }));
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    },
    csv(rows, cols) {
      const q = (v) => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
      return '﻿' + [cols.map((c) => q(c.l || c)).join(',')].concat(rows.map((r) => cols.map((c) => q(r[c.k || c])).join(','))).join('\n');
    },
    pick(accept, capture) {
      return new Promise((ok) => { const i = document.createElement('input'); i.type = 'file'; if (accept) i.accept = accept; if (capture) i.capture = capture; i.onchange = () => ok(i.files[0] || null); i.click(); });
    }
  };

  // ---------------- Router hash ----------------
  const Router = {
    parse() { const h = location.hash.replace(/^#\/?/, ''); const i = h.indexOf('?'); const id = (i > -1 ? h.slice(0, i) : h) || 'dashboard'; const q = i > -1 ? h.slice(i + 1) : ''; return { id, params: Object.fromEntries(new URLSearchParams(q)) }; },
    go(id, params) { const q = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''; const h = '#/' + id + q; if (location.hash === h) Bus.emit('route'); else location.hash = h; },
    link(id, params) { return '#/' + id + (params ? '?' + new URLSearchParams(params).toString() : ''); }
  };
  window.addEventListener('hashchange', () => Bus.emit('route'));
  window.addEventListener('online', () => { S.online = true; Bus.emit('net', true); });
  window.addEventListener('offline', () => { S.online = false; Bus.emit('net', false); });

  const can = {
    role: (...r) => S.user && r.indexOf(S.user.peran) > -1,
    int: () => can.role('SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU'),
    ent: (n) => S.boot && S.boot.ent && S.boot.ent[n],
    write: (n) => !!(S.boot && S.boot.ent[n] && S.boot.ent[n].w) && !S.viewAs
  };
  const master = (k) => (S.boot && S.boot.master && S.boot.master[k]) || [];
  const namaLokasi = (id) => { const l = master('lokasi').find((x) => x.id_lokasi === id); return l ? l.nama : (id === 'SEMUA' ? 'Semua Lokasi' : id || '-'); };
  const namaShift = (id) => { const l = master('shift').find((x) => x.id_shift === id); return l ? l.nama : id || '-'; };

  window.SP = { $, $$, esc, fmt, BLN, BLN3, HARI, today, nowLocal, periodeNow, addMonth, inisial, debounce, LS, S, Bus, Cache, API, ApiError, Lib, loadScript, Files, Router, can, master, namaLokasi, namaShift, Pages: {} };
})();
