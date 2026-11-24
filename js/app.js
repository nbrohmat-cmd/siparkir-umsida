/* =====================================================================
   app.js — kerangka SPA: login, ganti sandi wajib, navbar, sidebar, filter global,
   notifikasi, router, PWA (service worker + tombol pasang), "lihat sebagai"
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, S, LS, API, Bus, Router, Cache, Pages, inisial, master } = SP;
  const app = $('#app');
  let navId = 0, installEvt = null, notifTimer = null;

  // ---------------- PWA ----------------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) UI.toast('Versi baru tersedia — muat ulang halaman untuk memperbarui', 'warn'); }); });
    }).catch((e) => console.warn('SW gagal', e)));
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $$('[data-install]').forEach((b) => b.classList.remove('d-none')); });
  async function pasangApp() { if (!installEvt) return UI.toast('Gunakan menu browser → "Tambahkan ke layar utama"', 'warn'); installEvt.prompt(); await installEvt.userChoice; installEvt = null; $$('[data-install]').forEach((b) => b.classList.add('d-none')); }

  // ---------------- Info publik (nama, logo) ----------------
  function pub() { return LS.get('sp_pub', { nama: CONFIG.APP_NAME, pengelola: 'PT Jenggolo Manik Bangkit Makmur', rs: 'Rumah Sakit UMSIDA Sidoarjo', versi: CONFIG.VERSION }); }
  function logos() { return LS.get('sp_logo', { pengelola: '', rs: '' }); }
  function refreshPub() {
    API.raw('publik.info').then((d) => LS.set('sp_pub', d)).catch(() => { });
    API.raw('publik.logo').then((d) => { LS.set('sp_logo', d); $$('[data-logo-p]').forEach((i) => { if (d.pengelola) { i.src = d.pengelola; i.classList.remove('d-none'); } }); }).catch(() => { });
  }
  const brandHtml = () => { const p = pub(); const n = String(p.nama || 'SiParkir UMSIDA'); const m = n.match(/^(Si)(.*)$/); return m ? `<span class="t1">${esc(m[1])}</span><span class="t2">${esc(m[2])}</span>` : `<span class="t2">${esc(n)}</span>`; };

  // ---------------- Login ----------------
  function showLogin(pesan) {
    clearInterval(notifTimer);
    document.body.className = '';
    const p = pub(), lg = logos();
    app.innerHTML = `<div class="login-wrap"><div class="login-card">
      <div class="hd"><div class="logo">${lg.pengelola ? `<img src="${lg.pengelola}" alt="Logo Pengelola">` : ''}${lg.rs ? `<img src="${lg.rs}" alt="Logo RS">` : ''}${!lg.pengelola && !lg.rs ? '<i class="fa-solid fa-square-parking fa-3x text-hijau"></i>' : ''}</div>
        <h2>${brandHtml().replace('class="t2"', 'class="t2" style="color:var(--hijau)"')}</h2><div class="muted fs-13">Sistem Monitoring & Pembukuan Parkir</div><div class="muted fs-12">${esc(p.rs || '')}</div></div>
      <div class="bd">${pesan ? UI.callout('fa-circle-info', esc(pesan), 'biru') : ''}
        <form id="fLogin" novalidate><div class="mb-2"><label class="form-label">Email</label><div class="input-group"><span class="input-group-text"><i class="fa-solid fa-envelope"></i></span><input type="email" class="form-control" name="email" autocomplete="username" required value="${esc(LS.get('sp_email', ''))}"></div></div>
        <div class="mb-3"><label class="form-label">Kata sandi</label><div class="input-group"><span class="input-group-text"><i class="fa-solid fa-lock"></i></span><input type="password" class="form-control" name="sandi" autocomplete="current-password" required><button type="button" class="btn btn-abu" data-eye><i class="fa-solid fa-eye"></i></button></div></div>
        <button class="btn btn-hijau w-100 btn-big" type="submit"><i class="fa-solid fa-right-to-bracket"></i> Masuk</button></form>
        <div class="text-center mt-3 fs-12 muted">${esc(p.pengelola || '')} · Versi ${esc(p.versi || CONFIG.VERSION)}</div>
        <div class="text-center mt-2"><button class="btn btn-sm btn-garis d-none" data-install><i class="fa-solid fa-download"></i> Pasang Aplikasi</button></div></div></div></div>`;
    if (installEvt) $$('[data-install]').forEach((b) => b.classList.remove('d-none'));
    $('[data-install]').onclick = pasangApp;
    $('[data-eye]').onclick = () => { const i = $('[name=sandi]'); i.type = i.type === 'password' ? 'text' : 'password'; };
    $('#fLogin').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, email = f.email.value.trim(), sandi = f.sandi.value;
      if (!email || !sandi) return UI.toast('Email dan kata sandi wajib diisi', 'warn');
      try {
        const r = await UI.run(f.querySelector('button[type=submit]'), () => API.raw('auth.login', { email, sandi }));
        LS.set('sp_email', email); S.token = r.token; LS.set('sp_token', r.token); S.user = r.user; Cache.clear();
        if (r.user.wajibGanti) showGantiWajib(); else boot(true);
      } catch (x) { }
    };
    refreshPub();
  }
  function showGantiWajib() {
    app.innerHTML = `<div class="login-wrap"><div class="login-card"><div class="hd"><i class="fa-solid fa-key fa-2x text-oranye"></i><h2 class="fs-4 mt-2">Ganti Kata Sandi</h2><div class="muted fs-13">Wajib diganti pada login pertama / setelah reset.</div></div>
      <div class="bd"><form id="fGanti">${sandiForm()}<button class="btn btn-hijau w-100 btn-big mt-2">Simpan & Lanjutkan</button><button type="button" class="btn btn-abu w-100 mt-2" data-out>Keluar</button></form></div></div></div>`;
    $('[data-out]').onclick = () => logout();
    $('#fGanti').onsubmit = (e) => { e.preventDefault(); simpanSandi(e.target, () => boot(true)); };
  }
  function sandiForm() {
    return `<div class="mb-2"><label class="form-label">Kata sandi lama / sementara</label><input type="password" class="form-control" name="lama" required autocomplete="current-password"></div>
      <div class="mb-2"><label class="form-label">Kata sandi baru</label><input type="password" class="form-control" name="baru" required autocomplete="new-password"><div class="form-text">Minimal 8 karakter, berisi huruf dan angka.</div></div>
      <div class="mb-2"><label class="form-label">Ulangi kata sandi baru</label><input type="password" class="form-control" name="ulang" required autocomplete="new-password"></div>`;
  }
  async function simpanSandi(f, next) {
    if (f.baru.value !== f.ulang.value) return UI.toast('Konfirmasi kata sandi tidak sama', 'warn');
    if (f.baru.value.length < 8 || !/[A-Za-z]/.test(f.baru.value) || !/[0-9]/.test(f.baru.value)) return UI.toast('Kata sandi minimal 8 karakter berisi huruf & angka', 'warn');
    try {
      const r = await UI.run(f.querySelector('button:not([type=button])'), () => API.raw('auth.gantiSandi', { lama: f.lama.value, baru: f.baru.value }), 'Kata sandi diperbarui');
      S.token = r.token; LS.set('sp_token', r.token); f.reset(); next && next();
    } catch (x) { }
  }
  async function logout(pesan) {
    const t = S.token;
    S.token = ''; S.boot = null; S.user = null; S.viewAs = ''; LS.del('sp_token'); LS.del('sp_boot'); sessionStorage.removeItem('sp_viewas'); Cache.clear();
    if (t && !pesan) fetch(CONFIG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'auth.logout', token: t }) }).catch(() => { });
    history.replaceState(null, '', location.pathname);
    showLogin(pesan);
  }
  Bus.on('unauth', () => logout('Sesi berakhir, silakan masuk kembali.'));
  Bus.on('mustchange', () => showGantiWajib());
  Bus.on('maintenance', (e) => {
    app.innerHTML = `<div class="login-wrap"><div class="login-card"><div class="hd"><i class="fa-solid fa-screwdriver-wrench fa-3x text-oranye"></i><h2 class="fs-4 mt-3">Sedang perbaikan</h2></div><div class="bd text-center"><p>${esc(e.message)}</p><button class="btn btn-hijau" onclick="location.reload()">Coba lagi</button> <button class="btn btn-abu" id="mOut">Keluar</button></div></div></div>`;
    $('#mOut').onclick = () => logout();
  });

  // ---------------- Bootstrap & shell ----------------
  async function boot(fresh) {
    const cached = !fresh && LS.get('sp_boot', null);
    if (cached && cached.user && cached.vAs === (S.viewAs || '')) { S.boot = cached; S.user = cached.user; shell(); render(); }
    else app.innerHTML = `<div class="d-flex align-items-center justify-content-center" style="min-height:100vh"><div class="text-center"><i class="fa-solid fa-square-parking fa-3x text-hijau"></i><div class="mt-3 muted">Memuat ${esc(pub().nama || 'SiParkir')}…</div></div></div>`;
    try {
      const b = await API.raw('app.bootstrap');
      b.vAs = S.viewAs || '';
      const beda = !S.boot || JSON.stringify(Object.assign({}, S.boot, { waktu: 0 })) !== JSON.stringify(Object.assign({}, b, { waktu: 0 }));
      S.boot = b; S.user = b.user; LS.set('sp_boot', b);
      if (SP.can.lap() && S.lokasi !== 'SEMUA' && S.user.lokasi.indexOf(S.lokasi) === -1) S.lokasi = 'SEMUA';
      if (beda || !cached) { shell(); render(); }
      prefetchAwal();
    } catch (e) {
      if (e.code === 'UNAUTHORIZED' || e.code === 'MAINTENANCE' || e.code === 'MUST_CHANGE_PASSWORD') return;
      if (!cached) app.innerHTML = `<div class="login-wrap"><div class="login-card"><div class="bd text-center p-4">${UI.callout('fa-circle-xmark', esc(e.message), 'merah')}<button class="btn btn-hijau" onclick="location.reload()">Coba lagi</button> <button class="btn btn-abu" id="eOut">Keluar</button></div></div></div>`;
      const o = $('#eOut'); if (o) o.onclick = () => logout();
    }
  }
  function prefetchAwal() {
    const u = S.user;
    if (u.peran === 'RS_UMSIDA') API.prefetch('dash.rs', { periode: S.periode, lokasi: S.lokasi }, { persist: true });
    else if (u.peran === 'SUPERVISOR') API.prefetch('dash.supervisor', {}, { persist: true });
    else if (u.peran === 'OPERATOR') API.prefetch('dash.operator', {}, { persist: true });
    else API.prefetch('dash.internal', { periode: S.periode, lokasi: S.lokasi }, { persist: true });
    loadNotif();
    clearInterval(notifTimer); notifTimer = setInterval(() => { if (!document.hidden) loadNotif(); }, 120000);
  }
  function shell() {
    const u = S.user, b = S.boot, p = pub(), lg = logos();
    const lokOpts = master('lokasi').filter((l) => l.aktif === true && (!SP.can.lap() || u.lokasi.indexOf(l.id_lokasi) > -1));
    document.body.className = (LS.get('sp_mini', false) ? 'side-mini ' : '') + (SP.can.lap() ? 'has-bnav' : '');
    app.innerHTML = `
      <nav class="sp-nav">
        <a class="sp-brand" href="#/dashboard"><img data-logo-p class="${lg.pengelola ? '' : 'd-none'}" src="${lg.pengelola || ''}" alt=""><span class="bt">${brandHtml()}</span></a>
        <button class="nav-btn" data-side title="Menu"><i class="fa-solid fa-bars"></i></button>
        <div class="flex-fill"></div>
        <div class="filter"><i class="fa-regular fa-calendar"></i><span class="lbl-f fs-12">Periode</span><input type="month" data-gper value="${S.periode}" max="${SP.periodeNow()}"></div>
        <div class="filter"><i class="fa-solid fa-location-dot"></i><select data-glok><option value="SEMUA">Semua Lokasi</option>${lokOpts.map((l) => `<option value="${esc(l.id_lokasi)}" ${S.lokasi === l.id_lokasi ? 'selected' : ''}>${esc(l.nama)}</option>`).join('')}</select></div>
        <div class="dropdown-x" data-dd="notif"><button class="nav-btn bell" title="Notifikasi"><i class="fa-regular fa-bell fa-lg"></i><span class="cnt d-none" data-ncnt>0</span></button><div class="menu" data-nlist><div class="mh">Notifikasi</div><div class="p-3 muted fs-13">Memuat…</div></div></div>
        <div class="dropdown-x" data-dd="user"><button class="nav-btn user-chip"><span class="avatar">${esc(inisial(u.nama))}</span><span class="nm fw-600">${esc(u.nama)}</span><i class="fa-solid fa-caret-down fs-12"></i></button>
          <div class="menu" style="min-width:230px"><div class="mh">${esc(u.nama)}<div class="fs-12 muted fw-normal">${esc(u.email)} · ${esc(u.namaPeran)}</div></div>
          <a class="mi" href="#/sandi"><i class="fa-solid fa-key"></i> Ganti Password</a><a class="mi d-none" href="#" data-install><i class="fa-solid fa-download"></i> Pasang Aplikasi</a>
          <a class="mi" href="#" data-refresh><i class="fa-solid fa-rotate"></i> Muat ulang data</a><a class="mi" href="#" data-logout><i class="fa-solid fa-right-from-bracket"></i> Logout</a></div></div>
        <button class="nav-btn logout" data-logout title="Logout"><i class="fa-solid fa-right-from-bracket"></i><span class="lbl">LOGOUT</span></button>
      </nav>
      <aside class="sp-side">
        <div class="user-panel"><span class="avatar lg">${esc(inisial(u.nama))}</span><div><div class="nm">${esc(u.nama)}</div><div class="rl">${esc(u.namaPeran)}${u.lokasi.length ? ' · ' + esc(u.lokasi.join(', ')) : ''}</div></div></div>
        ${b.menu.map((g) => `<div class="grp">${esc(g.g)}</div>${g.items.map((i) => `<a class="item" href="#/${i.id}" data-nav="${i.id}" title="${esc(i.t)}"><i class="fa-solid ${i.i}"></i><span class="lbl">${esc(i.t)}</span></a>`).join('')}`).join('')}
        <a class="item" href="#" data-logout><i class="fa-solid fa-power-off"></i><span class="lbl">Logout</span></a>
        <div class="install"><button class="btn btn-sm btn-garis w-100 d-none" data-install><i class="fa-solid fa-mobile-screen"></i> Pasang Aplikasi</button></div>
      </aside>
      <div class="side-shade" data-shade></div>
      <main class="sp-main">
        ${S.viewAs ? `<div class="banner va"><span><i class="fa-solid fa-user-secret"></i> Anda melihat sebagai <b>${esc(u.nama)}</b> (${esc(u.namaPeran)}) — mode baca saja.</span><button class="btn btn-sm btn-oranye" data-exitva>Keluar dari mode ini</button></div>` : ''}
        <div class="banner off ${S.online ? 'd-none' : ''}" data-offline><span><i class="fa-solid fa-wifi"></i> Anda sedang offline — menampilkan data terakhir yang tersimpan.</span></div>
        <div class="sp-content"><div id="page"></div></div>
        <footer class="sp-foot"><span>Copyright © ${new Date().getFullYear()} — <b>${esc(p.nama || CONFIG.APP_NAME)}</b> · ${esc(p.pengelola || '')}</span><span><b>Versi</b> ${esc(b.versi || CONFIG.VERSION)}</span></footer>
      </main>
      ${u.peran === 'SUPERVISOR' ? `<nav class="bnav"><a href="#/dashboard" data-bn="dashboard"><i class="fa-solid fa-house"></i>Beranda</a><a href="#/rekap?baru=1" data-bn="rekap"><i class="fa-solid fa-square-plus"></i>Input Shift</a>
        <a href="#/sla?catat=1" data-bn="sla"><i class="fa-solid fa-triangle-exclamation"></i>Log Kejadian</a><a href="#/gratis" data-bn="gratis"><i class="fa-solid fa-square-parking"></i>Gratis</a><a href="#/sandi" data-bn="sandi"><i class="fa-solid fa-user"></i>Akun</a></nav>` : ''}
      ${u.peran === 'OPERATOR' ? `<nav class="bnav"><a href="#/dashboard" data-bn="dashboard"><i class="fa-solid fa-house"></i>Beranda</a><a href="#/setoran?baru=1" data-bn="setoran-baru"><i class="fa-solid fa-square-plus"></i>Input Setoran</a>
        <a href="#/setoran" data-bn="setoran"><i class="fa-solid fa-clock-rotate-left"></i>Riwayat</a><a href="#/sandi" data-bn="sandi"><i class="fa-solid fa-user"></i>Akun</a></nav>` : ''}`;
    if (installEvt) $$('[data-install]').forEach((x) => x.classList.remove('d-none'));
    // peristiwa shell
    $('[data-side]').onclick = () => { if (window.innerWidth < 768) document.body.classList.toggle('side-open'); else { document.body.classList.toggle('side-mini'); LS.set('sp_mini', document.body.classList.contains('side-mini')); } };
    $('[data-shade]').onclick = () => document.body.classList.remove('side-open');
    $$('[data-logout]').forEach((x) => x.onclick = async (e) => { e.preventDefault(); if (await UI.confirm({ title: 'Logout', msg: 'Keluar dari aplikasi?', ok: 'Logout' })) logout(); });
    $$('[data-install]').forEach((x) => x.onclick = (e) => { e.preventDefault(); pasangApp(); });
    const rf = $('[data-refresh]'); if (rf) rf.onclick = (e) => { e.preventDefault(); Cache.clear(); boot(true); UI.toast('Data dimuat ulang'); };
    const ex = $('[data-exitva]'); if (ex) ex.onclick = () => { S.viewAs = ''; sessionStorage.removeItem('sp_viewas'); Cache.clear(); LS.del('sp_boot'); Router.go('panel'); boot(true); };
    $('[data-gper]').onchange = (e) => { if (!e.target.value) return; S.periode = e.target.value; sessionStorage.setItem('sp_per', S.periode); Bus.emit('filter'); render(); };
    $('[data-glok]').onchange = (e) => { S.lokasi = e.target.value; sessionStorage.setItem('sp_lok', S.lokasi); Bus.emit('filter'); render(); };
    $$('.dropdown-x').forEach((d) => d.querySelector('button').onclick = (e) => { e.stopPropagation(); const o = d.classList.contains('open'); $$('.dropdown-x').forEach((x) => x.classList.remove('open')); if (!o) d.classList.add('open'); if (!o && d.dataset.dd === 'notif') loadNotif(); });
    // prefetch saat kursor/jari menyentuh menu → navigasi terasa instan
    $$('[data-nav]').forEach((a) => { const f = () => { const pg = Pages[a.dataset.nav]; if (pg && pg.prefetch) try { pg.prefetch(); } catch (x) { } }; a.addEventListener('mouseenter', f, { once: true }); a.addEventListener('touchstart', f, { once: true, passive: true }); });
    $('.sp-side').addEventListener('click', (e) => { if (e.target.closest('a.item') && window.innerWidth < 768) document.body.classList.remove('side-open'); });
    if (b.lengkap && b.lengkap.length && SP.can.role('SUPER_ADMIN', 'PIMPINAN') && !sessionStorage.getItem('sp_lengkap')) { sessionStorage.setItem('sp_lengkap', 1); setTimeout(() => UI.toast('Pengaturan belum lengkap: ' + b.lengkap.join(', '), 'warn'), 800); }
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('.dropdown-x')) $$('.dropdown-x.open').forEach((x) => x.classList.remove('open')); });
  Bus.on('net', (on) => { const b = $('[data-offline]'); if (b) b.classList.toggle('d-none', on); if (on) UI.toast('Kembali online'); });

  function loadNotif() {
    if (!S.token || !S.boot) return;
    API.swr('app.notif', {}, (d) => {
      const c = $('[data-ncnt]'), l = $('[data-nlist]');
      if (c) { c.textContent = d.jumlah; c.classList.toggle('d-none', !d.jumlah); }
      if (l) l.innerHTML = `<div class="mh">Notifikasi (${d.items.length})</div>` + (d.items.length ? d.items.slice(0, 30).map((a) => `<a class="mi" href="${a.link || '#'}"><i class="fa-solid ${a.lvl === 'danger' ? 'fa-circle-exclamation text-merah' : a.lvl === 'warning' ? 'fa-triangle-exclamation text-oranye' : 'fa-circle-info text-biru'}"></i><span>${esc(a.teks)}</span></a>`).join('') : '<div class="p-3 muted fs-13">Tidak ada notifikasi 🎉</div>');
    }, { ttl: 60000 });
  }
  Bus.on('written', () => { setTimeout(loadNotif, 600); });

  // ---------------- Router ----------------
  function render() {
    if (!S.boot) return;
    const { id, params } = Router.parse();
    const allowed = ['sandi'].concat(...S.boot.menu.map((g) => g.items.map((i) => i.id)));
    const pid = allowed.indexOf(id) > -1 && Pages[id] ? id : 'dashboard';
    const pg = Pages[pid], my = ++navId, el = $('#page');
    if (!el) return;
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === pid));
    const bk = (params.baru || params.id) && $(`[data-bn="${pid}-baru"]`) ? pid + '-baru' : pid;
    $$('[data-bn]').forEach((a) => a.classList.toggle('on', a.dataset.bn === bk));
    const item = S.boot.menu.map((g) => g.items).flat().find((i) => i.id === pid);
    const judul = (pg.title && (typeof pg.title === 'function' ? pg.title(params) : pg.title)) || (item ? item.t : '');
    const sub = typeof pg.sub === 'function' ? pg.sub(params) : (pg.sub || '');
    document.title = judul + ' — ' + (pub().nama || 'SiParkir');
    el.innerHTML = `<div class="page-h"><h1>${esc(judul)}<small>${esc(sub)}</small></h1><div class="crumb"><a href="#/dashboard"><i class="fa-solid fa-house"></i> Beranda</a>${pid !== 'dashboard' ? ' / ' + esc(judul) : ''}</div></div>
      <div class="mfilter no-print"><input type="month" class="form-control form-control-sm" value="${S.periode}" data-mper><select class="form-select form-select-sm" data-mlok><option value="SEMUA">Semua Lokasi</option>${master('lokasi').filter((l) => l.aktif === true && (!SP.can.lap() || S.user.lokasi.indexOf(l.id_lokasi) > -1)).map((l) => `<option value="${esc(l.id_lokasi)}" ${S.lokasi === l.id_lokasi ? 'selected' : ''}>${esc(l.nama)}</option>`).join('')}</select></div>
      <div data-body></div>`;
    const mp = $('[data-mper]', el), ml = $('[data-mlok]', el);
    if (mp) mp.onchange = () => { if (!mp.value) return; S.periode = mp.value; sessionStorage.setItem('sp_per', S.periode); const g = $('[data-gper]'); if (g) g.value = S.periode; render(); };
    if (ml) ml.onchange = () => { S.lokasi = ml.value; sessionStorage.setItem('sp_lok', S.lokasi); const g = $('[data-glok]'); if (g) g.value = S.lokasi; render(); };
    const ctx = { live: () => my === navId, params, rerender: () => { if (my === navId) render(); } };
    window.scrollTo(0, 0);
    try { pg.render($('[data-body]', el), params, ctx); } catch (e) { console.error(e); $('[data-body]', el).innerHTML = UI.callout('fa-bug', 'Terjadi kesalahan tampilan: ' + esc(e.message), 'merah'); }
  }
  Bus.on('route', render);
  SP.App = { render, logout, boot, pasangApp, sandiForm, simpanSandi };

  // ---------------- Mulai ----------------
  document.addEventListener('DOMContentLoaded', () => { if (S.token) boot(false); else showLogin(); });
})();
