/* Laporan (F-18), Kontak & WhatsApp/CRM, Pengguna (F-19), Pengaturan (F-20), Panel Kendali Sistem (F-21), Ganti Password */
(function () {
  'use strict';
  const { $, $$, esc, fmt, S, API, can, LS, Files, Lib, Router, master, namaLokasi } = SP;

  // =====================================================================
  //  LAPORAN
  // =====================================================================
  const LAP = [
    { id: 'resmi', t: 'Laporan Bulanan · BA Rekonsiliasi · Laporan Dana Cadangan', d: 'PDF resmi ber-QR (Pasal 10 ay. 2, Pasal 16 ay. 15)', i: 'fa-file-pdf', r: ['SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU', 'RS_UMSIDA'], link: '#/rekon' },
    { id: 'rekap_shift', t: 'Rekap shift per periode / lokasi', d: 'Excel — seluruh rekap periode & lokasi terpilih', i: 'fa-table-list', r: ['SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU', 'SUPERVISOR'] },
    { id: 'bagi_hasil_lokasi', t: 'Bagi hasil per lokasi', d: 'Excel — kontribusi PPK, PBJT, PNBH per lokasi', i: 'fa-location-dot', r: ['SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU', 'RS_UMSIDA'] },
    { id: 'laba_rugi', t: 'Laba-rugi Pengelola', d: 'Excel / PDF — per bulan tahun berjalan', i: 'fa-chart-area', r: ['SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU'] },
    { id: 'pbjt', t: 'Rekap PBJT', d: 'Excel — dasar pengenaan, PBJT & status setor', i: 'fa-receipt', r: ['SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU', 'RS_UMSIDA'] },
    { id: 'gratis', t: 'Parkir gratis & pelanggaran zonasi per penerima', d: 'Excel / PDF — bahan penegakan disiplin', i: 'fa-ban', r: ['SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU', 'RS_UMSIDA'] },
    { id: 'sla', t: 'Skor SLA triwulan', d: 'PDF / Excel — capaian per jenis kejadian', i: 'fa-stopwatch', r: ['SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU', 'RS_UMSIDA'] },
    { id: 'aset', t: 'Daftar aset semesteran', d: 'Excel / PDF — versi RS tanpa nilai rupiah', i: 'fa-boxes-stacked', r: ['SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU', 'RS_UMSIDA'] },
    { id: 'dana_cadangan', t: 'Buku Dana Cadangan', d: 'Excel — mutasi periode & saldo', i: 'fa-shield-halved', r: ['SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU', 'RS_UMSIDA'] },
    { id: 'kompensasi', t: 'Kalkulasi kompensasi pengakhiran', d: 'PDF — menu Aset & CAPEX', i: 'fa-calculator', r: ['SUPER_ADMIN', 'PIMPINAN'], link: '#/aset' },
    { id: 'audit', t: 'Paket Audit periode', d: 'ZIP — Excel per sheet + PDF resmi + potongan Audit_Log (Pasal 18)', i: 'fa-file-zipper', r: ['SUPER_ADMIN', 'PIMPINAN', 'RS_UMSIDA'] }
  ];
  const KOL = {
    rekap_shift: (d) => ({ rows: d.rows, cols: [{ k: 'tanggal_operasi', l: 'Tanggal', t: 'tgl' }, { k: 'id_shift', l: 'Shift' }, { k: 'id_lokasi', l: 'Lokasi' }, { k: 'sumber', l: 'Sumber' }, { k: 'trx_berbayar', l: 'Trx bayar', t: 'n', sum: true }, { k: 'trx_gratis', l: 'Trx gratis', t: 'n', sum: true }, { k: 'total_diterima', l: 'Total', t: 'rp', sum: true }, { k: 'tunai', l: 'Tunai', t: 'rp', sum: true }, { k: 'qris', l: 'QRIS', t: 'rp', sum: true }, { k: 'pbjt', l: 'PBJT', t: 'rp', sum: true }, { k: 'selisih_kas', l: 'Selisih', t: 'rp', sum: true }, { k: 'status', l: 'Status' }] }),
    bagi_hasil_lokasi: (d) => ({ rows: d.per_lokasi, cols: [{ k: 'id_lokasi', l: 'Lokasi' }, { k: 'trx_berbayar', l: 'Trx bayar', t: 'n', sum: true }, { k: 'trx_gratis', l: 'Trx gratis', t: 'n', sum: true }, { k: 'ppk', l: 'PPK', t: 'rp', sum: true }, { k: 'pbjt', l: 'PBJT', t: 'rp', sum: true }, { k: 'dc_berbayar', l: 'DC berbayar', t: 'rp', sum: true }, { k: 'pnbh', l: 'PNBH', t: 'rp', sum: true }, { k: 'hak_pengelola', l: 'Pengelola', t: 'rp', sum: true }, { k: 'hak_rs', l: 'RS bruto', t: 'rp', sum: true }] }),
    laba_rugi: (d) => ({ rows: d.bulan.filter((x) => !x.kosong), cols: [{ k: 'periode', l: 'Periode', t: 'month' }, { k: 'pnbh', l: 'PNBH', t: 'rp', sum: true }, { k: 'hak_pengelola', l: 'Porsi Pengelola', t: 'rp', sum: true }, { k: 'biaya_tetap', l: 'Biaya tetap', t: 'rp', sum: true }, { k: 'biaya_variabel', l: 'Biaya variabel', t: 'rp', sum: true }, { k: 'amortisasi', l: 'Amortisasi', t: 'rp', sum: true }, { k: 'laba_rugi', l: 'Laba/rugi', t: 'rp', sum: true }] }),
    pbjt: (d) => ({ rows: d.bulan, cols: [{ k: 'periode', l: 'Periode', t: 'month' }, { k: 'dasar_pengenaan', l: 'Dasar pengenaan', t: 'rp', sum: true }, { k: 'pbjt', l: 'PBJT', t: 'rp', sum: true }, { k: 'pbjt_gate', l: 'Pembanding gate', t: 'rp', sum: true }, { k: 'status_setor', l: 'Status setor' }, { k: 'tgl_setor', l: 'Tgl setor', t: 'tgl' }] }),
    gratis: (d) => ({ rows: d.rekap, cols: [{ k: 'nama', l: 'Nama' }, { k: 'nopol', l: 'Nopol' }, { k: 'kategori', l: 'Kategori' }, { k: 'unit', l: 'Unit' }, { k: 'jumlah', l: 'Pelanggaran', t: 'n', sum: true }, { k: 'total_menit', l: 'Durasi (mnt)', t: 'n', sum: true }, { k: 'total_tarif', l: 'Tarif ditagih', t: 'rp', sum: true }] }),
    sla: (d) => ({ rows: d.per_jenis, cols: [{ k: 'jenis', l: 'Jenis kejadian' }, { k: 'jumlah', l: 'Kejadian', t: 'n', sum: true }, { k: 'selesai', l: 'Selesai', t: 'n', sum: true }, { k: 'tepat_waktu', l: 'Tepat waktu', t: 'n', sum: true }, { k: 'target_menit', l: 'Target (mnt)', t: 'n' }, { k: 'persen', l: 'Capaian %', t: 'number' }, { k: 'rata_menit', l: 'Rata-rata (mnt)', t: 'n' }], info: 'Skor SLA TW ' + d.triwulan + ' ' + d.tahun + ': ' + (d.skor === null ? '—' : fmt.pct(d.skor, 1)) }),
    aset: (d) => ({ rows: d.aset, cols: [{ k: 'kode_aset', l: 'Kode' }, { k: 'nama', l: 'Nama' }, { k: 'nomor_seri', l: 'No. seri' }, { k: 'id_lokasi', l: 'Lokasi' }, { k: 'klasifikasi', l: 'Klasifikasi' }, { k: 'tgl_perolehan', l: 'Perolehan', t: 'tgl' }, { k: 'kondisi', l: 'Kondisi' }].concat(can.role('RS_UMSIDA') ? [] : [{ k: 'nilai_perolehan', l: 'Nilai', t: 'rp', sum: true }, { k: 'nilai_belum_pulih', l: 'Belum pulih', t: 'rp', sum: true }]) }),
    dana_cadangan: (d) => ({ rows: d.mutasi, cols: [{ k: 'tanggal', l: 'Tanggal', t: 'tgl' }, { k: 'jenis', l: 'Jenis' }, { k: 'ref', l: 'Referensi' }, { k: 'uraian', l: 'Uraian' }, { k: 'debit', l: 'Debit', t: 'rp', sum: true }, { k: 'kredit', l: 'Kredit', t: 'rp', sum: true }, { k: 'saldo_berjalan', l: 'Saldo', t: 'rp' }], info: 'Saldo awal ' + fmt.rp(d.saldo_awal) + ' · saldo akhir ' + fmt.rp(d.saldo_akhir) })
  };
  SP.Pages.laporan = {
    sub: 'Laporan resmi, rekap & ekspor Excel/PDF/ZIP',
    render(el) {
      const daftar = LAP.filter((l) => l.r.indexOf(S.user.peran) > -1);
      el.innerHTML = `<div class="row g-3">${daftar.map((l) => `<div class="col-md-6 col-xl-4"><div class="panel h-100 mb-0"><div class="panel-b d-flex gap-3"><i class="fa-solid ${l.i} fa-2x text-hijau"></i><div class="flex-fill"><div class="fw-700">${esc(l.t)}</div><div class="fs-12 muted mb-2">${esc(l.d)}</div>
        ${l.link ? `<a class="btn btn-sm btn-biru" href="${l.link}">Buka</a>` : `<button class="btn btn-sm btn-biru" data-lap="${l.id}"><i class="fa-solid fa-eye"></i> Lihat & unduh</button>`}</div></div></div></div>`).join('')}</div>`;
      el.onclick = (e) => { const b = e.target.closest('[data-lap]'); if (b) b.dataset.lap === 'audit' ? paketAudit(b) : lihat(b.dataset.lap); };
    }
  };
  async function paketAudit(btn) {
    const c = await UI.confirm({ title: 'Paket Audit', msg: `Buat paket audit periode <b>${fmt.per(S.periode)}</b> (Excel per sheet, PDF resmi, potongan Audit_Log)? Proses dapat memakan 30–60 detik.`, ok: 'Buat ZIP' });
    if (!c) return;
    const r = await UI.run(btn, () => API.call('laporan.paketAudit', { periode: S.periode }, { timeout: 300000, keepCache: true }), 'Paket audit dibuat & diarsipkan');
    if (r.data) Files.download(r.data, r.nama, 'application/zip'); else UI.toast('ZIP besar — unduh dari folder Drive "08 Paket Audit"', 'warn');
  }
  async function lihat(jenis) {
    const L = LAP.find((x) => x.id === jenis);
    const m = UI.modal({ title: esc(L.t) + ' — ' + (['laba_rugi', 'pbjt', 'aset'].indexOf(jenis) > -1 ? S.periode.slice(0, 4) : fmt.per(S.periode)), size: 'xl', body: '<div class="sk box"></div>', foot: '<button class="btn btn-abu" data-x>Tutup</button><button class="btn btn-biru" data-pdf><i class="fa-solid fa-file-pdf"></i> Unduh PDF</button>' });
    try {
      const d = await API.get('laporan.data', { jenis, periode: S.periode, tahun: S.periode.slice(0, 4), lokasi: S.lokasi, triwulan: Math.ceil(Number(S.periode.slice(5, 7)) / 3) }, { ttl: 30000 });
      const k = KOL[jenis](d);
      m.$('.md-b').innerHTML = (k.info ? `<div class="mini mb-2">${esc(k.info)}</div>` : '') + '<div data-t></div>';
      UI.table(m.$('[data-t]'), { key: k.cols[0].k, rows: k.rows || [], cols: k.cols, size: 15, excel: jenis + '_' + S.periode, showCount: true });
      m.$('[data-pdf]').onclick = (e) => UI.run(e.currentTarget, () => pdfTabel(L.t, k, jenis));
    } catch (e) { m.$('.md-b').innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); }
  }
  async function pdfTabel(judul, k, jenis) {
    const l = LS.get('sp_logo', {}) || {}, cell = (c, r) => UI.cell(c, r).replace(/<[^>]+>/g, '');
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:-10000px;top:0';
    box.innerHTML = `<div class="doc"><div class="kop">${l.rs ? `<img src="${l.rs}">` : '<div></div>'}<div class="tx"><b>${esc(S.boot.set.NAMA_PENGELOLA || '')}</b>${esc(S.boot.set.NAMA_RS || '')}</div>${l.pengelola ? `<img src="${l.pengelola}">` : '<div></div>'}</div>
      <h3>${esc(judul)}</h3><div class="no">Periode ${esc(fmt.per(S.periode))} · lokasi ${esc(namaLokasi(S.lokasi))} · dicetak ${esc(fmt.tglw(SP.nowLocal()))}</div>${k.info ? `<p>${esc(k.info)}</p>` : ''}
      <table><thead><tr>${k.cols.map((c) => `<th>${esc(c.l)}</th>`).join('')}</tr></thead><tbody>${(k.rows || []).map((r) => `<tr>${k.cols.map((c) => `<td class="${/rp|n|number/.test(c.t) ? 'r' : ''}">${esc(cell(c, r))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    document.body.appendChild(box);
    try { const h = await Lib.pdf(); const blob = await h().set({ margin: 8, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: k.cols.length > 7 ? 'landscape' : 'portrait' } }).from(box.firstChild).outputPdf('blob'); Files.download(blob, jenis + '_' + S.periode + '.pdf', 'application/pdf'); }
    finally { box.remove(); }
  }

  // =====================================================================
  //  KONTAK & WHATSAPP (CRM)
  // =====================================================================
  const PIPE = ['Prospek', 'Negosiasi', 'Deal', 'Aktif', 'Batal'];
  SP.Pages.wa = {
    title: 'Kontak & WhatsApp', sub: 'CRM mitra iklan/sewa, pejabat RS & vendor · notifikasi WhatsApp lewat antrean',
    render(el, p, ctx) {
      const tab = p.tab || 'kontak';
      el.innerHTML = `<div data-k>${UI.skKpi(4)}</div>${UI.tabs([{ id: 'kontak', t: 'Kontak', i: 'fa-address-book' }, { id: 'pipeline', t: 'Pipeline', i: 'fa-columns' }, { id: 'followup', t: 'Tindak Lanjut', i: 'fa-list-check' }, { id: 'broadcast', t: 'Broadcast', i: 'fa-bullhorn' }, { id: 'templat', t: 'Templat', i: 'fa-file-lines' }, { id: 'antrean', t: 'Antrean WA', i: 'fa-paper-plane' }], tab)}<div data-tb></div>`;
      $$('[data-tab]', el).forEach((b) => b.onclick = () => Router.go('wa', { tab: b.dataset.tab }));
      API.swr('wa.ringkas', {}, (d) => {
        if (!ctx.live()) return; el._w = d;
        $('[data-k]', el).innerHTML = `${!d.provider || d.provider === 'nonaktif' ? UI.callout('fa-plug-circle-xmark', 'Gateway WhatsApp belum dikonfigurasi. Super Admin dapat mengisinya di Panel Kendali → Rahasia & Integrasi (token disimpan di Script Properties). Pesan tetap masuk antrean.', 'oranye') : ''}
          <div class="row g-3"><div class="col-6 col-xl-3">${UI.kpi({ v: esc(d.provider || '—'), l: 'Gateway WA', sub: d.aktif_notif ? 'Notifikasi otomatis aktif' : 'Notifikasi otomatis nonaktif', c: d.provider && d.provider !== 'nonaktif' ? 'hijau' : 'abu', i: 'fa-comment-dots' })}</div>
          <div class="col-6 col-xl-3">${UI.kpi({ v: d.pending, l: 'Antrean menunggu', sub: d.gagal + ' gagal', c: d.gagal ? 'merah' : 'oranye', i: 'fa-hourglass-half' })}</div>
          <div class="col-6 col-xl-3">${UI.kpi({ v: d.terkirim_hari, l: 'Terkirim hari ini', c: 'biru', i: 'fa-paper-plane' })}</div>
          <div class="col-6 col-xl-3">${UI.kpi({ v: d.kontak, l: 'Kontak', sub: d.followup_hari + ' tindak lanjut hari ini', c: 'aqua', i: 'fa-address-book' })}</div></div>`;
      });
      const tb = $('[data-tb]', el);
      if (tab === 'followup') { tb.innerHTML = UI.panel({ t: 'Tindak Lanjut', i: 'fa-list-check', p0: true, body: '<div data-t></div>' }); UI.entity($('[data-t]', tb), 'followup', { defaults: { tanggal: SP.today(), pic: S.user.nama, jenis: 'Telepon' } }); return; }
      if (tab === 'templat') { tb.innerHTML = UI.panel({ t: 'Templat WhatsApp', i: 'fa-file-lines', p0: true, body: '<div data-t></div>', foot: '<span>Placeholder: {{nama}}, {{organisasi}}, {{pesan}}, {{pengirim}}, {{tanggal}}, {{shift}}, {{lokasi}}, {{periode}}, {{nilai}}, {{tenggat}}</span>' }); UI.entity($('[data-t]', tb), 'templateWa', { defaults: { aktif: true } }); return; }
      if (tab === 'antrean') { tb.innerHTML = UI.panel({ t: 'Antrean & Log WhatsApp', i: 'fa-paper-plane', p0: true, body: '<div data-t></div>', foot: '<span>Dikirim trigger tiap 15 menit · maks. 20 pesan/batch · jeda 1,5 detik · 3 percobaan</span>' }); UI.entity($('[data-t]', tb), 'antreanWa', { size: 20 }); return; }
      if (tab === 'broadcast') return broadcast(tb);
      if (tab === 'pipeline') return pipeline(tb);
      tb.innerHTML = UI.panel({ t: 'Kontak', i: 'fa-address-book', p0: true, body: '<div data-t></div>' });
      const ent = UI.entity($('[data-t]', tb), 'kontak', { defaults: { segmen: 'Mitra Iklan', status_pipeline: 'Prospek', pic: S.user.nama },
        cols: [{ k: 'nama', l: 'Nama', f: (v, r) => `<b>${esc(v)}</b><div class="fs-11 muted">${esc(r.jabatan || '')}${r.organisasi ? ' · ' + esc(r.organisasi) : ''}</div>` }, { k: 'no_wa', l: 'WhatsApp' }, { k: 'segmen', l: 'Segmen', f: (v) => `<span class="tag">${esc(v)}</span>` }, { k: 'status_pipeline', l: 'Status', t: 'badge' }, { k: 'pic', l: 'PIC' }, { k: 'opt_out', l: 'Opt-out', t: 'bool' }],
        extraActions: (r) => UI.btnAct('tl', '', 'biru', 'fa-timeline', 'Riwayat & kirim WA'), onAct: (a, r) => { if (a === 'tl') timeline(r.id, () => ent.load(true)); }, onClick: (r) => timeline(r.id, () => ent.load(true)) });
    }
  };
  async function timeline(id, done) {
    const m = UI.modal({ title: 'Kontak', size: 'lg', body: '<div class="sk box"></div>' });
    const d = await API.get('crm.timeline', { id }, { force: true });
    const k = d.kontak, tpl = ((SP.Cache.get(SP.Cache.key('wa.ringkas', {})) || {}).d || {}).templat || [];
    m.$('h5').textContent = k.nama;
    m.$('.md-b').innerHTML = `<div class="d-flex justify-content-between flex-wrap gap-2 mb-2"><div><b>${esc(k.organisasi || '')}</b> ${esc(k.jabatan || '')}<div class="fs-12 muted">${esc(k.no_wa || '-')} · ${esc(k.email || '')} · PIC ${esc(k.pic || '-')}</div></div><div>${UI.badge(k.status_pipeline)} <span class="tag">${esc(k.segmen)}</span></div></div>
      <div class="row g-3"><div class="col-md-6">${UI.panel({ t: 'Kirim WhatsApp', i: 'fa-paper-plane', collapse: false, body: k.no_wa && !k.opt_out ? `<select class="form-select form-select-sm mb-2" data-tpl><option value="">— tulis bebas —</option>${tpl.map((t) => `<option value="${esc(t.kode)}">${esc(t.judul)}</option>`).join('')}</select><textarea class="form-control" rows="4" data-psn placeholder="Isi pesan…"></textarea><label class="form-label fs-12 mt-2">Jadwal tindak lanjut berikutnya</label><input type="date" class="form-control form-control-sm" data-jdw><button class="btn btn-hijau btn-sm mt-2" data-kirim><i class="fa-solid fa-paper-plane"></i> Masukkan ke antrean</button>` : UI.callout('fa-ban', k.opt_out ? 'Kontak memilih tidak menerima pesan (opt-out).' : 'Nomor WA belum diisi.', 'oranye') })}
        ${UI.panel({ t: 'Catat tindak lanjut', i: 'fa-pen', c: 'biru', collapse: false, body: `<select class="form-select form-select-sm mb-2" data-fj>${['Telepon', 'WA', 'Kunjungan', 'Email', 'Rapat'].map((x) => `<option>${x}</option>`).join('')}</select><textarea class="form-control" rows="2" data-fh placeholder="Hasil…"></textarea><select class="form-select form-select-sm mt-2" data-fs>${PIPE.map((x) => `<option ${x === k.status_pipeline ? 'selected' : ''}>${x}</option>`).join('')}</select><button class="btn btn-biru btn-sm mt-2" data-fu>Simpan</button>` })}</div>
      <div class="col-md-6">${UI.panel({ t: 'Linimasa', i: 'fa-timeline', collapse: false, body: `<div class="tl">${d.followup.map((f) => `<div class="ev"><b>${esc(f.jenis)}</b> · ${fmt.tgl(f.tanggal)} <span class="fs-11 muted">${esc(f.pic)}</span><div class="fs-13">${esc(f.hasil)}</div>${f.jadwal_berikutnya ? `<div class="fs-11 text-oranye">Berikutnya ${fmt.tgl(f.jadwal_berikutnya)}</div>` : ''}</div>`).join('') || '<div class="muted fs-13">Belum ada tindak lanjut</div>'}
        ${d.wa.map((w) => `<div class="ev ${w.status === 'SENT' ? '' : 'cur'}"><b>WA</b> · ${fmt.tglw(w.dibuat)} ${UI.badge(w.status)}<div class="fs-12">${esc(String(w.pesan).slice(0, 140))}</div></div>`).join('')}</div>` })}</div></div>`;
    const tp = m.$('[data-tpl]'); if (tp) tp.onchange = () => { const t = tpl.find((x) => x.kode === tp.value); if (t) m.$('[data-psn]').value = t.isi.replace(/{{\s*nama\s*}}/g, k.nama).replace(/{{\s*organisasi\s*}}/g, k.organisasi || '').replace(/{{\s*pengirim\s*}}/g, S.user.nama); };
    const kb = m.$('[data-kirim]'); if (kb) kb.onclick = async (e) => { const ps = m.$('[data-psn]').value.trim(); if (!ps) return UI.toast('Tulis pesan', 'warn'); await UI.run(e.currentTarget, () => API.call('wa.kirim', { no: k.no_wa, pesan: ps, id_kontak: k.id, jadwal_berikutnya: m.$('[data-jdw]').value }), 'Pesan masuk antrean WA'); m.close(); done && done(); };
    m.$('[data-fu]').onclick = async (e) => {
      const h = m.$('[data-fh]').value.trim(); if (!h) return UI.toast('Isi hasil tindak lanjut', 'warn');
      await UI.run(e.currentTarget, async () => { await API.call('data.save', { ent: 'followup', row: { id_kontak: k.id, tanggal: SP.today(), jenis: m.$('[data-fj]').value, hasil: h, pic: S.user.nama } }); if (m.$('[data-fs]').value !== k.status_pipeline) await API.call('data.save', { ent: 'kontak', row: { id: k.id, status_pipeline: m.$('[data-fs]').value } }); }, 'Tersimpan');
      m.close(); done && done();
    };
  }
  function pipeline(el) {
    el.innerHTML = UI.skBox(1);
    API.swr('data.list', { ent: 'kontak' }, (d) => {
      el.innerHTML = `<div class="row g-2 flex-nowrap overflow-auto pb-2">${PIPE.map((s) => `<div class="col" style="min-width:220px"><div class="panel ${s === 'Deal' || s === 'Aktif' ? '' : s === 'Batal' ? 'p-merah' : 'p-oranye'} h-100 mb-0"><div class="panel-h"><h3 class="ttl fs-6">${s}</h3><span class="badge-s s-abu">${d.rows.filter((r) => r.status_pipeline === s).length}</span></div><div class="panel-b" data-col="${s}" style="min-height:240px">
        ${d.rows.filter((r) => r.status_pipeline === s).map((r) => `<div class="mini mb-2" draggable="true" data-card="${esc(r.id)}" style="cursor:grab"><b class="fs-13">${esc(r.nama)}</b><div class="fs-11 muted">${esc(r.organisasi || r.segmen)}</div></div>`).join('')}</div></div></div>`).join('')}</div><div class="fs-12 muted">Seret kartu ke kolom lain untuk mengubah status (tercatat sebagai tindak lanjut).</div>`;
      let drag = null;
      el.ondragstart = (e) => { const c = e.target.closest('[data-card]'); if (c) { drag = c.dataset.card; e.dataTransfer.effectAllowed = 'move'; } };
      el.ondragover = (e) => { if (e.target.closest('[data-col]')) e.preventDefault(); };
      el.ondrop = async (e) => {
        const col = e.target.closest('[data-col]'); if (!col || !drag) return; e.preventDefault();
        const r = d.rows.find((x) => x.id === drag); if (!r || r.status_pipeline === col.dataset.col) return;
        const lama = r.status_pipeline; r.status_pipeline = col.dataset.col; col.appendChild(el.querySelector(`[data-card="${drag}"]`));
        try { await API.call('data.save', { ent: 'kontak', row: { id: r.id, status_pipeline: r.status_pipeline } }); await API.call('data.save', { ent: 'followup', row: { id_kontak: r.id, tanggal: SP.today(), jenis: 'Rapat', hasil: 'Status pipeline: ' + lama + ' → ' + r.status_pipeline, pic: S.user.nama } }); UI.toast(r.nama + ' → ' + r.status_pipeline); }
        catch (x) { UI.err(x); pipeline(el); }
      };
    }, { ttl: 0 });
  }
  function broadcast(el) {
    const w = (SP.Cache.get(SP.Cache.key('wa.ringkas', {})) || {}).d || { templat: [] };
    el.innerHTML = UI.panel({ t: 'Broadcast WhatsApp per Segmen', i: 'fa-bullhorn', body: `<div class="row g-2"><div class="col-md-4"><label class="form-label">Segmen</label><select class="form-select" data-seg><option value="SEMUA">Semua kontak</option>${S.boot.ent.kontak.fields.find((f) => f.n === 'segmen').opts.map((o) => `<option>${esc(o)}</option>`).join('')}</select></div>
      <div class="col-md-4"><label class="form-label">Tag (opsional)</label><input class="form-control" data-tag></div><div class="col-md-4"><label class="form-label">Templat</label><select class="form-select" data-tpl><option value="">— pesan bebas —</option>${w.templat.map((t) => `<option value="${esc(t.kode)}">${esc(t.judul)}</option>`).join('')}</select></div>
      <div class="col-12"><label class="form-label">Pesan / isi {{pesan}}</label><textarea class="form-control" rows="4" data-psn></textarea></div></div>
      <div class="d-flex gap-2 mt-2"><button class="btn btn-abu" data-pv><i class="fa-solid fa-eye"></i> Pratinjau penerima</button><button class="btn btn-hijau" data-go><i class="fa-solid fa-paper-plane"></i> Masukkan ke antrean</button></div><div data-res class="mt-3"></div>`,
      foot: '<span>Broadcast masuk antrean (bukan kirim sekaligus); kontak opt-out dilewati; maks. 500 penerima.</span>' });
    const p = () => ({ segmen: $('[data-seg]', el).value, tag: $('[data-tag]', el).value, kode: $('[data-tpl]', el).value, pesan: $('[data-psn]', el).value });
    el.onclick = async (e) => {
      const pv = e.target.closest('[data-pv]'), go = e.target.closest('[data-go]');
      if (pv) { const r = await UI.run(pv, () => API.call('wa.broadcast', Object.assign(p(), { pratinjau: true }), { keepCache: true })); $('[data-res]', el).innerHTML = `<div class="mini"><b>${r.jumlah} penerima</b>${r.contoh.map((c) => `<div class="fs-12 mt-1"><b>${esc(c.nama)}:</b> ${esc(c.pesan)}</div>`).join('')}</div>`; }
      if (go) { const c = await UI.confirm({ title: 'Kirim broadcast', msg: 'Masukkan pesan ke antrean WhatsApp untuk segmen terpilih?', ok: 'Kirim' }); if (c) await UI.run(go, () => API.call('wa.broadcast', p()), (r) => r.jumlah + ' pesan masuk antrean'); }
    };
  }

  // =====================================================================
  //  PENGGUNA
  // =====================================================================
  SP.Pages.pengguna = {
    sub: 'Akun aplikasi, peran & lokasi tugas',
    render(el) {
      el.innerHTML = UI.panel({ t: 'Pengguna', i: 'fa-users', p0: true, body: '<div data-t></div>', foot: '<span>Kata sandi sementara ditampilkan SEKALI; pengguna wajib menggantinya saat login pertama.</span>' });
      const ent = UI.entity($('[data-t]', el), 'pengguna', { save: 'user.save', add: !S.viewAs, readonly: !!S.viewAs, size: 20, del: false, defaults: { status: 'Aktif', peran: 'SUPERVISOR' },
        cols: [{ k: 'nama', l: 'Nama', f: (v, r) => `<div class="d-flex gap-2 align-items-center"><span class="avatar" style="background:#e3f4ea">${esc(SP.inisial(v))}</span><div><b>${esc(v)}</b><div class="fs-11 muted">${esc(r.email)}</div></div></div>` },
          { k: 'peran', l: 'Peran', f: (v) => UI.badge(({ SUPER_ADMIN: 'Super Admin', PIMPINAN: 'Pimpinan', ADMIN_KEU: 'Admin Keuangan', SUPERVISOR: 'Supervisor', OPERATOR: 'Operator', RS_UMSIDA: 'RS UMSIDA' })[v] || v, v === 'SUPER_ADMIN' ? 'hitam' : v === 'RS_UMSIDA' ? 'biru' : v === 'OPERATOR' ? 'aqua' : 'hijau') },
          { k: 'lokasi_tugas', l: 'Lokasi tugas' }, { k: 'no_wa', l: 'WhatsApp' }, { k: 'status', l: 'Status', t: 'badge' }, { k: 'login_terakhir', l: 'Login terakhir', t: 'tglw' }],
        formFields: (f) => f.filter((x) => !x.ro).map((x) => x.n === 'peran' && can.role('PIMPINAN') ? Object.assign({}, x, { opts: x.opts.filter((o) => o !== 'SUPER_ADMIN') }) : x),
        formNote: () => UI.callout('fa-circle-info', 'Supervisor & Operator wajib memiliki lokasi tugas. Operator hanya bisa menginput setoran shift di pos/lokasinya; setorannya diterima & digabung Supervisor lokasi yang sama. Mengubah peran / menonaktifkan akun langsung mengakhiri sesi aktif pengguna tersebut.', 'biru'),
        extraActions: (r) => !S.viewAs && !(can.role('PIMPINAN') && r.peran === 'SUPER_ADMIN') ? UI.btnAct('reset', '', 'abu', 'fa-key', 'Reset kata sandi') : '',
        onAct: async (a, r, btn) => { if (a !== 'reset') return; const c = await UI.confirm({ title: 'Reset kata sandi', msg: 'Buat kata sandi sementara untuk <b>' + esc(r.nama) + '</b>? Sesi aktifnya berakhir.', ok: 'Reset' }); if (c) { const x = await UI.run(btn, () => API.call('user.resetSandi', { id: r.id_pengguna })); tampilSandi(r.email, x.sandi_sementara); } },
        onSaved: (res, baru) => { if (res && res.sandi_sementara) tampilSandi(res.user.email, res.sandi_sementara); } });
    }
  };
  function tampilSandi(email, s) {
    const m = UI.modal({ title: 'Kata sandi sementara', size: 'sm', body: `<p class="fs-13">Berikan kepada <b>${esc(email)}</b> melalui jalur aman. Hanya ditampilkan sekali.</p><div class="mini text-center"><div class="vl tnum" style="letter-spacing:.08em">${esc(s)}</div></div><button class="btn btn-sm btn-biru mt-2 w-100" data-cp><i class="fa-solid fa-copy"></i> Salin</button>` });
    m.$('[data-cp]').onclick = () => navigator.clipboard.writeText(s).then(() => UI.toast('Disalin'));
  }

  // =====================================================================
  //  PENGATURAN
  // =====================================================================
  const GRUP = [
    ['Identitas & kontrak', ['NAMA_APLIKASI', 'NAMA_PENGELOLA', 'NAMA_RS', 'NOMOR_PKS', 'TGL_TTD_PKS', 'TAHAP_AKTIF', 'REKENING_RS']],
    ['Bagi hasil & pajak', ['PERSEN_PENGELOLA', 'PERSEN_RS', 'DC_PER_TRX', 'PBJT_PERSEN', 'MDR_PERSEN_DEFAULT']],
    ['Ganti rugi klaim', ['GR_PERSEN', 'GR_MAKS_MOTOR', 'GR_MAKS_MOBIL']],
    ['Tenggat & denda', ['TGL_LAPORAN', 'TGL_BA', 'HK_BA_SETELAH_LAPORAN', 'HK_SETOR', 'DENDA_TELAT']],
    ['Kontrol & zonasi', ['BATAS_SETUJU_PENGELUARAN', 'TOLERANSI_SELISIH_IMPOR', 'BIAYA_TETAP_BULANAN', 'ZONASI_JAM_MULAI', 'ZONASI_JAM_SELESAI', 'DARURAT_MAKS', 'SESI_JAM']],
    ['Notifikasi email & WhatsApp', ['EMAIL_PIMPINAN', 'EMAIL_ADMIN', 'EMAIL_PENGHUBUNG_RS', 'NOTIF_WA_AKTIF', 'WA_PIMPINAN', 'WA_ADMIN', 'WA_PENGHUBUNG_RS']],
    ['Pencocokan bank', ['BANK_POLA_QRIS', 'BANK_POLA_SETOR']]
  ];
  const LABEL = { TAHAP_AKTIF: ['select', ['PRAOPERASI', 'OPERASI_SEMENTARA', 'OPERASI_PENUH', 'BERAKHIR']], TGL_TTD_PKS: ['date'], NOTIF_WA_AKTIF: ['select', ['TRUE', 'FALSE']], ZONASI_JAM_MULAI: ['time'], ZONASI_JAM_SELESAI: ['time'] };
  SP.Pages.pengaturan = {
    sub: 'Parameter bisnis, master data & logo',
    render(el, p) {
      const tab = p.tab || 'parameter', boleh = can.role('SUPER_ADMIN', 'PIMPINAN') && !S.viewAs;
      const tabs = [{ id: 'parameter', t: 'Parameter Bisnis', i: 'fa-sliders' }, { id: 'lokasi', t: 'Lokasi', i: 'fa-location-dot' }, { id: 'shift', t: 'Shift', i: 'fa-clock' }, { id: 'tarif', t: 'Tarif', i: 'fa-tags' }, { id: 'kategori', t: 'Kategori Biaya', i: 'fa-folder' }, { id: 'libur', t: 'Hari Libur', i: 'fa-calendar-xmark' }, { id: 'targetSla', t: 'Target SLA', i: 'fa-stopwatch' }, { id: 'logo', t: 'Logo', i: 'fa-image' }];
      el.innerHTML = UI.tabs(tabs, tab) + '<div data-tb></div>';
      $$('[data-tab]', el).forEach((b) => b.onclick = () => Router.go('pengaturan', { tab: b.dataset.tab }));
      const tb = $('[data-tb]', el);
      if (tab === 'logo') return logo(tb, boleh);
      if (tab !== 'parameter') { tb.innerHTML = UI.panel({ t: tabs.find((t) => t.id === tab).t, i: 'fa-table', p0: true, body: '<div data-t></div>', foot: tab === 'libur' ? '<span>Lengkapi libur nasional & cuti bersama (SKB) tiap tahun — dipakai menghitung Hari Kerja tenggat.</span>' : tab === 'tarif' ? '<span>Tarif bertanda CONTOH wajib disesuaikan dengan Lampiran Tarif. Komponen "kena PBJT" menentukan perhitungan pajak (BR-07).</span>' : '' }); UI.entity($('[data-t]', tb), tab, { size: 20, onSaved: () => SP.App.boot(true) }); return; }
      const s = S.boot.set;
      tb.innerHTML = (S.boot.lengkap && S.boot.lengkap.length ? UI.callout('fa-circle-exclamation', 'Belum diisi: <b>' + S.boot.lengkap.map(esc).join(', ') + '</b>', 'oranye') : '') +
        GRUP.map((g) => UI.panel({ t: g[0], i: 'fa-gear', body: `<div class="row g-2">${g[1].filter((k) => s[k] !== undefined).map((k) => { const tp = LABEL[k] || ['text']; return `<div class="col-md-6 col-xl-4"><label class="form-label fs-12">${esc(k)}</label>${tp[0] === 'select' ? `<select class="form-select form-select-sm" data-set="${k}" ${boleh ? '' : 'disabled'}>${tp[1].map((o) => `<option ${String(s[k]) === o ? 'selected' : ''}>${o}</option>`).join('')}</select>` : `<input type="${tp[0]}" class="form-control form-control-sm" data-set="${k}" value="${esc(s[k])}" ${boleh ? '' : 'disabled'}>`}</div>`; }).join('')}</div>` })).join('') +
        (boleh ? '<div class="text-end"><button class="btn btn-hijau" data-simpan><i class="fa-solid fa-floppy-disk"></i> Simpan perubahan</button></div>' : UI.callout('fa-lock', 'Hanya Pimpinan & Super Admin yang dapat mengubah parameter.', 'biru'));
      const btn = $('[data-simpan]', tb);
      if (btn) btn.onclick = async () => {
        const items = $$('[data-set]', tb).filter((i) => String(s[i.dataset.set]) !== i.value).map((i) => ({ kunci: i.dataset.set, nilai: i.value }));
        if (!items.length) return UI.toast('Tidak ada perubahan', 'warn');
        await UI.run(btn, () => API.call('set.update', { items }), items.length + ' parameter diperbarui'); SP.App.boot(true);
      };
    }
  };
  function logo(el, boleh) {
    const l = LS.get('sp_logo', {}) || {};
    el.innerHTML = `<div class="row g-3">${[['pengelola', 'Logo Pengelola (navbar & kop PDF)'], ['rs', 'Logo RS UMSIDA (kop PDF)']].map((x) => `<div class="col-md-6">${UI.panel({ t: x[1], i: 'fa-image', body: `<div class="d-flex gap-3 align-items-center"><div style="width:120px;height:90px;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;background:#fafafa">${l[x[0]] ? `<img src="${l[x[0]]}" style="max-width:110px;max-height:80px">` : '<span class="muted fs-12">Belum ada</span>'}</div>${boleh ? `<button class="btn btn-biru" data-up="${x[0]}"><i class="fa-solid fa-upload"></i> Unggah PNG</button>` : ''}</div><div class="form-text">PNG latar transparan, lebar ± 400 px.</div>` })}</div>`).join('')}</div>`;
    el.onclick = async (e) => {
      const b = e.target.closest('[data-up]'); if (!b) return;
      const f = await Files.pick('image/png,image/jpeg'); if (!f) return;
      await UI.run(b, async () => { const d = await Files.toB64(f); await API.call('file.upload', { kategori: 'logo', jenis: b.dataset.up, nama: 'logo_' + b.dataset.up + '.png', mime: f.type, data: d }); const lg = await API.raw('publik.logo'); LS.set('sp_logo', lg); }, 'Logo diperbarui');
      SP.App.boot(true);
    };
  }

  // =====================================================================
  //  PANEL KENDALI SISTEM (Super Admin)
  // =====================================================================
  const ENT_HAPUS = { Rekap_Shift: 'rekap', Pengeluaran: 'pengeluaran', Pendapatan_Lain: 'pendapatanLain', Penerima_Gratis: 'penerima', Log_Kejadian: 'kejadian', Klaim: 'klaim', Mutasi_Bank: 'mutasiBank', Dana_Cadangan: 'danaCadangan', Kontak: 'kontak' };
  SP.Pages.panel = {
    title: 'Panel Kendali Sistem', sub: 'Kesehatan, sesi, backup/restore, trigger, rahasia, migrasi & log',
    render(el, p, ctx) {
      const tab = p.tab || 'sehat';
      el.innerHTML = UI.tabs([{ id: 'sehat', t: 'Kesehatan', i: 'fa-heart-pulse' }, { id: 'sesi', t: 'Pengguna & Sesi', i: 'fa-user-shield' }, { id: 'backup', t: 'Backup & Restore', i: 'fa-database' }, { id: 'pulih', t: 'Pemulihan Data', i: 'fa-trash-arrow-up' }, { id: 'rahasia', t: 'Rahasia & Integrasi', i: 'fa-key' }, { id: 'migrasi', t: 'Migrasi', i: 'fa-right-left' }, { id: 'log', t: 'Log', i: 'fa-scroll' }], tab) + '<div data-tb>' + UI.skBox(1) + '</div>';
      $$('[data-tab]', el).forEach((b) => b.onclick = () => Router.go('panel', { tab: b.dataset.tab }));
      const tb = $('[data-tb]', el);
      ({ sehat, sesi, backup, pulih, rahasia, migrasi, log })[tab](tb, ctx);
    }
  };
  function sehat(el, ctx) {
    API.swr('sys.health', {}, (h) => {
      if (!ctx.live()) return;
      const pctSel = Math.round(h.total_sel * 1000 / h.batas_sel) / 10;
      el.innerHTML = `<div class="row g-3"><div class="col-md-6 col-xl-3">${UI.kpi({ v: h.trigger_lengkap ? 'OK' : 'Kurang', l: 'Trigger terjadwal', sub: h.trigger.length + ' terpasang', c: h.trigger_lengkap ? 'hijau' : 'merah', i: 'fa-clock-rotate-left' })}</div>
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: h.kuota_email === null ? '—' : h.kuota_email, l: 'Sisa kuota email hari ini', c: 'biru', i: 'fa-envelope' })}</div>
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.pct(pctSel, 1), l: 'Pemakaian sel Spreadsheet', sub: fmt.n(h.total_sel) + ' / 10 juta', c: pctSel > 70 ? 'merah' : 'aqua', i: 'fa-table-cells' })}</div>
        <div class="col-md-6 col-xl-3">${UI.kpi({ v: h.backup_terakhir ? fmt.tgl(h.backup_terakhir) : 'Belum', l: 'Backup terakhir', sub: h.backup_terakhir ? fmt.jam(h.backup_terakhir) + ' WIB' : '', c: h.backup_terakhir ? 'hijau' : 'oranye', i: 'fa-database' })}</div></div>
        ${UI.panel({ t: 'Tindakan sistem', i: 'fa-screwdriver-wrench', body: `<div class="d-flex gap-2 flex-wrap"><button class="btn btn-biru" data-a="trig"><i class="fa-solid fa-plug"></i> Pasang ulang trigger</button><button class="btn btn-hijau" data-a="bk"><i class="fa-solid fa-database"></i> Backup sekarang</button>
          <button class="btn ${h.pemeliharaan ? 'btn-hijau' : 'btn-oranye'}" data-a="mt"><i class="fa-solid fa-screwdriver-wrench"></i> ${h.pemeliharaan ? 'Matikan' : 'Aktifkan'} mode pemeliharaan</button><button class="btn btn-abu" data-a="rs"><i class="fa-solid fa-rotate"></i> Kirim ulang notifikasi gagal</button><button class="btn btn-abu" data-a="fc" title="Pakai setelah mengedit sheet langsung di Google Sheets"><i class="fa-solid fa-broom"></i> Bersihkan cache data</button>
          <select class="form-select form-select-sm" style="width:auto" data-job><option value="trgAntrean">Proses antrean email & WA</option><option value="trgCekRekap">Cek rekap belum masuk</option><option value="trgHarian">Tugas harian 07.00</option><option value="trgBulanan">Tugas bulanan (draf rekon)</option></select><button class="btn btn-abu" data-a="job"><i class="fa-solid fa-play"></i> Jalankan</button></div>
          <div class="fs-12 muted mt-2">Versi ${esc(h.versi)} · antrean email ${h.antrean.email_pending} menunggu / ${h.antrean.email_gagal} gagal · WA ${h.antrean.wa_pending} / ${h.antrean.wa_gagal}</div>` })}
        <div class="row g-3"><div class="col-lg-6">${UI.panel({ t: 'Ukuran sheet', i: 'fa-table', p0: true, body: `<div class="tbl-wrap" style="max-height:340px"><table class="tbl"><thead><tr><th>Sheet</th><th class="num">Baris</th><th class="num">Kolom</th><th class="num">Sel</th></tr></thead><tbody>${h.lembar.sort((a, b) => b.baris - a.baris).map((x) => `<tr><td>${esc(x.nama)}</td><td class="num">${fmt.n(x.baris)}</td><td class="num">${x.kolom}</td><td class="num">${fmt.n(x.sel)}</td></tr>`).join('')}</tbody></table></div>` })}</div>
        <div class="col-lg-6">${UI.panel({ t: 'Error terakhir', i: 'fa-bug', c: 'merah', p0: true, body: h.error_terakhir.length ? `<div class="list-x">${h.error_terakhir.map((x) => `<div class="it"><i class="fa-solid fa-circle-exclamation text-merah"></i><div><b class="fs-12">${esc(x.modul)}</b> · <span class="fs-11 muted">${fmt.tglw(x.waktu)}</span><div class="fs-12">${esc(x.pesan)}</div></div></div>`).join('')}</div>` : UI.empty('Tidak ada error 🎉') })}
          ${UI.panel({ t: 'Trigger terpasang', i: 'fa-clock', p0: true, body: `<div class="list-x">${h.trigger.map((t) => `<div class="it"><i class="fa-solid fa-circle-check text-hijau"></i><span class="fs-13">${esc(t.fungsi)}</span></div>`).join('') || '<div class="p-3">' + UI.empty('Belum ada trigger') + '</div>'}</div>` })}</div></div>`;
      el.onclick = async (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'trig') await UI.run(b, () => API.call('sys.triggers', {}), (r) => r.length + ' trigger terpasang');
        if (a === 'bk') await UI.run(b, () => API.call('sys.backup', {}, { timeout: 120000 }), (r) => 'Backup ' + r.nama + ' dibuat');
        if (a === 'mt') { const c = await UI.confirm({ title: 'Mode pemeliharaan', msg: h.pemeliharaan ? 'Buka kembali akses semua pengguna?' : 'Tutup akses semua pengguna selain Super Admin dengan pesan "Sedang perbaikan"?', danger: !h.pemeliharaan }); if (!c) return; await UI.run(b, () => API.call('sys.maintenance', { aktif: !h.pemeliharaan }), 'Mode pemeliharaan ' + (h.pemeliharaan ? 'dimatikan' : 'aktif')); }
        if (a === 'rs') await UI.run(b, () => API.call('sys.resend', {}), (r) => r.jumlah + ' notifikasi dijadwalkan ulang');
        if (a === 'fc') { await UI.run(b, () => API.call('sys.flushCache', {}), 'Cache data dibersihkan'); SP.Cache.clear(); }
        if (a === 'job') await UI.run(b, () => API.call('sys.runJob', { nama: $('[data-job]', el).value }, { timeout: 300000 }), 'Pekerjaan selesai');
        SP.Cache.drop('sys.'); sehat(el, ctx);
      };
    }, { ttl: 0, onError: (e) => { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
  }
  function sesi(el, ctx) {
    API.swr('sys.health', {}, (h) => {
      if (!ctx.live()) return;
      el.innerHTML = UI.panel({ t: 'Pengguna & sesi', i: 'fa-user-shield', p0: true, tools: '<button class="btn btn-sm btn-merah" data-all><i class="fa-solid fa-power-off"></i> Paksa logout semua</button>', body: '<div data-t></div>' });
      UI.table($('[data-t]', el), { key: 'id', rows: h.pengguna, size: 20, cols: [{ k: 'nama', l: 'Nama' }, { k: 'email', l: 'Email' }, { k: 'peran', l: 'Peran' }, { k: 'status', l: 'Status', t: 'badge' }, { k: 'terkunci_sampai', l: 'Terkunci s.d.', t: 'tglw' }, { k: 'login_terakhir', l: 'Login terakhir', t: 'tglw' }],
        actions: (r) => (r.id !== S.user.id ? UI.btnAct('va', 'Lihat sebagai', 'biru', 'fa-user-secret') : '') + UI.btnAct('lo', '', 'oranye', 'fa-right-from-bracket', 'Paksa logout') + UI.btnAct('un', '', 'hijau', 'fa-lock-open', 'Buka kunci akun') + UI.btnAct('rp', '', 'abu', 'fa-key', 'Reset sandi'),
        onAct: async (a, r, b) => {
          if (a === 'va') { S.viewAs = r.id; sessionStorage.setItem('sp_viewas', r.id); SP.Cache.clear(); LS.del('sp_boot'); Router.go('dashboard'); SP.App.boot(true); return; }
          if (a === 'lo') await UI.run(b, () => API.call('sys.forceLogout', { id: r.id }), 'Sesi ' + r.nama + ' diakhiri');
          if (a === 'un') await UI.run(b, () => API.call('sys.unlockUser', { id: r.id }), 'Akun dibuka');
          if (a === 'rp') { const x = await UI.run(b, () => API.call('user.resetSandi', { id: r.id })); tampilSandi(r.email, x.sandi_sementara); }
        } });
      el.onclick = async (e) => { const b = e.target.closest('[data-all]'); if (!b) return; const c = await UI.confirm({ title: 'Paksa logout semua', msg: 'Semua sesi (termasuk Anda) akan berakhir.', danger: true }); if (c) { await UI.run(b, () => API.call('sys.forceLogout', {}), 'Semua sesi diakhiri'); SP.App.logout('Semua sesi diakhiri. Silakan masuk kembali.'); } };
    }, { ttl: 0 });
  }
  function backup(el) {
    el.innerHTML = UI.skBox(1);
    API.get('sys.backups', {}, { force: true }).then((list) => {
      el.innerHTML = UI.panel({ t: 'Restore per sheet', i: 'fa-clock-rotate-left', c: 'oranye', body: `${UI.callout('fa-triangle-exclamation', 'Restore menimpa SELURUH isi sheet dengan salinan backup. Audit_Log tidak dapat direstore (append-only). Lakukan backup manual sebelum restore.', 'merah')}
        <div class="row g-2"><div class="col-md-5"><label class="form-label">Backup</label><select class="form-select" data-b>${list.map((b) => `<option value="${esc(b.id)}">${esc(b.nama)} (${esc(b.waktu)})</option>`).join('')}</select></div><div class="col-md-3"><label class="form-label">Sheet</label><select class="form-select" data-s>${Object.keys(ENT_HAPUS).concat(['Pengaturan', 'Lokasi', 'Shift', 'Tarif', 'Pengguna', 'Rekon_Bulanan', 'Kewajiban', 'Berita_Acara', 'Aset_CAPEX', 'Okupansi_Jam']).map((s) => `<option>${s}</option>`).join('')}</select></div>
        <div class="col-md-4"><label class="form-label">Alasan</label><input class="form-control" data-al></div></div><button class="btn btn-merah mt-2" data-go ${list.length ? '' : 'disabled'}><i class="fa-solid fa-rotate-left"></i> Restore sheet</button>` }) +
        UI.panel({ t: 'Daftar backup (retensi 30 hari)', i: 'fa-database', p0: true, body: '<div data-t></div>' });
      UI.table($('[data-t]', el), { key: 'id', rows: list, cols: [{ k: 'nama', l: 'Nama' }, { k: 'waktu', l: 'Waktu' }] });
      el.onclick = async (e) => {
        const b = e.target.closest('[data-go]'); if (!b) return;
        const al = $('[data-al]', el).value.trim(); if (!al) return UI.toast('Isi alasan restore', 'warn');
        const c = await UI.confirm({ title: 'Restore ' + $('[data-s]', el).value, msg: 'Lanjutkan restore? Tindakan tercatat di Audit_Log & Log_Sistem.', danger: true, ok: 'Restore' }); if (!c) return;
        await UI.run(b, () => API.call('sys.restoreSheet', { backupId: $('[data-b]', el).value, sheet: $('[data-s]', el).value, alasan: al }, { timeout: 180000 }), (r) => r.baris + ' baris direstore'); SP.Cache.clear();
      };
    }).catch((e) => { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); });
  }
  function pulih(el) {
    el.innerHTML = UI.panel({ t: 'Pulihkan data terhapus (soft delete)', i: 'fa-trash-arrow-up', p0: true, tools: `<select class="form-select form-select-sm" style="width:auto" data-ent>${Object.keys(ENT_HAPUS).map((s) => `<option value="${ENT_HAPUS[s]}">${s}</option>`).join('')}</select><a class="btn btn-sm btn-abu" href="#/rekap?tab=riwayat">Rollback impor</a><a class="btn btn-sm btn-abu" href="#/rekon">Buka kunci periode</a>`, body: '<div data-t></div>' });
    const load = () => { const ent = $('[data-ent]', el).value, meta = S.boot.ent[ent]; API.get('data.list', { ent, deleted: true }, { force: true }).then((d) => {
      UI.table($('[data-t]', el), { key: meta.key, rows: d.rows, cols: meta.fields.filter((f) => f.list).slice(0, 6).map((f) => ({ k: f.n, l: f.l, t: f.t })).concat([{ k: 'diubah_oleh', l: 'Dihapus oleh' }, { k: 'diubah_pada', l: 'Waktu', t: 'tglw' }]),
        actions: () => UI.btnAct('rs', 'Pulihkan', 'hijau', 'fa-trash-arrow-up'), empty: 'Tidak ada data terhapus',
        onAct: async (a, r, b) => { await UI.run(b, () => API.call('data.restore', { ent, id: r[meta.key] }), 'Data dipulihkan'); load(); } }); }).catch(UI.err); };
    el.onchange = (e) => { if (e.target.matches('[data-ent]')) load(); };
    load();
  }
  function rahasia(el) {
    API.get('sys.secretStatus', {}, { force: true }).then((s) => {
      el.innerHTML = `<div class="row g-3"><div class="col-lg-5">${UI.panel({ t: 'Status Script Properties', i: 'fa-key', p0: true, body: `<table class="tbl">${Object.keys(s.terisi).map((k) => `<tr><td class="fs-12">${k}</td><td class="text-end">${s.terisi[k] ? UI.badge('Terisi', 'hijau') : UI.badge('Kosong', 'abu')}</td></tr>`).join('')}</table>`, foot: '<span>Nilai rahasia tidak pernah dikirim ke browser. SPREADSHEET_ID, FOLDER & HMAC hanya diubah dari editor Apps Script.</span>' })}</div>
        <div class="col-lg-7">${UI.panel({ t: 'Gateway WhatsApp', i: 'fa-comment-dots', body: `<div class="row g-2"><div class="col-md-4"><label class="form-label">Provider</label><select class="form-select" data-k="WA_PROVIDER">${['fonnte', 'wablas', 'meta', 'nonaktif'].map((o) => `<option ${s.wa_provider === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="col-md-8"><label class="form-label">Token / API key</label><input type="password" class="form-control" data-k="WA_TOKEN" placeholder="${s.terisi.WA_TOKEN ? '•••••• (terisi — isi untuk mengganti)' : 'Tempel token dari dashboard gateway'}" autocomplete="off"></div>
          <div class="col-md-4"><label class="form-label fs-12">Domain Wablas</label><input class="form-control form-control-sm" data-k="WA_WABLAS_DOMAIN" placeholder="mis. tegal.wablas.com"></div><div class="col-md-4"><label class="form-label fs-12">Phone ID (Meta)</label><input class="form-control form-control-sm" data-k="WA_PHONE_ID"></div><div class="col-md-4"><label class="form-label fs-12">Versi Graph API</label><input class="form-control form-control-sm" data-k="WA_GRAPH_VERSION" placeholder="v21.0"></div></div>
          <div class="d-flex gap-2 mt-2 flex-wrap"><button class="btn btn-biru" data-simpan><i class="fa-solid fa-floppy-disk"></i> Simpan</button><input class="form-control" style="max-width:200px" placeholder="No. WA uji" data-no><button class="btn btn-abu" data-tes><i class="fa-solid fa-vial"></i> Kirim pesan uji</button></div>
          <div class="fs-12 muted mt-2">Fonnte: POST api.fonnte.com/send (header Authorization). WA Cloud API (Meta) mewajibkan templat disetujui untuk pesan di luar jendela 24 jam. Aktifkan notifikasi otomatis di Pengaturan → NOTIF_WA_AKTIF.</div>` })}
        ${UI.panel({ t: 'API key integrasi sistem gate', i: 'fa-plug', c: 'biru', body: `<p class="fs-13">Sistem gate dapat mengirim ringkasan shift langsung via <code>doPost</code> dengan <code>{"apiKey":"…","action":"ext.rekap","payload":{"rekap":[…]}}</code>. Status: ${s.terisi.PUBLIC_API_KEY ? UI.badge('Terisi', 'hijau') : UI.badge('Belum', 'abu')}</p><button class="btn btn-sm btn-biru" data-apikey><i class="fa-solid fa-key"></i> Buat API key baru</button>` })}</div></div>`;
      el.onclick = async (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.matches('[data-simpan]')) { await UI.run(b, async () => { for (const i of $$('[data-k]', el)) { if (i.value.trim() || i.dataset.k === 'WA_PROVIDER') await API.call('sys.setSecret', { kunci: i.dataset.k, nilai: i.value.trim() }, { keepCache: true }); } }, 'Konfigurasi WA tersimpan di Script Properties'); rahasia(el); }
        if (b.matches('[data-tes]')) { const no = $('[data-no]', el).value.trim(); if (!no) return UI.toast('Isi nomor WA uji', 'warn'); const r = await UI.run(b, () => API.call('wa.tes', { no }, { keepCache: true })); UI.toast(r.ok ? 'Pesan uji terkirim ✔' : 'Gagal: ' + r.body, r.ok ? '' : 'err'); }
        if (b.matches('[data-apikey]')) { const c = await UI.confirm({ title: 'Buat API key baru', msg: 'API key lama (bila ada) tidak berlaku lagi. Kunci baru ditampilkan SEKALI.', ok: 'Buat' }); if (!c) return; const r = await UI.run(b, () => API.call('sys.setSecret', { kunci: 'PUBLIC_API_KEY', nilai: 'ACAK' }, { keepCache: true })); tampilSandi('sistem gate (API key)', r.nilai_sekali_tampil); }
      };
    }).catch((e) => { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); });
  }
  function migrasi(el) {
    el.innerHTML = UI.panel({ t: 'Migrasi & sinkronisasi dari spreadsheet lama', i: 'fa-right-left', body: `${UI.callout('fa-circle-info', 'Spreadsheet lama hanya DIBACA. Kolom dicocokkan berdasarkan nama header; upsert idempoten (aman diulang); jalankan Pindai (dry-run) dulu, lalu ulangi sesaat sebelum cutover untuk delta-sync. Spreadsheet harus berada di akun Google yang sama.', 'biru')}
      <div class="input-group"><input class="form-control" placeholder="ID atau URL spreadsheet lama" data-src><button class="btn btn-biru" data-scan><i class="fa-solid fa-magnifying-glass"></i> Pindai (dry-run)</button></div><div data-res class="mt-3"></div>` });
    el.onclick = async (e) => {
      const sc = e.target.closest('[data-scan]'), go = e.target.closest('[data-go]');
      const src = $('[data-src]', el).value.trim();
      if (sc) {
        if (!src) return UI.toast('Isi ID spreadsheet lama', 'warn');
        const r = await UI.run(sc, () => API.call('migrasi.pindai', { sumber: src }, { timeout: 300000, keepCache: true }));
        $('[data-res]', el).innerHTML = `<div class="fw-600 mb-2">Sumber: ${esc(r.sumber)}</div><table class="tbl"><thead><tr><th></th><th>Sheet</th><th class="num">Baris sumber</th><th class="num">Tambah</th><th class="num">Perbarui</th><th class="num">Lewati</th><th>Kolom asing</th></tr></thead><tbody>${r.hasil.map((x) => `<tr class="${x.ada ? '' : 'row-oranye'}"><td>${x.ada ? `<input type="checkbox" class="form-check-input" data-sh="${x.sheet}" ${x.inserted || x.updated ? 'checked' : ''}>` : ''}</td><td>${esc(x.sheet)}</td><td class="num">${x.ada ? fmt.n(x.baris_sumber) : 'tidak ada'}</td><td class="num">${x.ada ? fmt.n(x.inserted) : ''}</td><td class="num">${x.ada ? fmt.n(x.updated) : ''}</td><td class="num">${x.ada ? fmt.n(x.skipped) : ''}</td><td class="fs-11">${x.kolom_asing ? esc(x.kolom_asing.join(', ')) : ''}</td></tr>`).join('')}</tbody></table>
          <button class="btn btn-hijau mt-2" data-go><i class="fa-solid fa-play"></i> Jalankan migrasi sheet terpilih</button>`;
      }
      if (go) {
        const sheets = $$('[data-sh]:checked', el).map((i) => i.dataset.sh); if (!sheets.length) return UI.toast('Pilih sheet', 'warn');
        const c = await UI.confirm({ title: 'Jalankan migrasi', msg: 'Menulis ' + sheets.length + ' sheet ke database baru (backup otomatis disarankan sebelumnya).', ok: 'Jalankan' }); if (!c) return;
        const r = await UI.run(go, () => API.call('migrasi.jalankan', { sumber: src, sheets }, { timeout: 330000 }), 'Migrasi selesai');
        $('[data-res]', el).insertAdjacentHTML('beforeend', `<div class="mini mt-2">${r.hasil.map((x) => `<div class="fs-12"><b>${esc(x.sheet)}</b>: ${x.ditunda ? 'ditunda (batas waktu) — jalankan ulang' : `+${x.inserted} baru, ${x.updated} diperbarui, ${x.skipped} dilewati`}</div>`).join('')}</div>`); SP.Cache.clear();
      }
    };
  }
  function log(el) {
    el.innerHTML = UI.tabs([{ id: 'auditLog', t: 'Audit Log' }, { id: 'logSistem', t: 'Log Sistem' }, { id: 'antreanNotif', t: 'Antrean Email' }], 'auditLog') + '<div data-t></div>';
    const show = (ent) => { $$('[data-tab]', el).forEach((b) => b.classList.toggle('on', b.dataset.tab === ent)); UI.entity($('[data-t]', el), ent, { size: 25, params: () => ({ dari: SP.addMonth(SP.periodeNow(), -1) + '-01' }) }); };
    $$('[data-tab]', el).forEach((b) => b.onclick = (e) => { e.stopPropagation(); show(b.dataset.tab); });
    show('auditLog');
  }

  // =====================================================================
  //  GANTI PASSWORD
  // =====================================================================
  SP.Pages.sandi = {
    title: 'Ganti Password', sub: 'Keamanan akun',
    render(el) {
      el.innerHTML = `<div class="row"><div class="col-md-6 col-lg-5">${UI.panel({ t: 'Ganti kata sandi', i: 'fa-key', body: `<form data-f>${SP.App.sandiForm()}<button class="btn btn-hijau mt-2">Simpan</button></form>` })}
        ${UI.panel({ t: 'Akun', i: 'fa-user', c: 'biru', body: `<div class="fs-13"><b>${esc(S.user.nama)}</b><br>${esc(S.user.email)}<br>${esc(S.user.namaPeran)}${S.user.lokasi.length ? ' · ' + esc(S.user.lokasi.join(', ')) : ''}</div><div class="d-flex gap-2 mt-3"><button class="btn btn-sm btn-garis" data-pasang><i class="fa-solid fa-mobile-screen"></i> Pasang aplikasi</button><button class="btn btn-sm btn-merah" data-out><i class="fa-solid fa-right-from-bracket"></i> Logout</button></div>` })}</div></div>`;
      $('[data-f]', el).onsubmit = (e) => { e.preventDefault(); SP.App.simpanSandi(e.target); };
      $('[data-pasang]', el).onclick = () => SP.App.pasangApp();
      $('[data-out]', el).onclick = () => SP.App.logout();
    }
  };
})();
