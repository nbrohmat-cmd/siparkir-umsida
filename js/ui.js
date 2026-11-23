/* =====================================================================
   ui.js — komponen antarmuka: KPI, panel, label status, toast, modal,
   formulir dari metadata server, tabel (cari/urut/halaman/Excel), entitas CRUD,
   stepper, heatmap, grafik (Chart.js lazy)
   ===================================================================== */
(function () {
  'use strict';
  const { esc, fmt, $, $$, S, API, Files, Lib, master, can, Bus, HARI } = SP;
  const UI = {};

  // ---------- Elemen dasar ----------
  UI.kpi = (o) => {
    const tag = o.href ? 'a' : 'div';
    return `<${tag} class="kpi k-${o.c || 'hijau'} ${o.wide ? 'wide' : ''}" ${o.href ? `href="${o.href}"` : ''}>
      <div class="kpi-in"><div class="kpi-val">${o.v}</div><div class="kpi-lbl">${esc(o.l)}</div>${o.sub ? `<div class="kpi-sub">${esc(o.sub)}</div>` : ''}</div>
      <i class="fa-solid ${o.i || 'fa-chart-simple'} kpi-ico"></i>
      ${o.href ? `<span class="kpi-foot">${esc(o.foot || 'Info lebih lanjut')} <i class="fa-solid fa-circle-arrow-right"></i></span>` : (o.foot ? `<span class="kpi-foot">${esc(o.foot)}</span>` : '')}</${tag}>`;
  };
  UI.panel = (o) => `<div class="panel ${o.c ? 'p-' + o.c : ''} ${o.cls || ''}" ${o.id ? `id="${o.id}"` : ''}>
    ${o.t !== undefined ? `<div class="panel-h"><h3 class="ttl">${o.i ? `<i class="fa-solid ${o.i}"></i>` : ''}${o.t}</h3><div class="tools">${o.tools || ''}${o.collapse === false ? '' : '<button class="tool-btn" data-collapse title="Ciutkan"><i class="fa-solid fa-minus"></i></button>'}</div></div>` : ''}
    <div class="panel-b ${o.p0 ? 'p0' : ''}">${o.body || ''}</div>${o.foot ? `<div class="panel-f">${o.foot}</div>` : ''}</div>`;
  const ST = { Draft: 'abu', Diajukan: 'biru', Menunggu: 'oranye', Diverifikasi: 'hijau', Disetujui: 'hijau', Dibayar: 'hijau', Lunas: 'hijau', Terbit: 'biru', 'BA Dikonfirmasi': 'hijau', Ditinjau: 'oranye',
    Ditolak: 'merah', Terkunci: 'hitam', Aktif: 'hijau', Nonaktif: 'abu', Kedaluwarsa: 'merah', Selesai: 'hijau', Terbuka: 'oranye', Dilaporkan: 'oranye', 'Dokumen Lengkap': 'biru', Appraisal: 'aqua',
    Diputuskan: 'biru', 'BA Penyelesaian': 'ungu', Berhasil: 'hijau', Dibatalkan: 'abu', Gagal: 'merah', PENDING: 'oranye', SENT: 'hijau', FAILED: 'merah', SKIPPED: 'abu', 'Belum Cocok': 'oranye', Cocok: 'hijau',
    Diabaikan: 'abu', 'Menunggu Pemicu': 'abu', 'Belum Ada': 'merah', 'Sudah Setor': 'biru', 'Sudah Lapor': 'hijau', 'Belum Setor': 'oranye', Berjalan: 'aqua', Prospek: 'biru', Negosiasi: 'oranye', Deal: 'hijau', Batal: 'abu' };
  UI.badge = (s, c) => s === undefined || s === null || s === '' ? '' : `<span class="badge-s s-${c || ST[s] || 'abu'}">${esc(s)}</span>`;
  UI.callout = (t, html, c, aksi) => `<div class="callout ${c ? 'c-' + c : ''}"><i class="fa-solid ${t}"></i><div class="flex-fill">${html}</div>${aksi || ''}</div>`;
  UI.empty = (m) => `<div class="empty"><i class="fa-regular fa-folder-open fa-2x mb-2 d-block"></i>${esc(m || 'Belum ada data')}</div>`;
  UI.skKpi = (n, col) => `<div class="row g-3">${Array.from({ length: n }, () => `<div class="${col || 'col-md-6 col-xl-3'}"><div class="sk kpi"></div></div>`).join('')}</div>`;
  UI.skBox = (n) => Array.from({ length: n || 1 }, () => '<div class="panel p-polos"><div class="panel-b"><div class="sk line" style="width:40%"></div><div class="sk box"></div></div></div>').join('');
  UI.stepper = (steps, cur) => `<div class="stepper">${steps.map((s, i) => `<div class="st ${i < cur ? 'done' : i === cur ? 'cur' : ''}"><div class="dot">${i < cur ? '<i class="fa-solid fa-check"></i>' : i + 1}</div><div class="nm">${esc(s.nm)}</div><div class="ds">${esc(s.ds || '')}</div></div>`).join('')}</div>`;
  UI.tabs = (items, on) => `<div class="tabs-x">${items.map((t) => `<button data-tab="${t.id}" class="${t.id === on ? 'on' : ''}">${t.i ? `<i class="fa-solid ${t.i}"></i>` : ''}${esc(t.t)}${t.cnt ? ` <span class="cnt">${t.cnt}</span>` : ''}</button>`).join('')}</div>`;
  UI.mini = (lb, vl, c, sub) => `<div class="mini ${c ? 'l-' + c : ''}"><div class="lb">${esc(lb)}</div><div class="vl">${vl}</div>${sub ? `<div class="fs-12 muted">${sub}</div>` : ''}</div>`;
  UI.sisaWarna = (s) => (s === null || s === undefined ? 'abu' : s < 3 ? 'merah' : s <= 14 ? 'oranye' : 'hijau');
  UI.sisaTeks = (s) => (s === null || s === undefined ? '—' : s < 0 ? 'Lewat ' + (-s) + ' hr' : s === 0 ? 'Hari ini' : 'Sisa ' + s + ' hr');

  // ---------- Toast & modal ----------
  UI.toast = (msg, type) => {
    let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast-x ' + (type || '');
    t.innerHTML = `<i class="fa-solid ${type === 'err' ? 'fa-circle-xmark text-merah' : type === 'warn' ? 'fa-triangle-exclamation text-oranye' : 'fa-circle-check text-hijau'}"></i><div>${esc(msg)}</div>`;
    box.appendChild(t); setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, type === 'err' ? 6000 : 3200);
  };
  UI.err = (e) => { if (e && e.code === 'UNAUTHORIZED') return; UI.toast((e && e.message) || String(e), 'err'); };
  UI.modal = (o) => {
    const w = document.createElement('div'); w.className = 'sp-modal';
    w.innerHTML = `<div class="sp-dialog ${o.size || ''}" role="dialog" aria-modal="true"><div class="md-h"><h5>${o.title || ''}</h5><button class="tool-btn" data-x aria-label="Tutup"><i class="fa-solid fa-xmark fa-lg"></i></button></div>
      <div class="md-b">${o.body || ''}</div>${o.foot !== false ? `<div class="md-f">${o.foot || '<button class="btn btn-abu" data-x>Tutup</button>'}</div>` : ''}</div>`;
    document.body.appendChild(w); document.body.style.overflow = 'hidden';
    const m = { el: w, $: (s) => w.querySelector(s), $$: (s) => Array.from(w.querySelectorAll(s)),
      close() { w.remove(); if (!$('.sp-modal')) document.body.style.overflow = ''; document.removeEventListener('keydown', key); if (o.onClose) o.onClose(); } };
    const key = (e) => { if (e.key === 'Escape' && w === Array.from(document.querySelectorAll('.sp-modal')).pop()) m.close(); };
    document.addEventListener('keydown', key);
    w.addEventListener('click', (e) => { if (e.target.closest('[data-x]') || (e.target === w && !o.static)) m.close(); });
    setTimeout(() => { const f = w.querySelector('input:not([type=hidden]):not([disabled]),select,textarea'); if (f && !o.noFocus && window.innerWidth > 768) f.focus(); }, 50);
    return m;
  };
  /** konfirmasi; opsi input:{label, req} → mengembalikan {nilai} */
  UI.confirm = (o) => new Promise((ok) => {
    const m = UI.modal({ title: o.title || 'Konfirmasi', size: 'sm', static: true,
      body: `<div>${o.msg || ''}</div>${o.input ? `<div class="mt-3"><label class="form-label">${esc(o.input.label)}${o.input.req ? ' <span class="req">*</span>' : ''}</label><textarea class="form-control" rows="3" data-in>${esc(o.input.val || '')}</textarea></div>` : ''}`,
      foot: `<button class="btn btn-abu" data-no>Batal</button><button class="btn ${o.danger ? 'btn-merah' : 'btn-hijau'}" data-ok>${esc(o.ok || 'Ya, lanjutkan')}</button>`, onClose: () => ok(false) });
    m.$('[data-no]').onclick = () => m.close();
    m.$('[data-ok]').onclick = () => {
      const v = o.input ? m.$('[data-in]').value.trim() : true;
      if (o.input && o.input.req && !v) { UI.toast(o.input.label + ' wajib diisi', 'warn'); return; }
      const res = o.input ? { nilai: v } : true; m.el.remove(); if (!$('.sp-modal')) document.body.style.overflow = ''; ok(res);
    };
  });
  /** jalankan aksi tombol dengan indikator memuat + toast */
  UI.run = async (btn, fn, okMsg) => {
    if (btn) btn.classList.add('loading');
    try { const r = await fn(); if (okMsg) UI.toast(typeof okMsg === 'function' ? okMsg(r) : okMsg); return r; }
    catch (e) { UI.err(e); throw e; }
    finally { if (btn) btn.classList.remove('loading'); }
  };

  // ---------- Formulir dari metadata ----------
  UI.parseRp = (s) => { const n = Number(String(s || '').replace(/[^0-9-]/g, '')); return isFinite(n) ? n : 0; };
  const refOpts = (f) => {
    const m = { lokasi: ['lokasi', 'id_lokasi', 'nama'], kategori: ['kategori', 'kode', 'nama'], shift: ['shift', 'id_shift', 'nama'] }[f.ref];
    if (!m) return [];
    return master(m[0]).filter((x) => x.aktif !== false || f.ref === 'lokasi').map((x) => [x[m[1]], x[m[1]] + ' — ' + x[m[2]]]);
  };
  UI.field = (f, v, opt) => {
    opt = opt || {};
    const id = 'f_' + f.n + '_' + Math.random().toString(36).slice(2, 6), dis = (f.ro || opt.ro) ? 'disabled' : '';
    const lbl = `<label class="form-label" for="${id}">${esc(f.l)}${f.req && !f.ro ? ' <span class="req">*</span>' : ''}</label>`;
    const val = v === undefined || v === null ? '' : v;
    const attr = `id="${id}" name="${f.n}" data-t="${f.t}" ${dis} ${f.req && !f.ro ? 'required' : ''}`;
    let inp;
    switch (f.t) {
      case 'textarea': inp = `<textarea class="form-control" rows="3" ${attr}>${esc(val)}</textarea>`; break;
      case 'money': inp = `<div class="input-group"><span class="input-group-text">Rp</span><input class="form-control money" inputmode="numeric" ${attr} value="${val === '' ? '' : fmt.n(val)}"></div>`; break;
      case 'int': case 'number': inp = `<input type="number" class="form-control" ${f.t === 'int' ? 'step="1"' : 'step="any"'} ${f.neg ? '' : 'min="0"'} ${attr} value="${esc(val)}">`; break;
      case 'date': inp = `<input type="date" class="form-control" ${attr} value="${esc(String(val).slice(0, 10))}">`; break;
      case 'datetime': inp = `<input type="datetime-local" class="form-control" ${attr} value="${esc(String(val).slice(0, 16).replace(' ', 'T'))}">`; break;
      case 'time': inp = `<input type="time" class="form-control" ${attr} value="${esc(val)}">`; break;
      case 'month': inp = `<input type="month" class="form-control" ${attr} value="${esc(val)}">`; break;
      case 'email': inp = `<input type="email" class="form-control" ${attr} value="${esc(val)}">`; break;
      case 'phone': inp = `<input type="tel" class="form-control" inputmode="tel" ${attr} value="${esc(val)}" placeholder="08xxxxxxxxxx">`; break;
      case 'bool': return `<div class="form-check form-switch mt-4"><input class="form-check-input" type="checkbox" ${attr} ${val === true || val === 'TRUE' ? 'checked' : ''}><label class="form-check-label" for="${id}">${esc(f.l)}</label></div>`;
      case 'select': case 'ref': {
        const ops = f.t === 'ref' ? refOpts(f) : (f.opts || []).map((o) => [o, o]);
        if (f.semua) ops.unshift(['SEMUA', 'SEMUA — Semua lokasi']);
        if (val !== '' && !ops.some((o) => String(o[0]) === String(val))) ops.push([val, val]);
        inp = `<select class="form-select" ${attr}><option value="">— pilih —</option>${ops.map((o) => `<option value="${esc(o[0])}" ${String(o[0]) === String(val) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`; break;
      }
      case 'multi': {
        const cur = String(val).split(',').filter(String);
        inp = `<div class="chk-grid" data-multi="${f.n}">${refOpts(f).map((o) => `<label class="form-check"><input class="form-check-input" type="checkbox" value="${esc(o[0])}" ${cur.indexOf(String(o[0])) > -1 ? 'checked' : ''} ${dis}> <span class="form-check-label">${esc(o[1])}</span></label>`).join('')}</div>`; break;
      }
      case 'file': inp = `<div class="file-box" data-file="${f.n}" data-kat="${esc(opt.fileKat || f.kat || 'lain')}" data-sub="${esc(opt.fileSub || '')}"><input type="hidden" name="${f.n}" data-t="file" value="${esc(val)}">
        <button type="button" class="btn btn-sm btn-abu" data-up ${dis}><i class="fa-solid fa-upload"></i> Unggah</button>${val ? `<a href="#" data-view="${esc(val)}" class="fs-12"><i class="fa-solid fa-eye"></i> Lihat berkas</a>` : '<span class="nm">Belum ada berkas</span>'}</div>`; break;
      case 'json': return '';
      default: inp = `<input type="text" class="form-control" ${attr} value="${esc(val)}" ${f.max ? `maxlength="${f.max}"` : ''}>`;
    }
    return lbl + inp + (f.help ? `<div class="form-text">${esc(f.help)}</div>` : '');
  };
  UI.form = (fields, vals, opt) => {
    opt = opt || {}; vals = vals || {};
    const cols = opt.cols || 2;
    return `<form class="row g-2" novalidate onsubmit="return false">${fields.filter((f) => f.t !== 'json' && !(opt.isNew && f.ro)).map((f) =>
      `<div class="${f.t === 'textarea' || f.t === 'multi' || f.wide ? 'col-12' : 'col-md-' + 12 / cols}">${UI.field(f, vals[f.n], opt)}</div>`).join('')}</form>`;
  };
  UI.readForm = (el, fields) => {
    const o = {};
    fields.forEach((f) => {
      if (f.ro || f.t === 'json') return;
      if (f.t === 'multi') { const g = el.querySelector(`[data-multi="${f.n}"]`); if (g) o[f.n] = Array.from(g.querySelectorAll('input:checked')).map((i) => i.value).join(','); return; }
      const i = el.querySelector(`[name="${f.n}"]`); if (!i) return;
      if (f.t === 'bool') o[f.n] = i.checked;
      else if (f.t === 'money') o[f.n] = i.value === '' ? '' : UI.parseRp(i.value);
      else if (f.t === 'datetime') o[f.n] = i.value ? i.value.replace('T', ' ') : '';
      else o[f.n] = i.value.trim();
    });
    return o;
  };
  UI.validate = (el, fields, data) => {
    for (const f of fields) {
      if (f.req && !f.ro && f.t !== 'bool' && (data[f.n] === '' || data[f.n] === undefined)) {
        const i = el.querySelector(`[name="${f.n}"]`); if (i) { i.classList.add('is-invalid'); i.focus(); }
        UI.toast(f.l + ' wajib diisi', 'warn'); return false;
      }
    }
    return true;
  };
  /** perilaku isian: format rupiah, unggah berkas, lihat berkas */
  UI.bindForm = (el) => {
    el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.classList && t.classList.contains('money')) { const p = t.selectionStart, l = t.value.length; const n = t.value.replace(/[^0-9]/g, ''); t.value = n ? fmt.n(Number(n)) : ''; try { t.setSelectionRange(p + t.value.length - l, p + t.value.length - l); } catch (x) { } }
      if (t.classList) t.classList.remove('is-invalid');
    });
    el.addEventListener('click', async (e) => {
      const up = e.target.closest('[data-up]'), vw = e.target.closest('[data-view]');
      if (up) {
        const box = up.closest('[data-file]'), file = await Files.pick('image/*,application/pdf');
        if (!file) return;
        await UI.run(up, async () => {
          const c = await Files.compress(file);
          const r = await API.call('file.upload', { kategori: box.dataset.kat, sub: box.dataset.sub || undefined, nama: c.nama, mime: c.mime, data: c.data }, { keepCache: true });
          box.querySelector('input').value = r.id;
          const nm = box.querySelector('.nm, [data-view]'); if (nm) nm.outerHTML = `<a href="#" data-view="${r.id}" class="fs-12"><i class="fa-solid fa-check text-hijau"></i> ${esc(r.nama)}</a>`;
        }, 'Berkas terunggah');
      }
      if (vw) { e.preventDefault(); UI.viewFile(vw.dataset.view); }
    });
  };
  UI.viewFile = async (id) => {
    const m = UI.modal({ title: 'Pratinjau berkas', size: 'lg', body: '<div class="sk box"></div>' });
    try {
      const f = await API.get('file.get', { id }, { ttl: 600000 });
      if (f.terlaluBesar) { m.$('.md-b').innerHTML = UI.callout('fa-circle-info', 'Berkas terlalu besar untuk pratinjau (' + esc(f.nama) + ').'); return; }
      const src = 'data:' + f.mime + ';base64,' + f.data;
      m.$('.md-b').innerHTML = /^image\//.test(f.mime) ? `<img src="${src}" style="max-width:100%" alt="${esc(f.nama)}">`
        : `<iframe src="${src}" style="width:100%;height:70vh;border:0"></iframe>`;
      m.$('.md-f').insertAdjacentHTML('afterbegin', `<button class="btn btn-biru" data-dl><i class="fa-solid fa-download"></i> Unduh</button>`);
      m.$('[data-dl]').onclick = () => Files.download(f.data, f.nama, f.mime);
    } catch (e) { m.$('.md-b').innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); }
  };

  // ---------- Format sel tabel ----------
  UI.cell = (c, r) => {
    const v = r[c.k];
    if (typeof c.f === 'function') return c.f(v, r);
    switch (c.t) {
      case 'rp': case 'money': return fmt.rp(v);
      case 'n': case 'int': case 'number': return fmt.n(v);
      case 'tgl': case 'date': return fmt.tgl(v);
      case 'tglw': case 'datetime': return fmt.tglw(v);
      case 'month': return fmt.per(v);
      case 'badge': return UI.badge(v);
      case 'bool': return v === true ? '<i class="fa-solid fa-check text-hijau"></i>' : '<span class="muted">—</span>';
      case 'lok': return esc(v === 'SEMUA' ? 'Semua' : v);
      case 'file': return v ? `<a href="#" data-view="${esc(v)}" title="Lihat berkas"><i class="fa-solid fa-file-lines"></i></a>` : '';
      case 'textarea': return `<span title="${esc(v)}">${esc(String(v || '').slice(0, 70))}${String(v || '').length > 70 ? '…' : ''}</span>`;
      default: return esc(v);
    }
  };
  const isNumT = (t) => ['rp', 'money', 'n', 'int', 'number'].indexOf(t) > -1;

  // ---------- Tabel ----------
  UI.table = (el, o) => {
    const st = { rows: o.rows || [], q: '', sort: o.sort || null, dir: o.dir || -1, page: 1, size: o.size || 10, sel: new Set() };
    const T = {
      set(rows) { st.rows = rows || []; st.page = Math.min(st.page, Math.max(1, Math.ceil(T.filtered().length / st.size))); T.render(); },
      filtered() {
        let r = st.rows;
        if (st.q) { const q = st.q.toLowerCase(); r = r.filter((x) => o.cols.some((c) => String(x[c.k] === undefined ? '' : x[c.k]).toLowerCase().indexOf(q) > -1)); }
        if (o.filter) r = r.filter(o.filter);
        if (st.sort) { const c = o.cols.find((x) => x.k === st.sort), num = c && isNumT(c.t); r = r.slice().sort((a, b) => { const x = a[st.sort], y = b[st.sort]; return (num ? (Number(x) || 0) - (Number(y) || 0) : String(x || '').localeCompare(String(y || ''), 'id')) * st.dir; }); }
        return r;
      },
      selected() { return st.rows.filter((r) => st.sel.has(String(r[o.key]))); },
      render() {
        const all = T.filtered(), pages = Math.max(1, Math.ceil(all.length / st.size)), pg = Math.min(st.page, pages), view = all.slice((pg - 1) * st.size, pg * st.size);
        const head = `${o.sel ? '<th style="width:28px"><input type="checkbox" class="form-check-input" data-selall></th>' : ''}${o.cols.map((c) => `<th class="${isNumT(c.t) ? 'num' : ''} ${c.sort === false ? '' : 'sortable'}" data-sort="${c.k}">${esc(c.l)}${c.sort === false ? '' : `<i class="fa-solid ${st.sort === c.k ? (st.dir > 0 ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} si"></i>`}</th>`).join('')}${o.actions ? '<th class="text-end">Aksi</th>' : ''}`;
        const body = view.length ? view.map((r) => `<tr class="${o.rowCls ? o.rowCls(r) : ''} ${o.onClick ? 'clickable' : ''}" data-id="${esc(r[o.key])}">${o.sel ? `<td><input type="checkbox" class="form-check-input" data-sel ${st.sel.has(String(r[o.key])) ? 'checked' : ''}></td>` : ''}${o.cols.map((c) => `<td class="${isNumT(c.t) ? 'num' : ''} ${c.cls || ''}">${UI.cell(c, r)}</td>`).join('')}${o.actions ? `<td class="aksi text-end">${o.actions(r)}</td>` : ''}</tr>`).join('')
          : `<tr><td colspan="${o.cols.length + (o.actions ? 1 : 0) + (o.sel ? 1 : 0)}">${UI.empty(o.empty)}</td></tr>`;
        const sums = o.cols.some((c) => c.sum) ? `<tfoot><tr>${o.sel ? '<td></td>' : ''}${o.cols.map((c, i) => `<td class="${isNumT(c.t) ? 'num' : ''}">${c.sum ? (c.t === 'rp' || c.t === 'money' ? fmt.rp : fmt.n)(all.reduce((a, r) => a + (Number(r[c.k]) || 0), 0)) : (i === 0 ? 'TOTAL' : '')}</td>`).join('')}${o.actions ? '<td></td>' : ''}</tr></tfoot>` : '';
        const btns = []; for (let i = Math.max(1, pg - 2); i <= Math.min(pages, pg + 2); i++) btns.push(`<button data-pg="${i}" class="${i === pg ? 'on' : ''}">${i}</button>`);
        el.innerHTML = `${o.search !== false || o.excel || o.tools ? `<div class="tbl-bar"><div class="d-flex gap-2 align-items-center flex-wrap">${o.tools || ''}</div><div class="d-flex gap-2 align-items-center flex-wrap">${o.search !== false ? `<input class="form-control form-control-sm search" placeholder="Cari…" value="${esc(st.q)}" data-q>` : ''}${o.excel ? '<button class="btn btn-sm btn-garis" data-xls><i class="fa-solid fa-file-excel"></i> Unduh Excel</button>' : ''}</div></div>` : ''}
          <div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${sums}</table></div>
          ${all.length > st.size || o.showCount ? `<div class="tbl-foot"><span>Menampilkan ${all.length ? (pg - 1) * st.size + 1 : 0}–${Math.min(pg * st.size, all.length)} dari ${fmt.n(all.length)} data</span><div class="pager"><button data-pg="${pg - 1}" ${pg <= 1 ? 'disabled' : ''}>«</button>${btns.join('')}<button data-pg="${pg + 1}" ${pg >= pages ? 'disabled' : ''}>»</button></div></div>` : ''}`;
        if (o.after) o.after(el, view);
      },
      async excel() {
        const X = await Lib.xlsx();
        const data = T.filtered().map((r) => { const o2 = {}; o.cols.forEach((c) => { if (c.noxls) return; let v = r[c.k]; if (isNumT(c.t)) v = Number(v) || 0; else if (typeof c.x === 'function') v = c.x(v, r); o2[c.l] = v === undefined || v === null ? '' : v; }); return o2; });
        const ws = X.utils.json_to_sheet(data), wb = X.utils.book_new();
        X.utils.book_append_sheet(wb, ws, 'Data'); X.writeFile(wb, (typeof o.excel === 'string' ? o.excel : 'SiParkir') + '_' + SP.today() + '.xlsx');
      }
    };
    el.addEventListener('input', SP.debounce((e) => { if (e.target.matches('[data-q]')) { st.q = e.target.value; st.page = 1; T.render(); const q = el.querySelector('[data-q]'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } } }, 180));
    el.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]'), pg = e.target.closest('[data-pg]'), act = e.target.closest('[data-act]'), vw = e.target.closest('[data-view]');
      if (vw) { e.preventDefault(); UI.viewFile(vw.dataset.view); return; }
      if (e.target.matches('[data-selall]')) { const v = e.target.checked; T.filtered().forEach((r) => (v ? st.sel.add(String(r[o.key])) : st.sel.delete(String(r[o.key])))); T.render(); if (o.onSel) o.onSel(T.selected()); return; }
      if (e.target.matches('[data-sel]')) { const id = e.target.closest('tr').dataset.id; e.target.checked ? st.sel.add(id) : st.sel.delete(id); if (o.onSel) o.onSel(T.selected()); return; }
      if (th && !e.target.closest('input')) { const c = o.cols.find((x) => x.k === th.dataset.sort); if (c && c.sort === false) return; st.dir = st.sort === th.dataset.sort ? -st.dir : 1; st.sort = th.dataset.sort; T.render(); return; }
      if (pg && !pg.disabled) { st.page = Number(pg.dataset.pg); T.render(); return; }
      if (e.target.closest('[data-xls]')) { T.excel().catch(UI.err); return; }
      if (act) { const id = act.closest('tr') ? act.closest('tr').dataset.id : act.dataset.id; const r = st.rows.find((x) => String(x[o.key]) === String(id)); if (o.onAct) o.onAct(act.dataset.act, r, act); return; }
      const tr = e.target.closest('tbody tr[data-id]');
      if (tr && o.onClick && !e.target.closest('a,button,input')) { const r = st.rows.find((x) => String(x[o.key]) === tr.dataset.id); if (r) o.onClick(r, tr); }
    });
    T.render();
    return T;
  };
  UI.btnAct = (act, label, c, ic, title) => `<button class="btn btn-xs btn-${c || 'biru'}" data-act="${act}" title="${esc(title || label)}">${ic ? `<i class="fa-solid ${ic}"></i>` : ''}${label ? ' ' + esc(label) : ''}</button>`;

  // ---------- Halaman entitas generik (CRUD dari metadata server) ----------
  const FLOW_BTN = { Diajukan: ['Ajukan', 'biru', 'fa-paper-plane'], Disetujui: ['Setujui', 'hijau', 'fa-check'], Ditolak: ['Tolak', 'merah', 'fa-xmark'], Dibayar: ['Bayar', 'hijau', 'fa-money-bill'] };
  UI.entity = (el, ent, o) => {
    o = o || {};
    const meta = S.boot.ent[ent];
    if (!meta) { el.innerHTML = UI.callout('fa-lock', 'Anda tidak memiliki akses ke data ini.', 'merah'); return null; }
    const fields = o.fields ? o.fields(meta.fields) : meta.fields;
    const cols = o.cols || fields.filter((f) => f.list && f.t !== 'json').map((f) => ({ k: f.n, l: f.l, t: f.t === 'select' && f.n === 'status' ? 'badge' : (f.n === 'status' || f.n === 'status_cocok' || f.n === 'status_pipeline' ? 'badge' : f.t) }));
    const canW = meta.w && !S.viewAs && o.readonly !== true;
    const flow = meta.flow || {};
    const wrap = document.createElement('div'); el.innerHTML = ''; el.appendChild(wrap);
    let lastRows = [];
    const T = UI.table(wrap, {
      cols, key: meta.key || '_i', excel: o.excel || meta.judul, size: o.size || 10, empty: o.empty, rowCls: o.rowCls, sel: o.sel, onSel: o.onSel,
      tools: (canW && o.add !== false ? `<button class="btn btn-sm btn-hijau" data-add><i class="fa-solid fa-plus"></i> ${esc(o.addLabel || 'Tambah')}</button>` : '') + (o.tools || '') + '<button class="btn btn-sm btn-abu" data-reload title="Muat ulang"><i class="fa-solid fa-rotate"></i></button>',
      actions: (r) => {
        let h = o.extraActions ? o.extraActions(r) : '';
        h += UI.btnAct('view', '', 'abu', 'fa-eye', 'Lihat');
        if (canW && o.edit !== false && (!o.canEdit || o.canEdit(r))) h += UI.btnAct('edit', '', 'oranye', 'fa-pen', 'Ubah');
        Object.keys(flow).forEach((s) => { if (flow[s].from.indexOf(r.status) > -1 && FLOW_BTN[s]) h += UI.btnAct('st:' + s, FLOW_BTN[s][0], FLOW_BTN[s][1], FLOW_BTN[s][2]); });
        if (canW && meta.del && o.del !== false && (!o.canDel || o.canDel(r))) h += UI.btnAct('del', '', 'merah', 'fa-trash', 'Hapus');
        return h;
      },
      onAct: async (act, r, btn) => {
        if (act === 'view') return UI.detail(meta, fields, r, o);
        if (act === 'edit') return form(r);
        if (act === 'del') {
          const c = await UI.confirm({ title: 'Hapus data', msg: `Hapus <b>${esc(r[meta.key])}</b>? Data dihapus lunak dan tercatat di audit.`, danger: true, ok: 'Hapus', input: { label: 'Alasan' } });
          if (!c) return;
          await UI.run(btn, () => API.call('data.del', { ent, id: r[meta.key], alasan: c.nilai }), 'Data dihapus'); load(true);
          return;
        }
        if (act.indexOf('st:') === 0) {
          const s = act.slice(3), need = flow[s].alasan;
          const c = await UI.confirm({ title: FLOW_BTN[s][0] + ' ' + r[meta.key], msg: `Ubah status menjadi <b>${esc(s)}</b>?`, danger: s === 'Ditolak', input: need ? { label: 'Alasan', req: true } : null });
          if (!c) return;
          const prev = r.status; r.status = s; T.render(); // UI optimis
          try { await UI.run(btn, () => API.call('data.status', { ent, id: r[meta.key], status: s, alasan: c.nilai }), 'Status: ' + s); load(true); }
          catch (e) { r.status = prev; T.render(); }
          return;
        }
        if (o.onAct) o.onAct(act, r, btn, load);
      },
      onClick: o.onClick
    });
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('[data-add]')) form(null);
      if (e.target.closest('[data-reload]')) load(true);
    });
    function form(r) {
      const isNew = !r, vals = Object.assign({}, o.defaults || {}, r || {});
      const ff = o.formFields ? o.formFields(fields, r) : fields;
      const m = UI.modal({ title: (isNew ? 'Tambah ' : 'Ubah ') + esc(meta.judul), size: o.formSize || 'lg', static: true,
        body: (o.formNote ? o.formNote(r) : '') + UI.form(ff, vals, { isNew, cols: o.formCols || 2, fileKat: o.fileKat }),
        foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-biru" data-save><i class="fa-solid fa-floppy-disk"></i> Simpan</button>' });
      UI.bindForm(m.el);
      if (o.afterForm) o.afterForm(m, r);
      m.$('[data-save]').onclick = async (e) => {
        const data = UI.readForm(m.el, ff);
        if (!UI.validate(m.el, ff, data)) return;
        if (!isNew) data[meta.key] = r[meta.key];
        if (o.beforeSave) o.beforeSave(data, r, m);
        try {
          const res = await UI.run(e.currentTarget, () => API.call(o.save || 'data.save', o.save ? { row: data } : { ent, row: data }), 'Tersimpan');
          m.close(); load(true); if (o.onSaved) o.onSaved(res, isNew);
        } catch (x) { }
      };
    }
    function load(force) {
      const p = Object.assign({ ent }, o.params ? o.params() : {});
      if (force) SP.Cache.drop('data.list|');
      return API.swr('data.list', p, (d) => { const rs = o.rowFilter ? d.rows.filter(o.rowFilter) : d.rows; lastRows = o.map ? rs.map(o.map) : rs; T.set(lastRows); if (o.onData) o.onData(lastRows, d); },
        { ttl: force ? 0 : 15000, onError: (e) => { wrap.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
    }
    load();
    return { T, load, form, rows: () => lastRows };
  };
  UI.detail = (meta, fields, r, o) => {
    const rows = fields.filter((f) => f.t !== 'json').map((f) => `<tr><td class="muted" style="width:38%">${esc(f.l)}</td><td>${UI.cell({ k: f.n, t: f.n === 'status' ? 'badge' : f.t }, r)}</td></tr>`).join('');
    const extra = ['dibuat_oleh', 'dibuat_pada', 'diubah_oleh', 'diubah_pada'].filter((k) => r[k]).map((k) => `<tr><td class="muted">${k.replace('_', ' ')}</td><td>${esc(r[k])}</td></tr>`).join('');
    const m = UI.modal({ title: esc(meta.judul) + ' — ' + esc(r[meta.key] || ''), size: 'lg', body: `<table class="tbl">${rows}${extra}</table>${o && o.detailExtra ? o.detailExtra(r) : ''}` });
    m.el.addEventListener('click', (e) => { const v = e.target.closest('[data-view]'); if (v) { e.preventDefault(); UI.viewFile(v.dataset.view); } });
  };

  // ---------- Grafik ----------
  UI.chart = async (canvas, cfg) => {
    if (!canvas) return null;
    const Chart = await Lib.chart();
    Chart.defaults.font.family = "'Source Sans 3', Arial, sans-serif"; Chart.defaults.font.size = 12; Chart.defaults.color = '#555';
    if (canvas._chart) canvas._chart.destroy();
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }, cfg.options || {});
    canvas._chart = new Chart(canvas, cfg);
    return canvas._chart;
  };
  UI.rpTick = (v) => fmt.rps(v).replace('Rp', '');
  UI.heatmap = (grid, satuan) => {
    if (!grid || !grid.length) return UI.empty('Belum ada data okupansi (impor file gate untuk mengisi)');
    const warna = (p) => p > 90 ? '#FF6B6B' : p > 60 ? '#00a65a' : p > 30 ? '#7dd3a0' : '#eef1f4';
    const urut = [1, 2, 3, 4, 5, 6, 0], kol = Array.from({ length: 12 }, (_, i) => i * 2);
    return `<div class="tbl-wrap"><table class="heat"><thead><tr><th class="d">HARI</th>${kol.map((h) => `<th>${String(h).padStart(2, '0')}</th>`).join('')}</tr></thead><tbody>${urut.map((d) => `<tr><th class="d" style="${d === 0 ? 'color:#c0392b' : ''}">${HARI[d].toUpperCase()}</th>${kol.map((h) => {
      const v = Math.round(((grid[d] || [])[h] || 0) / 2 + ((grid[d] || [])[h + 1] || 0) / 2);
      return `<td style="background:${warna(v)};${v <= 30 ? 'color:#999' : ''}" title="${HARI[d]} ${h}:00–${h + 2}:00 · ${v}%">${v > 30 ? v : ''}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="heat-leg"><span style="--c:#eef1f4">0–30%</span><span style="--c:#7dd3a0">31–60%</span><span style="--c:#00a65a">61–90%</span><span style="--c:#FF6B6B">91–100%</span>${satuan === 'persen_relatif' ? '<span class="ms-2">*relatif terhadap puncak (kapasitas lokasi belum diisi)</span>' : ''}</div>`;
  };

  // ---------- Delegasi global ----------
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-collapse]');
    if (c) { const p = c.closest('.panel'); p.classList.toggle('collapsed'); c.innerHTML = p.classList.contains('collapsed') ? '<i class="fa-solid fa-plus"></i>' : '<i class="fa-solid fa-minus"></i>'; }
  });

  window.UI = UI;
})();
