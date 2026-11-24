/* Dashboard — internal (Super Admin/Pimpinan/Admin), Supervisor, Pihak RS (F-02, PRD 7.4) */
(function () {
  'use strict';
  const { esc, fmt, S, API, can, namaLokasi, BLN3, Router } = SP;

  SP.Pages.dashboard = {
    title: 'Dashboard',
    sub: () => can.role('OPERATOR') ? 'Setoran pendapatan shift Anda per pos/gate' : can.role('SUPERVISOR') ? 'Status shift lokasi tugas Anda' : can.role('RS_UMSIDA') ? 'Ringkasan transparansi untuk RS UMSIDA' : 'Panel kendali eksekutif operasional & keuangan',
    prefetch() {
      if (can.role('SUPERVISOR')) API.prefetch('dash.supervisor', {}, { persist: true });
      else if (can.role('OPERATOR')) API.prefetch('dash.operator', {}, { persist: true });
      else if (can.role('RS_UMSIDA')) API.prefetch('dash.rs', { periode: S.periode, lokasi: S.lokasi }, { persist: true });
      else API.prefetch('dash.internal', { periode: S.periode, lokasi: S.lokasi }, { persist: true });
    },
    render(el, p, ctx) {
      if (can.role('SUPERVISOR')) return renderSpv(el, ctx);
      if (can.role('OPERATOR')) return renderOpr(el, ctx);
      if (can.role('RS_UMSIDA')) return renderRS(el, ctx);
      return renderInternal(el, ctx);
    }
  };

  function alertBanner(alerts) {
    const a = (alerts || []).filter((x) => x.lvl !== 'info').slice(0, 2);
    if (!a.length) return '';
    return UI.callout('fa-triangle-exclamation', `<b>Perhatian Operasional:</b> ${a.map((x) => esc(x.teks)).join(' · ')}`, a[0].lvl === 'danger' ? 'merah' : '',
      a[0].link ? `<a class="btn btn-sm btn-oranye" href="${a[0].link}"><i class="fa-solid fa-eye"></i> Tindak lanjuti</a>` : '');
  }
  const bulanLbl = (arr) => arr.map((x) => BLN3[Number(x.periode.slice(5, 7)) - 1]);

  // ================= INTERNAL =================
  function renderInternal(el, ctx) {
    el.innerHTML = UI.skKpi(2, 'col-lg-6') + UI.skKpi(4) + UI.skKpi(4) + UI.skBox(2);
    API.swr('dash.internal', { periode: S.periode, lokasi: S.lokasi }, (d) => { if (ctx.live()) draw(d); },
      { persist: true, onError: (e) => { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
    function draw(d) {
      const k = d.kpi, kl = d.kelayakan, per = fmt.per(d.periode);
      el.innerHTML = `${alertBanner(d.alerts)}
      <div class="row g-3">
        <div class="col-lg-6">${UI.kpi({ v: fmt.rp(k.ppk_bulan), l: 'Pendapatan (PPK) ' + per, c: 'hijau', i: 'fa-money-bills', href: '#/verifikasi', foot: 'Rincian pendapatan lapangan', wide: true })}</div>
        <div class="col-lg-6">${UI.kpi({ v: k.peringatan, l: 'Tenggat & Peringatan Aktif', c: 'oranye', i: 'fa-bell', href: '#/kontrak', foot: 'Evaluasi seluruh peringatan', wide: true })}</div>
      </div>
      <div class="row g-3">
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(k.kendaraan_hari), l: 'Kendaraan Masuk Hari Ini', c: 'biru', i: 'fa-car', href: '#/rekap' })}</div>
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(k.kendaraan_bulan), l: 'Kendaraan Masuk Bulan Ini', c: 'biru', i: 'fa-car-side', href: '#/rekap' })}</div>
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(k.kendaraan_tahun), l: 'Kendaraan Masuk Tahun Ini', c: 'biru', i: 'fa-warehouse', href: '#/laporan' })}</div>
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: k.okupansi_lps === null ? '—' : k.okupansi_lps + '%', l: 'Rata-rata Okupansi Lahan Sementara', c: 'biru', i: 'fa-square-parking', href: '#/sla' })}</div>
      </div>
      <div class="row g-3">
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(k.pendapatan_hari), l: 'Pendapatan Hari Ini', c: 'hijau', i: 'fa-dollar-sign', href: '#/verifikasi', foot: 'Rincian setoran' })}</div>
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(k.pnbh), l: 'PNBH Bulan Ini', c: 'hijau', i: 'fa-calculator', href: '#/rekon', foot: k.mdr_estimasi ? 'MDR masih estimasi' : 'Rincian PNBH' })}</div>
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(k.hak_pengelola), l: 'Porsi Pengelola ' + (S.boot.set.PERSEN_PENGELOLA || 75) + '%', c: 'hijau', i: 'fa-building', href: '#/pengeluaran', foot: 'Alokasi Pengelola' })}</div>
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(k.hak_rs), l: 'Bagian RS ' + (S.boot.set.PERSEN_RS || 25) + '% (bruto)', c: 'hijau', i: 'fa-hospital', href: '#/rekon', foot: 'Kewajiban setor RS' })}</div>
      </div>
      <div class="row g-3">
        <div class="col-lg-6">${UI.panel({ t: 'Grafik Kendaraan per Jenis & Lokasi', i: 'fa-chart-column', body: '<div style="height:280px"><canvas data-c1></canvas></div>', foot: `<span>Kendaraan masuk ${esc(per)}</span>` })}</div>
        <div class="col-lg-6">${UI.panel({ t: 'Grafik Pendapatan per Bulan', i: 'fa-chart-line', body: '<div style="height:280px"><canvas data-c2></canvas></div>', foot: `<span>PPK tahun ${esc(d.periode.slice(0, 4))} (bulan berjalan = estimasi)</span>` })}</div>
      </div>
      <div class="row g-3">
        <div class="col-lg-6">${UI.panel({ t: 'Porsi 75% vs Biaya Tetap', i: 'fa-scale-balanced', c: kl.defisit_beruntun >= 2 ? 'merah' : '', tools: kl.defisit_beruntun ? `<span class="badge-s s-merah">Defisit ${kl.defisit_beruntun} bln beruntun</span>` : '',
          body: `${kl.biaya_tetap ? `<div class="mb-2 fs-13">Porsi Pengelola <b>${fmt.rp(kl.hak_pengelola)}</b> ${kl.hak_pengelola >= kl.biaya_tetap ? 'menutup' : '<span class="text-merah">belum menutup</span>'} biaya tetap <b>${fmt.rp(kl.biaya_tetap)}</b> (${fmt.pct(kl.persen_tutup, 1)}).</div>
            <div class="progress mb-1"><div class="progress-bar" style="width:${Math.min(100, kl.persen_tutup || 0)}%;${kl.persen_tutup < 100 ? 'background:var(--merah-2)' : ''}"></div></div>
            <div class="d-flex justify-content-between fs-12 text-merah mb-2"><span>Titik impas PNBH: ${fmt.rp(kl.titik_impas)}</span><span>PNBH kini: ${fmt.rp(kl.pnbh)}</span></div>` : UI.callout('fa-circle-info', 'Biaya tetap belum tercatat (isi Pengeluaran berkategori Tetap atau Anggaran).', 'biru')}
            <div style="height:200px"><canvas data-c3></canvas></div>
            <div class="row g-2 mt-1"><div class="col-6">${UI.mini('Biaya operasional bulan ini', fmt.rp(kl.biaya_operasional))}</div><div class="col-6">${UI.mini('Estimasi laba/rugi bersih', `<span class="${kl.laba_rugi < 0 ? 'text-merah' : 'text-hijau'}">${fmt.rp(kl.laba_rugi)}</span>`, kl.laba_rugi < 0 ? 'merah' : 'hijau')}</div></div>` })}</div>
        <div class="col-lg-6">${UI.panel({ t: 'Peta Jam Sibuk (Okupansi per Jam)', i: 'fa-table-cells', c: 'aqua', body: UI.heatmap(d.grafik.heatmap.grid, d.grafik.heatmap.satuan) })}</div>
      </div>
      <div class="row g-3">
        <div class="col-lg-6">${UI.panel({ t: 'Tenggat Terdekat & Kepatuhan PKS', i: 'fa-calendar-check', c: 'oranye', p0: true, body: tenggatTable(d.tenggat), foot: '<span>Dipantau dari Kalender Kewajiban</span><a href="#/kontrak">Seluruh kontrak →</a>' })}</div>
        <div class="col-lg-6">${UI.panel({ t: 'Dana Cadangan Risiko & Klaim', i: 'fa-shield-halved', tools: '<span class="badge-s s-hijau">Pasal 16 PKS</span>', body: dcPanel(d.dc), foot: '<span>Saldo dibagi 50:50 saat PKS berakhir</span><a href="#/dc">Buku Dana Cadangan →</a>' })}</div>
      </div>`;
      charts(el, d.grafik, d.kelayakan);
    }
  }
  function tenggatTable(t) {
    if (!t || !t.length) return UI.empty('Tidak ada tenggat dekat');
    return `<table class="tbl"><thead><tr><th>Kewajiban / Klausul</th><th>Tenggat</th><th class="text-end">Sisa</th></tr></thead><tbody>${t.map((x) => `<tr><td><div class="fw-600">${esc(x.uraian.slice(0, 70))}</div><div class="fs-11 muted">Pasal ${esc(x.pasal)} · ${esc(x.pihak)}</div></td><td>${fmt.tgl(x.tenggat)}</td><td class="text-end">${UI.badge(UI.sisaTeks(x.sisa), UI.sisaWarna(x.sisa))}</td></tr>`).join('')}</tbody></table>`;
  }
  function dcPanel(dc) {
    return `<div class="mini l-hijau mb-2"><div class="lb">Total saldo kas khusus cadangan klaim</div><div class="vl text-hijau" style="font-size:28px">${fmt.rp(dc.saldo)}</div></div>
      <div class="row g-2 mb-2"><div class="col-6">${UI.mini('Kontribusi berbayar (berjalan)', fmt.rp(dc.kontribusi_berbayar), '', fmt.n(dc.trx_berbayar) + ' trx × Rp' + (S.boot.set.DC_PER_TRX || 500))}</div><div class="col-6">${UI.mini('Kontribusi parkir gratis', fmt.rp(dc.kontribusi_gratis), '', fmt.n(dc.trx_gratis) + ' trx × Rp' + (S.boot.set.DC_PER_TRX || 500))}</div></div>
      ${dc.klaim.length ? dc.klaim.map((k) => `<div class="callout c-merah mb-2" style="box-shadow:none;border:1px solid #f3c5bf;border-left-width:4px"><i class="fa-solid fa-triangle-exclamation"></i><div class="flex-fill fs-13"><b>${esc(k.id_klaim)}</b> · ${esc(k.merek_tipe_tahun || k.jenis_kendaraan)} ${esc(k.nopol)}<div class="fs-12">Lokasi ${esc(namaLokasi(k.id_lokasi))} · Status: <b>${esc(k.status)}</b>${k.tenggat_keputusan ? ' · Tenggat ' + fmt.tgl(k.tenggat_keputusan) : ''}</div></div><a class="btn btn-xs btn-merah" href="#/dc?klaim=${esc(k.id_klaim)}">Detail</a></div>`).join('') : '<div class="muted fs-13"><i class="fa-solid fa-circle-check text-hijau"></i> Tidak ada klaim aktif</div>'}`;
  }
  function charts(el, g, kl) {
    const lok = g.per_jenis || [];
    UI.chart(el.querySelector('[data-c1]'), { type: 'bar', data: { labels: lok.map((x) => x.nama.length > 22 ? x.id_lokasi : x.nama), datasets: [
      { label: 'Mobil', data: lok.map((x) => x.mobil), backgroundColor: '#FF6B6B', borderColor: '#E04848', borderWidth: 1 },
      { label: 'Motor', data: lok.map((x) => x.motor), backgroundColor: '#3C8DBC' }] }, options: { scales: { y: { beginAtZero: true } } } });
    const pb = g.per_bulan || [];
    UI.chart(el.querySelector('[data-c2]'), { type: 'bar', data: { labels: bulanLbl(pb), datasets: [{ label: 'PPK', data: pb.map((x) => x.ppk), backgroundColor: pb.map((x) => x.periode === S.periode ? '#006a37' : '#FF6B6B'), borderColor: '#E04848', borderWidth: 1 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmt.rp(c.raw) } } }, scales: { y: { beginAtZero: true, ticks: { callback: UI.rpTick } } } } });
    if (kl) UI.chart(el.querySelector('[data-c3]'), { type: 'bar', data: { labels: bulanLbl(pb), datasets: [
      { type: 'bar', label: 'Porsi Pengelola', data: pb.map((x) => x.hak_pengelola), backgroundColor: '#FF6B6B' },
      { type: 'line', label: 'Biaya tetap', data: pb.map((x) => x.biaya_tetap || null), borderColor: '#3C8DBC', backgroundColor: '#3C8DBC', tension: .2, spanGaps: true }] },
      options: { plugins: { tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + fmt.rp(c.raw) } } }, scales: { y: { beginAtZero: true, ticks: { callback: UI.rpTick } } } } });
  }

  // ================= SUPERVISOR =================
  function renderSpv(el, ctx) {
    el.innerHTML = UI.skKpi(4) + UI.skBox(1);
    API.swr('dash.supervisor', {}, (d) => { if (ctx.live()) draw(d); }, { persist: true, onError: (e) => { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
    function draw(d) {
      const k = d.kpi, sa = d.shift_aktif;
      const hari = d.status.filter((x) => x.tanggal === SP.today()), kemarin = d.status.filter((x) => x.tanggal !== SP.today());
      const grid = (arr) => `<div class="row g-2">${arr.map((x) => `<div class="col-md-6"><div class="mini ${x.status === 'Belum Ada' || x.status === 'Ditolak' ? 'l-merah' : x.status === 'Draft' ? 'l-oranye' : 'l-hijau'}">
        <div class="d-flex justify-content-between"><div class="lb">${esc(x.nama_shift)} · ${esc(namaLokasi(x.id_lokasi))}</div>${UI.badge(x.status)}</div>
        <div class="fs-13 mt-1">${x.status === 'Belum Ada' ? 'Rekap belum diinput' : `${fmt.n(x.kendaraan)} kendaraan · ${fmt.rp(x.total)}${x.selisih ? ` · <span class="text-merah">selisih ${fmt.rp(x.selisih)}</span>` : ''}`}</div>
        ${x.alasan_tolak ? `<div class="fs-12 text-merah">Ditolak: ${esc(x.alasan_tolak)}</div>` : ''}
        <div class="mt-2">${x.status === 'Belum Ada' ? `<a class="btn btn-sm btn-hijau" href="#/rekap?baru=1&tanggal=${x.tanggal}&shift=${x.id_shift}&lokasi=${x.id_lokasi}"><i class="fa-solid fa-plus"></i> Input</a>` : (x.status === 'Draft' || x.status === 'Ditolak') ? `<a class="btn btn-sm btn-oranye" href="#/rekap?id=${x.id_rekap}"><i class="fa-solid fa-pen"></i> Lanjutkan</a>` : ''}</div></div></div>`).join('')}</div>`;
      el.innerHTML = `${alertBanner(d.alerts)}
        <div class="row g-3">
          <div class="col-6 col-xl-3">${UI.kpi({ v: k.belum, l: 'Rekap Perlu Tindakan', c: k.belum ? 'oranye' : 'hijau', i: 'fa-clipboard-list', sub: 'kemarin & hari ini' })}</div>
          <div class="col-6 col-xl-3">${UI.kpi({ v: fmt.n(k.kendaraan_shift), l: 'Kendaraan Shift Ini', c: 'biru', i: 'fa-car', sub: sa ? sa.nama + ' ' + sa.jam_mulai + '–' + sa.jam_selesai : '' })}</div>
          <div class="col-6 col-xl-3">${UI.kpi({ v: fmt.rps(k.pendapatan_shift), l: 'Pendapatan Shift Ini', c: 'hijau', i: 'fa-money-bill' })}</div>
          <div class="col-6 col-xl-3">${UI.kpi({ v: fmt.rp(k.selisih_hari), l: 'Selisih Kas Hari Ini', c: k.selisih_hari ? 'merah' : 'hijau', i: 'fa-scale-unbalanced' })}</div>
        </div>
        ${setoranMenunggu(d.setoran_menunggu)}
        <a href="#/rekap?baru=1" class="btn btn-hijau w-100 btn-big mb-3 fs-5"><i class="fa-solid fa-square-plus"></i> REKAP SHIFT</a>
        ${UI.panel({ t: 'Status Rekap Hari Ini', i: 'fa-clock', body: grid(hari) })}
        ${UI.panel({ t: 'Status Rekap Kemarin', i: 'fa-clock-rotate-left', c: 'biru', body: grid(kemarin) })}
        <div class="row g-3"><div class="col-lg-6">${UI.panel({ t: 'Kuota Pengecualian Darurat (BR-18)', i: 'fa-truck-medical', c: 'merah', body: daruratSlots(d.gratis), foot: '<a href="#/gratis">Kelola darurat & pelanggaran →</a>' })}</div>
        <div class="col-lg-6">${UI.panel({ t: 'Rekap Terakhir Saya', i: 'fa-list', p0: true, body: d.terakhir.length ? `<table class="tbl"><tbody>${d.terakhir.map((r) => `<tr class="clickable" onclick="location.hash='#/rekap?id=${esc(r.id_rekap)}'"><td>${fmt.tgl(r.tanggal_operasi)}<div class="fs-11 muted">${esc(r.id_shift)} · ${esc(r.id_lokasi)}</div></td><td class="num">${fmt.rp(r.total_diterima)}</td><td class="text-end">${UI.badge(r.status)}</td></tr>`).join('')}</tbody></table>` : UI.empty() })}</div></div>`;
    }
  }
  /** Supervisor: daftar setoran operator yang menunggu diterima */
  function setoranMenunggu(list) {
    if (!list || !list.length) return '';
    const grup = {};
    list.forEach((x) => { const k = x.tanggal_operasi + '|' + x.id_shift + '|' + x.id_lokasi; (grup[k] = grup[k] || []).push(x); });
    return UI.panel({ t: `Setoran Operator Menunggu Diterima <span class="badge-s s-oranye">${list.length}</span>`, i: 'fa-hand-holding-dollar', c: 'oranye', p0: true,
      body: `<table class="tbl"><tbody>${Object.keys(grup).map((k) => { const g = grup[k], x = g[0]; return `<tr class="clickable" onclick="location.hash='#/rekap?baru=1&tanggal=${esc(x.tanggal_operasi)}&shift=${esc(x.id_shift)}&lokasi=${esc(x.id_lokasi)}'">
        <td>${fmt.tgl(x.tanggal_operasi)} · ${esc(x.id_shift)}<div class="fs-11 muted">${esc(namaLokasi(x.id_lokasi))} · ${g.map((y) => esc(y.nama_operator) + (y.pos ? ' (' + esc(y.pos) + ')' : '')).join(', ')}</div></td>
        <td class="num">${fmt.rp(g.reduce((a, y) => a + (y.total_diterima || 0), 0))}</td><td class="text-end"><span class="btn btn-xs btn-oranye">Periksa</span></td></tr>`; }).join('')}</tbody></table>`,
      foot: '<span class="fs-12">Terima setoran di formulir Rekap Shift — jumlahnya bisa langsung dipakai mengisi rekap.</span><a href="#/setoran">Semua setoran →</a>' });
  }

  // ================= OPERATOR =================
  function renderOpr(el, ctx) {
    el.innerHTML = UI.skKpi(4) + UI.skBox(1);
    API.swr('dash.operator', {}, (d) => { if (ctx.live()) draw(d); }, { persist: true, onError: (e) => { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
    function draw(d) {
      const k = d.kpi, sa = d.shift_aktif;
      const lbl = (x) => x.status === 'Belum Ada' ? 'Belum diinput' : x.status === 'Draft' ? 'Draft — belum diserahkan' : x.status === 'Diserahkan' ? 'Menunggu diterima Supervisor' : x.status === 'Diterima' ? 'Diterima Supervisor' : x.status === 'Direkap' ? 'Sudah masuk rekap shift' : x.status;
      const grid = (arr) => `<div class="row g-2">${arr.map((x) => `<div class="col-md-6"><div class="mini ${x.status === 'Belum Ada' || x.status === 'Dikembalikan' ? 'l-merah' : x.status === 'Draft' || x.status === 'Diserahkan' ? 'l-oranye' : 'l-hijau'}">
        <div class="d-flex justify-content-between"><div class="lb">${esc(x.nama_shift)} · ${esc(namaLokasi(x.id_lokasi))}</div>${UI.badge(x.status)}</div>
        <div class="fs-13 mt-1">${esc(lbl(x))}${x.total ? ' · ' + fmt.rp(x.total) : ''}</div>
        ${x.alasan ? `<div class="fs-12 text-merah">Dikembalikan: ${esc(x.alasan)}</div>` : ''}
        <div class="mt-2">${x.status === 'Belum Ada' ? `<a class="btn btn-sm btn-hijau" href="#/setoran?baru=1&tanggal=${x.tanggal}&shift=${x.id_shift}&lokasi=${x.id_lokasi}"><i class="fa-solid fa-plus"></i> Input</a>` : (x.status === 'Draft' || x.status === 'Dikembalikan') ? `<a class="btn btn-sm btn-oranye" href="#/setoran?id=${x.id_setoran}"><i class="fa-solid fa-pen"></i> ${x.status === 'Draft' ? 'Lanjutkan' : 'Perbaiki'}</a>` : ''}</div></div></div>`).join('')}</div>`;
      const hari = d.status.filter((x) => x.tanggal === SP.today()), kemarin = d.status.filter((x) => x.tanggal !== SP.today());
      const baru = sa ? `#/setoran?baru=1&tanggal=${sa.tanggal}&shift=${sa.id_shift}` : '#/setoran?baru=1';
      el.innerHTML = `${alertBanner(d.alerts)}
        <div class="row g-3">
          <div class="col-6 col-xl-3">${UI.kpi({ v: fmt.n(k.setoran_bulan), l: 'Setoran Bulan Ini', c: 'biru', i: 'fa-receipt', sub: sa ? 'Shift aktif: ' + sa.nama + ' ' + sa.jam_mulai + '–' + sa.jam_selesai : '' })}</div>
          <div class="col-6 col-xl-3">${UI.kpi({ v: fmt.rps(k.total_bulan), l: 'Pendapatan Bulan Ini', c: 'hijau', i: 'fa-money-bill' })}</div>
          <div class="col-6 col-xl-3">${UI.kpi({ v: fmt.n(k.menunggu), l: 'Menunggu Diterima', c: k.menunggu ? 'oranye' : 'hijau', i: 'fa-hourglass-half' })}</div>
          <div class="col-6 col-xl-3">${UI.kpi({ v: fmt.n(k.dikembalikan), l: 'Perlu Diperbaiki', c: k.dikembalikan ? 'merah' : 'hijau', i: 'fa-rotate-left' })}</div>
        </div>
        <a href="${baru}" class="btn btn-hijau w-100 btn-big mb-3 fs-5"><i class="fa-solid fa-square-plus"></i> INPUT SETORAN SHIFT</a>
        ${UI.panel({ t: 'Setoran Hari Ini', i: 'fa-clock', body: grid(hari) })}
        ${UI.panel({ t: 'Setoran Kemarin', i: 'fa-clock-rotate-left', c: 'biru', body: grid(kemarin) })}
        ${UI.panel({ t: 'Setoran Terakhir Saya', i: 'fa-list', p0: true, body: d.terakhir.length ? `<table class="tbl"><tbody>${d.terakhir.map((r) => `<tr class="clickable" onclick="location.hash='#/setoran?id=${esc(r.id_setoran)}'"><td>${fmt.tgl(r.tanggal_operasi)}<div class="fs-11 muted">${esc(r.id_shift)} · ${esc(r.id_lokasi)}${r.pos ? ' · ' + esc(r.pos) : ''}</div></td><td class="num">${fmt.rp(r.total_diterima)}</td><td class="text-end">${UI.badge(r.status)}</td></tr>`).join('')}</tbody></table>` : UI.empty('Belum ada setoran'), foot: '<a href="#/setoran">Semua riwayat setoran →</a>' })}`;
    }
  }
  function daruratSlots(g) {
    const n = g.darurat_maks || 2, act = g.darurat_aktif || [];
    return `<div class="row g-2">${Array.from({ length: n }, (_, i) => { const x = act[i]; return `<div class="col-6"><div class="slot ${x ? 'isi' : 'kosong'}"><div class="fs-12 fw-600">SLOT DARURAT ${i + 1} ${x ? '<span class="badge-s s-merah">TERPAKAI</span>' : '<span class="badge-s s-hijau">KOSONG</span>'}</div>
      ${x ? `<div class="fw-700 mt-1">${esc(x.nopol)}</div><div class="fs-12">${esc(x.deskripsi || '')}</div><div class="fs-11 muted">Otorisasi: ${esc(x.pejabat_penyetuju)} · masuk ${fmt.jam(x.waktu)}</div>` : '<div class="fs-12 muted mt-2">Siap untuk panggilan medis/on-call</div>'}</div></div>`; }).join('')}</div>`;
  }

  // ================= RS UMSIDA =================
  function renderRS(el, ctx) {
    el.innerHTML = UI.skKpi(4) + UI.skKpi(4) + UI.skBox(2);
    API.swr('dash.rs', { periode: S.periode, lokasi: S.lokasi }, (d) => { if (ctx.live()) draw(d); }, { persist: true, onError: (e) => { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
    function draw(d) {
      const k = d.kpi, per = fmt.per(d.periode);
      el.innerHTML = `${alertBanner(d.alerts)}
        ${d.rekon_menunggu.map((r) => UI.callout('fa-file-signature', `BA Rekonsiliasi <b>${fmt.per(r.periode)}</b> menunggu konfirmasi Anda — bagian RS <b>${fmt.rp(r.hak_rs_neto)}</b>, tenggat ${fmt.tgl(r.tgl_ba)}.`, 'biru', `<a class="btn btn-sm btn-hijau" href="#/rekon?periode=${r.periode}">Tinjau & konfirmasi</a>`)).join('')}
        <div class="row g-3">
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(k.ppk_bulan), l: 'Pendapatan (PPK) ' + per, c: 'hijau', i: 'fa-money-bills', href: '#/rekon' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(k.pnbh), l: 'PNBH Bulan Ini', c: 'hijau', i: 'fa-calculator', href: '#/rekon' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(k.hak_rs_bruto), l: 'Bagian RS ' + (S.boot.set.PERSEN_RS || 25) + '% (bruto)', c: 'hijau', i: 'fa-hospital', sub: 'Neto (estimasi): ' + fmt.rp(k.hak_rs_neto), href: '#/rekon' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(k.trx_gratis), l: 'Transaksi Gratis Bulan Ini', c: 'aqua', i: 'fa-id-card', sub: 'Kontribusi DC ' + fmt.rp(k.dc_gratis), href: '#/gratis' })}</div>
        </div>
        <div class="row g-3">
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(k.kendaraan_bulan), l: 'Kendaraan Masuk Bulan Ini', c: 'biru', i: 'fa-car', sub: 'Hari ini ' + fmt.n(k.kendaraan_hari) + ' · Tahun ' + fmt.n(k.kendaraan_tahun) })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.n(k.pelanggaran), l: 'Pelanggaran Zonasi', c: 'merah', i: 'fa-ban', href: '#/gratis' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(k.saldo_dc), l: 'Saldo Dana Cadangan', c: 'hijau', i: 'fa-shield-halved', sub: k.klaim_aktif + ' klaim aktif', href: '#/dc' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: k.skor_sla === null ? '—' : fmt.pct(k.skor_sla, 1), l: 'Skor SLA Triwulan', c: 'aqua', i: 'fa-stopwatch', sub: 'Okupansi LPS ' + (k.okupansi_lps === null ? '—' : k.okupansi_lps + '%'), href: '#/sla' })}</div>
        </div>
        <div class="row g-3">
          <div class="col-lg-6">${UI.panel({ t: 'Grafik Kendaraan per Jenis & Lokasi', i: 'fa-chart-column', body: '<div style="height:260px"><canvas data-c1></canvas></div>' })}</div>
          <div class="col-lg-6">${UI.panel({ t: 'Grafik Pendapatan per Bulan', i: 'fa-chart-line', body: '<div style="height:260px"><canvas data-c2></canvas></div>' })}</div>
        </div>
        <div class="row g-3">
          <div class="col-lg-6">${UI.panel({ t: 'Pelanggaran Zonasi per Minggu', i: 'fa-ban', c: 'merah', body: '<div style="height:220px"><canvas data-c4></canvas></div>', foot: '<a href="#/gratis">Rekap per penerima →</a>' })}</div>
          <div class="col-lg-6">${UI.panel({ t: 'Peta Jam Sibuk', i: 'fa-table-cells', c: 'aqua', body: UI.heatmap(d.grafik.heatmap.grid, d.grafik.heatmap.satuan) })}</div>
        </div>
        <div class="row g-3">
          <div class="col-lg-6">${UI.panel({ t: 'Tenggat & Kewajiban', i: 'fa-calendar-check', c: 'oranye', p0: true, body: tenggatTable(d.tenggat) })}</div>
          <div class="col-lg-6">${UI.panel({ t: 'Status Klaim Kehilangan', i: 'fa-shield-halved', p0: true, body: d.klaim.length ? `<table class="tbl"><thead><tr><th>ID</th><th>Lokasi</th><th>Status</th><th class="num">Ganti rugi</th></tr></thead><tbody>${d.klaim.map((x) => `<tr><td>${esc(x.id_klaim)}</td><td>${esc(x.id_lokasi)}</td><td>${UI.badge(x.status)}</td><td class="num">${fmt.rp(x.ganti_rugi_disetujui)}</td></tr>`).join('')}</tbody></table>` : UI.empty('Tidak ada klaim aktif') })}</div>
        </div>`;
      charts(el, d.grafik, null);
      const pm = d.grafik.pelanggaran_minggu || [];
      UI.chart(el.querySelector('[data-c4]'), { type: 'bar', data: { labels: pm.map((x) => 'Mg ' + fmt.tgl(x.minggu).slice(0, 6)), datasets: [{ label: 'Pelanggaran', data: pm.map((x) => x.jumlah), backgroundColor: '#DD4B39' }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    }
  }
})();
