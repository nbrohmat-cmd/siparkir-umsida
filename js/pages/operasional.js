/* Operasional: Rekap Shift (F-03, F-04), Parkir Gratis & Zonasi (F-13), Operasional & SLA (F-14) */
(function () {
  'use strict';
  const { $, $$, esc, fmt, S, API, can, master, namaLokasi, namaShift, Files, Lib, Router, today, nowLocal } = SP;
  const VOL = [['masuk_mobil', 'Masuk Mobil', 'fa-right-to-bracket'], ['masuk_motor', 'Masuk Motor', 'fa-right-to-bracket'], ['keluar_mobil', 'Keluar Mobil', 'fa-right-from-bracket'], ['keluar_motor', 'Keluar Motor', 'fa-right-from-bracket'],
    ['trx_berbayar', 'Trx Berbayar', 'fa-ticket'], ['trx_gratis', 'Civitas / Nakes (gratis)', 'fa-id-card'], ['trx_menginap', 'Menginap', 'fa-moon'], ['trx_darurat', 'Pengecualian Darurat', 'fa-truck-medical'],
    ['tiket_hilang', 'Tiket Hilang', 'fa-ticket-simple'], ['trx_pelanggaran_zonasi', 'Pelanggaran Zonasi', 'fa-ban'], ['kendaraan_kedaruratan', 'Kendaraan Kedaruratan', 'fa-truck-medical']];
  const UANG = [['pend_parkir', 'Pendapatan parkir reguler'], ['pend_menginap', 'Inap (menginap)'], ['denda_tiket_hilang', 'Denda tiket hilang'], ['pend_tarif_zonasi', 'Tarif sanksi zonasi']];
  const lokasiSaya = () => master('lokasi').filter((l) => l.aktif === true && (!can.lap() || S.user.lokasi.indexOf(l.id_lokasi) > -1));
  const shiftSekarang = () => { const now = nowLocal().slice(11, 16); const s = master('shift').find((x) => x.aktif !== false && (x.jam_mulai < x.jam_selesai ? now >= x.jam_mulai && now < x.jam_selesai : now >= x.jam_mulai || now < x.jam_selesai)); return s ? s.id_shift : ((master('shift')[0] || {}).id_shift || ''); };

  // =====================================================================
  //  REKAP SHIFT
  // =====================================================================
  SP.Pages.rekap = {
    sub: 'Input harian, impor file gate & riwayat',
    prefetch() { API.prefetch('data.list', { ent: 'rekap', periode: S.periode, lokasi: S.lokasi }); },
    render(el, p, ctx) {
      if (p.baru || p.id) return formRekap(el, p, ctx);
      const tabs = [{ id: 'daftar', t: 'Daftar Rekap', i: 'fa-list' }];
      if (can.role('ADMIN_KEU', 'SUPER_ADMIN')) tabs.push({ id: 'impor', t: 'Impor File Gate', i: 'fa-file-import' }, { id: 'riwayat', t: 'Riwayat Impor', i: 'fa-clock-rotate-left' });
      const tab = p.tab || 'daftar';
      el.innerHTML = UI.tabs(tabs, tab) + '<div data-tb></div>';
      $$('[data-tab]', el).forEach((b) => b.onclick = () => Router.go('rekap', { tab: b.dataset.tab }));
      const tb = $('[data-tb]', el);
      if (tab === 'impor') return imporWizard(tb, ctx);
      if (tab === 'riwayat') return riwayatImpor(tb);
      daftarRekap(tb);
    }
  };
  function daftarRekap(el) {
    const bisaInput = can.role('SUPERVISOR', 'ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs;
    el.innerHTML = `${bisaInput ? '<a class="btn btn-hijau mb-3" href="#/rekap?baru=1"><i class="fa-solid fa-plus"></i> Input Rekap Shift</a>' : ''}<div data-k></div>${UI.panel({ t: 'Rekap Shift — ' + fmt.per(S.periode) + ' · ' + namaLokasi(S.lokasi), i: 'fa-table-list', p0: true, body: '<div data-t></div>' })}`;
    UI.entity($('[data-t]', el), 'rekap', {
      params: () => ({ periode: S.periode, lokasi: S.lokasi }), add: false, edit: false, del: false, size: 15,
      cols: [{ k: 'tanggal_operasi', l: 'Tanggal', t: 'tgl' }, { k: 'id_shift', l: 'Shift' }, { k: 'id_lokasi', l: 'Lokasi' }, { k: 'sumber', l: 'Sumber', f: (v) => UI.badge(v, v === 'IMPOR' ? 'ungu' : 'abu') },
        { k: 'trx_berbayar', l: 'Trx', t: 'n', sum: true }, { k: 'total_diterima', l: 'Total', t: 'rp', sum: true }, { k: 'selisih_kas', l: 'Selisih', t: 'rp', sum: true, f: (v) => v ? `<span class="text-merah fw-600">${fmt.rp(v)}</span>` : fmt.rp(0) },
        { k: 'status', l: 'Status', t: 'badge' }, { k: 'flag_selisih', l: 'Flag', f: (v) => v ? '<i class="fa-solid fa-flag text-merah" title="Selisih manual vs impor"></i>' : '' }],
      rowCls: (r) => r.flag_selisih ? 'row-merah' : (r.status === 'Ditolak' ? 'row-oranye' : ''),
      extraActions: (r) => (bisaInput && r.sumber === 'MANUAL' && ['Draft', 'Ditolak'].concat(can.role('SUPERVISOR') ? [] : ['Diajukan']).indexOf(r.status) > -1 ? UI.btnAct('edit2', '', 'oranye', 'fa-pen', 'Ubah') : ''),
      onAct: (act, r) => { if (act === 'edit2') Router.go('rekap', { id: r.id_rekap }); },
      onClick: (r) => detailRekap(r.id_rekap),
      onData: (rows) => { const k = $('[data-k]', el); if (k) k.innerHTML = `<div class="row g-2 mb-3">${[['Rekap', fmt.n(rows.length)], ['Menunggu verifikasi', fmt.n(rows.filter((r) => r.status === 'Diajukan').length), 'oranye'], ['Total diterima', fmt.rp(rows.reduce((a, r) => a + (r.status !== 'Ditolak' ? r.total_diterima || 0 : 0), 0)), 'hijau'], ['Selisih kas', fmt.rp(rows.reduce((a, r) => a + (r.selisih_kas || 0), 0)), 'merah']].map((x) => `<div class="col-6 col-lg-3">${UI.mini(x[0], x[1], x[2])}</div>`).join('')}</div>`; }
    });
  }
  async function detailRekap(id) {
    const m = UI.modal({ title: 'Detail Rekap ' + esc(id), size: 'lg', body: '<div class="sk box"></div>' });
    try {
      const r = await API.get('data.get', { ent: 'rekap', id }, { ttl: 5000 });
      const row = (l, v) => `<tr><td class="muted">${l}</td><td class="num">${v}</td></tr>`;
      m.$('.md-b').innerHTML = `<div class="d-flex justify-content-between flex-wrap gap-2 mb-2"><div><b>${fmt.tgl(r.tanggal_operasi)}</b> · ${esc(namaShift(r.id_shift))} · ${esc(namaLokasi(r.id_lokasi))}</div><div>${UI.badge(r.sumber, 'abu')} ${UI.badge(r.status)}</div></div>
        <div class="row g-3"><div class="col-md-6"><table class="tbl">${VOL.map((v) => row(v[1], fmt.n(r[v[0]]))).join('')}</table></div>
        <div class="col-md-6"><table class="tbl">${UANG.map((u) => row(u[1], fmt.rp(r[u[0]]))).join('')}${row('<b>Total diterima</b>', '<b>' + fmt.rp(r.total_diterima) + '</b>')}${row('Tunai', fmt.rp(r.tunai))}${row('QRIS', fmt.rp(r.qris))}
        ${row('PBJT (dihitung)', fmt.rp(r.pbjt))}${r.pbjt_gate ? row('PBJT sistem gate', fmt.rp(r.pbjt_gate)) : ''}${row('Refund', fmt.rp(r.refund_nilai) + (r.refund_ref ? ' <span class="tag">' + esc(r.refund_ref) + '</span>' : ''))}${row('Tunai disetor', fmt.rp(r.tunai_disetor))}${row('Selisih kas', `<span class="${r.selisih_kas ? 'text-merah fw-600' : ''}">${fmt.rp(r.selisih_kas)}</span>`)}</table></div></div>
        ${r.catatan ? UI.callout('fa-comment', '<b>Catatan:</b> ' + esc(r.catatan), 'biru') : ''}${r.alasan_tolak ? UI.callout('fa-circle-xmark', '<b>Alasan ditolak:</b> ' + esc(r.alasan_tolak), 'merah') : ''}
        <div class="fs-12 muted">Petugas: ${esc(r.petugas || '-')} · Dibuat ${esc(r.dibuat_oleh)} ${fmt.tglw(r.dibuat_pada)}${r.verifikator ? ' · Diverifikasi ' + esc(r.verifikator) + ' ' + fmt.tglw(r.waktu_verifikasi) : ''}</div>
        ${r.foto_bukti ? `<button class="btn btn-sm btn-biru mt-2" data-view="${esc(r.foto_bukti)}"><i class="fa-solid fa-image"></i> Lihat foto bukti setoran</button>` : ''}`;
      m.el.addEventListener('click', (e) => { const v = e.target.closest('[data-view]'); if (v) UI.viewFile(v.dataset.view); });
    } catch (e) { m.$('.md-b').innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); }
  }

  // ---------- Formulir rekap bertahap (ponsel-first) ----------
  async function formRekap(el, p, ctx) {
    let r = { tanggal_operasi: p.tanggal || today(), id_shift: p.shift || '', id_lokasi: p.lokasi || (lokasiSaya()[0] || {}).id_lokasi || '', petugas: S.user.nama };
    VOL.forEach((v) => r[v[0]] = 0); UANG.forEach((u) => r[u[0]] = 0); Object.assign(r, { tunai: 0, qris: 0, refund_jumlah: 0, refund_nilai: 0, refund_ref: '', tunai_disetor: 0, catatan: '', foto_bukti: '' });
    if (!r.id_shift) { const now = nowLocal().slice(11, 16); const s = master('shift').find((x) => x.aktif !== false && (x.jam_mulai < x.jam_selesai ? now >= x.jam_mulai && now < x.jam_selesai : now >= x.jam_mulai || now < x.jam_selesai)); r.id_shift = s ? s.id_shift : ((master('shift')[0] || {}).id_shift || ''); }
    if (p.id) {
      el.innerHTML = UI.skBox(2);
      try { r = await API.get('data.get', { ent: 'rekap', id: p.id }, { force: true }); } catch (e) { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); return; }
      if (!ctx.live()) return;
    }
    const pb = Number(S.boot.set.PBJT_PERSEN) || 0, lok = lokasiSaya();
    const step = (n, t, i, body, badge) => `<div class="panel" data-sec="${n}"><div class="panel-h"><h3 class="ttl"><i class="fa-solid ${i}"></i>${n}. ${t}</h3>${badge || ''}</div><div class="panel-b">${body}</div></div>`;
    const num = (k, l, ic) => `<div class="col-6 col-lg-3"><label class="form-label fs-12"><i class="fa-solid ${ic} muted"></i> ${l}</label><div class="stepper-num"><button type="button" data-dec="${k}">−</button><input class="form-control" inputmode="numeric" data-k="${k}" value="${r[k] || 0}"><button type="button" data-inc="${k}">+</button></div></div>`;
    const rpIn = (k, l, big) => `<div class="${big ? 'col-12' : 'col-md-6'}"><label class="form-label fs-12">${l}</label><div class="input-group"><span class="input-group-text">Rp</span><input class="form-control money" inputmode="numeric" data-k="${k}" value="${fmt.n(r[k] || 0)}"></div></div>`;
    el.innerHTML = `
      ${r.status === 'Ditolak' ? UI.callout('fa-circle-xmark', '<b>Rekap ditolak verifikator:</b> ' + esc(r.alasan_tolak || ''), 'merah') : ''}
      <div class="panel p-polos"><div class="panel-b p-1">${UI.stepper([{ nm: 'Identitas' }, { nm: 'Volume' }, { nm: 'Uang & Kas' }, { nm: 'Bukti & Tim' }], 0)}</div></div>
      ${step(1, 'Identitas Shift Operasional', 'fa-id-badge', `<div class="row g-2"><div class="col-md-4"><label class="form-label">Tanggal operasional</label><input type="date" class="form-control" data-k="tanggal_operasi" value="${esc(r.tanggal_operasi)}" max="${today()}"><div class="form-text">Shift malam memakai tanggal mulai shift.</div></div>
        <div class="col-md-8"><label class="form-label">Pilihan jam kerja shift</label><div class="row g-2">${master('shift').filter((s) => s.aktif !== false).map((s) => `<div class="col-6"><div class="opt-card ${r.id_shift === s.id_shift ? 'on' : ''}" data-shift="${esc(s.id_shift)}"><b>${esc(s.nama)}</b><div class="fs-12">${esc(s.jam_mulai)} – ${esc(s.jam_selesai)} WIB</div></div></div>`).join('')}</div></div>
        <div class="col-12"><label class="form-label">Lokasi penugasan</label><select class="form-select" data-k="id_lokasi" ${lok.length === 1 ? 'disabled' : ''}>${lok.map((l) => `<option value="${esc(l.id_lokasi)}" ${l.id_lokasi === r.id_lokasi ? 'selected' : ''}>${esc(l.nama)}</option>`).join('')}</select></div></div>`)}
      ${step(2, 'Volume Kendaraan & Trafik', 'fa-car', `<div class="row g-2">${VOL.map((v) => num(v[0], v[1], v[2])).join('')}</div>`, '<span class="tag" data-totken></span>')}
      ${step(3, 'Rincian Keuangan & Kas', 'fa-money-bill-wave', `<div data-opr></div><div class="row g-2">${UANG.map((u) => rpIn(u[0], u[1])).join('')}</div>
        <div class="big-total my-3"><div class="fs-12 fw-600">TOTAL DITERIMA (PPK SHIFT)</div><div class="v" data-total>Rp0</div><i class="fa-solid fa-sack-dollar"></i></div>
        <div class="d-flex justify-content-between align-items-center"><b class="fs-13">METODE PEMBAYARAN</b><span data-cocok></span></div>
        <div class="row g-2 mt-1">${rpIn('tunai', 'Tunai (cash)')}${rpIn('qris', 'QRIS (non-tunai)')}</div>
        <div class="form-check form-switch my-3"><input class="form-check-input" type="checkbox" id="swRefund" ${r.refund_nilai ? 'checked' : ''}><label class="form-check-label fw-600" for="swRefund">Ada refund / koreksi transaksi?</label></div>
        <div class="row g-2 ${r.refund_nilai ? '' : 'd-none'}" data-refund><div class="col-md-3"><label class="form-label fs-12">Jumlah refund</label><input class="form-control" inputmode="numeric" data-k="refund_jumlah" value="${r.refund_jumlah || 0}"></div>${rpIn('refund_nilai', 'Nominal refund disetujui')}
          <div class="col-md-3"><label class="form-label fs-12">No. memo persetujuan Pimpinan *</label><input class="form-control" data-k="refund_ref" value="${esc(r.refund_ref || '')}" placeholder="REF-…"></div></div>
        <hr><b class="fs-13">REKONSILIASI KAS TUNAI</b><div class="row g-2 mt-1"><div class="col-md-6">${UI.mini('Fisik di kasir / POS (tunai − refund)', '<span data-fisik>Rp0</span>')}</div>${rpIn('tunai_disetor', 'Disetor ke brankas / bank')}</div>
        <div data-selisih class="mt-2"></div><div class="d-flex justify-content-between fs-13 mt-2 muted"><span>Estimasi PBJT ${pb}% (pajak daerah)</span><b data-pbjt>Rp0</b></div>`)}
      ${step(4, 'Bukti Setoran, Petugas & Catatan', 'fa-camera', `<label class="form-label">Foto bukti slip setoran / brankas</label><div class="d-flex gap-3 align-items-center flex-wrap"><img class="foto-prev ${r.foto_bukti ? '' : 'd-none'}" data-prev alt="Foto bukti">
          <div><button type="button" class="btn btn-biru" data-foto><i class="fa-solid fa-camera"></i> ${r.foto_bukti ? 'Ganti foto' : 'Ambil / pilih foto'}</button>${r.foto_bukti ? ` <button type="button" class="btn btn-sm btn-abu" data-view="${esc(r.foto_bukti)}">Lihat</button>` : ''}<div class="fs-12 muted mt-1" data-fnm>${r.foto_bukti ? 'Foto tersimpan' : 'Wajib bila ada uang tunai · dikompres otomatis'}</div></div></div>
        <label class="form-label mt-3">Petugas jaga aktif</label><input class="form-control" data-k="petugas" value="${esc(r.petugas || '')}" placeholder="Nama petugas, pisahkan koma">
        <label class="form-label mt-3">Catatan operasional / keterangan selisih <span class="req" data-catreq></span></label><textarea class="form-control" rows="3" data-k="catatan">${esc(r.catatan || '')}</textarea>`)}
      ${UI.callout('fa-shield-halved', 'Data rekap tersinkron ke dashboard Pimpinan PT JMBM & Bagian Keuangan RS UMSIDA setelah diverifikasi.', 'hijau')}
      <div class="d-flex gap-2 justify-content-between sticky-bottom bg-white p-2 border rounded no-print" style="bottom:${can.role('SUPERVISOR') ? '64px' : '0'}">
        <a class="btn btn-abu" href="#/rekap">Batal</a><div class="d-flex gap-2"><button class="btn btn-garis" data-draft><i class="fa-solid fa-floppy-disk"></i> Simpan Draft</button><button class="btn btn-hijau" data-ajukan><i class="fa-solid fa-paper-plane"></i> Ajukan Rekap Shift</button></div></div>`;
    const get = (k) => { const i = el.querySelector(`[data-k="${k}"]`); if (!i) return r[k]; return i.classList.contains('money') ? UI.parseRp(i.value) : (/^(tanggal_operasi|id_lokasi|refund_ref|petugas|catatan)$/.test(k) ? i.value : Number(i.value) || 0); };
    function hitung() {
      const tot = UANG.reduce((a, u) => a + get(u[0]), 0), tun = get('tunai'), qr = get('qris'), ref = $('#swRefund').checked ? get('refund_nilai') : 0;
      const fisik = tun - ref, sel = get('tunai_disetor') - fisik;
      $('[data-total]', el).textContent = fmt.rp(tot); $('[data-fisik]', el).textContent = fmt.rp(fisik);
      $('[data-pbjt]', el).textContent = fmt.rp(pb ? Math.round(tot * pb / (100 + pb)) : 0);
      $('[data-totken]', el).textContent = 'Total ' + fmt.n(get('masuk_mobil') + get('masuk_motor')) + ' kendaraan';
      $('[data-cocok]', el).innerHTML = tot === tun + qr ? '<span class="text-hijau fw-600"><i class="fa-solid fa-circle-check"></i> COCOK 100%</span>' : `<span class="text-merah fw-600"><i class="fa-solid fa-circle-xmark"></i> Selisih ${fmt.rp(tot - tun - qr)}</span>`;
      $('[data-selisih]', el).innerHTML = sel === 0 ? '' : UI.callout('fa-triangle-exclamation', `<b>Selisih kas: ${fmt.rp(sel)}</b> (${sel < 0 ? 'kurang setor' : 'lebih setor'}). Catatan keterangan wajib diisi pada bagian 4.`, 'merah');
      $('[data-catreq]', el).textContent = sel !== 0 ? '* wajib karena ada selisih' : '';
      const st = $('.stepper', el), filled = [true, get('masuk_mobil') + get('masuk_motor') > 0, tot > 0 && tot === tun + qr, !!r.foto_bukti || tun === 0];
      if (st) st.outerHTML = UI.stepper([{ nm: 'Identitas' }, { nm: 'Volume' }, { nm: 'Uang & Kas' }, { nm: 'Bukti & Tim' }], filled.indexOf(false) === -1 ? 4 : filled.indexOf(false));
      cekOpr(tot, tun, qr);
      return { tot, tun, qr, sel };
    }
    // ---- setoran operator (per pos/gate) yang digabung ke rekap ini ----
    const oprBox = $('[data-opr]', el), bisaPeriksa = can.role('SUPERVISOR', 'ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs;
    let opr = null, oprKey = '';
    async function muatSetoran() {
      const key = { tanggal_operasi: get('tanggal_operasi'), id_shift: r.id_shift, id_lokasi: get('id_lokasi') || r.id_lokasi, id_rekap: r.id_rekap || '' };
      if (!key.tanggal_operasi || !key.id_shift || !key.id_lokasi) return;
      const k = JSON.stringify(key); oprKey = k;
      try { const d = await API.get('setoran.shift', key, { ttl: 0 }); if (!ctx.live() || oprKey !== k) return; opr = d; } catch (e) { opr = null; }
      drawOpr(); hitung();
    }
    function drawOpr() {
      if (!opr || !opr.rows.length) { opr = opr && opr.rows.length ? opr : null; oprBox.innerHTML = can.role('SUPERVISOR') ? '<div class="fs-12 muted mb-2"><i class="fa-solid fa-hand-holding-dollar"></i> Belum ada setoran operator untuk shift & lokasi ini — isi rekap secara manual.</div>' : ''; return; }
      const j = opr.jumlah;
      oprBox.innerHTML = `<div class="mini l-biru mb-3"><div class="d-flex justify-content-between align-items-center flex-wrap gap-2"><b class="fs-13"><i class="fa-solid fa-hand-holding-dollar"></i> SETORAN OPERATOR PER POS (${opr.rows.length})</b>${opr.menunggu ? `<span class="badge-s s-oranye">${opr.menunggu} menunggu diterima</span>` : ''}</div>
        <div class="tbl-wrap mt-1"><table class="tbl fs-13"><thead><tr><th>Operator / pos</th><th class="num">Total</th><th class="num">Tunai</th><th class="num">QRIS</th><th class="num">Diserahkan</th><th>Status</th></tr></thead><tbody>
        ${opr.rows.map((x) => `<tr><td><b>${esc(x.nama_operator)}</b><div class="fs-11 muted">${esc(x.pos || '-')} · ${fmt.n(x.trx_berbayar)} trx</div>${x.catatan ? `<div class="fs-11"><i class="fa-solid fa-comment muted"></i> ${esc(x.catatan)}</div>` : ''}${x.alasan_kembali ? `<div class="fs-11 text-merah">Dikembalikan: ${esc(x.alasan_kembali)}</div>` : ''}</td>
          <td class="num">${fmt.rp(x.total_diterima)}</td><td class="num">${fmt.rp(x.tunai)}</td><td class="num">${fmt.rp(x.qris)}</td><td class="num ${x.selisih_kas ? 'text-merah fw-600' : ''}">${fmt.rp(x.tunai_disetor)}</td><td>${UI.badge(x.status)}
          <div class="d-flex gap-1 mt-1 flex-wrap">${x.foto_bukti ? `<button type="button" class="btn btn-xs btn-abu" data-view="${esc(x.foto_bukti)}" title="Foto bukti"><i class="fa-solid fa-image"></i></button> ` : ''}${bisaPeriksa && x.status === 'Diserahkan' ? `<button type="button" class="btn btn-xs btn-hijau" data-terima="${esc(x.id_setoran)}"><i class="fa-solid fa-check"></i> Terima</button> ` : ''}${bisaPeriksa && ['Diserahkan', 'Diterima'].indexOf(x.status) > -1 ? `<button type="button" class="btn btn-xs btn-merah" data-kembali="${esc(x.id_setoran)}" title="Kembalikan ke operator"><i class="fa-solid fa-rotate-left"></i></button>` : ''}</div></td></tr>`).join('')}
        </tbody><tfoot><tr><td>Dihitung (${j.jumlah} diterima)</td><td class="num">${fmt.rp(j.total_diterima)}</td><td class="num">${fmt.rp(j.tunai)}</td><td class="num">${fmt.rp(j.qris)}</td><td class="num">${fmt.rp(j.tunai_disetor)}</td><td></td></tr></tfoot></table></div>
        <div class="d-flex gap-2 mt-2 align-items-center flex-wrap"><button type="button" class="btn btn-sm btn-biru" data-isi-opr ${j.jumlah ? '' : 'disabled'}><i class="fa-solid fa-wand-magic-sparkles"></i> Isi dari setoran operator</button><span class="fs-12" data-opr-cek></span></div></div>`;
    }
    function cekOpr(tot, tun, qr) {
      const c = $('[data-opr-cek]', el); if (!c || !opr || !opr.jumlah.jumlah) return;
      const j = opr.jumlah, sama = tot === j.total_diterima && tun === j.tunai && qr === j.qris;
      c.innerHTML = sama ? '<span class="text-hijau fw-600"><i class="fa-solid fa-circle-check"></i> Rekap sama dengan jumlah setoran operator</span>' : `<span class="text-merah fw-600"><i class="fa-solid fa-triangle-exclamation"></i> Berbeda ${fmt.rp(tot - j.total_diterima)} dari setoran operator — jelaskan di catatan</span>`;
    }
    function isiDariOpr() {
      const j = opr.jumlah, set = (k, v) => { const i = el.querySelector(`[data-k="${k}"]`); if (i) i.value = i.classList.contains('money') ? fmt.n(v) : v; };
      UANG.forEach((u) => set(u[0], j[u[0]])); ['tunai', 'qris', 'tunai_disetor'].forEach((k) => set(k, j[k])); set('trx_berbayar', j.trx_berbayar);
      const cat = el.querySelector('[data-k="catatan"]'), cc = opr.rows.filter((x) => (x.status === 'Diterima' || x.status === 'Direkap') && x.catatan).map((x) => (x.pos || x.nama_operator) + ': ' + x.catatan);
      if (cat && !cat.value.trim() && cc.length) cat.value = cc.join('; ');
      hitung(); UI.toast('Rincian uang & trx berbayar diisi dari ' + j.jumlah + ' setoran operator');
    }
    oprBox.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-terima]'), k = e.target.closest('[data-kembali]');
      if (e.target.closest('[data-isi-opr]')) return isiDariOpr();
      if (t) { try { const x = await UI.run(t, () => API.call('setoran.periksa', { id: t.dataset.terima, aksi: 'terima' }), 'Setoran diterima'); if (x.info) UI.toast(x.info, 'warn'); muatSetoran(); } catch (z) { } }
      if (k) { const c = await UI.confirm({ title: 'Kembalikan setoran ' + esc(k.dataset.kembali), msg: 'Setoran dikembalikan ke operator untuk diperbaiki.', danger: true, ok: 'Kembalikan', input: { label: 'Alasan (dikirim ke operator)', req: true } }); if (!c) return;
        try { await UI.run(k, () => API.call('setoran.periksa', { id: k.dataset.kembali, aksi: 'kembalikan', alasan: c.nilai }), 'Setoran dikembalikan ke operator'); muatSetoran(); } catch (z) { } }
    });
    el.addEventListener('change', (e) => { const k = e.target.dataset && e.target.dataset.k; if (k === 'tanggal_operasi' || k === 'id_lokasi') muatSetoran(); });
    UI.bindForm(el);
    el.addEventListener('input', hitung);
    el.addEventListener('click', async (e) => {
      const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'), sh = e.target.closest('[data-shift]'), vw = e.target.closest('[data-view]');
      if (inc || dec) { const k = (inc || dec).dataset[inc ? 'inc' : 'dec'], i = el.querySelector(`[data-k="${k}"]`); i.value = Math.max(0, (Number(i.value) || 0) + (inc ? 1 : -1)); hitung(); }
      if (sh) { r.id_shift = sh.dataset.shift; $$('[data-shift]', el).forEach((x) => x.classList.toggle('on', x === sh)); muatSetoran(); }
      if (vw) UI.viewFile(vw.dataset.view);
      if (e.target.closest('[data-foto]')) {
        const f = await Files.pick('image/*', 'environment'); if (!f) return;
        const btn = e.target.closest('[data-foto]');
        await UI.run(btn, async () => {
          const c = await Files.compress(f, 1280, 0.8);
          const pv = $('[data-prev]', el); pv.src = c.preview; pv.classList.remove('d-none');
          const up = await API.call('file.upload', { kategori: 'bukti', nama: 'setoran_' + get('tanggal_operasi') + '_' + r.id_shift + '_' + get('id_lokasi') + '.jpg', mime: c.mime, data: c.data }, { keepCache: true });
          r.foto_bukti = up.id; $('[data-fnm]', el).textContent = up.nama + ' · ' + Math.round(up.ukuran / 1024) + ' KB · berhasil diunggah'; hitung();
        }, 'Foto bukti terunggah');
      }
    });
    $('#swRefund').onchange = (e) => { $('[data-refund]', el).classList.toggle('d-none', !e.target.checked); hitung(); };
    const simpan = async (ajukan, btn) => {
      const row = { id_rekap: r.id_rekap || '', tanggal_operasi: get('tanggal_operasi'), id_shift: r.id_shift, id_lokasi: get('id_lokasi') || r.id_lokasi, petugas: get('petugas'), catatan: get('catatan'), foto_bukti: r.foto_bukti, refund_ref: get('refund_ref') };
      VOL.forEach((v) => row[v[0]] = get(v[0])); UANG.forEach((u) => row[u[0]] = get(u[0]));
      ['tunai', 'qris', 'tunai_disetor'].forEach((k) => row[k] = get(k));
      if ($('#swRefund').checked) { row.refund_jumlah = get('refund_jumlah'); row.refund_nilai = get('refund_nilai'); } else { row.refund_jumlah = 0; row.refund_nilai = 0; row.refund_ref = ''; }
      const h = hitung();
      if (ajukan) {
        if (opr && opr.menunggu) return UI.toast('Masih ada ' + opr.menunggu + ' setoran operator yang belum diterima — terima atau kembalikan dulu', 'warn');
        if (h.tot !== h.tun + h.qr) return UI.toast('Total pendapatan harus sama dengan Tunai + QRIS', 'warn');
        if (h.tun > 0 && !r.foto_bukti) return UI.toast('Foto bukti setoran wajib bila ada uang tunai', 'warn');
        if (h.sel !== 0 && !row.catatan) return UI.toast('Isi catatan keterangan selisih kas', 'warn');
        if (row.refund_nilai > 0 && !row.refund_ref) return UI.toast('Refund wajib memiliki nomor memo persetujuan', 'warn');
      }
      try {
        const res = await UI.run(btn, () => API.call('rekap.save', { row, ajukan }), ajukan ? 'Rekap diajukan untuk verifikasi' : 'Draft tersimpan');
        (res.peringatan || []).forEach((w) => UI.toast(w, 'warn'));
        SP.Cache.drop('dash.'); SP.Cache.drop('data.list|');
        Router.go(can.role('SUPERVISOR') ? 'dashboard' : 'rekap');
      } catch (x) { }
    };
    $('[data-draft]', el).onclick = (e) => simpan(false, e.currentTarget);
    $('[data-ajukan]', el).onclick = (e) => simpan(true, e.currentTarget);
    hitung();
    muatSetoran();
  }

  // =====================================================================
  //  SETORAN OPERATOR — pendapatan shift per pos/gate → digabung ke rekap Supervisor
  // =====================================================================
  const UANG_OPR = [['pend_parkir', 'Parkir reguler'], ['pend_menginap', 'Inap (menginap)'], ['denda_tiket_hilang', 'Denda tiket hilang'], ['pend_tarif_zonasi', 'Sanksi zonasi']];
  const ARTI_SETORAN = { Draft: 'Belum diserahkan — masih bisa diubah', Diserahkan: 'Menunggu diterima Supervisor', Diterima: 'Diterima Supervisor, menunggu digabung ke rekap shift',
    Direkap: 'Sudah tergabung ke rekap shift', Dikembalikan: 'Dikembalikan Supervisor — perbaiki lalu serahkan ulang' };
  SP.Pages.setoran = {
    title: (p) => can.role('OPERATOR') && (p.baru || p.id) ? (p.id ? 'Setoran Shift' : 'Input Setoran Shift') : '',
    sub: () => can.role('OPERATOR') ? 'Pendapatan shift Anda per pos/gate — diterima & digabung oleh Supervisor' : 'Setoran pendapatan operator per pos/gate yang digabung ke rekap shift',
    prefetch() { API.prefetch('data.list', { ent: 'setoran', periode: S.periode, lokasi: S.lokasi }); },
    render(el, p, ctx) {
      if (can.role('OPERATOR') && (p.baru || p.id)) return formSetoran(el, p, ctx);
      daftarSetoran(el, p);
    }
  };
  const bisaPeriksaSetoran = () => can.role('SUPERVISOR', 'ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs;
  async function periksaSetoran(aksi, r, btn, done) {
    if (aksi === 'terima') {
      try { const x = await UI.run(btn, () => API.call('setoran.periksa', { id: r.id_setoran, aksi: 'terima' }), 'Setoran ' + r.id_setoran + ' diterima'); if (x.info) UI.toast(x.info, 'warn'); SP.Cache.drop('dash.'); if (done) done(); } catch (e) { }
      return;
    }
    const c = await UI.confirm({ title: 'Kembalikan setoran ' + esc(r.id_setoran), msg: `Setoran <b>${esc(r.nama_operator)}</b> (${esc(r.pos || '-')}) ${fmt.rp(r.total_diterima)} dikembalikan ke operator untuk diperbaiki.`, danger: true, ok: 'Kembalikan', input: { label: 'Alasan (dikirim ke operator)', req: true } });
    if (!c) return;
    try { await UI.run(btn, () => API.call('setoran.periksa', { id: r.id_setoran, aksi: 'kembalikan', alasan: c.nilai }), 'Setoran dikembalikan ke operator'); SP.Cache.drop('dash.'); if (done) done(); } catch (e) { }
  }
  function daftarSetoran(el, p) {
    const opr = can.role('OPERATOR'), tab = opr ? 'semua' : (p.tab || 'tunggu');
    el.innerHTML = (opr && !S.viewAs ? '<a class="btn btn-hijau mb-3" href="#/setoran?baru=1"><i class="fa-solid fa-plus"></i> Input Setoran Shift</a>' : '') +
      (opr ? '' : UI.tabs([{ id: 'tunggu', t: 'Menunggu Diterima', i: 'fa-hourglass-half' }, { id: 'semua', t: 'Semua Setoran', i: 'fa-list' }], tab)) +
      `<div data-k></div>${UI.panel({ t: (tab === 'tunggu' ? 'Setoran Menunggu Diterima · ' : 'Setoran — ' + fmt.per(S.periode) + ' · ') + namaLokasi(S.lokasi), i: 'fa-hand-holding-dollar', p0: true, body: '<div data-t></div>',
        foot: opr ? '<span>Setoran yang sudah diserahkan dikunci. Bila Supervisor mengembalikan, perbaiki lalu serahkan ulang.</span>' : '<span>Setoran yang diterima otomatis dijumlahkan di formulir Rekap Shift (tombol "Isi dari setoran operator").</span>' })}`;
    $$('[data-tab]', el).forEach((b) => b.onclick = () => Router.go('setoran', { tab: b.dataset.tab }));
    const cols = [{ k: 'tanggal_operasi', l: 'Tanggal', t: 'tgl' }, { k: 'id_shift', l: 'Shift' }, { k: 'id_lokasi', l: 'Lokasi' }, { k: 'pos', l: 'Pos / Gate' }];
    if (!opr) cols.push({ k: 'nama_operator', l: 'Operator' });
    cols.push({ k: 'total_diterima', l: 'Total', t: 'rp', sum: true }, { k: 'tunai', l: 'Tunai', t: 'rp', sum: true }, { k: 'qris', l: 'QRIS', t: 'rp', sum: true },
      { k: 'selisih_kas', l: 'Selisih', t: 'rp', f: (v) => v ? `<span class="text-merah fw-600">${fmt.rp(v)}</span>` : fmt.rp(0) }, { k: 'status', l: 'Status', t: 'badge' });
    const ent = UI.entity($('[data-t]', el), 'setoran', {
      params: () => tab === 'tunggu' ? { lokasi: S.lokasi, status: 'Diserahkan' } : { periode: S.periode, lokasi: S.lokasi }, size: 15, cols, excel: 'Setoran_Operator',
      empty: tab === 'tunggu' ? 'Tidak ada setoran yang menunggu diterima' : 'Belum ada setoran',
      rowCls: (r) => r.status === 'Dikembalikan' ? 'row-merah' : r.status === 'Diserahkan' ? 'row-oranye' : '',
      extraActions: (r) => {
        if (opr) return !S.viewAs && ['Draft', 'Dikembalikan'].indexOf(r.status) > -1 ? UI.btnAct('ubah', '', 'oranye', 'fa-pen', 'Ubah / serahkan') : '';
        if (!bisaPeriksaSetoran()) return '';
        return (r.status === 'Diserahkan' ? UI.btnAct('terima', 'Terima', 'hijau', 'fa-check') : '') + (['Diserahkan', 'Diterima'].indexOf(r.status) > -1 ? UI.btnAct('kembali', '', 'merah', 'fa-rotate-left', 'Kembalikan ke operator') : '');
      },
      onAct: (act, r, btn, load) => {
        if (act === 'ubah') Router.go('setoran', { id: r.id_setoran });
        if (act === 'terima' || act === 'kembali') periksaSetoran(act === 'terima' ? 'terima' : 'kembalikan', r, btn, () => load(true));
      },
      onClick: (r) => detailSetoran(r, () => ent && ent.load(true)),
      onData: (rows) => {
        const k = $('[data-k]', el); if (!k) return;
        const sum = (f, st) => rows.filter((r) => !st || st.indexOf(r.status) > -1).reduce((a, r) => a + (Number(r[f]) || 0), 0);
        k.innerHTML = `<div class="row g-2 mb-3">${[['Setoran', fmt.n(rows.length)], ['Menunggu diterima', fmt.n(rows.filter((r) => r.status === 'Diserahkan').length), 'oranye'],
          ['Total diserahkan', fmt.rp(sum('total_diterima', ['Diserahkan', 'Diterima', 'Direkap'])), 'hijau'], [opr ? 'Perlu diperbaiki' : 'Dikembalikan', fmt.n(rows.filter((r) => r.status === 'Dikembalikan').length), 'merah']]
          .map((x) => `<div class="col-6 col-lg-3">${UI.mini(x[0], x[1], x[2])}</div>`).join('')}</div>`;
      }
    });
    if (p.id && !opr) API.get('data.get', { ent: 'setoran', id: p.id }, { ttl: 5000 }).then((r) => detailSetoran(r, () => ent && ent.load(true))).catch(UI.err);
  }
  function detailSetoran(r, done) {
    const row = (l, v) => `<tr><td class="muted">${l}</td><td class="num">${v}</td></tr>`;
    const periksa = bisaPeriksaSetoran() && ['Diserahkan', 'Diterima'].indexOf(r.status) > -1;
    const ubah = can.role('OPERATOR') && !S.viewAs && ['Draft', 'Dikembalikan'].indexOf(r.status) > -1;
    const m = UI.modal({ title: 'Setoran ' + esc(r.id_setoran), size: 'lg',
      body: `<div class="d-flex justify-content-between flex-wrap gap-2 mb-2"><div><b>${fmt.tgl(r.tanggal_operasi)}</b> · ${esc(namaShift(r.id_shift))} · ${esc(namaLokasi(r.id_lokasi))}<div class="fs-12 muted">${esc(r.nama_operator)} · ${esc(r.pos || '-')}</div></div><div class="text-end">${UI.badge(r.status)}<div class="fs-11 muted">${esc(ARTI_SETORAN[r.status] || '')}</div></div></div>
        ${r.alasan_kembali ? UI.callout('fa-rotate-left', '<b>Dikembalikan:</b> ' + esc(r.alasan_kembali), 'merah') : ''}
        <div class="row g-3"><div class="col-md-6"><table class="tbl">${row('Trx berbayar', fmt.n(r.trx_berbayar))}${UANG_OPR.map((u) => row(u[1], fmt.rp(r[u[0]]))).join('')}${row('<b>Total pendapatan</b>', '<b>' + fmt.rp(r.total_diterima) + '</b>')}</table></div>
        <div class="col-md-6"><table class="tbl">${row('Tunai', fmt.rp(r.tunai))}${row('QRIS', fmt.rp(r.qris))}${row('Tunai diserahkan', fmt.rp(r.tunai_disetor))}${row('Selisih tunai', `<span class="${r.selisih_kas ? 'text-merah fw-600' : ''}">${fmt.rp(r.selisih_kas)}</span>`)}</table></div></div>
        ${r.catatan ? UI.callout('fa-comment', '<b>Catatan operator:</b> ' + esc(r.catatan), 'biru') : ''}
        <div class="fs-12 muted">${r.waktu_serah ? 'Diserahkan ' + fmt.tglw(r.waktu_serah) : 'Belum diserahkan'}${r.diterima_oleh ? ' · ' + (r.status === 'Dikembalikan' ? 'Dikembalikan' : 'Diterima') + ' ' + esc(r.diterima_oleh) + ' ' + fmt.tglw(r.waktu_terima) : ''}${r.id_rekap ? ' · Rekap <b>' + esc(r.id_rekap) + '</b>' : ''}</div>
        ${r.foto_bukti ? `<button class="btn btn-sm btn-biru mt-2" data-view="${esc(r.foto_bukti)}"><i class="fa-solid fa-image"></i> Lihat foto bukti</button>` : ''}`,
      foot: `<button class="btn btn-abu" data-x>Tutup</button>${ubah ? '<a class="btn btn-oranye" href="#/setoran?id=' + esc(r.id_setoran) + '" data-x><i class="fa-solid fa-pen"></i> Ubah / serahkan</a>' : ''}${periksa ? `<button class="btn btn-merah" data-kembali><i class="fa-solid fa-rotate-left"></i> Kembalikan</button>${r.status === 'Diserahkan' ? '<button class="btn btn-hijau" data-terima><i class="fa-solid fa-check"></i> Terima Setoran</button>' : ''}` : ''}` });
    m.el.addEventListener('click', (e) => {
      const v = e.target.closest('[data-view]'); if (v) UI.viewFile(v.dataset.view);
      const t = e.target.closest('[data-terima]'), k = e.target.closest('[data-kembali]');
      if (t || k) periksaSetoran(t ? 'terima' : 'kembalikan', r, t || k, () => { m.close(); if (done) done(); });
    });
  }

  // ---------- Formulir setoran operator (ponsel-first, isi cepat) ----------
  async function formSetoran(el, p, ctx) {
    const lok = lokasiSaya();
    let r = { tanggal_operasi: p.tanggal || today(), id_shift: p.shift || shiftSekarang(), id_lokasi: p.lokasi || (lok[0] || {}).id_lokasi || '', pos: SP.LS.get('sp_pos', ''),
      trx_berbayar: 0, tunai: 0, qris: 0, tunai_disetor: 0, foto_bukti: '', catatan: '' };
    UANG_OPR.forEach((u) => r[u[0]] = 0);
    if (p.id) {
      el.innerHTML = UI.skBox(2);
      try { r = await API.get('data.get', { ent: 'setoran', id: p.id }, { force: true }); } catch (e) { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); return; }
      if (!ctx.live()) return;
      if (['Draft', 'Dikembalikan'].indexOf(r.status) === -1) {
        el.innerHTML = UI.callout(r.status === 'Direkap' ? 'fa-circle-check' : 'fa-lock', `<b>Setoran ${esc(r.id_setoran)} berstatus ${esc(r.status)}.</b> ${esc(ARTI_SETORAN[r.status] || '')} — tidak dapat diubah lagi.`, r.status === 'Direkap' ? 'hijau' : 'biru') +
          '<a class="btn btn-abu" href="#/setoran">Kembali ke riwayat</a> <button class="btn btn-biru" data-det><i class="fa-solid fa-eye"></i> Lihat rincian</button>';
        $('[data-det]', el).onclick = () => detailSetoran(r);
        return;
      }
    }
    let ikutTunai = !r.id_setoran || r.tunai === r.pend_parkir + r.pend_menginap + r.denda_tiket_hilang + r.pend_tarif_zonasi - r.qris, ikutSetor = !r.id_setoran || r.tunai_disetor === r.tunai;
    const step = (n, t, i, body, badge) => `<div class="panel" data-sec="${n}"><div class="panel-h"><h3 class="ttl"><i class="fa-solid ${i}"></i>${n}. ${t}</h3>${badge || ''}</div><div class="panel-b">${body}</div></div>`;
    const rpIn = (k, l, sub) => `<div class="col-md-6"><label class="form-label fs-12">${l}</label><div class="input-group"><span class="input-group-text">Rp</span><input class="form-control money" inputmode="numeric" data-k="${k}" value="${fmt.n(r[k] || 0)}"></div>${sub ? `<div class="form-text">${sub}</div>` : ''}</div>`;
    const LANGKAH = [{ nm: 'Shift & Pos' }, { nm: 'Pendapatan' }, { nm: 'Tunai / QRIS' }, { nm: 'Bukti' }];
    el.innerHTML = `
      ${r.status === 'Dikembalikan' ? UI.callout('fa-rotate-left', '<b>Dikembalikan Supervisor:</b> ' + esc(r.alasan_kembali || '') + '<br><span class="fs-12">Perbaiki data di bawah lalu tekan <b>Serahkan ke Supervisor</b> lagi.</span>', 'merah') : ''}
      <div class="panel p-polos"><div class="panel-b p-1">${UI.stepper(LANGKAH, 0)}</div></div>
      ${step(1, 'Shift & Pos Jaga', 'fa-id-badge', `<div class="row g-2"><div class="col-md-4"><label class="form-label">Tanggal operasional</label><input type="date" class="form-control" data-k="tanggal_operasi" value="${esc(r.tanggal_operasi)}" max="${today()}"><div class="form-text">Shift malam memakai tanggal mulai shift.</div></div>
        <div class="col-md-8"><label class="form-label">Shift kerja</label><div class="row g-2">${master('shift').filter((x) => x.aktif !== false).map((x) => `<div class="col-6"><div class="opt-card ${r.id_shift === x.id_shift ? 'on' : ''}" data-shift="${esc(x.id_shift)}"><b>${esc(x.nama)}</b><div class="fs-12">${esc(x.jam_mulai)} – ${esc(x.jam_selesai)} WIB</div></div></div>`).join('')}</div></div>
        <div class="col-md-6"><label class="form-label">Lokasi</label><select class="form-select" data-k="id_lokasi" ${lok.length === 1 ? 'disabled' : ''}>${lok.map((l) => `<option value="${esc(l.id_lokasi)}" ${l.id_lokasi === r.id_lokasi ? 'selected' : ''}>${esc(l.nama)}</option>`).join('')}</select></div>
        <div class="col-md-6"><label class="form-label">Pos / gate jaga</label><input class="form-control" data-k="pos" value="${esc(r.pos || '')}" placeholder="mis. Gate Masuk 1" maxlength="60"></div></div>`)}
      ${step(2, 'Pendapatan Shift di Pos Ini', 'fa-money-bill-wave', `<div class="row g-2"><div class="col-md-6"><label class="form-label fs-12"><i class="fa-solid fa-ticket muted"></i> Transaksi berbayar</label><div class="stepper-num"><button type="button" data-dec="trx_berbayar">−</button><input class="form-control" inputmode="numeric" data-k="trx_berbayar" value="${r.trx_berbayar || 0}"><button type="button" data-inc="trx_berbayar">+</button></div></div>
        ${UANG_OPR.map((u) => rpIn(u[0], u[1])).join('')}</div>
        <div class="big-total my-3"><div class="fs-12 fw-600">TOTAL PENDAPATAN POS INI</div><div class="v" data-total>Rp0</div><i class="fa-solid fa-sack-dollar"></i></div>`)}
      ${step(3, 'Tunai & QRIS', 'fa-wallet', `<div class="d-flex justify-content-between align-items-center"><b class="fs-13">METODE PEMBAYARAN</b><span data-cocok></span></div>
        <div class="row g-2 mt-1">${rpIn('qris', 'QRIS (non-tunai)', 'Lihat total QRIS di mesin / aplikasi')}${rpIn('tunai', 'Tunai (cash)', 'Terisi otomatis = total − QRIS')}</div>
        <hr><div class="row g-2">${rpIn('tunai_disetor', 'Uang tunai yang diserahkan ke Supervisor', 'Hitung fisik uangnya')}<div class="col-md-6 d-flex align-items-end"><div data-selisih class="w-100"></div></div></div>`)}
      ${step(4, 'Bukti & Catatan', 'fa-camera', `<label class="form-label">Foto bukti (uang tunai / struk rekap pos)</label><div class="d-flex gap-3 align-items-center flex-wrap"><img class="foto-prev ${r.foto_bukti ? '' : 'd-none'}" data-prev alt="Foto bukti">
          <div><button type="button" class="btn btn-biru" data-foto><i class="fa-solid fa-camera"></i> ${r.foto_bukti ? 'Ganti foto' : 'Ambil / pilih foto'}</button>${r.foto_bukti ? ` <button type="button" class="btn btn-sm btn-abu" data-view="${esc(r.foto_bukti)}">Lihat</button>` : ''}<div class="fs-12 muted mt-1" data-fnm>${r.foto_bukti ? 'Foto tersimpan' : 'Wajib bila ada uang tunai · dikompres otomatis'}</div></div></div>
        <label class="form-label mt-3">Catatan <span class="req" data-catreq></span></label><textarea class="form-control" rows="2" data-k="catatan" placeholder="mis. kurang uang kembalian Rp5.000">${esc(r.catatan || '')}</textarea>`)}
      <div class="d-flex gap-2 justify-content-between sticky-bottom bg-white p-2 border rounded no-print" style="bottom:64px">
        <a class="btn btn-abu" href="#/setoran">Batal</a><div class="d-flex gap-2"><button class="btn btn-garis" data-draft><i class="fa-solid fa-floppy-disk"></i> Draft</button><button class="btn btn-hijau" data-serah><i class="fa-solid fa-paper-plane"></i> Serahkan ke Supervisor</button></div></div>`;
    const inp = (k) => el.querySelector(`[data-k="${k}"]`);
    const get = (k) => { const i = inp(k); if (!i) return r[k]; return i.classList.contains('money') ? UI.parseRp(i.value) : (/^(tanggal_operasi|id_lokasi|pos|catatan)$/.test(k) ? i.value : Number(i.value) || 0); };
    const setRp = (k, v) => { const i = inp(k); if (i) i.value = fmt.n(Math.max(0, v)); };
    function hitung() {
      const tot = UANG_OPR.reduce((a, u) => a + get(u[0]), 0);
      if (ikutTunai) setRp('tunai', tot - get('qris'));
      if (ikutSetor) setRp('tunai_disetor', get('tunai'));
      const tun = get('tunai'), qr = get('qris'), sel = get('tunai_disetor') - tun;
      $('[data-total]', el).textContent = fmt.rp(tot);
      $('[data-cocok]', el).innerHTML = tot === tun + qr ? '<span class="text-hijau fw-600"><i class="fa-solid fa-circle-check"></i> COCOK</span>' : `<span class="text-merah fw-600"><i class="fa-solid fa-circle-xmark"></i> Selisih ${fmt.rp(tot - tun - qr)}</span>`;
      $('[data-selisih]', el).innerHTML = sel === 0 ? '<div class="fs-12 text-hijau fw-600"><i class="fa-solid fa-circle-check"></i> Uang tunai pas</div>' : UI.callout('fa-triangle-exclamation', `<b>Selisih ${fmt.rp(sel)}</b> (${sel < 0 ? 'kurang' : 'lebih'}) — wajib diberi catatan.`, 'merah');
      $('[data-catreq]', el).textContent = sel !== 0 ? '* wajib karena ada selisih' : '';
      const st = $('.stepper', el), isi = [!!get('pos'), tot > 0, tot === tun + qr, !!r.foto_bukti || tun === 0];
      if (st) st.outerHTML = UI.stepper(LANGKAH, isi.indexOf(false) === -1 ? 4 : isi.indexOf(false));
      return { tot, tun, qr, sel };
    }
    UI.bindForm(el);
    el.addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.k; if (k === 'tunai') ikutTunai = false; if (k === 'tunai_disetor') ikutSetor = false; hitung(); });
    el.addEventListener('click', async (e) => {
      const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'), sh = e.target.closest('[data-shift]');
      if (inc || dec) { const i = inp((inc || dec).dataset[inc ? 'inc' : 'dec']); i.value = Math.max(0, (Number(i.value) || 0) + (inc ? 1 : -1)); hitung(); }
      if (sh) { r.id_shift = sh.dataset.shift; $$('[data-shift]', el).forEach((x) => x.classList.toggle('on', x === sh)); }
      if (e.target.closest('[data-foto]')) {
        const f = await Files.pick('image/*', 'environment'); if (!f) return;
        const btn = e.target.closest('[data-foto]');
        await UI.run(btn, async () => {
          const c = await Files.compress(f, 1280, 0.8);
          const pv = $('[data-prev]', el); pv.src = c.preview; pv.classList.remove('d-none');
          const up = await API.call('file.upload', { kategori: 'bukti', nama: 'operator_' + get('tanggal_operasi') + '_' + r.id_shift + '_' + (get('id_lokasi') || r.id_lokasi) + '_' + String(get('pos') || 'pos').replace(/[^A-Za-z0-9]+/g, '-') + '.jpg', mime: c.mime, data: c.data }, { keepCache: true });
          r.foto_bukti = up.id; $('[data-fnm]', el).textContent = up.nama + ' · ' + Math.round(up.ukuran / 1024) + ' KB · berhasil diunggah'; hitung();
        }, 'Foto bukti terunggah');
      }
    });
    const simpan = async (serahkan, btn) => {
      const row = { id_setoran: r.id_setoran || '', tanggal_operasi: get('tanggal_operasi'), id_shift: r.id_shift, id_lokasi: get('id_lokasi') || r.id_lokasi, pos: get('pos'), catatan: get('catatan'), foto_bukti: r.foto_bukti, trx_berbayar: get('trx_berbayar') };
      UANG_OPR.forEach((u) => row[u[0]] = get(u[0])); ['tunai', 'qris', 'tunai_disetor'].forEach((k) => row[k] = get(k));
      const h = hitung();
      if (h.tot !== h.tun + h.qr) return UI.toast('Total pendapatan harus sama dengan Tunai + QRIS', 'warn');
      if (serahkan) {
        if (!row.pos) return UI.toast('Isi pos / gate jaga Anda', 'warn');
        if (h.tot <= 0) return UI.toast('Isi pendapatan shift terlebih dahulu', 'warn');
        if (h.tun > 0 && !r.foto_bukti) return UI.toast('Foto bukti uang tunai wajib diunggah', 'warn');
        if (h.sel !== 0 && !row.catatan) return UI.toast('Isi catatan keterangan selisih tunai', 'warn');
        const ok = await UI.confirm({ title: 'Serahkan setoran', msg: `Serahkan <b>${fmt.rp(h.tot)}</b> (tunai ${fmt.rp(h.tun)} · QRIS ${fmt.rp(h.qr)}) dari <b>${esc(row.pos)}</b> ke Supervisor?<div class="fs-12 muted mt-1">Setelah diserahkan, setoran terkunci sampai Supervisor menerima atau mengembalikannya.</div>`, ok: 'Serahkan' });
        if (!ok) return;
      }
      try {
        const res = await UI.run(btn, () => API.call('setoran.save', { row, serahkan }), serahkan ? 'Setoran diserahkan ke Supervisor' : 'Draft tersimpan');
        if (res.info) UI.toast(res.info, 'warn');
        if (row.pos) SP.LS.set('sp_pos', row.pos);
        SP.Cache.drop('dash.'); SP.Cache.drop('data.list|');
        Router.go('dashboard');
      } catch (x) { }
    };
    $('[data-draft]', el).onclick = (e) => simpan(false, e.currentTarget);
    $('[data-serah]', el).onclick = (e) => simpan(true, e.currentTarget);
    hitung();
  }

  // ---------- Wizard impor file gate (F-04) ----------
  const TARGET = [['waktu_masuk', 'Waktu masuk', 1], ['waktu_keluar', 'Waktu keluar', 1], ['lokasi', 'Lokasi / gate', 1], ['jenis', 'Jenis kendaraan', 1], ['kelompok', 'Kelompok pengguna', 0],
    ['nopol', 'Nopol / kartu', 0], ['metode', 'Metode bayar', 0], ['nominal', 'Nominal (Rp)', 1], ['pbjt', 'PBJT (Rp)', 0], ['batal', 'Status pembatalan', 0]];
  const KELOMPOK = ['Berbayar', 'Gratis', 'Darurat', 'Kedaruratan', 'Menginap', 'Tiket Hilang', 'Pelanggaran Zonasi'];
  function parseWaktu(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number' || /^\d+(\.\d+)?$/.test(String(v))) { const n = Number(v); if (n > 20000 && n < 80000) { const ms = Math.round((n - 25569) * 86400000); const d = new Date(ms); return d.toISOString().slice(0, 16).replace('T', ' '); } }
    const s = String(v).trim(); let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2})[:.](\d{2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')} ${m[4].padStart(2, '0')}:${m[5]}`;
    if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})[ T,]+(\d{1,2})[:.](\d{2})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')} ${m[4].padStart(2, '0')}:${m[5]}`;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')} 00:00`;
    return null;
  }
  const toMin = (hm) => { const p = String(hm).split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); };
  const addDay = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  function shiftOf(dt) {
    const tgl = dt.slice(0, 10), mn = toMin(dt.slice(11, 16));
    for (const s of master('shift').filter((x) => x.aktif !== false)) {
      const a = toMin(s.jam_mulai), b = toMin(s.jam_selesai);
      if (a < b) { if (mn >= a && mn < b) return { id: s.id_shift, tgl }; }
      else { if (mn >= a) return { id: s.id_shift, tgl }; if (mn < b) return { id: s.id_shift, tgl: addDay(tgl, -1) }; }
    }
    return { id: (master('shift')[0] || {}).id_shift, tgl };
  }
  function prosesImpor(rows, H, map, val) {
    const col = (k) => (map[k] === '' || map[k] === undefined ? -1 : H.indexOf(map[k]));
    const ix = {}; TARGET.forEach((t) => ix[t[0]] = col(t[0]));
    const rek = {}, oku = {}, err = []; let ok = 0;
    const getR = (tgl, sh, lok) => { const k = tgl + '|' + sh + '|' + lok; if (!rek[k]) { rek[k] = { tanggal_operasi: tgl, id_shift: sh, id_lokasi: lok }; ['masuk_mobil', 'masuk_motor', 'keluar_mobil', 'keluar_motor', 'trx_berbayar', 'trx_gratis', 'trx_darurat', 'trx_menginap', 'tiket_hilang', 'trx_pelanggaran_zonasi', 'kendaraan_kedaruratan', 'pend_parkir', 'pend_menginap', 'denda_tiket_hilang', 'pend_tarif_zonasi', 'tunai', 'qris', 'refund_jumlah', 'refund_nilai', 'pbjt_gate'].forEach((f) => rek[k][f] = 0); } return rek[k]; };
    rows.forEach((row, i) => {
      const g = (k) => (ix[k] > -1 ? row[ix[k]] : '');
      const wm = parseWaktu(g('waktu_masuk')), wk = parseWaktu(g('waktu_keluar'));
      const lok = val.lokasi[String(g('lokasi')).trim()] || '';
      const jen = val.jenis[String(g('jenis')).trim()] || '';
      if (!wm && !wk) { err.push([i + 2, 'Waktu masuk/keluar kosong atau format tidak dikenal']); return; }
      if (!lok) { err.push([i + 2, 'Lokasi "' + g('lokasi') + '" belum dipetakan']); return; }
      if (!jen) { err.push([i + 2, 'Jenis "' + g('jenis') + '" belum dipetakan']); return; }
      const nominal = Math.max(0, Math.round(Number(String(g('nominal')).replace(/[^0-9.-]/g, '')) || 0));
      const kel = ix.kelompok > -1 ? (val.kelompok[String(g('kelompok')).trim()] || 'Berbayar') : (nominal > 0 ? 'Berbayar' : 'Gratis');
      const batal = ix.batal > -1 && val.batal.indexOf(String(g('batal')).trim()) > -1;
      const met = ix.metode > -1 ? (val.metode[String(g('metode')).trim()] || 'Tunai') : 'Tunai';
      const jk = jen === 'Mobil' ? 'mobil' : 'motor';
      if (wm) { const s = shiftOf(wm); getR(s.tgl, s.id, lok)['masuk_' + jk]++; }
      if (wk) {
        const s = shiftOf(wk), r = getR(s.tgl, s.id, lok);
        if (batal) { r.refund_jumlah++; ok++; return; }
        r['keluar_' + jk]++;
        const bayar = { Berbayar: 'pend_parkir', Menginap: 'pend_menginap', 'Tiket Hilang': 'denda_tiket_hilang', 'Pelanggaran Zonasi': 'pend_tarif_zonasi' }[kel];
        if (bayar) { r.trx_berbayar++; r[bayar] += nominal; r[met === 'QRIS' ? 'qris' : 'tunai'] += nominal; r.pbjt_gate += Math.round(Number(String(g('pbjt')).replace(/[^0-9.-]/g, '')) || 0); }
        if (kel === 'Menginap') r.trx_menginap++; if (kel === 'Tiket Hilang') r.tiket_hilang++; if (kel === 'Pelanggaran Zonasi') r.trx_pelanggaran_zonasi++;
        if (kel === 'Gratis') r.trx_gratis++; if (kel === 'Darurat') r.trx_darurat++; if (kel === 'Kedaruratan') r.kendaraan_kedaruratan++;
      }
      // okupansi per jam (kendaraan terparkir), maks. 72 jam per transaksi
      if (wm) {
        const a = Date.parse(wm.replace(' ', 'T') + ':00Z'), b = wk ? Date.parse(wk.replace(' ', 'T') + ':00Z') : a + 3600000;
        for (let t = a - (a % 3600000), n = 0; t < b && n < 72; t += 3600000, n++) {
          const d = new Date(t).toISOString(), k = d.slice(0, 10) + '|' + lok, h = 'j' + d.slice(11, 13);
          oku[k] = oku[k] || { tanggal: d.slice(0, 10), id_lokasi: lok }; oku[k][h] = (oku[k][h] || 0) + 1;
        }
      }
      ok++;
    });
    return { rekap: Object.values(rek).sort((a, b) => (a.tanggal_operasi + a.id_shift + a.id_lokasi).localeCompare(b.tanggal_operasi + b.id_shift + b.id_lokasi)), okupansi: Object.values(oku), err, ok };
  }
  function imporWizard(el) {
    const st = { step: 0, file: null, buf: null, hash: '', rows: [], H: [], map: {}, val: { lokasi: {}, jenis: {}, kelompok: {}, metode: {}, batal: [] }, tpl: [], hasil: null };
    const steps = [{ nm: 'Pilih File' }, { nm: 'Pemetaan Kolom' }, { nm: 'Pratinjau & Validasi' }, { nm: 'Hasil' }];
    API.get('data.list', { ent: 'templatImpor' }).then((d) => { st.tpl = d.rows.filter((t) => t.jenis === 'GATE'); draw(); }).catch(() => { });
    function draw() {
      let body = '';
      if (st.step === 0) body = `<div class="row g-3"><div class="col-md-6"><label class="form-label">File ekspor sistem gate (CSV / XLSX, maks. 10 MB)</label><input type="file" class="form-control" accept=".csv,.xlsx,.xls,.txt" data-file>
          <div class="form-text">File dibaca & diringkas di browser; server hanya menerima ringkasan per tanggal–shift–lokasi. File mentah diarsipkan ke Drive.</div></div>
          <div class="col-md-6"><label class="form-label">Templat pemetaan (opsional)</label><select class="form-select" data-tpl><option value="">— buat pemetaan baru —</option>${st.tpl.map((t) => `<option value="${esc(t.id_templat)}">${esc(t.nama)}</option>`).join('')}</select></div></div>
          <div data-info class="mt-3"></div>`;
      if (st.step === 1) {
        const opt = (k) => `<select class="form-select form-select-sm" data-map="${k}"><option value="">— tidak ada —</option>${st.H.map((h) => `<option ${st.map[k] === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select>`;
        const distinct = (k) => { const i = st.H.indexOf(st.map[k]); if (i < 0) return []; const s = new Set(); st.rows.forEach((r) => { const v = String(r[i] === undefined ? '' : r[i]).trim(); if (v !== '' && s.size < 40) s.add(v); }); return Array.from(s); };
        const vmap = (k, opts, lbl) => { const ds = distinct(k); if (!ds.length) return ''; return `<div class="col-md-6"><div class="mini"><div class="lb mb-1">${lbl}</div>${ds.map((v) => `<div class="d-flex gap-2 align-items-center mb-1"><span class="fs-12 flex-fill text-truncate" title="${esc(v)}">${esc(v)}</span><select class="form-select form-select-sm" style="max-width:55%" data-val="${k}" data-v="${esc(v)}"><option value="">—</option>${opts.map((o) => `<option value="${esc(o[0])}" ${st.val[k][v] === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`).join('')}</div></div>`; };
        const bt = distinct('batal');
        body = `<div class="row g-2">${TARGET.map((t) => `<div class="col-md-4 col-lg-3"><label class="form-label fs-12">${t[1]}${t[2] ? ' <span class="req">*</span>' : ''}</label>${opt(t[0])}</div>`).join('')}</div><hr>
          <div class="fw-600 mb-2">Pemetaan nilai</div><div class="row g-2">
          ${vmap('lokasi', master('lokasi').map((l) => [l.id_lokasi, l.id_lokasi + ' — ' + l.nama]), 'Lokasi di file → lokasi SiParkir')}
          ${vmap('jenis', [['Mobil', 'Mobil'], ['Motor', 'Motor']], 'Jenis kendaraan')}
          ${vmap('kelompok', KELOMPOK.map((k) => [k, k]), 'Kelompok pengguna → kategori transaksi')}
          ${vmap('metode', [['Tunai', 'Tunai'], ['QRIS', 'QRIS']], 'Metode bayar')}
          ${bt.length ? `<div class="col-md-6"><div class="mini"><div class="lb mb-1">Nilai yang berarti DIBATALKAN</div>${bt.map((v) => `<label class="form-check"><input type="checkbox" class="form-check-input" data-batal value="${esc(v)}" ${st.val.batal.indexOf(v) > -1 ? 'checked' : ''}> <span class="fs-12">${esc(v)}</span></label>`).join('')}</div></div>` : ''}</div>
          <div class="row g-2 mt-2"><div class="col-md-6"><div class="input-group input-group-sm"><input class="form-control" placeholder="Nama templat (mis. Vendor ABC v2)" data-tplname><button class="btn btn-garis" data-savetpl>Simpan sebagai templat</button></div></div></div>`;
      }
      if (st.step === 2) {
        const h = st.hasil, tot = h.rekap.reduce((a, r) => a + r.pend_parkir + r.pend_menginap + r.denda_tiket_hilang + r.pend_tarif_zonasi, 0);
        body = `<div class="row g-2 mb-3"><div class="col-6 col-lg-3">${UI.mini('Baris file', fmt.n(st.rows.length))}</div><div class="col-6 col-lg-3">${UI.mini('Baris valid', fmt.n(h.ok), 'hijau')}</div><div class="col-6 col-lg-3">${UI.mini('Baris bermasalah', fmt.n(h.err.length), h.err.length ? 'merah' : '')}</div><div class="col-6 col-lg-3">${UI.mini('Total pendapatan', fmt.rp(tot), 'hijau')}</div></div>
          ${h.err.length ? UI.panel({ t: 'Baris bermasalah (dilewati)', i: 'fa-triangle-exclamation', c: 'merah', p0: true, body: `<div class="tbl-wrap" style="max-height:200px"><table class="tbl"><tbody>${h.err.slice(0, 100).map((e) => `<tr><td style="width:70px">Baris ${e[0]}</td><td>${esc(e[1])}</td></tr>`).join('')}</tbody></table></div>` }) : ''}
          ${UI.panel({ t: 'Ringkasan per tanggal–shift–lokasi (' + h.rekap.length + ')', i: 'fa-table', p0: true, body: '<div data-prev></div>' })}`;
      }
      if (st.step === 3) { const r = st.res; body = `${UI.callout('fa-circle-check', `<b>Impor berhasil — ${esc(r.id_batch)}</b><br>${r.rekap} ringkasan rekap & ${r.okupansi} baris okupansi tersimpan (status Diajukan, menunggu verifikasi).${r.selisih ? `<br><b class="text-merah">${r.selisih} rekap berbeda dengan input manual → ditandai flag selisih.</b>` : ''}${r.diganti.length ? '<br>Batch lama digantikan: ' + r.diganti.join(', ') : ''}`, 'hijau')}<a class="btn btn-hijau" href="#/verifikasi">Ke Verifikasi Setoran</a> <button class="btn btn-abu" data-ulang>Impor file lain</button>`; }
      el.innerHTML = UI.panel({ t: 'Impor Rekap dari File Sistem Gate', i: 'fa-file-import', body: UI.stepper(steps, st.step) + '<div class="mt-2">' + body + '</div>',
        foot: st.step < 3 ? `<span>${st.file ? esc(st.file.name) + ' · ' + Math.round(st.file.size / 1024) + ' KB' : ''}</span><div class="d-flex gap-2">${st.step > 0 ? '<button class="btn btn-sm btn-abu" data-back>Kembali</button>' : ''}${st.step === 1 ? '<button class="btn btn-sm btn-biru" data-next>Pratinjau (dry-run)</button>' : ''}${st.step === 2 ? '<button class="btn btn-sm btn-hijau" data-simpan><i class="fa-solid fa-cloud-arrow-up"></i> Simpan Impor</button>' : ''}</div>` : '' });
      if (st.step === 2) UI.table($('[data-prev]', el), { key: 'k', rows: st.hasil.rekap.map((r) => Object.assign({ k: r.tanggal_operasi + r.id_shift + r.id_lokasi, total: r.pend_parkir + r.pend_menginap + r.denda_tiket_hilang + r.pend_tarif_zonasi, masuk: r.masuk_mobil + r.masuk_motor }, r)), size: 10, excel: 'Pratinjau_Impor',
        cols: [{ k: 'tanggal_operasi', l: 'Tanggal', t: 'tgl' }, { k: 'id_shift', l: 'Shift' }, { k: 'id_lokasi', l: 'Lokasi' }, { k: 'masuk', l: 'Masuk', t: 'n', sum: true }, { k: 'trx_berbayar', l: 'Berbayar', t: 'n', sum: true }, { k: 'trx_gratis', l: 'Gratis', t: 'n', sum: true }, { k: 'tunai', l: 'Tunai', t: 'rp', sum: true }, { k: 'qris', l: 'QRIS', t: 'rp', sum: true }, { k: 'total', l: 'Total', t: 'rp', sum: true }] });
    }
    el.addEventListener('change', async (e) => {
      if (e.target.matches('[data-file]')) {
        const f = e.target.files[0]; if (!f) return;
        if (f.size > 10 * 1024 * 1024) return UI.toast('File > 10 MB: pecah per hari terlebih dahulu', 'warn');
        const info = $('[data-info]', el); info.innerHTML = '<div class="sk line"></div>';
        try {
          st.file = f; st.buf = await f.arrayBuffer(); st.hash = await Files.sha256(st.buf);
          const c = await API.call('impor.cekHash', { hash: st.hash }, { keepCache: true });
          if (c.ada) { info.innerHTML = UI.callout('fa-ban', `File ini identik dengan impor <b>${esc(c.batch.id_batch)}</b> (${fmt.tglw(c.batch.waktu)}). Impor ganda ditolak.`, 'merah'); return; }
          const X = await Lib.xlsx(); const wb = X.read(st.buf, { type: 'array', raw: false }); const ws = wb.Sheets[wb.SheetNames[0]];
          const aoa = X.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).filter((r) => r.some((v) => String(v).trim() !== ''));
          st.H = (aoa[0] || []).map((h) => String(h).trim()); st.rows = aoa.slice(1);
          const tid = $('[data-tpl]', el).value, t = st.tpl.find((x) => x.id_templat === tid);
          if (t) { try { const pj = JSON.parse(t.pemetaan_json || '{}'); st.map = pj.map || {}; st.val = Object.assign(st.val, pj.val || {}); } catch (x) { } }
          else TARGET.forEach((tg) => { const g = st.H.find((h) => h.toLowerCase().replace(/[^a-z]/g, '').indexOf(tg[0].replace(/_/g, '')) > -1 || h.toLowerCase().indexOf(tg[1].toLowerCase().split(' ')[0]) > -1); if (g && !st.map[tg[0]]) st.map[tg[0]] = g; });
          st.step = 1; draw();
        } catch (x) { info.innerHTML = UI.callout('fa-circle-xmark', esc(x.message), 'merah'); }
      }
      if (e.target.matches('[data-map]')) { st.map[e.target.dataset.map] = e.target.value; draw(); }
      if (e.target.matches('[data-val]')) st.val[e.target.dataset.val][e.target.dataset.v] = e.target.value;
      if (e.target.matches('[data-batal]')) st.val.batal = $$('[data-batal]:checked', el).map((i) => i.value);
    });
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-back]')) { st.step--; draw(); }
      if (e.target.closest('[data-ulang]')) { Object.assign(st, { step: 0, file: null, rows: [], H: [], map: {}, hasil: null }); draw(); }
      if (e.target.closest('[data-next]')) {
        const kurang = TARGET.filter((t) => t[2] && !st.map[t[0]]).filter((t) => !(t[0] === 'waktu_masuk' && st.map.waktu_keluar));
        if (kurang.length) return UI.toast('Petakan kolom wajib: ' + kurang.map((t) => t[1]).join(', '), 'warn');
        st.hasil = prosesImpor(st.rows, st.H, st.map, st.val);
        if (!st.hasil.rekap.length) return UI.toast('Tidak ada baris valid — periksa pemetaan nilai lokasi & jenis', 'warn');
        st.step = 2; draw();
      }
      if (e.target.closest('[data-savetpl]')) {
        const nama = $('[data-tplname]', el).value.trim(); if (!nama) return UI.toast('Isi nama templat', 'warn');
        await UI.run(e.target.closest('button'), () => API.call('data.save', { ent: 'templatImpor', row: { nama, jenis: 'GATE', pemetaan_json: JSON.stringify({ map: st.map, val: st.val }) } }), 'Templat disimpan');
      }
      if (e.target.closest('[data-simpan]')) {
        const tg = st.hasil.rekap.map((r) => r.tanggal_operasi).sort();
        const b64 = st.buf.byteLength < 9.5 * 1024 * 1024 ? await Files.toB64(st.file) : null;
        try {
          st.res = await UI.run(e.target.closest('button'), () => API.call('impor.gate', { meta: { nama_file: st.file.name, hash_file: st.hash, jumlah_baris: st.rows.length, periode_awal: tg[0], periode_akhir: tg[tg.length - 1], jenis: 'GATE' },
            rekap: st.hasil.rekap, okupansi: st.hasil.okupansi, file: b64 ? { data: b64, mime: st.file.type || 'text/csv' } : null }, { timeout: 180000 }), 'Impor tersimpan');
          st.step = 3; draw();
        } catch (x) { }
      }
    });
    draw();
  }
  function riwayatImpor(el) {
    el.innerHTML = UI.panel({ t: 'Riwayat Impor (gate & bank)', i: 'fa-clock-rotate-left', p0: true, body: '<div data-t></div>' });
    UI.entity($('[data-t]', el), 'imporBatch', { size: 15, rowCls: (r) => r.status === 'Dibatalkan' ? 'row-oranye' : '',
      cols: [{ k: 'id_batch', l: 'Batch' }, { k: 'waktu', l: 'Waktu', t: 'tglw' }, { k: 'jenis', l: 'Jenis' }, { k: 'nama_file', l: 'File' }, { k: 'periode_awal', l: 'Dari', t: 'tgl' }, { k: 'periode_akhir', l: 'Sampai', t: 'tgl' }, { k: 'jumlah_rekap', l: 'Rekap', t: 'n' }, { k: 'status', l: 'Status', t: 'badge' }, { k: 'oleh', l: 'Oleh' }],
      extraActions: (r) => can.role('SUPER_ADMIN') && r.status === 'Berhasil' && r.jenis !== 'BANK' && !S.viewAs ? UI.btnAct('rb', 'Rollback', 'merah', 'fa-rotate-left') : '',
      onAct: async (act, r, btn, load) => {
        if (act !== 'rb') return;
        const c = await UI.confirm({ title: 'Rollback ' + r.id_batch, msg: 'Semua rekap dari batch ini akan dihapus lunak. Tidak bisa untuk periode terkunci.', danger: true, ok: 'Rollback', input: { label: 'Alasan', req: true } });
        if (c) { await UI.run(btn, () => API.call('impor.rollback', { id_batch: r.id_batch, alasan: c.nilai }), (x) => x.dibatalkan + ' rekap dibatalkan'); load(true); }
      } });
  }

  // =====================================================================
  //  PARKIR GRATIS & ZONASI
  // =====================================================================
  SP.Pages.gratis = {
    title: 'Parkir Gratis & Zonasi', sub: 'Whitelist civitas/nakes, kuota darurat & pelanggaran zonasi (Pasal 11–12 PKS)',
    prefetch() { API.prefetch('gratis.ringkas', { periode: S.periode }); },
    render(el, p, ctx) {
      const tab = p.tab || 'whitelist';
      el.innerHTML = '<div data-k>' + UI.skKpi(4) + '</div><div data-tabs></div><div data-tb></div>';
      API.swr('gratis.ringkas', { periode: S.periode }, (g) => {
        if (!ctx.live()) return;
        const kat = g.per_kategori ? Object.keys(g.per_kategori).map((k) => k + ': ' + g.per_kategori[k]).join(' · ') : '';
        $('[data-k]', el).innerHTML = `<div class="row g-3"><div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(g.aktif) + '<small>nopol</small>', l: 'Total Whitelist Aktif', sub: kat, c: 'hijau', i: 'fa-id-card' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(g.trx_gratis) + '<small>trx</small>', l: 'Transaksi Gratis ' + fmt.per(S.periode), sub: 'Kontribusi DC ' + fmt.rp(g.dc_gratis) + ' (Pasal 16 ay. 3)', c: 'biru', i: 'fa-credit-card' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(g.pengajuan_menunggu) + '<small>pengajuan</small>', l: 'Menunggu Verifikasi', sub: g.kedaluwarsa_7hari + ' kedaluwarsa ≤ 7 hari', c: 'oranye', i: 'fa-hourglass-half' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(g.pelanggaran) + '<small>kasus</small>', l: 'Pelanggaran Zonasi', sub: 'Zona A ' + g.zonasi.mulai + '–' + g.zonasi.selesai + ' WIB', c: 'merah', i: 'fa-ban' })}</div></div>`;
        const tabs = [{ id: 'whitelist', t: 'Whitelist Penerima', i: 'fa-id-card' }, { id: 'pengajuan', t: 'Pengajuan RS', i: 'fa-inbox', cnt: g.pengajuan_menunggu || '' }, { id: 'pelanggaran', t: 'Pelanggaran & Darurat', i: 'fa-ban', cnt: g.pelanggaran || '' }, { id: 'aturan', t: 'Aturan Zonasi', i: 'fa-scale-balanced' }];
        $('[data-tabs]', el).innerHTML = UI.tabs(can.role('SUPERVISOR') ? tabs.filter((t) => t.id !== 'pengajuan') : tabs, tab);
        $$('[data-tab]', el).forEach((b) => b.onclick = () => Router.go('gratis', { tab: b.dataset.tab }));
        g._darurat = g.darurat_aktif; el._g = g;
        if (tab === 'pelanggaran') { const d = $('[data-darurat]', el); if (d) d.innerHTML = slotDarurat(g); }
      });
      const tb = $('[data-tb]', el);
      if (tab === 'pengajuan') return tabPengajuan(tb);
      if (tab === 'pelanggaran') return tabPelanggaran(tb, el);
      if (tab === 'aturan') return tabAturan(tb);
      tabWhitelist(tb);
    }
  };
  function tabWhitelist(el) {
    const isRS = can.role('RS_UMSIDA'), isAdm = can.role('ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs;
    el.innerHTML = UI.panel({ t: 'Daftar Penerima Fasilitas Parkir Gratis (Whitelist)', i: 'fa-id-card', p0: true, body: '<div data-t></div>' });
    const ent = UI.entity($('[data-t]', el), 'penerima', {
      save: 'gratis.save', add: isAdm, readonly: !isAdm, size: 15, addLabel: 'Tambah Penerima',
      tools: (isAdm ? '<button class="btn btn-sm btn-abu" data-massal><i class="fa-solid fa-file-excel"></i> Unggah Massal</button><button class="btn btn-sm btn-abu" data-wl><i class="fa-solid fa-file-export"></i> Ekspor Whitelist Gate/LPR (CSV)</button>' : '') + (isRS && !S.viewAs ? '<button class="btn btn-sm btn-hijau" data-ajukan-baru><i class="fa-solid fa-user-plus"></i> Ajukan Penerima Baru</button>' : ''),
      cols: [{ k: 'nama', l: 'Nama', f: (v, r) => `<b>${esc(v)}</b>${r.nik_nip ? `<div class="fs-11 muted">${esc(r.nik_nip)}</div>` : ''}` }, { k: 'kategori', l: 'Kategori', f: (v, r) => `<span class="tag">${esc(v)}</span>${r.unit ? `<div class="fs-11 muted">${esc(r.unit)}</div>` : ''}` },
        { k: 'nopol', l: 'Nopol', f: (v, r) => `<b class="tnum">${esc(v)}</b><div class="fs-11 muted">${esc(r.jenis_kendaraan || '')}</div>` }, { k: 'no_kartu_stiker', l: 'Kartu/Stiker' },
        { k: 'berlaku_sampai', l: 'Berlaku s.d.', f: (v) => { const s = v ? Math.round((Date.parse(v) - Date.parse(SP.today())) / 86400000) : null; return `${fmt.tgl(v)}<div class="fs-11 ${s !== null && s <= 7 ? 'text-merah fw-600' : 'muted'}">${s === null ? '' : s < 0 ? 'lewat' : 'sisa ' + s + ' hari'}</div>`; } }, { k: 'status', l: 'Status', t: 'badge' }],
      rowCls: (r) => r.status !== 'Aktif' ? 'row-oranye' : '',
      formFields: (f) => f.filter((x) => x.n !== 'sumber_pengajuan'),
      formNote: () => UI.callout('fa-circle-info', 'BR-19: masa berlaku otomatis — Karyawan/Dokter Tetap/Outsourcing 6 bulan sejak verifikasi; kategori Lainnya sampai akhir bulan. Satu identitas hanya satu kendaraan aktif.', 'biru'),
      extraActions: (r) => isRS && !S.viewAs ? UI.btnAct('aj:Ubah', '', 'oranye', 'fa-pen', 'Ajukan ubah') + UI.btnAct('aj:Perpanjang', '', 'hijau', 'fa-rotate', 'Ajukan perpanjang') + UI.btnAct('aj:Nonaktifkan', '', 'merah', 'fa-ban', 'Ajukan nonaktif') : '',
      onAct: (act, r) => { if (act.indexOf('aj:') === 0) ajukanRS(act.slice(3), r); }
    });
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-ajukan-baru]')) ajukanRS('Tambah', null);
      if (e.target.closest('[data-wl]')) { const rows = await UI.run(e.target.closest('button'), () => API.call('gratis.whitelist', {}, { keepCache: true })); Files.download(Files.csv(rows, ['nopol', 'no_kartu_stiker', 'nama', 'kategori', 'jenis_kendaraan', 'berlaku_sampai']), 'whitelist_parkir_gratis_' + SP.today() + '.csv', 'text/csv'); }
      if (e.target.closest('[data-massal]')) unggahMassal(() => ent.load(true));
    });
  }
  function ajukanRS(jenis, r) {
    const f = S.boot.ent.penerima.fields.filter((x) => !x.ro && ['status', 'tgl_verifikasi'].indexOf(x.n) === -1);
    const butuhData = jenis === 'Tambah' || jenis === 'Ubah';
    const m = UI.modal({ title: 'Ajukan ' + jenis + ' Penerima' + (r ? ' — ' + esc(r.nama) : ''), size: 'lg', static: true,
      body: (butuhData ? UI.form(f, r || {}) : `<p>Ajukan <b>${jenis.toLowerCase()}</b> untuk <b>${esc(r.nama)}</b> (${esc(r.nopol)})?</p>`) + '<label class="form-label mt-2">Catatan</label><textarea class="form-control" data-cat rows="2"></textarea>',
      foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-hijau" data-kirim><i class="fa-solid fa-paper-plane"></i> Kirim Pengajuan</button>' });
    m.$('[data-kirim]').onclick = async (e) => {
      const data = butuhData ? UI.readForm(m.el, f) : {};
      if (butuhData && jenis === 'Tambah' && !UI.validate(m.el, f, data)) return;
      try { await UI.run(e.currentTarget, () => API.call('gratis.ajukan', { jenis, id_penerima: r ? r.id_penerima : '', data, catatan: m.$('[data-cat]').value }), 'Pengajuan terkirim ke Pengelola'); m.close(); } catch (x) { }
    };
  }
  async function unggahMassal(done) {
    const file = await Files.pick('.xlsx,.xls,.csv'); if (!file) return;
    const X = await Lib.xlsx(); const wb = X.read(await file.arrayBuffer(), { type: 'array', raw: false });
    const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false, defval: '' }).map((r) => { const o = {}; Object.keys(r).forEach((k) => o[k.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')] = r[k]); return o; });
    const pv = await API.call('gratis.massal', { rows, pratinjau: true }, { keepCache: true });
    const m = UI.modal({ title: 'Unggah Massal Penerima — Pratinjau', size: 'lg', body: `<p>${pv.berhasil} baris valid, <b class="text-merah">${pv.gagal.length} bermasalah</b> dari ${rows.length}.</p>${pv.gagal.length ? `<div class="tbl-wrap" style="max-height:240px"><table class="tbl"><tbody>${pv.gagal.map((g) => `<tr><td>Baris ${g.baris}</td><td>${esc(g.pesan)}</td></tr>`).join('')}</tbody></table></div>` : ''}<div class="form-text">Kolom yang dibaca: nama, nik_nip, kategori, unit, nopol, jenis_kendaraan, no_kartu_stiker, tgl_verifikasi.</div>`,
      foot: `<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-hijau" data-go ${pv.berhasil ? '' : 'disabled'}>Simpan ${pv.berhasil} baris valid</button>` });
    m.$('[data-go]').onclick = async (e) => { const ok = rows.filter((_, i) => !pv.gagal.some((g) => g.baris === i + 2)); const r = await UI.run(e.currentTarget, () => API.call('gratis.massal', { rows: ok }), (x) => x.berhasil + ' penerima tersimpan'); m.close(); done && done(r); };
  }
  function tabPengajuan(el) {
    el.innerHTML = UI.panel({ t: 'Pengajuan Perubahan dari RS UMSIDA', i: 'fa-inbox', p0: true, body: '<div data-t></div>' });
    UI.entity($('[data-t]', el), 'pengajuan', { size: 15,
      cols: [{ k: 'id', l: 'ID' }, { k: 'waktu', l: 'Waktu', t: 'tglw' }, { k: 'jenis', l: 'Jenis', t: 'badge' }, { k: 'data_json', l: 'Data', f: (v, r) => { try { const d = JSON.parse(v || '{}'); return esc([d.nama, d.nopol, d.kategori].filter(Boolean).join(' · ') || r.id_penerima); } catch (e) { return ''; } } }, { k: 'diajukan_oleh', l: 'Oleh' }, { k: 'status', l: 'Status', t: 'badge' }, { k: 'catatan', l: 'Catatan' }],
      extraActions: (r) => r.status === 'Menunggu' && can.role('ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs ? UI.btnAct('ok', 'Setujui', 'hijau', 'fa-check') + UI.btnAct('no', 'Tolak', 'merah', 'fa-xmark') : '',
      onAct: async (act, r, btn, load) => {
        const c = await UI.confirm({ title: (act === 'ok' ? 'Setujui' : 'Tolak') + ' pengajuan ' + r.id, msg: 'Jenis: <b>' + esc(r.jenis) + '</b>', danger: act === 'no', input: { label: 'Catatan', req: act === 'no' } });
        if (c) { await UI.run(btn, () => API.call('gratis.proses', { id: r.id, setuju: act === 'ok', catatan: c.nilai }), 'Pengajuan diproses'); load(true); }
      } });
  }
  function slotDarurat(g) {
    const n = g.darurat_maks || 2, a = g.darurat_aktif || [];
    return `<div class="row g-2">${Array.from({ length: n }, (_, i) => { const x = a[i]; return `<div class="col-md-6"><div class="slot ${x ? 'isi' : 'kosong'}"><div class="d-flex justify-content-between"><b class="fs-12">SLOT DARURAT ${i + 1} ${x ? '(TERPAKAI)' : '(KOSONG)'}</b>${x ? '<span class="badge-s s-merah">ON-CALL</span>' : '<span class="badge-s s-hijau">STANDBY</span>'}</div>
      ${x ? `<div class="fs-5 fw-bold mt-1">${esc(x.nopol)}</div><div class="fs-12">${esc(x.deskripsi || '')}</div><div class="fs-11 muted mt-1">Otorisasi: ${esc(x.pejabat_penyetuju)} · Masuk ${fmt.tglw(x.waktu)}</div>${can.role('SUPERVISOR', 'ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs ? `<button class="btn btn-xs btn-garis mt-2" data-keluar="${esc(x.id_kejadian)}">Catat keluar</button>` : ''}` : '<div class="fs-12 muted mt-2">Slot tersedia untuk kendaraan medis darurat/on-call dengan otorisasi tertulis pejabat RS.</div>'}</div></div>`; }).join('')}</div>`;
  }
  function tabPelanggaran(el, root) {
    const bisa = can.role('SUPERVISOR', 'ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs;
    el.innerHTML = `<div class="row g-3"><div class="col-lg-7">${UI.panel({ t: 'Monitor Kuota Pengecualian Darurat Zona A', i: 'fa-truck-medical', c: 'merah', tools: '<span class="badge-s s-merah">BR-18</span>', body: '<div data-darurat><div class="sk box"></div></div>' + (bisa ? '<button class="btn btn-sm btn-merah mt-2" data-catat="Pengecualian Darurat"><i class="fa-solid fa-plus"></i> Input otorisasi darurat</button>' : '') })}</div>
      <div class="col-lg-5">${UI.panel({ t: 'Ketentuan Zonasi', i: 'fa-scale-balanced', c: 'biru', body: aturanRingkas() })}</div></div>
      ${can.role('SUPERVISOR') ? (bisa ? '<button class="btn btn-merah mb-3" data-catat="Pelanggaran Zonasi"><i class="fa-solid fa-plus"></i> Catat pelanggaran zonasi</button>' : '') : UI.panel({ t: 'Rekap Pelanggaran Zonasi per Penerima — ' + fmt.per(S.periode), i: 'fa-ban', c: 'merah', p0: true, tools: bisa ? '<button class="btn btn-sm btn-merah" data-catat="Pelanggaran Zonasi"><i class="fa-solid fa-plus"></i> Catat pelanggaran</button>' : '', body: '<div data-rk></div>', foot: '<span>Bahan penegakan disiplin oleh RS (Pasal 12 ayat 6)</span>' })}
      ${UI.panel({ t: 'Log Pelanggaran & Darurat', i: 'fa-list', p0: true, body: '<div data-log></div>' })}`;
    if (root._g) $('[data-darurat]', el).innerHTML = slotDarurat(root._g);
    if (!can.role('SUPERVISOR')) API.swr('gratis.rekapPelanggaran', { periode: S.periode }, (d) => {
      const rk = $('[data-rk]', el); if (!rk) return;
      UI.table(rk, { key: 'nopol', rows: d.rekap, excel: 'Rekap_Pelanggaran_' + S.periode, cols: [{ k: 'nama', l: 'Nama' }, { k: 'nopol', l: 'Nopol' }, { k: 'kategori', l: 'Kategori' }, { k: 'unit', l: 'Unit' }, { k: 'jumlah', l: 'Pelanggaran', t: 'n', sum: true }, { k: 'total_menit', l: 'Durasi (menit)', t: 'n', sum: true }, { k: 'total_tarif', l: 'Tarif ditagih', t: 'rp', sum: true }] });
    }, { onError: (e) => { const rk = $('[data-rk]', el); if (rk) rk.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
    const logEnt = UI.entity($('[data-log]', el), 'kejadian', { add: false, edit: false, del: false, size: 10, params: () => ({ periode: S.periode, lokasi: S.lokasi }),
      rowFilter: (r) => r.jenis === 'Pelanggaran Zonasi' || r.jenis === 'Pengecualian Darurat', cols: [{ k: 'waktu', l: 'Waktu', t: 'tglw' }, { k: 'jenis', l: 'Jenis', f: (v) => UI.badge(v, v === 'Pelanggaran Zonasi' ? 'merah' : 'ungu') }, { k: 'id_lokasi', l: 'Lokasi' }, { k: 'nopol', l: 'Nopol' }, { k: 'durasi_menit', l: 'Durasi', t: 'n' }, { k: 'nilai', l: 'Tarif', t: 'rp' }, { k: 'pejabat_penyetuju', l: 'Otorisasi' }, { k: 'status', l: 'Status', t: 'badge' }] });
    el.addEventListener('click', (e) => {
      const c = e.target.closest('[data-catat]'), k = e.target.closest('[data-keluar]');
      if (c) formKejadian(c.dataset.catat, null, () => SP.App.render());
      if (k) { const x = (root._g.darurat_aktif || []).find((d) => d.id_kejadian === k.dataset.keluar); formKejadian('Pengecualian Darurat', Object.assign({}, x, { waktu_selesai: nowLocal() }), () => SP.App.render()); }
    });
  }
  function aturanRingkas() {
    const s = S.boot.set;
    return `<div class="mini l-hijau mb-2"><b class="text-hijau fs-12">LAHAN PARKIR SEMENTARA</b> <span class="badge-s s-hijau">GRATIS 24 JAM</span><div class="fs-12">Gratis bagi penerima fasilitas (civitas, nakes, outsourcing ber-stiker/RFID aktif).</div></div>
      <div class="mini l-merah mb-2"><b class="text-merah fs-12">ZONA A</b> <span class="badge-s s-merah">TERBATAS</span><div class="fs-12">Pukul ${esc(s.ZONASI_JAM_MULAI || '07:30')}–${esc(s.ZONASI_JAM_SELESAI || '17:30')} berlaku <b>tarif umum</b> bagi penerima gratis; gratis di luar rentang itu (BR-17).</div></div>
      <div class="mini l-oranye mb-2"><b class="fs-12">PENGECUALIAN DARURAT</b> <span class="badge-s s-oranye">MAKS ${esc(s.DARURAT_MAKS || 2)}</span><div class="fs-12">Maksimal ${esc(s.DARURAT_MAKS || 2)} kendaraan bersamaan dengan nama pejabat penyetuju (BR-18).</div></div>
      <div class="mini l-biru"><b class="fs-12">MASA BERLAKU (BR-19)</b><div class="fs-12">Karyawan/Dokter Tetap/Outsourcing 6 bulan sejak verifikasi; kategori lain sampai akhir bulan; otomatis kedaluwarsa.</div></div>`;
  }
  function tabAturan(el) { el.innerHTML = `<div class="row g-3"><div class="col-lg-6">${UI.panel({ t: 'Ketentuan Zonasi PKS', i: 'fa-scale-balanced', body: aturanRingkas() })}</div><div class="col-lg-6">${UI.panel({ t: 'Kendaraan Kedaruratan', i: 'fa-truck-medical', c: 'merah', body: '<p class="fs-13">Ambulans, pemadam kebakaran, dan kendaraan evakuasi dicatat jumlahnya saja — tanpa tarif dan tanpa kontribusi Dana Cadangan (BR-06, Pasal 3 ayat 4).</p><p class="fs-13 mb-0">Transaksi gratis (termasuk pengecualian darurat) tidak masuk PPK/PNBH, namun menjadi dasar Kontribusi Dana Cadangan Transaksi Gratis Rp' + esc(S.boot.set.DC_PER_TRX || 500) + '/trx yang dibebankan ke bagian RS.</p>' })}</div></div>`; }

  // form kejadian (dipakai Gratis & SLA)
  function formKejadian(jenis, r, done) {
    const all = S.boot.ent.kejadian.fields.filter((f) => !f.ro);
    const pakai = { 'Pelanggaran Zonasi': ['waktu', 'waktu_selesai', 'id_lokasi', 'nopol', 'nilai', 'deskripsi', 'foto'], 'Pengecualian Darurat': ['waktu', 'waktu_selesai', 'id_lokasi', 'nopol', 'pejabat_penyetuju', 'deskripsi'] }[jenis];
    const f = pakai ? all.filter((x) => pakai.indexOf(x.n) > -1) : all.filter((x) => x.n !== 'id_penerima');
    if (jenis === 'Pengecualian Darurat') f.forEach((x) => { if (x.n === 'pejabat_penyetuju') x.req = true; });
    const vals = Object.assign({ waktu: nowLocal(), id_lokasi: (lokasiSaya()[0] || {}).id_lokasi, jenis: jenis || '' }, r || {});
    const m = UI.modal({ title: (r && r.id_kejadian ? 'Ubah ' : 'Catat ') + esc(jenis || 'Kejadian'), size: 'lg', static: true,
      body: (jenis === 'Pengecualian Darurat' ? UI.callout('fa-truck-medical', 'BR-18: maksimal ' + esc(S.boot.set.DARURAT_MAKS || 2) + ' kendaraan pada waktu bersamaan; entri ke-3 yang tumpang tindih ditolak sistem.', 'merah') : '') +
        (jenis === 'Pelanggaran Zonasi' ? UI.callout('fa-circle-info', 'Durasi dihitung otomatis hanya pada rentang ' + esc(S.boot.set.ZONASI_JAM_MULAI || '07:30') + '–' + esc(S.boot.set.ZONASI_JAM_SELESAI || '17:30') + '. Nopol dicocokkan dengan whitelist.', 'biru') : '') + UI.form(f, vals, { fileKat: 'kejadian' }),
      foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-biru" data-save>Simpan</button>' });
    UI.bindForm(m.el);
    m.$('[data-save]').onclick = async (e) => {
      const d = UI.readForm(m.el, f); if (!UI.validate(m.el, f, d)) return;
      d.jenis = jenis || d.jenis; if (r && r.id_kejadian) d.id_kejadian = r.id_kejadian;
      try { await UI.run(e.currentTarget, () => API.call('kejadian.save', { row: d }), 'Kejadian tercatat'); m.close(); SP.Cache.drop('gratis.'); SP.Cache.drop('data.list|'); done && done(); } catch (x) { }
    };
  }
  SP.formKejadian = formKejadian;

  // =====================================================================
  //  OPERASIONAL & SLA
  // =====================================================================
  SP.Pages.sla = {
    title: 'Operasional & SLA', sub: 'Log kejadian, skor SLA triwulan & peta jam sibuk (Pasal 19 PKS)',
    render(el, p, ctx) {
      const th = S.periode.slice(0, 4), tw = Number(p.tw) || Math.ceil(Number(S.periode.slice(5, 7)) / 3), isSpv = can.role('SUPERVISOR');
      el.innerHTML = `${isSpv ? '' : `<div class="d-flex gap-2 align-items-center mb-3"><span class="fw-600">Triwulan:</span>${[1, 2, 3, 4].map((q) => `<a class="btn btn-sm ${q === tw ? 'btn-hijau' : 'btn-abu'}" href="#/sla?tw=${q}">TW ${q} ${th}</a>`).join('')}</div><div data-sla>${UI.skKpi(4)}</div>`}
        ${UI.panel({ t: 'Log Kejadian Lapangan — ' + fmt.per(S.periode), i: 'fa-triangle-exclamation', c: 'oranye', p0: true, body: '<div data-log></div>' })}
        <div class="row g-3"><div class="col-lg-7">${UI.panel({ t: 'Peta Jam Sibuk (dasar penyesuaian petugas — Pasal 6 ay. 4)', i: 'fa-table-cells', c: 'aqua', body: '<div data-hm><div class="sk box"></div></div>' })}</div>
        <div class="col-lg-5">${UI.panel({ t: 'Okupansi Lahan Parkir Sementara per Hari', i: 'fa-square-parking', c: 'aqua', body: '<div style="height:240px"><canvas data-lps></canvas></div>' })}</div></div>`;
      if (!isSpv) API.swr('sla.ringkas', { tahun: th, triwulan: tw, lokasi: S.lokasi }, (d) => {
        const b = $('[data-sla]', el); if (!b || !ctx.live()) return;
        const sel = d.per_jenis.filter((x) => x.selesai);
        b.innerHTML = `<div class="row g-3"><div class="col-md-6 col-xl-3">${UI.kpi({ v: d.skor === null ? '—' : fmt.pct(d.skor, 1), l: 'Skor SLA TW ' + d.triwulan + ' ' + d.tahun, c: 'hijau', i: 'fa-stopwatch' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(d.terbuka.length), l: 'Kejadian Masih Terbuka', c: d.terbuka.length ? 'oranye' : 'hijau', i: 'fa-folder-open' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(d.per_jenis.reduce((a, x) => a + x.jumlah, 0)), l: 'Total Kejadian Ber-SLA', c: 'biru', i: 'fa-list-check' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: sel.length ? fmt.n(Math.round(sel.reduce((a, x) => a + x.rata_menit, 0) / sel.length)) + '<small>menit</small>' : '—', l: 'Rata-rata Waktu Respons', c: 'aqua', i: 'fa-hourglass-half' })}</div></div>
          ${UI.panel({ t: 'Capaian SLA per Jenis Kejadian', i: 'fa-chart-simple', p0: true, body: `<table class="tbl"><thead><tr><th>Jenis</th><th class="num">Kejadian</th><th class="num">Selesai</th><th class="num">Tepat waktu</th><th class="num">Target</th><th class="num">Capaian</th><th>Status</th></tr></thead><tbody>${d.per_jenis.map((x) => `<tr><td>${esc(x.jenis)}</td><td class="num">${x.jumlah}</td><td class="num">${x.selesai}</td><td class="num">${x.tepat_waktu}</td><td class="num">${x.target_menit ? x.target_menit + ' mnt / ' + (x.target_persen || 0) + '%' : '<span class="muted">belum diatur</span>'}</td><td class="num">${x.persen === null ? '—' : fmt.pct(x.persen, 1)}</td><td>${x.memenuhi === null ? '<span class="muted">—</span>' : x.memenuhi ? UI.badge('Memenuhi', 'hijau') : UI.badge('Di bawah target', 'merah')}</td></tr>`).join('')}</tbody></table>`, foot: '<span>Target SLA diatur di Pengaturan → Target SLA (Lampiran SLA)</span>' })}`;
      });
      const bisa = can.role('SUPERVISOR', 'ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs;
      const ent = UI.entity($('[data-log]', el), 'kejadian', { add: false, del: false, size: 10, params: () => ({ periode: S.periode, lokasi: S.lokasi }),
        tools: bisa ? '<button class="btn btn-sm btn-hijau" data-baru><i class="fa-solid fa-plus"></i> Catat Kejadian</button>' : '',
        cols: [{ k: 'waktu', l: 'Waktu', t: 'tglw' }, { k: 'id_lokasi', l: 'Lokasi' }, { k: 'jenis', l: 'Jenis', f: (v) => UI.badge(v, v === 'Keamanan' || v === 'Pelanggaran Zonasi' ? 'merah' : v === 'Gangguan Gate' || v === 'Gangguan Sistem' ? 'oranye' : 'biru') }, { k: 'deskripsi', l: 'Deskripsi', t: 'textarea' }, { k: 'durasi_menit', l: 'Respons (mnt)', t: 'n' }, { k: 'status', l: 'Status', t: 'badge' }],
        edit: false, extraActions: (r) => bisa ? UI.btnAct('ubah', '', 'oranye', 'fa-pen', 'Ubah / tutup') : '',
        onAct: (act, r) => { if (act === 'ubah') formKejadian(r.jenis, Object.assign({}, r, r.waktu_selesai ? {} : { waktu_selesai: nowLocal(), status: 'Selesai' }), () => ent.load(true)); } });
      el.addEventListener('click', (e) => { if (e.target.closest('[data-baru]')) formKejadian('', null, () => ent && ent.load(true)); });
      if (p.catat && bisa) setTimeout(() => formKejadian('', null, () => ent && ent.load(true)), 50);
      API.swr('okupansi.heatmap', { periode: S.periode, lokasi: S.lokasi }, (h) => { const b = $('[data-hm]', el); if (b) b.innerHTML = UI.heatmap(h.grid, h.satuan); });
      API.swr('okupansi.heatmap', { periode: S.periode, lokasi: 'LPS' }, (h) => {
        UI.chart($('[data-lps]', el), { type: 'line', data: { labels: h.harian.map((x) => x.tanggal.slice(8)), datasets: [{ label: h.kapasitas ? 'Okupansi puncak (%)' : 'Kendaraan puncak', data: h.harian.map((x) => h.kapasitas ? x.persen : x.puncak), borderColor: '#00839e', backgroundColor: 'rgba(0,192,239,.15)', fill: true, tension: .25 }] }, options: { scales: { y: { beginAtZero: true } } } });
      });
    }
  };
})();
