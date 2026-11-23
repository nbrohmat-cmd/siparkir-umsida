/* Kontrak & Kewajiban (F-15), Aset & CAPEX (F-16), Analisis & Simulasi (F-17) */
(function () {
  'use strict';
  const { $, $$, esc, fmt, S, API, can, namaLokasi, Router, BLN3 } = SP;

  // =====================================================================
  //  KONTRAK & KEWAJIBAN
  // =====================================================================
  SP.Pages.kontrak = {
    title: 'Kontrak & Kewajiban', sub: 'Tahapan PKS, Berita Acara, kalender kewajiban & Zona B',
    prefetch() { API.prefetch('kontrak.ringkas', {}); },
    render(el, p, ctx) {
      const tab = p.tab || 'kewajiban', pim = can.role('PIMPINAN', 'SUPER_ADMIN') && !S.viewAs;
      el.innerHTML = `<div data-card>${UI.skBox(1)}</div>${UI.tabs([{ id: 'kewajiban', t: 'Kalender Kewajiban', i: 'fa-calendar-check' }, { id: 'ba', t: 'Register Berita Acara', i: 'fa-file-signature' }, { id: 'zonab', t: 'Zona B', i: 'fa-building' }], tab)}<div data-tb></div>`;
      $$('[data-tab]', el).forEach((b) => b.onclick = () => Router.go('kontrak', { tab: b.dataset.tab }));
      API.swr('kontrak.ringkas', {}, (d) => {
        if (!ctx.live()) return;
        $('[data-card]', el).innerHTML = `<div class="row g-3"><div class="col-lg-8">${UI.panel({ t: 'Status Perjanjian Kerja Sama', i: 'fa-file-contract', tools: UI.badge(String(d.tahap).replace('_', ' '), 'hijau'),
          body: d.tgl_ttd ? `<div class="row g-2 mb-2"><div class="col-6 col-md-3">${UI.mini('Nomor PKS', esc(d.nomor_pks || '-'))}</div><div class="col-6 col-md-3">${UI.mini('Tanda tangan', fmt.tgl(d.tgl_ttd))}</div><div class="col-6 col-md-3">${UI.mini('Tanggal Berakhir', fmt.tgl(d.tgl_berakhir), '', d.total_pengunduran ? '+' + d.total_pengunduran + ' hari pengunduran' : 'Tanpa pengunduran')}</div><div class="col-6 col-md-3">${UI.mini('Sisa masa', fmt.n(d.sisa_hari) + ' hari', UI.sisaWarna(d.sisa_hari > 180 ? 99 : d.sisa_hari > 30 ? 10 : 0))}</div></div>
            <div class="d-flex justify-content-between fs-12 mb-1"><span>Hari ke-<b>${fmt.n(d.hari_ke)}</b> dari ${fmt.n(d.total_hari)}</span><span>${fmt.pct(d.progres, 1)}</span></div><div class="progress"><div class="progress-bar" style="width:${d.progres}%"></div></div>
            <div class="fs-12 muted mt-2">Evaluasi perpanjangan (H-180): <b>${fmt.tgl(d.h180)}</b> · Hak penawaran pertama Zona B s.d. <b>${fmt.tgl(d.hak_penawaran_zona_b_sampai)}</b></div>`
            : UI.callout('fa-circle-info', 'Isi Tanggal Tanda Tangan PKS di menu Pengaturan agar Tanggal Berakhir & tenggat kewajiban dapat dihitung.', 'oranye') })}</div>
          <div class="col-lg-4">${UI.panel({ t: 'Ringkas Kewajiban', i: 'fa-list-check', c: 'oranye', body: `<div class="row g-2">${[['Terlewat', d.kewajiban.filter((k) => k.status === 'Aktif' && k.sisa_hari !== null && k.sisa_hari < 0).length, 'merah'], ['≤ 14 hari', d.kewajiban.filter((k) => k.status === 'Aktif' && k.sisa_hari !== null && k.sisa_hari >= 0 && k.sisa_hari <= 14).length, 'oranye'], ['Aktif', d.kewajiban.filter((k) => k.status === 'Aktif').length, 'hijau'], ['Menunggu pemicu', d.kewajiban.filter((k) => k.status === 'Menunggu Pemicu').length, '']].map((x) => `<div class="col-6">${UI.mini(x[0], x[1], x[2])}</div>`).join('')}</div>` })}</div></div>`;
        el._d = d;
        if (tab === 'kewajiban') kewajiban($('[data-tb]', el), d);
      });
      const tb = $('[data-tb]', el);
      if (tab === 'kewajiban') tb.innerHTML = UI.skBox(1);
      if (tab === 'ba') {
        tb.innerHTML = UI.panel({ t: 'Register Berita Acara', i: 'fa-file-signature', p0: true, body: '<div data-t></div>', foot: '<span>BA "Mulai Operasi Sementara/Penuh" mengubah tahap aktif & mengaktifkan lokasi; BA pengunduran menggeser Tanggal Berakhir (BR-14)</span>' });
        UI.entity($('[data-t]', tb), 'ba', { save: 'ba.save', add: pim, readonly: !pim, fileKat: 'kontrak', defaults: { tanggal: SP.today() }, del: false,
          onSaved: (r) => { (r.efek || []).forEach((x) => UI.toast(x)); SP.Cache.drop('kontrak.'); SP.App.boot(true); } });
      }
      if (tab === 'zonab') {
        tb.innerHTML = UI.panel({ t: 'Informasi Zona B dari RS (Pasal 7 ayat 3) & hak penawaran pertama (Pasal 7 ayat 7)', i: 'fa-building', p0: true, body: '<div data-t></div>' });
        UI.entity($('[data-t]', tb), 'zonaB', { fileKat: 'kontrak', defaults: { tanggal: SP.today() }, formNote: () => UI.callout('fa-circle-info', 'Untuk "Penawaran Pengelolaan", isi tanggal penawaran — jawaban Pengelola wajib ≤ 30 hari (dipantau di kartu kontrak).', 'biru') });
      }
    }
  };
  function kewajiban(el, d) {
    const bisa = can.role('PIMPINAN', 'SUPER_ADMIN', 'ADMIN_KEU') && !S.viewAs;
    el.innerHTML = UI.panel({ t: 'Kalender Kewajiban PKS (Lampiran B)', i: 'fa-calendar-check', p0: true,
      tools: (can.role('PIMPINAN', 'SUPER_ADMIN') && !S.viewAs ? '<button class="btn btn-sm btn-abu" data-hit><i class="fa-solid fa-rotate"></i> Hitung ulang tenggat</button><button class="btn btn-sm btn-hijau" data-add><i class="fa-solid fa-plus"></i> Tambah</button>' : '') + '<select class="form-select form-select-sm" style="width:auto" data-pihak><option value="">Semua pihak</option><option>Pengelola</option><option>RS</option><option>Bersama</option></select>',
      body: '<div data-t></div>', foot: '<span>Warna: hijau > 14 hari · oranye 3–14 hari · merah < 3 hari / terlewat</span>' });
    const T = UI.table($('[data-t]', el), { key: 'id', rows: d.kewajiban, size: 25, excel: 'Kewajiban_PKS', sort: 'sisa_hari', dir: 1,
      rowCls: (r) => r.status === 'Aktif' && r.sisa_hari !== null && r.sisa_hari < 3 ? 'row-merah' : (r.status === 'Aktif' && r.sisa_hari !== null && r.sisa_hari <= 14 ? 'row-oranye' : ''),
      cols: [{ k: 'pasal', l: 'Pasal' }, { k: 'uraian', l: 'Kewajiban', f: (v, r) => `${esc(v)}<div class="fs-11 muted">${esc(r.pola)}${r.terakhir_selesai ? ' · terakhir selesai ' + fmt.tgl(r.terakhir_selesai) : ''}</div>` }, { k: 'pihak', l: 'Pihak', f: (v) => UI.badge(v, v === 'RS' ? 'biru' : v === 'Pengelola' ? 'hijau' : 'ungu') },
        { k: 'tenggat_berikut', l: 'Tenggat', t: 'tgl' }, { k: 'sisa_hari', l: 'Sisa', t: 'n', f: (v, r) => r.status !== 'Aktif' ? '' : UI.badge(UI.sisaTeks(v), UI.sisaWarna(v)) }, { k: 'status', l: 'Status', t: 'badge' }],
      actions: (r) => (bisa && r.status !== 'Selesai' && (!can.role('ADMIN_KEU') || /Keuangan|Dana Cadangan/.test(r.kategori)) ? UI.btnAct('done', 'Selesai', 'hijau', 'fa-check') : '') + (can.role('PIMPINAN', 'SUPER_ADMIN') && !S.viewAs ? UI.btnAct('edit', '', 'oranye', 'fa-pen') : '') + (r.bukti ? `<a href="#" class="btn btn-xs btn-abu" data-view="${esc(r.bukti)}"><i class="fa-solid fa-paperclip"></i></a>` : ''),
      onAct: async (a, r, btn) => {
        if (a === 'done') {
          const f = [{ n: 'tanggal', l: 'Tanggal selesai', t: 'date', req: true }, { n: 'bukti', l: 'Bukti penyelesaian', t: 'file' }];
          const m = UI.modal({ title: 'Tandai selesai — Pasal ' + esc(r.pasal), body: `<p class="fs-13">${esc(r.uraian)}</p>` + UI.form(f, { tanggal: SP.today() }, { cols: 1, fileKat: 'kontrak' }), foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-hijau" data-s>Simpan</button>' });
          UI.bindForm(m.el);
          m.$('[data-s]').onclick = async (e) => { const v = UI.readForm(m.el, f); const x = await UI.run(e.currentTarget, () => API.call('kewajiban.selesai', { id: r.id, tanggal: v.tanggal, bukti: v.bukti }), (z) => z.status === 'Selesai' ? 'Kewajiban selesai' : 'Tenggat berikutnya ' + fmt.tgl(z.tenggat_berikut)); m.close(); SP.Cache.drop('kontrak.'); SP.App.render(); };
        }
        if (a === 'edit') formKw(r);
      } });
    function formKw(r) {
      const f = S.boot.ent.kewajiban.fields.filter((x) => !x.ro && x.t !== 'json');
      const m = UI.modal({ title: r ? 'Ubah kewajiban' : 'Tambah kewajiban', size: 'lg', body: UI.form(f, r || { status: 'Aktif', pihak: 'Pengelola', pola: 'Sekali', pengingat_hari: 7 }, { fileKat: 'kontrak' }), foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-biru" data-s>Simpan</button>' });
      UI.bindForm(m.el);
      m.$('[data-s]').onclick = async (e) => { const v = UI.readForm(m.el, f); if (!UI.validate(m.el, f, v)) return; if (r) v.id = r.id; await UI.run(e.currentTarget, () => API.call('data.save', { ent: 'kewajiban', row: v }), 'Tersimpan'); m.close(); SP.Cache.drop('kontrak.'); SP.App.render(); };
    }
    el.onclick = async (e) => {
      const v = e.target.closest('[data-view]'); if (v) { e.preventDefault(); UI.viewFile(v.dataset.view); }
      if (e.target.closest('[data-add]')) formKw(null);
      const h = e.target.closest('[data-hit]'); if (h) { await UI.run(h, () => API.call('kewajiban.hitungUlang', {}), (x) => x.diubah + ' tenggat diperbarui'); SP.Cache.drop('kontrak.'); SP.App.render(); }
    };
    el.onchange = (e) => { if (e.target.matches('[data-pihak]')) T.set(d.kewajiban.filter((k) => !e.target.value || k.pihak === e.target.value)); };
  }

  // =====================================================================
  //  ASET & CAPEX
  // =====================================================================
  SP.Pages.aset = {
    title: 'Aset & CAPEX', sub: 'Register aset, amortisasi & kalkulator kompensasi pengakhiran (Pasal 17 & 24 PKS)',
    render(el, p, ctx) {
      const isRS = can.role('RS_UMSIDA'), pim = can.role('PIMPINAN', 'SUPER_ADMIN');
      el.innerHTML = `<div data-k>${UI.skKpi(4)}</div>${UI.panel({ t: 'Register Aset & Investasi', i: 'fa-boxes-stacked', p0: true, body: '<div data-t></div>' })}${pim ? '<div data-komp></div>' : ''}`;
      API.swr('aset.daftar', {}, (d) => {
        if (!ctx.live()) return; const r = d.ringkas;
        $('[data-k]', el).innerHTML = `${UI.callout('fa-calendar', 'Pembaruan daftar aset semesteran berikutnya: <b>' + fmt.tgl(d.pembaruan_berikut) + '</b> (Pasal 17 ayat 6).', 'biru')}<div class="row g-3">
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(r.jumlah), l: 'Jumlah Aset', sub: r.bergerak + ' bergerak · ' + r.melekat + ' pekerjaan melekat', c: 'biru', i: 'fa-boxes-stacked' })}</div>
          ${isRS ? `<div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(r.rusak), l: 'Kondisi Perlu Perhatian', c: r.rusak ? 'oranye' : 'hijau', i: 'fa-screwdriver-wrench' })}</div>` : `
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rps(r.nilai), l: 'Nilai Perolehan', c: 'hijau', i: 'fa-coins' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rps(r.belum_pulih_capex), l: 'Investasi Belum Pulih (CAPEX disetujui)', sub: 'Akumulasi amortisasi ' + fmt.rps(r.akumulasi), c: 'oranye', i: 'fa-hourglass-half' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(r.rusak), l: 'Kondisi Perlu Perhatian', c: r.rusak ? 'merah' : 'hijau', i: 'fa-screwdriver-wrench' })}</div>`}</div>`;
      });
      UI.entity($('[data-t]', el), 'aset', { fileKat: 'aset', size: 15, excel: 'Daftar_Aset' + (isRS ? '_RS' : ''), defaults: { klasifikasi: 'Aset Bergerak', kondisi: 'Baik', capex_disetujui: 'Ya', tgl_perolehan: SP.today() },
        onSaved: () => SP.Cache.drop('aset.') });
      if (pim) kompensasi($('[data-komp]', el));
    }
  };
  function kompensasi(el) {
    const f = [{ n: 'tagihan', l: 'Tagihan belum dibayar', t: 'money' }, { n: 'pembatalan', l: 'Biaya pembatalan kontrak pihak ketiga', t: 'money' }, { n: 'demobilisasi', l: 'Biaya demobilisasi', t: 'money' }, { n: 'ketenagakerjaan', l: 'Kewajiban ketenagakerjaan', t: 'money' }];
    el.innerHTML = UI.panel({ t: 'Kalkulator Kompensasi Pengakhiran (Pasal 24 ayat 2)', i: 'fa-calculator', c: 'merah', body: `${UI.form(f, {}, { cols: 4 })}<div class="d-flex gap-2 mt-2"><button class="btn btn-merah" data-h><i class="fa-solid fa-calculator"></i> Hitung</button></div><div data-res class="mt-3"></div>`, foot: '<span>Hanya Pimpinan & Super Admin. Nilai investasi belum pulih diambil otomatis dari register aset (CAPEX disetujui).</span>' });
    UI.bindForm(el);
    el.onclick = async (e) => {
      const b = e.target.closest('[data-h]'); if (!b) return;
      const v = UI.readForm(el, f); const r = await UI.run(b, () => API.call('aset.kompensasi', v, { keepCache: true }));
      $('[data-res]', el).innerHTML = `<table class="tbl"><tbody>${[['Tagihan belum dibayar', r.tagihan], ['Investasi belum pulih (CAPEX)', r.investasi], ['Pembatalan kontrak pihak ketiga', r.pembatalan], ['Demobilisasi', r.demobilisasi], ['Ketenagakerjaan', r.ketenagakerjaan]].map((x) => `<tr><td>${x[0]}</td><td class="num">${fmt.rp(x[1])}</td></tr>`).join('')}</tbody><tfoot><tr><td>TOTAL KOMPENSASI</td><td class="num">${fmt.rp(r.total)}</td></tr></tfoot></table><button class="btn btn-sm btn-biru mt-2" data-pdf><i class="fa-solid fa-file-pdf"></i> Cetak PDF</button>`;
      $('[data-pdf]', el).onclick = (ev) => UI.run(ev.currentTarget, () => SP.Doc.pdf('KOMPENSASI', { nilai: r, pihak: { pengelola: S.boot.set.NAMA_PENGELOLA, rs: S.boot.set.NAMA_RS, nomor_pks: S.boot.set.NOMOR_PKS } }, { nama: 'Kompensasi_' + SP.today() + '.pdf' }));
    };
  }

  // =====================================================================
  //  ANALISIS & SIMULASI
  // =====================================================================
  SP.Pages.analisis = {
    title: 'Analisis & Simulasi', sub: 'Anggaran vs realisasi, titik impas, simulasi tarif & kelayakan 5 tahun',
    render(el, p, ctx) {
      const tab = p.tab || 'bep', th = S.periode.slice(0, 4);
      el.innerHTML = UI.tabs([{ id: 'bep', t: 'Titik Impas & Defisit', i: 'fa-scale-balanced' }, { id: 'anggaran', t: 'Anggaran vs Realisasi', i: 'fa-bullseye' }, { id: 'tarif', t: 'Simulasi Tarif', i: 'fa-sliders' }, { id: 'kelayakan', t: 'Kelayakan 5 Tahun', i: 'fa-chart-line' }], tab) + '<div data-tb></div>';
      $$('[data-tab]', el).forEach((b) => b.onclick = () => Router.go('analisis', { tab: b.dataset.tab }));
      const tb = $('[data-tb]', el);
      if (tab === 'tarif') return simTarif(tb);
      if (tab === 'kelayakan') return simKelayakan(tb);
      tb.innerHTML = UI.skBox(2);
      API.swr('analisis.ringkas', { tahun: th }, (d) => {
        if (!ctx.live()) return;
        const b = d.bulan, lbl = b.map((x) => BLN3[Number(x.periode.slice(5)) - 1]), past = b.filter((x) => !x.masa_depan);
        if (tab === 'anggaran') {
          tb.innerHTML = UI.panel({ t: 'Anggaran vs Realisasi ' + th, i: 'fa-bullseye', body: '<div style="height:280px"><canvas data-c></canvas></div>' }) + UI.panel({ t: 'Tabel', i: 'fa-table', p0: true, body: '<div data-t></div>' });
          UI.chart($('[data-c]', tb), { type: 'bar', data: { labels: lbl, datasets: [{ label: 'Anggaran PPK', data: b.map((x) => x.anggaran_ppk || null), backgroundColor: '#c9d6e0' }, { label: 'Realisasi PPK', data: b.map((x) => x.ppk === undefined ? null : x.ppk), backgroundColor: '#FF6B6B' }, { type: 'line', label: 'Anggaran biaya', data: b.map((x) => x.anggaran_biaya || null), borderColor: '#a46700' }, { type: 'line', label: 'Realisasi biaya operasional', data: b.map((x) => x.biaya_operasional === undefined ? null : x.biaya_operasional), borderColor: '#00658f' }] }, options: { scales: { y: { ticks: { callback: UI.rpTick } } } } });
          UI.table($('[data-t]', tb), { key: 'periode', rows: past.map((x) => Object.assign({ selisih_ppk: (x.ppk || 0) - (x.anggaran_ppk || 0), capai: x.anggaran_ppk ? Math.round((x.ppk || 0) * 1000 / x.anggaran_ppk) / 10 : null }, x)), search: false, size: 12, excel: 'Anggaran_vs_Realisasi_' + th,
            cols: [{ k: 'periode', l: 'Periode', t: 'month' }, { k: 'anggaran_ppk', l: 'Anggaran PPK', t: 'rp', sum: true }, { k: 'ppk', l: 'Realisasi PPK', t: 'rp', sum: true }, { k: 'capai', l: 'Capaian', f: (v) => v === null ? '—' : fmt.pct(v, 1) }, { k: 'anggaran_biaya', l: 'Anggaran biaya', t: 'rp', sum: true }, { k: 'biaya_operasional', l: 'Realisasi biaya', t: 'rp', sum: true }] });
          return;
        }
        tb.innerHTML = `${d.peringatan_defisit ? UI.callout('fa-triangle-exclamation', `<b>Defisit ${d.defisit_beruntun} bulan berturut-turut</b> — porsi ${S.boot.set.PERSEN_PENGELOLA || 75}% di bawah biaya tetap (BR-15, Pasal 6 ayat 5). Draf surat evaluasi tersedia di bawah.`, 'merah') : UI.callout('fa-circle-check', 'Defisit beruntun: ' + d.defisit_beruntun + ' bulan. Peringatan otomatis muncul bila mencapai 3 bulan.', 'hijau')}
          ${UI.panel({ t: 'Porsi Pengelola vs Biaya Tetap & Titik Impas ' + th, i: 'fa-scale-balanced', body: '<div style="height:300px"><canvas data-c></canvas></div>', foot: '<span>Titik impas PNBH = biaya tetap ÷ ' + (S.boot.set.PERSEN_PENGELOLA || 75) + '% (BR-16)</span>' })}
          ${UI.panel({ t: 'Tabel kelayakan bulanan', i: 'fa-table', p0: true, body: '<div data-t></div>' })}
          ${d.draf_surat ? UI.panel({ t: 'Draf Surat Evaluasi (Pasal 6 ayat 5)', i: 'fa-envelope-open-text', c: 'merah', body: `<textarea class="form-control" rows="12" data-surat>${esc(d.draf_surat)}</textarea><button class="btn btn-sm btn-biru mt-2" data-copy><i class="fa-solid fa-copy"></i> Salin teks</button>` }) : ''}`;
        UI.chart($('[data-c]', tb), { type: 'bar', data: { labels: lbl, datasets: [{ label: 'Porsi Pengelola', data: b.map((x) => x.hak_pengelola === undefined ? null : x.hak_pengelola), backgroundColor: b.map((x) => x.defisit ? '#DD4B39' : '#00a65a') }, { type: 'line', label: 'Biaya tetap', data: b.map((x) => x.biaya_tetap || null), borderColor: '#00658f', spanGaps: true }, { type: 'line', label: 'Titik impas PNBH', data: b.map((x) => x.titik_impas || null), borderColor: '#E04848', borderDash: [6, 4], spanGaps: true }, { type: 'line', label: 'PNBH', data: b.map((x) => x.pnbh === undefined ? null : x.pnbh), borderColor: '#a46700' }] }, options: { plugins: { tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + fmt.rp(c.raw) } } }, scales: { y: { beginAtZero: true, ticks: { callback: UI.rpTick } } } } });
        UI.table($('[data-t]', tb), { key: 'periode', rows: past, search: false, size: 12, excel: 'Kelayakan_' + th, rowCls: (r) => r.defisit ? 'row-merah' : '',
          cols: [{ k: 'periode', l: 'Periode', t: 'month' }, { k: 'pnbh', l: 'PNBH', t: 'rp' }, { k: 'hak_pengelola', l: 'Porsi Pengelola', t: 'rp' }, { k: 'biaya_tetap', l: 'Biaya tetap', t: 'rp' }, { k: 'titik_impas', l: 'Titik impas PNBH', t: 'rp' }, { k: 'defisit', l: 'Status', f: (v) => v ? UI.badge('Defisit', 'merah') : UI.badge('Aman', 'hijau') }] });
        const cp = $('[data-copy]', tb); if (cp) cp.onclick = () => { navigator.clipboard.writeText($('[data-surat]', tb).value).then(() => UI.toast('Teks disalin')); };
      }, { onError: (e) => { tb.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
    }
  };
  function simTarif(el) {
    const f = [{ n: 'periode', l: 'Periode dasar', t: 'month' }, { n: 'mobil', l: 'Perubahan tarif mobil (%)', t: 'number', neg: true }, { n: 'motor', l: 'Perubahan tarif motor (%)', t: 'number', neg: true }, { n: 'menginap', l: 'Tarif menginap (%)', t: 'number', neg: true }, { n: 'tiket_hilang', l: 'Denda tiket hilang (%)', t: 'number', neg: true }, { n: 'volume', l: 'Asumsi perubahan volume (%)', t: 'number', neg: true }, { n: 'inflasi', l: 'Inflasi biaya (%)', t: 'number' }, { n: 'umk', l: 'Kenaikan UMK (%)', t: 'number' }];
    el.innerHTML = UI.panel({ t: 'Simulasi Tarif (bahan evaluasi tarif 12 bulanan — Pasal 9 ayat 8)', i: 'fa-sliders', body: UI.form(f, { periode: SP.addMonth(SP.periodeNow(), -1), mobil: 0, motor: 0, menginap: 0, tiket_hilang: 0, volume: 0, inflasi: 3, umk: 6 }, { cols: 4 }) + '<button class="btn btn-biru mt-2" data-go><i class="fa-solid fa-play"></i> Jalankan simulasi</button><div data-res class="mt-3"></div>' });
    el.onclick = async (e) => {
      const b = e.target.closest('[data-go]'); if (!b) return;
      const v = UI.readForm(el, f);
      const r = await UI.run(b, () => API.call('analisis.simulasiTarif', { periode: v.periode, perubahan: { mobil: v.mobil, motor: v.motor, menginap: v.menginap, tiket_hilang: v.tiket_hilang }, volume: v.volume, inflasi: v.inflasi, umk: v.umk }, { keepCache: true }));
      const row = (l, k) => `<tr><td>${l}</td><td class="num">${fmt.rp(r.awal[k])}</td><td class="num">${fmt.rp(r.baru[k])}</td><td class="num ${r.baru[k] - r.awal[k] < 0 ? 'text-merah' : 'text-hijau'}">${fmt.rp(r.baru[k] - r.awal[k])}</td></tr>`;
      $('[data-res]', el).innerHTML = `<div class="fs-12 muted mb-1">Dasar: ${fmt.per(r.periode_dasar)} · porsi pendapatan mobil ±${r.porsi_mobil}% (dari volume × tarif jam pertama)</div><table class="tbl"><thead><tr><th>Komponen</th><th class="num">Saat ini</th><th class="num">Simulasi</th><th class="num">Selisih</th></tr></thead><tbody>
        ${row('PPK', 'ppk')}${row('PBJT', 'pbjt')}${row('DC berbayar', 'dc_berbayar')}${row('PNBH', 'pnbh')}${row('Porsi Pengelola', 'hak_pengelola')}${row('Bagian RS (bruto)', 'hak_rs')}${row('Biaya tetap', 'biaya_tetap')}${row('Porsi Pengelola − biaya tetap', 'selisih')}</tbody></table><div class="fs-12 mt-1">Titik impas PNBH setelah penyesuaian biaya: <b>${fmt.rp(r.titik_impas)}</b></div>`;
    };
  }
  function simKelayakan(el) {
    const f = [{ n: 'pertumbuhan_volume', l: 'Pertumbuhan volume/tahun (%)', t: 'number', neg: true }, { n: 'kenaikan_tarif', l: 'Kenaikan tarif/tahun (%)', t: 'number', neg: true }, { n: 'inflasi', l: 'Inflasi biaya variabel (%)', t: 'number' }, { n: 'kenaikan_umk', l: 'Kenaikan UMK / biaya tetap (%)', t: 'number' },
      { n: 'capex_tambahan', l: 'CAPEX tambahan', t: 'money' }, { n: 'pnbh_bulanan', l: 'PNBH/bulan (kosong = rata-rata 3 bulan)', t: 'money' }, { n: 'biaya_tetap_bulanan', l: 'Biaya tetap/bulan (opsional)', t: 'money' }, { n: 'biaya_variabel_bulanan', l: 'Biaya variabel/bulan (opsional)', t: 'money' }];
    el.innerHTML = UI.panel({ t: 'Simulasi Kelayakan Operasi Sementara 5 Tahun tanpa Zona B (Pasal 22 ayat 3)', i: 'fa-chart-line', body: UI.form(f, { pertumbuhan_volume: 3, kenaikan_tarif: 0, inflasi: 3, kenaikan_umk: 6 }, { cols: 4 }) + '<button class="btn btn-biru mt-2" data-go><i class="fa-solid fa-play"></i> Proyeksikan</button><div data-res class="mt-3"></div>' });
    UI.bindForm(el);
    el.onclick = async (e) => {
      const b = e.target.closest('[data-go]'); if (!b) return;
      const r = await UI.run(b, () => API.call('analisis.kelayakan', UI.readForm(el, f), { keepCache: true }));
      $('[data-res]', el).innerHTML = `${UI.callout(r.layak ? 'fa-circle-check' : 'fa-triangle-exclamation', `<b>${r.layak ? 'Layak' : 'Berisiko'}</b> — total laba 5 tahun ${fmt.rp(r.total_laba)}. Dasar: PNBH ${fmt.rp(r.dasar.pnbh_bulanan)}/bulan (${r.dasar.bulan_data} bulan data), biaya tetap ${fmt.rp(r.dasar.biaya_tetap_bulanan)}/bulan.`, r.layak ? 'hijau' : 'merah')}
        <div style="height:240px"><canvas data-c></canvas></div><div data-t class="mt-2"></div>`;
      UI.chart($('[data-c]', el), { type: 'bar', data: { labels: r.tahun.map((x) => 'Tahun ' + x.tahun), datasets: [{ label: 'Porsi Pengelola', data: r.tahun.map((x) => x.hak_pengelola), backgroundColor: '#00a65a' }, { label: 'Biaya total', data: r.tahun.map((x) => x.biaya_tetap + x.biaya_variabel + x.amortisasi), backgroundColor: '#FF6B6B' }, { type: 'line', label: 'Arus kas kumulatif', data: r.tahun.map((x) => x.arus_kas_kumulatif), borderColor: '#00658f' }] }, options: { scales: { y: { ticks: { callback: UI.rpTick } } } } });
      UI.table($('[data-t]', el), { key: 'tahun', rows: r.tahun, search: false, excel: 'Kelayakan_5_Tahun', cols: [{ k: 'tahun', l: 'Tahun' }, { k: 'pnbh', l: 'PNBH', t: 'rp', sum: true }, { k: 'hak_pengelola', l: 'Porsi Pengelola', t: 'rp', sum: true }, { k: 'hak_rs', l: 'Bagian RS', t: 'rp', sum: true }, { k: 'biaya_tetap', l: 'Biaya tetap', t: 'rp', sum: true }, { k: 'biaya_variabel', l: 'Biaya variabel', t: 'rp', sum: true }, { k: 'amortisasi', l: 'Amortisasi', t: 'rp', sum: true }, { k: 'laba', l: 'Laba', t: 'rp', sum: true }, { k: 'arus_kas_kumulatif', l: 'Kas kumulatif', t: 'rp' }] });
    };
  }
})();
