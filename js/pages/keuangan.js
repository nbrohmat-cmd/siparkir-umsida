/* Keuangan: Verifikasi Setoran (F-05), Pendapatan Lain (F-06), Pengeluaran & Laba-Rugi (F-07), Kas & Bank (F-08), PBJT (F-10) */
(function () {
  'use strict';
  const { $, $$, esc, fmt, S, API, can, namaLokasi, namaShift, Files, Lib, Router, BLN3 } = SP;

  // =====================================================================
  //  VERIFIKASI SETORAN — pencocokan 3 arah: fisik kasir vs impor gate vs mutasi bank
  // =====================================================================
  /** Rincian setoran operator per pos yang tergabung ke rekap (untuk verifikasi Admin) */
  function setoranOpr(list, r) {
    if (!list || !list.length) return '';
    const dih = list.filter((x) => x.status === 'Diterima' || (x.status === 'Direkap' && (!x.id_rekap || x.id_rekap === r.id_rekap)));
    const sum = (k) => dih.reduce((a, x) => a + (Number(x[k]) || 0), 0), tot = sum('total_diterima');
    return `<div class="fw-700 mb-1 mt-3"><i class="fa-solid fa-hand-holding-dollar text-hijau"></i> RINCIAN SETORAN OPERATOR PER POS (${list.length})</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Operator · pos</th><th class="num">Trx</th><th class="num">Total</th><th class="num">Tunai</th><th class="num">QRIS</th><th class="num">Diserahkan</th><th>Status</th></tr></thead><tbody>
      ${list.map((x) => `<tr><td><b>${esc(x.nama_operator)}</b> <span class="muted fs-12">${esc(x.pos || '-')}</span>${x.catatan ? `<div class="fs-11"><i class="fa-solid fa-comment muted"></i> ${esc(x.catatan)}</div>` : ''}</td><td class="num">${fmt.n(x.trx_berbayar)}</td><td class="num">${fmt.rp(x.total_diterima)}</td><td class="num">${fmt.rp(x.tunai)}</td><td class="num">${fmt.rp(x.qris)}</td><td class="num ${x.selisih_kas ? 'text-merah fw-600' : ''}">${fmt.rp(x.tunai_disetor)}</td><td>${UI.badge(x.status)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td>Jumlah dihitung (${dih.length})</td><td class="num">${fmt.n(sum('trx_berbayar'))}</td><td class="num">${fmt.rp(tot)}</td><td class="num">${fmt.rp(sum('tunai'))}</td><td class="num">${fmt.rp(sum('qris'))}</td><td class="num">${fmt.rp(sum('tunai_disetor'))}</td>
      <td>${tot === Number(r.total_diterima) ? '<span class="text-hijau fw-600"><i class="fa-solid fa-check"></i> = rekap</span>' : `<span class="text-merah fw-600"><i class="fa-solid fa-triangle-exclamation"></i> ${fmt.rp(Number(r.total_diterima) - tot)}</span>`}</td></tr></tfoot></table></div>`;
  }

  SP.Pages.verifikasi = {
    title: 'Verifikasi Setoran Shift', sub: 'Pencocokan 3 arah: fisik kasir vs gate elektronik vs mutasi bank',
    prefetch() { API.prefetch('rekap.antrean', { lokasi: S.lokasi, periode: S.periode }); },
    render(el, p, ctx) {
      let pilih = p.id || '', data = null;
      el.innerHTML = `<div data-k>${UI.skKpi(4)}</div>
        <div class="panel p-polos"><div class="panel-b d-flex gap-2 flex-wrap align-items-center"><select class="form-select form-select-sm" style="max-width:230px" data-fs><option value="">Semua menunggu</option><option value="cocok">Hanya yang cocok</option><option value="selisih">Ada selisih</option></select>
          <input class="form-control form-control-sm" style="max-width:280px" placeholder="Cari no. rekap / lokasi / petugas…" data-fq><div class="flex-fill"></div>
          ${can.role('ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs ? '<button class="btn btn-sm btn-hijau" data-bulk><i class="fa-solid fa-check-double"></i> Verifikasi Semua yang Cocok</button>' : ''}<button class="btn btn-sm btn-abu" data-rl><i class="fa-solid fa-rotate"></i></button></div></div>
        <div class="row g-3"><div class="col-lg-4">${UI.panel({ t: 'Antrean Rekap Shift', i: 'fa-inbox', c: 'oranye', p0: true, body: '<div class="list-x" data-list><div class="p-3"><div class="sk line"></div><div class="sk line"></div></div></div>' })}</div>
        <div class="col-lg-8" data-detail>${UI.panel({ t: 'Detail Rekap', i: 'fa-magnifying-glass', body: UI.empty('Pilih rekap dari antrean untuk diverifikasi') })}</div></div>`;
      const cocok = (r) => !r.flag_selisih && Number(r.selisih_kas) === 0;
      function list() {
        if (!data) return;
        const fs = $('[data-fs]', el).value, q = $('[data-fq]', el).value.toLowerCase();
        const rows = data.antrean.filter((r) => (!fs || (fs === 'cocok' ? cocok(r) : !cocok(r))) && (!q || JSON.stringify(r).toLowerCase().indexOf(q) > -1));
        $('[data-list]', el).innerHTML = rows.length ? rows.map((r) => `<div class="it click ${r.id_rekap === pilih ? 'on' : ''}" data-id="${esc(r.id_rekap)}"><i class="fa-solid ${cocok(r) ? 'fa-circle-check text-hijau' : 'fa-circle-exclamation text-merah'} mt-1"></i>
          <div class="flex-fill"><div class="d-flex justify-content-between gap-2"><b class="fs-13">${esc(namaShift(r.id_shift))} — ${fmt.tgl(r.tanggal_operasi)}</b>${cocok(r) ? UI.badge('Cocok', 'hijau') : UI.badge(r.flag_selisih ? 'Selisih impor' : 'Selisih kas ' + fmt.rp(r.selisih_kas), 'merah')}</div>
          <div class="fs-12 muted">${esc(namaLokasi(r.id_lokasi))} · ${esc(r.sumber)} · ${esc(r.petugas || r.dibuat_oleh)}</div><div class="d-flex justify-content-between fs-12"><span class="muted">Diajukan ${fmt.jam(r.dibuat_pada)}</span><b>${fmt.rp(r.total_diterima)}</b></div></div></div>`).join('')
          : `<div class="p-3">${UI.empty('Tidak ada rekap menunggu verifikasi 🎉')}</div>`;
      }
      function load(force) {
        if (force) SP.Cache.drop('rekap.antrean');
        return API.swr('rekap.antrean', { lokasi: S.lokasi, periode: S.periode }, (d) => {
          if (!ctx.live()) return; data = d; const k = d.kpi;
          $('[data-k]', el).innerHTML = `<div class="row g-3"><div class="col-md-6 col-xl-3">${UI.kpi({ v: k.menunggu + '<small>shift</small>', l: 'Menunggu Verifikasi', sub: 'Nominal ' + fmt.rp(k.nominal_menunggu), c: 'oranye', i: 'fa-hourglass-half' })}</div>
            <div class="col-md-6 col-xl-3">${UI.kpi({ v: k.terverifikasi_hari_ini + '<small>shift</small>', l: 'Terverifikasi Hari Ini', sub: 'Total ' + fmt.rp(k.nominal_terverifikasi), c: 'hijau', i: 'fa-circle-check' })}</div>
            <div class="col-md-6 col-xl-3">${UI.kpi({ v: k.selisih + '<small>shift</small>', l: 'Selisih Terdeteksi', sub: 'Deviasi bersih ' + fmt.rp(k.nilai_selisih), c: 'merah', i: 'fa-triangle-exclamation' })}</div>
            <div class="col-md-6 col-xl-3">${UI.kpi({ v: k.persen_bank_cocok === null ? '—' : fmt.pct(k.persen_bank_cocok, 1), l: 'Selesai Kliring Bank', sub: 'Mutasi rekening operasional ' + fmt.per(S.periode), c: 'biru', i: 'fa-building-columns', href: '#/kasbank', foot: 'Log mutasi' })}</div></div>`;
          list();
          if (!pilih && d.antrean.length && window.innerWidth >= 992) { pilih = d.antrean[0].id_rekap; list(); detail(); }
        }, { ttl: force ? 0 : 10000, onError: (e) => { $('[data-k]', el).innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
      }
      async function detail() {
        const box = $('[data-detail]', el);
        box.innerHTML = UI.skBox(1);
        if (window.innerWidth < 992) box.scrollIntoView({ behavior: 'smooth' });
        let d;
        try { d = await API.get('rekap.detailVerif', { id: pilih }, { ttl: 5000 }); } catch (e) { box.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); return; }
        if (!ctx.live()) return;
        const r = d.rekap, man = d.manual || {}, imp = d.impor || {}, b = d.bank;
        const st = (a, b2) => (b2 === null || b2 === undefined) ? '<span class="muted">—</span>' : Number(a) === Number(b2) ? '<span class="text-hijau fw-600"><i class="fa-solid fa-check"></i> Cocok</span>' : `<span class="text-merah fw-600"><i class="fa-solid fa-triangle-exclamation"></i> ${fmt.rp(Number(b2) - Number(a))}</span>`;
        const brs = [['Pendapatan parkir tunai', 'tunai', b.setoran_tunai, 'tunai_disetor'], ['Transaksi QRIS (non-tunai)', 'qris', b.settlement_qris], ['Parkir reguler', 'pend_parkir'], ['Menginap (> 24 jam)', 'pend_menginap'], ['Denda tiket hilang', 'denda_tiket_hilang'], ['Tarif sanksi zonasi', 'pend_tarif_zonasi'], ['Refund / koreksi', 'refund_nilai']];
        const v = (o, k) => (o && o[k] !== undefined ? fmt.rp(o[k]) : '<span class="muted">—</span>');
        const bisa = can.role('ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs && r.status === 'Diajukan';
        box.innerHTML = UI.panel({ t: `Detail Rekap: <span class="text-hijau">${esc(r.id_rekap)}</span>`, i: 'fa-right-left', tools: UI.badge(r.status === 'Diajukan' ? 'Menunggu' : r.status),
          body: `<div class="row g-2 fs-13 mb-2"><div class="col-md-4"><span class="muted">Supervisor lapangan</span><div class="fw-600">${esc(d.supervisor)}</div></div><div class="col-md-4"><span class="muted">Lokasi · shift</span><div class="fw-600">${esc(namaLokasi(r.id_lokasi))} · ${esc(d.shift.nama || r.id_shift)} (${esc(d.shift.jam_mulai || '')}–${esc(d.shift.jam_selesai || '')})</div></div><div class="col-md-4"><span class="muted">Diajukan</span><div class="fw-600">${fmt.tglw(r.dibuat_pada)}</div></div></div>
            <div class="fw-700 mb-1 mt-2"><i class="fa-solid fa-table-columns text-hijau"></i> PENCOCOKAN 3-ARAH: FISIK KASIR VS IMPOR GATE VS MUTASI BANK</div>
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Komponen</th><th class="num">Input fisik (kasir)</th><th class="num">Impor gate (POS)</th><th class="num">Mutasi bank</th><th>Status audit</th></tr></thead><tbody>
            ${brs.map((x) => `<tr><td>${x[0]}</td><td class="num">${v(man, x[3] || x[1])}</td><td class="num">${v(imp, x[1])}</td><td class="num">${x[2] !== undefined ? fmt.rp(x[2]) : '<span class="muted">—</span>'}</td><td>${x[2] !== undefined && d.manual ? st(man[x[3] || x[1]], x[2] || null) : (d.manual && d.impor ? st(man[x[1]], imp[x[1]]) : '<span class="muted">—</span>')}</td></tr>`).join('')}
            </tbody><tfoot><tr><td>TOTAL PENDAPATAN (PPK SHIFT)</td><td class="num">${v(man, 'total_diterima')}</td><td class="num">${v(imp, 'total_diterima')}</td><td class="num">${fmt.rp(b.setoran_tunai + b.settlement_qris)}</td><td>${d.manual && d.impor ? st(man.total_diterima, imp.total_diterima) : ''}</td></tr></tfoot></table></div>
            ${setoranOpr(d.setoran, r)}
            ${r.selisih_kas ? UI.callout('fa-scale-unbalanced', `<b>Selisih kas fisik: ${fmt.rp(r.selisih_kas)}</b> (disetor ${fmt.rp(r.tunai_disetor)} vs tunai − refund ${fmt.rp(r.tunai - r.refund_nilai)})`, 'merah') : ''}
            ${r.flag_selisih ? UI.callout('fa-flag', `<b>Flag selisih manual vs impor: ${fmt.rp(r.selisih_impor)}</b>. Wajib diberi catatan verifikator.`, 'merah') : ''}
            <div class="row g-3 mt-1"><div class="col-md-6"><div class="mini"><div class="lb mb-2">Bukti fisik & setoran</div>${r.foto_bukti ? `<div data-foto class="text-center"><div class="sk" style="height:140px"></div></div>` : '<span class="muted fs-13">Tidak ada foto (tanpa uang tunai)</span>'}
              ${r.catatan ? `<div class="callout mt-2 mb-0" style="box-shadow:none"><i class="fa-solid fa-comment"></i><div class="fs-12"><b>Catatan supervisor:</b> <i>"${esc(r.catatan)}"</i></div></div>` : ''}</div></div>
              <div class="col-md-6"><div class="mini"><div class="lb mb-2">Validasi volume vs gate</div><div class="row g-2 text-center"><div class="col-6"><div class="fs-11 muted">MASUK</div><div class="fs-4 fw-bold">${fmt.n((man.masuk_mobil || 0) + (man.masuk_motor || 0))}</div><div class="fs-11 text-hijau">Gate: ${d.impor ? fmt.n(imp.masuk_mobil + imp.masuk_motor) : '—'}</div></div>
              <div class="col-6"><div class="fs-11 muted">KELUAR</div><div class="fs-4 fw-bold">${fmt.n((man.keluar_mobil || 0) + (man.keluar_motor || 0))}</div><div class="fs-11 text-hijau">Gate: ${d.impor ? fmt.n(imp.keluar_mobil + imp.keluar_motor) : '—'}</div></div></div>
              <hr class="my-2"><div class="fs-12"><b>Parkir bebas civitas/nakes:</b> ${fmt.n(r.trx_gratis)} kendaraan · whitelist aktif ${fmt.n(d.penerima_aktif)}</div>
              <div class="fs-12"><b>Pengecualian darurat:</b> ${fmt.n(r.trx_darurat)} kendaraan${d.darurat.length ? ' — ' + d.darurat.map((x) => esc(x.nopol) + ' (' + esc(x.pejabat_penyetuju) + ')').join(', ') : ''}</div></div></div></div>
            ${bisa ? `<label class="form-label mt-3">Catatan audit internal (Admin Keuangan) ${r.flag_selisih ? '<span class="req">*</span>' : ''}</label><textarea class="form-control" rows="2" data-cat placeholder="Tersimpan di log permanen"></textarea>
            <label class="form-check mt-2"><input type="checkbox" class="form-check-input" data-sah> <span class="form-check-label fs-13"><b>Pernyataan auditor:</b> saya telah memvalidasi bukti fisik setoran kasir, data gate, dan mutasi bank sesuai PKS Pasal 9 ayat (7).</span></label>
            <div class="d-flex gap-2 justify-content-end flex-wrap mt-3"><button class="btn btn-merah" data-tolak><i class="fa-solid fa-circle-xmark"></i> Tolak Rekap</button><button class="btn btn-hijau" data-ok><i class="fa-solid fa-shield-halved"></i> Verifikasi & Setujui</button></div>` : ''}` });
        if (r.foto_bukti) API.get('file.get', { id: r.foto_bukti }, { ttl: 600000 }).then((f) => { const fb = $('[data-foto]', box); if (fb) fb.innerHTML = f.data ? `<img src="data:${f.mime};base64,${f.data}" style="max-width:100%;max-height:220px;border-radius:3px;cursor:zoom-in" data-zoom="${esc(r.foto_bukti)}" alt="Bukti setoran"><div class="fs-11 muted">${esc(f.nama)}</div>` : esc(f.nama); }).catch(() => { const fb = $('[data-foto]', box); if (fb) fb.innerHTML = '<span class="muted fs-12">Foto tidak dapat dimuat</span>'; });
        box.onclick = async (e) => {
          if (e.target.closest('[data-zoom]')) UI.viewFile(e.target.closest('[data-zoom]').dataset.zoom);
          const ok = e.target.closest('[data-ok]'), tl = e.target.closest('[data-tolak]');
          if (ok) {
            if (!$('[data-sah]', box).checked) return UI.toast('Centang pernyataan auditor terlebih dahulu', 'warn');
            const cat = $('[data-cat]', box).value.trim(); if (r.flag_selisih && !cat) return UI.toast('Rekap ber-flag selisih wajib diberi catatan', 'warn');
            const res = await UI.run(ok, () => API.call('rekap.verifikasi', { ids: [r.id_rekap], keputusan: 'Diverifikasi', catatan: cat }));
            if (res.dilewati.length) UI.toast(res.dilewati.join('; '), 'warn'); else UI.toast('Rekap terverifikasi');
            next();
          }
          if (tl) {
            const c = await UI.confirm({ title: 'Tolak rekap ' + r.id_rekap, msg: 'Rekap dikembalikan ke supervisor untuk diperbaiki (notifikasi otomatis).', danger: true, ok: 'Tolak', input: { label: 'Alasan penolakan', req: true } });
            if (c) { await UI.run(tl, () => API.call('rekap.verifikasi', { ids: [r.id_rekap], keputusan: 'Ditolak', alasan: c.nilai }), 'Rekap ditolak'); next(); }
          }
        };
      }
      function next() { const i = data.antrean.findIndex((x) => x.id_rekap === pilih); data.antrean.splice(i, 1); pilih = data.antrean[i] ? data.antrean[i].id_rekap : (data.antrean[0] || {}).id_rekap || ''; list(); if (pilih) detail(); else $('[data-detail]', el).innerHTML = UI.panel({ t: 'Detail Rekap', body: UI.empty('Antrean kosong') }); load(true); }
      el.addEventListener('click', async (e) => {
        const it = e.target.closest('[data-list] .it[data-id]');
        if (it) { pilih = it.dataset.id; list(); detail(); }
        if (e.target.closest('[data-rl]')) load(true);
        const bk = e.target.closest('[data-bulk]');
        if (bk && data) {
          const ids = data.antrean.filter(cocok).map((r) => r.id_rekap);
          if (!ids.length) return UI.toast('Tidak ada rekap yang cocok sempurna', 'warn');
          const c = await UI.confirm({ title: 'Verifikasi massal', msg: `Verifikasi <b>${ids.length}</b> rekap tanpa selisih kas maupun flag impor?`, ok: 'Verifikasi ' + ids.length + ' rekap' });
          if (c) { const r = await UI.run(bk, () => API.call('rekap.verifikasi', { ids, keputusan: 'Diverifikasi' }), (x) => x.diproses.length + ' rekap terverifikasi'); pilih = ''; load(true); }
        }
      });
      el.addEventListener('input', SP.debounce((e) => { if (e.target.matches('[data-fq]')) list(); }, 150));
      el.addEventListener('change', (e) => { if (e.target.matches('[data-fs]')) list(); });
      load();
      if (pilih) detail();
    }
  };

  // =====================================================================
  //  PENDAPATAN LAIN
  // =====================================================================
  SP.Pages.pendapatan = {
    sub: 'Iklan & sewa area yang disetujui RS (masuk PPK — Pasal 18 ayat 1)',
    render(el) {
      el.innerHTML = `<div data-k></div>${UI.panel({ t: 'Pendapatan Lain — ' + fmt.per(S.periode), i: 'fa-money-bill-wave', p0: true, body: '<div data-t></div>' })}`;
      UI.entity($('[data-t]', el), 'pendapatanLain', { params: () => ({ periode: S.periode }), fileKat: 'nota', defaults: { tanggal: SP.today() }, formNote: () => UI.callout('fa-circle-info', 'Iklan & sewa area wajib memiliki nomor persetujuan tertulis RS. Nilai yang disetujui Pimpinan masuk PPK periode berjalan.', 'biru'),
        canEdit: (r) => r.status !== 'Disetujui', canDel: (r) => r.status !== 'Disetujui',
        onData: (rows) => { const k = $('[data-k]', el); if (k) k.innerHTML = `<div class="row g-3"><div class="col-md-4">${UI.kpi({ v: fmt.rp(rows.filter((r) => r.status === 'Disetujui').reduce((a, r) => a + r.nominal, 0)), l: 'Disetujui (masuk PPK)', c: 'hijau', i: 'fa-circle-check' })}</div><div class="col-md-4">${UI.kpi({ v: rows.filter((r) => r.status === 'Diajukan').length, l: 'Menunggu Persetujuan Pimpinan', c: 'oranye', i: 'fa-hourglass-half' })}</div><div class="col-md-4">${UI.kpi({ v: rows.length, l: 'Entri Periode Ini', c: 'biru', i: 'fa-list' })}</div></div>`; } });
    }
  };

  // =====================================================================
  //  PENGELUARAN & LABA-RUGI
  // =====================================================================
  SP.Pages.pengeluaran = {
    title: 'Pengeluaran & Laba-Rugi', sub: 'Biaya operasional Pengelola (dibayar dari porsi 75%) & evaluasi kelayakan',
    prefetch() { API.prefetch('keu.ringkasPengeluaran', { periode: S.periode }); },
    render(el, p, ctx) {
      const tab = p.tab || 'pengeluaran';
      el.innerHTML = `<div data-k>${UI.skKpi(4)}</div>` + UI.tabs([{ id: 'pengeluaran', t: 'Pengeluaran', i: 'fa-receipt' }, { id: 'labarugi', t: 'Laba-Rugi', i: 'fa-chart-area' }, { id: 'anggaran', t: 'Anggaran', i: 'fa-bullseye' }, { id: 'berulang', t: 'Biaya Berulang', i: 'fa-repeat' }], tab) + '<div data-tb></div>';
      $$('[data-tab]', el).forEach((b) => b.onclick = () => Router.go('pengeluaran', { tab: b.dataset.tab }));
      API.swr('keu.ringkasPengeluaran', { periode: S.periode }, (d) => {
        if (!ctx.live()) return;
        $('[data-k]', el).innerHTML = `<div class="row g-3"><div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(d.total), l: 'Total Pengeluaran ' + fmt.per(d.periode), c: 'merah', i: 'fa-wallet' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: d.menunggu + '<small>item</small>', l: 'Menunggu Persetujuan Pimpinan', sub: d.menunggu_atas_batas + ' di atas ' + fmt.rp(d.batas) + ' (BR-20)', c: 'oranye', i: 'fa-hourglass-half' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(d.hak_pengelola), l: 'Porsi Pengelola ' + (S.boot.set.PERSEN_PENGELOLA || 75) + '% (PNBH)', sub: d.sumber_hak === 'rekon' ? 'Dari rekonsiliasi' : 'Estimasi berjalan', c: 'hijau', i: 'fa-chart-pie' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(d.laba_rugi), l: 'Estimasi Laba/Rugi Bersih', sub: 'Setelah amortisasi ' + fmt.rp(d.amortisasi), c: d.laba_rugi < 0 ? 'merah' : 'biru', i: 'fa-scale-balanced' })}</div></div>`;
        el._r = d;
      });
      const tb = $('[data-tb]', el);
      if (tab === 'labarugi') return labaRugi(tb, ctx);
      if (tab === 'anggaran') { tb.innerHTML = UI.panel({ t: 'Anggaran Pendapatan & Biaya', i: 'fa-bullseye', p0: true, body: '<div data-t></div>', foot: '<span>Pos "Biaya Tetap" dipakai sebagai cadangan biaya tetap & titik impas bila pengeluaran belum tercatat</span>' }); UI.entity($('[data-t]', tb), 'anggaran', { defaults: { periode: S.periode } }); return; }
      if (tab === 'berulang') {
        tb.innerHTML = UI.panel({ t: 'Templat Biaya Berulang (gaji, BPJS, internet…)', i: 'fa-repeat', p0: true, body: '<div data-t></div>' });
        UI.entity($('[data-t]', tb), 'biayaBerulang', { defaults: { aktif: true, metode_bayar: 'Transfer', id_lokasi: 'SEMUA' },
          tools: can.role('ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs ? `<button class="btn btn-sm btn-biru" data-gen><i class="fa-solid fa-calendar-plus"></i> Buat Biaya Rutin ${esc(fmt.per(S.periode))}</button>` : '' });
        tb.addEventListener('click', async (e) => { const g = e.target.closest('[data-gen]'); if (g) await UI.run(g, () => API.call('keu.buatBerulang', { periode: S.periode }), (r) => r.dibuat + ' pengeluaran draf dibuat, ' + r.dilewati + ' sudah ada'); });
        return;
      }
      tb.innerHTML = UI.panel({ t: 'Daftar Pengeluaran Operasional — ' + fmt.per(S.periode), i: 'fa-receipt', p0: true, body: '<div data-t></div>' });
      UI.entity($('[data-t]', tb), 'pengeluaran', { params: () => ({ periode: S.periode, lokasi: S.lokasi === 'SEMUA' ? undefined : undefined }), fileKat: 'nota', size: 15, defaults: { tanggal: SP.today(), metode_bayar: 'Transfer', id_lokasi: 'SEMUA' },
        tools: can.role('ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs ? '<button class="btn btn-sm btn-biru" data-gen2><i class="fa-solid fa-calendar-plus"></i> Buat Biaya Rutin</button>' : '',
        cols: [{ k: 'tanggal', l: 'Tanggal', t: 'tgl' }, { k: 'kode_kategori', l: 'Kategori', f: (v) => `<span class="tag">${esc((SP.master('kategori').find((k) => k.kode === v) || {}).nama || v)}</span>` }, { k: 'uraian', l: 'Uraian' }, { k: 'id_lokasi', l: 'Lokasi', t: 'lok' }, { k: 'vendor', l: 'Vendor' }, { k: 'nominal', l: 'Nominal', t: 'rp', sum: true }, { k: 'bukti', l: 'Nota', t: 'file', sort: false }, { k: 'status', l: 'Status', t: 'badge' }],
        formNote: () => UI.callout('fa-circle-info', `BR-05: biaya operasional tidak mengurangi PNBH. BR-20: di atas ${fmt.rp(S.boot.set.BATAS_SETUJU_PENGELUARAN || 1000000)} wajib disetujui Pimpinan sebelum dibayar. CAPEX dicatat di menu Aset & CAPEX.`, 'biru'),
        canEdit: (r) => ['Draft', 'Ditolak', 'Diajukan'].indexOf(r.status) > -1, canDel: (r) => ['Draft', 'Ditolak'].indexOf(r.status) > -1 });
      tb.addEventListener('click', async (e) => { const g = e.target.closest('[data-gen2]'); if (g) { await UI.run(g, () => API.call('keu.buatBerulang', { periode: S.periode }), (r) => r.dibuat + ' pengeluaran draf dibuat'); SP.App.render(); } });
    }
  };
  function labaRugi(el, ctx) {
    const th = S.periode.slice(0, 4);
    el.innerHTML = UI.skBox(2);
    API.swr('keu.labaRugi', { tahun: th }, (d) => {
      if (!ctx.live()) return;
      const b = d.bulan.filter((x) => !x.kosong), t = d.total, cur = d.bulan.find((x) => x.periode === S.periode) || b[b.length - 1] || {};
      el.innerHTML = `${UI.panel({ t: 'Ringkasan Laba-Rugi Pengelola (' + fmt.per(cur.periode || S.periode) + ')', i: 'fa-scale-balanced', tools: '<span class="badge-s s-hijau">Kepatuhan BR-05</span>',
        body: `<div class="row g-2"><div class="col-6 col-lg-3">${UI.mini('Porsi Pengelola 75%', `<span class="text-hijau">${fmt.rp(cur.hak_pengelola)}</span>`, 'hijau')}</div><div class="col-6 col-lg-3">${UI.mini('− Biaya tetap', fmt.rp(cur.biaya_tetap), 'merah')}</div>
          <div class="col-6 col-lg-3">${UI.mini('− Biaya variabel + amortisasi', fmt.rp((cur.biaya_variabel || 0) + (cur.amortisasi || 0)), 'oranye')}</div><div class="col-6 col-lg-3">${UI.mini('= Laba/rugi bersih', `<span class="${cur.laba_rugi < 0 ? 'text-merah' : 'text-hijau'}">${fmt.rp(cur.laba_rugi)}</span>`, cur.laba_rugi < 0 ? 'merah' : 'hijau')}</div></div>
          ${UI.callout('fa-circle-info', '<b>BR-05:</b> biaya operasional Pengelola tidak mengurangi PNBH; dibayar dari porsi 75%. Listrik ditanggung RS.', 'biru')}` })}
        ${UI.panel({ t: 'Laba-Rugi per Bulan ' + th, i: 'fa-chart-area', body: '<div style="height:260px"><canvas data-c></canvas></div>' })}
        ${UI.panel({ t: 'Tabel Laba-Rugi ' + th, i: 'fa-table', p0: true, body: '<div data-t></div>' })}`;
      UI.chart($('[data-c]', el), { type: 'bar', data: { labels: b.map((x) => BLN3[Number(x.periode.slice(5)) - 1]), datasets: [{ label: 'Porsi Pengelola', data: b.map((x) => x.hak_pengelola), backgroundColor: '#00a65a' }, { label: 'Biaya (tetap+variabel+amortisasi)', data: b.map((x) => x.biaya_tetap + x.biaya_variabel + x.amortisasi), backgroundColor: '#FF6B6B' }, { type: 'line', label: 'Laba/rugi', data: b.map((x) => x.laba_rugi), borderColor: '#00658f', backgroundColor: '#00658f' }] },
        options: { plugins: { tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + fmt.rp(c.raw) } } }, scales: { y: { ticks: { callback: UI.rpTick } } } } });
      UI.table($('[data-t]', el), { key: 'periode', rows: b, search: false, size: 12, excel: 'LabaRugi_' + th, cols: [{ k: 'periode', l: 'Periode', t: 'month' }, { k: 'pnbh', l: 'PNBH', t: 'rp', sum: true }, { k: 'hak_pengelola', l: 'Porsi 75%', t: 'rp', sum: true }, { k: 'biaya_tetap', l: 'Biaya tetap', t: 'rp', sum: true }, { k: 'biaya_variabel', l: 'Biaya variabel', t: 'rp', sum: true }, { k: 'amortisasi', l: 'Amortisasi', t: 'rp', sum: true }, { k: 'laba_rugi', l: 'Laba/rugi', t: 'rp', sum: true, f: (v) => `<b class="${v < 0 ? 'text-merah' : 'text-hijau'}">${fmt.rp(v)}</b>` }, { k: 'sumber', l: 'Sumber' }] });
    }, { onError: (e) => { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
  }

  // =====================================================================
  //  KAS & BANK
  // =====================================================================
  SP.Pages.kasbank = {
    sub: 'Mutasi rekening, pencocokan setoran & settlement QRIS, MDR aktual',
    render(el, p, ctx) {
      const bisa = can.role('ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs;
      el.innerHTML = `<div data-k>${UI.skKpi(4)}</div>${bisa ? '<div class="d-flex gap-2 mb-3 flex-wrap"><button class="btn btn-hijau" data-imp><i class="fa-solid fa-file-import"></i> Impor Mutasi Rekening (CSV/XLSX)</button><button class="btn btn-biru" data-auto><i class="fa-solid fa-wand-magic-sparkles"></i> Cocokkan Otomatis</button></div>' : ''}
        <div data-dc></div>${UI.panel({ t: 'Mutasi Rekening — ' + fmt.per(S.periode), i: 'fa-building-columns', p0: true, body: '<div data-t></div>' })}`;
      const ent = UI.entity($('[data-t]', el), 'mutasiBank', { params: () => ({ periode: S.periode }), size: 20, edit: false,
        cols: [{ k: 'tanggal', l: 'Tanggal', t: 'tgl' }, { k: 'rekening', l: 'Rekening' }, { k: 'keterangan_bank', l: 'Keterangan' }, { k: 'debit', l: 'Debit', t: 'rp', sum: true }, { k: 'kredit', l: 'Kredit', t: 'rp', sum: true }, { k: 'saldo', l: 'Saldo', t: 'rp' }, { k: 'jenis_cocok', l: 'Jenis' }, { k: 'ref_cocok', l: 'Ref. cocok' }, { k: 'status_cocok', l: 'Status', t: 'badge' }],
        rowCls: (r) => r.status_cocok === 'Belum Cocok' && r.kredit > 0 ? 'row-oranye' : '',
        extraActions: (r) => bisa ? UI.btnAct('cocok', 'Cocokkan', 'biru', 'fa-link') : '',
        onAct: (act, r, btn, load) => { if (act === 'cocok') cocokManual(r, load); } });
      function kpi() {
        API.swr('bank.ringkas', { periode: S.periode }, (d) => {
          if (!ctx.live()) return;
          $('[data-k]', el).innerHTML = `<div class="row g-3"><div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(d.settlement_qris), l: 'Settlement QRIS Masuk', sub: 'QRIS rekap ' + fmt.rp(d.qris_rekap), c: 'biru', i: 'fa-qrcode' })}</div>
            <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(d.setoran_tunai), l: 'Setoran Tunai Masuk', c: 'hijau', i: 'fa-money-bill' })}</div>
            <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(d.mdr), l: 'MDR QRIS ' + (d.mdr_estimasi ? '(ESTIMASI)' : 'Aktual'), sub: d.mdr_estimasi ? 'Impor mutasi untuk nilai aktual (BR-08)' : 'QRIS rekap − settlement', c: d.mdr_estimasi ? 'oranye' : 'aqua', i: 'fa-percent' })}</div>
            <div class="col-md-6 col-xl-3">${UI.kpi({ v: d.belum_cocok + '<small>mutasi</small>', l: 'Belum Cocok', sub: d.cocok + ' sudah cocok', c: d.belum_cocok ? 'merah' : 'hijau', i: 'fa-link-slash' })}</div></div>`;
          $('[data-dc]', el).innerHTML = UI.panel({ t: 'Rekening Dana Cadangan vs Buku Dana Cadangan', i: 'fa-shield-halved', c: d.selisih_dc ? 'merah' : '', body: `<div class="row g-2"><div class="col-md-4">${UI.mini('Saldo rekening DC (mutasi terakhir)', d.saldo_rekening_dc === null ? '<span class="muted">belum ada mutasi</span>' : fmt.rp(d.saldo_rekening_dc))}</div><div class="col-md-4">${UI.mini('Saldo buku DC akhir periode', fmt.rp(d.saldo_buku_dc))}</div><div class="col-md-4">${UI.mini('Selisih', d.selisih_dc === null ? '—' : `<span class="${d.selisih_dc ? 'text-merah' : 'text-hijau'}">${fmt.rp(d.selisih_dc)}</span>`, d.selisih_dc ? 'merah' : 'hijau')}</div></div>` });
        });
      }
      kpi();
      el.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-auto]'), im = e.target.closest('[data-imp]');
        if (a) { await UI.run(a, () => API.call('bank.cocokOtomatis', { periode: S.periode }), (r) => r.cocok + ' mutasi tercocok otomatis'); ent.load(true); SP.Cache.drop('bank.'); kpi(); }
        if (im) imporBank(() => { ent.load(true); SP.Cache.drop('bank.'); kpi(); });
      });
    }
  };
  function cocokManual(r, load) {
    const f = [{ n: 'jenis_cocok', l: 'Jenis', t: 'select', opts: ['Setoran Tunai', 'Settlement QRIS', 'Dana Cadangan', 'Lainnya'], req: true }, { n: 'ref_cocok', l: 'Referensi (ID rekap / "QRIS YYYY-MM-DD")', t: 'text' }, { n: 'status_cocok', l: 'Status', t: 'select', opts: ['Belum Cocok', 'Cocok', 'Diabaikan'], req: true }];
    const m = UI.modal({ title: 'Cocokkan mutasi ' + esc(r.id), body: `<div class="mini mb-3"><b>${fmt.tgl(r.tanggal)}</b> · ${esc(r.keterangan_bank)} · <b>${fmt.rp(r.kredit || r.debit)}</b></div>` + UI.form(f, r, { cols: 1 }), foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-biru" data-s>Simpan</button>' });
    m.$('[data-s]').onclick = async (e) => { const d = UI.readForm(m.el, f); d.id = r.id; await UI.run(e.currentTarget, () => API.call('bank.cocokManual', d), 'Tersimpan'); m.close(); load(true); };
  }
  async function imporBank(done) {
    const file = await Files.pick('.csv,.xlsx,.xls,.txt'); if (!file) return;
    const X = await Lib.xlsx(); const buf = await file.arrayBuffer(); const hash = await Files.sha256(buf);
    const wb = X.read(buf, { type: 'array', raw: false }); const aoa = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }).filter((r) => r.some((v) => String(v).trim()));
    let hi = aoa.findIndex((r) => r.some((v) => /tanggal|date|tgl/i.test(v))); if (hi < 0) hi = 0;
    const H = aoa[hi].map(String), rows = aoa.slice(hi + 1);
    const tebak = (re) => H.find((h) => re.test(h)) || '';
    const map = { tanggal: tebak(/tanggal|date|tgl/i), keterangan_bank: tebak(/ket|desc|uraian|remark/i), debit: tebak(/debit|debet|keluar|db/i), kredit: tebak(/kredit|credit|masuk|cr/i), saldo: tebak(/saldo|balance/i) };
    const sel = (k) => `<select class="form-select form-select-sm" data-m="${k}"><option value="">—</option>${H.map((h) => `<option ${map[k] === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select>`;
    const m = UI.modal({ title: 'Impor Mutasi Rekening — ' + esc(file.name), size: 'lg', static: true,
      body: `<div class="row g-2 mb-2"><div class="col-md-4"><label class="form-label">Rekening</label><select class="form-select" data-rek><option>Operasional</option><option>Dana Cadangan</option></select></div></div>
        <div class="row g-2">${['tanggal', 'keterangan_bank', 'debit', 'kredit', 'saldo'].map((k) => `<div class="col-md-4"><label class="form-label fs-12">${k.replace('_bank', '')}</label>${sel(k)}</div>`).join('')}</div>
        <div class="form-text mt-2">${rows.length} baris terbaca. Duplikat (tanggal+keterangan+nominal+saldo) dilewati otomatis; settlement QRIS & setoran tunai dikenali dari kata kunci keterangan.</div>`,
      foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-hijau" data-go>Impor</button>' });
    m.$('[data-go]').onclick = async (e) => {
      $$('[data-m]', m.el).forEach((s) => map[s.dataset.m] = s.value);
      if (!map.tanggal || !map.keterangan_bank) return UI.toast('Petakan kolom tanggal & keterangan', 'warn');
      const ix = (k) => H.indexOf(map[k]);
      const tgl = (v) => { const s = String(v).trim(); let x; if ((x = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${x[1]}-${x[2].padStart(2, '0')}-${x[3].padStart(2, '0')}`; if ((x = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) return `${x[3].length === 2 ? '20' + x[3] : x[3]}-${x[2].padStart(2, '0')}-${x[1].padStart(2, '0')}`; return ''; };
      const n = (v) => { let s = String(v || '').replace(/[^0-9,.-]/g, ''); if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, ''); return Math.round(Math.abs(Number(s) || 0)); };
      const data = rows.map((r) => ({ tanggal: tgl(r[ix('tanggal')]), keterangan_bank: String(r[ix('keterangan_bank')] || '').trim(), debit: ix('debit') > -1 ? n(r[ix('debit')]) : 0, kredit: ix('kredit') > -1 ? n(r[ix('kredit')]) : 0, saldo: ix('saldo') > -1 ? n(r[ix('saldo')]) : 0 })).filter((r) => r.tanggal && r.keterangan_bank);
      if (!data.length) return UI.toast('Tidak ada baris valid (cek format tanggal)', 'warn');
      try { await UI.run(e.currentTarget, () => API.call('bank.impor', { rekening: m.$('[data-rek]').value, rows: data, nama_file: file.name, hash }, { timeout: 120000 }), (r) => `${r.baru} mutasi baru, ${r.duplikat} duplikat, ${r.cocok} tercocok`); m.close(); done(); } catch (x) { }
    };
  }

  // =====================================================================
  //  PBJT
  // =====================================================================
  SP.Pages.pbjt = {
    title: 'PBJT', sub: 'Pajak Barang & Jasa Tertentu atas jasa parkir (Pasal 9 ayat 2–3)',
    render(el, p, ctx) {
      const th = S.periode.slice(0, 4);
      el.innerHTML = `<div data-r>${UI.skBox(1)}</div>${can.role('ADMIN_KEU', 'SUPER_ADMIN', 'PIMPINAN') ? UI.panel({ t: 'Pencatatan Setor & Lapor PBJT', i: 'fa-file-invoice', p0: true, body: '<div data-t></div>', foot: '<span>Tenggat setor/lapor diatur di Kalender Kewajiban sesuai ketentuan daerah</span>' }) : ''}`;
      API.swr('pbjt.rekap', { tahun: th }, (d) => {
        if (!ctx.live()) return;
        $('[data-r]', el).innerHTML = UI.panel({ t: 'Rekap PBJT ' + th + ' (tarif ' + (d.persen || '—') + '%)', i: 'fa-receipt', p0: true, body: '<div style="height:220px" class="p-2"><canvas data-c></canvas></div><div data-tt></div>' });
        UI.chart($('[data-c]', el), { type: 'bar', data: { labels: d.bulan.map((x) => BLN3[Number(x.periode.slice(5)) - 1]), datasets: [{ label: 'PBJT dihitung', data: d.bulan.map((x) => x.pbjt), backgroundColor: '#FF6B6B' }, { label: 'PBJT sistem gate', data: d.bulan.map((x) => x.pbjt_gate), backgroundColor: '#3C8DBC' }] }, options: { scales: { y: { ticks: { callback: UI.rpTick } } } } });
        UI.table($('[data-tt]', el), { key: 'periode', rows: d.bulan, search: false, size: 12, excel: 'PBJT_' + th, cols: [{ k: 'periode', l: 'Periode', t: 'month' }, { k: 'dasar_pengenaan', l: 'Dasar pengenaan', t: 'rp', sum: true }, { k: 'pbjt', l: 'PBJT', t: 'rp', sum: true }, { k: 'pbjt_gate', l: 'Pembanding gate', t: 'rp', sum: true }, { k: 'status_rekon', l: 'Rekon', t: 'badge' }, { k: 'status_setor', l: 'Setor', t: 'badge' }, { k: 'tgl_setor', l: 'Tgl setor', t: 'tgl' }, { k: 'tgl_lapor', l: 'Tgl lapor', t: 'tgl' }] });
      }, { onError: (e) => { $('[data-r]', el).innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
      const t = $('[data-t]', el); if (t) UI.entity(t, 'pbjt', { fileKat: 'laporan', defaults: { periode: SP.addMonth(SP.periodeNow(), -1), status: 'Belum Setor' } });
    }
  };
})();
