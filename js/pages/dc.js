/* Dana Cadangan & Klaim (F-11, F-12) — buku kas khusus risiko kehilangan & penanganan klaim (Pasal 16 PKS) */
(function () {
  'use strict';
  const { $, $$, esc, fmt, S, API, can, namaLokasi, Router, nowLocal } = SP;
  const TAHAP = [['Dilaporkan', 'Laporan'], ['Dokumen Lengkap', 'Dokumen'], ['Appraisal', 'Appraisal'], ['Diputuskan', 'Otorisasi'], ['BA Penyelesaian', 'Draf BA'], ['Dibayar', 'Pembayaran']];
  const DOK = [['dok_karcis', 'Tiket/karcis parkir asli atau riwayat akses elektronik'], ['dok_polisi', 'Surat laporan kehilangan Kepolisian'], ['dok_stnk_bpkb', 'Salinan STNK & BPKB'], ['dok_identitas', 'Kartu identitas pemohon'], ['dok_kronologi', 'Formulir kronologi kejadian']];

  SP.Pages.dc = {
    title: 'Dana Cadangan & Klaim', sub: 'Buku kas khusus risiko kehilangan kendaraan (Pasal 16 PKS) & penanganan klaim',
    prefetch() { if (!can.role('SUPERVISOR')) API.prefetch('dc.buku', { periode: S.periode }); },
    render(el, p, ctx) {
      const isSpv = can.role('SUPERVISOR');
      const tab = isSpv ? 'klaim' : (p.tab || (p.klaim ? 'klaim' : 'buku'));
      el.innerHTML = `${isSpv ? '' : `<div data-k>${UI.skKpi(4)}</div>`}${UI.tabs(isSpv ? [{ id: 'klaim', t: 'Klaim Kehilangan', i: 'fa-car-burst' }] : [{ id: 'buku', t: 'Buku Dana Cadangan', i: 'fa-book' }, { id: 'klaim', t: 'Klaim Kehilangan', i: 'fa-car-burst' }, { id: 'simulasi', t: 'Simulasi Pembagian Akhir PKS (50:50)', i: 'fa-scale-balanced' }], tab)}<div data-tb></div>`;
      $$('[data-tab]', el).forEach((b) => b.onclick = () => Router.go('dc', { tab: b.dataset.tab }));
      if (!isSpv) API.swr('dc.buku', { periode: S.periode }, (d) => {
        if (!ctx.live()) return; el._d = d;
        const kb = d.kontribusi_berjalan;
        $('[data-k]', el).innerHTML = `<div class="row g-3"><div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(d.saldo_kini), l: 'Saldo Kas Khusus Cadangan', sub: 'Saldo efektif (setelah komitmen klaim) ' + fmt.rp(d.saldo_efektif), c: 'hijau', i: 'fa-shield-halved' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(kb.berbayar + kb.gratis), l: 'Kontribusi Masuk ' + fmt.per(d.periode), sub: (kb.sudah_dibukukan ? 'Sudah dibukukan' : 'Estimasi berjalan') + ' · berbayar ' + fmt.rps(kb.berbayar) + ' + gratis ' + fmt.rps(kb.gratis), c: 'biru', i: 'fa-arrow-trend-up' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: fmt.rp(d.klaim_dibayar_tahun), l: 'Realisasi Klaim Dibayar ' + d.periode.slice(0, 4), c: 'oranye', i: 'fa-hand-holding-dollar' })}</div>
          <div class="col-md-6 col-xl-3">${UI.kpi({ v: d.klaim_aktif.length + '<small>kasus</small>', l: 'Klaim Berjalan', sub: d.klaim_aktif[0] ? d.klaim_aktif[0].id_klaim + ' · ' + d.klaim_aktif[0].status : 'Tidak ada', c: d.klaim_aktif.length ? 'merah' : 'hijau', i: 'fa-triangle-exclamation', href: '#/dc?tab=klaim', foot: 'Tinjau klaim' })}</div></div>`;
        if (tab === 'buku') buku($('[data-tb]', el), d);
      });
      const tb = $('[data-tb]', el);
      if (tab === 'buku') tb.innerHTML = UI.skBox(1);
      if (tab === 'klaim') klaim(tb, p);
      if (tab === 'simulasi') simulasi(tb);
    }
  };
  function buku(el, d) {
    const bisa = can.role('ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs;
    el.innerHTML = UI.panel({ t: 'Buku Besar Kas Khusus Cadangan Kehilangan — ' + fmt.per(d.periode), i: 'fa-book-open', p0: true,
      tools: (bisa ? '<button class="btn btn-sm btn-abu" data-giro><i class="fa-solid fa-plus"></i> Jasa giro / biaya bank</button>' : '') + '<button class="btn btn-sm btn-biru" data-ldc><i class="fa-solid fa-file-pdf"></i> Cetak Laporan DC (QR)</button>',
      body: `<div class="p-2 fs-13">Saldo awal periode: <b>${fmt.rp(d.saldo_awal)}</b> · Saldo akhir: <b>${fmt.rp(d.saldo_akhir)}</b>${!d.kontribusi_berjalan.sudah_dibukukan ? ` · <span class="text-oranye">Kontribusi ${fmt.per(d.periode)} (${fmt.rp(d.kontribusi_berjalan.berbayar + d.kontribusi_berjalan.gratis)}) dibukukan otomatis saat laporan bulanan terbit</span>` : ''}</div><div data-t></div>`,
      foot: '<span><i class="fa-solid fa-lock"></i> Saldo tidak dibagikan selama PKS berjalan (Pasal 16 ayat 14)</span>' });
    UI.table($('[data-t]', el), { key: 'id', rows: d.mutasi, size: 15, excel: 'Buku_Dana_Cadangan_' + d.periode, cols: [{ k: 'tanggal', l: 'Tanggal', t: 'tgl' }, { k: 'jenis', l: 'Jenis mutasi', f: (v) => UI.badge(v, /Kontribusi/.test(v) ? 'hijau' : /Klaim/.test(v) ? 'merah' : /Kekurangan/.test(v) ? 'ungu' : 'abu') }, { k: 'ref', l: 'Referensi' }, { k: 'uraian', l: 'Uraian' }, { k: 'debit', l: 'Debit (masuk)', t: 'rp', sum: true }, { k: 'kredit', l: 'Kredit (keluar)', t: 'rp', sum: true }, { k: 'saldo_berjalan', l: 'Saldo', t: 'rp' }] });
    el.onclick = async (e) => {
      if (e.target.closest('[data-giro]')) {
        const f = S.boot.ent.danaCadangan.fields.filter((x) => !x.ro);
        const m = UI.modal({ title: 'Entri manual Dana Cadangan', body: UI.form(f, { tanggal: SP.today(), jenis: 'Jasa Giro' }), foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-biru" data-s>Simpan</button>' });
        UI.bindForm(m.el);
        m.$('[data-s]').onclick = async (ev) => { const r = UI.readForm(m.el, f); if (!UI.validate(m.el, f, r)) return; await UI.run(ev.currentTarget, () => API.call('data.save', { ent: 'danaCadangan', row: r }), 'Tersimpan'); m.close(); SP.Cache.drop('dc.'); SP.App.render(); };
      }
      const l = e.target.closest('[data-ldc]');
      if (l) await UI.run(l, async () => { const doc = await API.get('rekon.dokumen', { periode: d.periode }, { ttl: 60000 }); await SP.Doc.pdf('DC', doc, { simpan: can.int(), kode: doc.dok.DC.kode, nama: 'LDC_' + d.periode + '.pdf' }); });
    };
  }
  function klaim(el, p) {
    const bisaLapor = can.role('SUPERVISOR', 'ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs;
    el.innerHTML = `<div data-detail></div>${UI.panel({ t: 'Daftar Klaim Kehilangan Kendaraan', i: 'fa-car-burst', c: 'merah', p0: true, body: '<div data-t></div>' })}`;
    const ent = UI.entity($('[data-t]', el), 'klaim', { add: false, edit: false, del: false, size: 10,
      tools: bisaLapor ? '<button class="btn btn-sm btn-oranye" data-lapor><i class="fa-solid fa-plus"></i> Buat Laporan Klaim Baru</button>' : '',
      onClick: (r) => detail(r.id_klaim), extraActions: (r) => UI.btnAct('buka', 'Buka', 'biru', 'fa-folder-open'), onAct: (a, r) => { if (a === 'buka') detail(r.id_klaim); } });
    el.addEventListener('click', (e) => { if (e.target.closest('[data-lapor]')) lapor(() => ent.load(true)); });
    if (p.klaim) detail(p.klaim);
    async function detail(id) {
      const box = $('[data-detail]', el); box.innerHTML = UI.skBox(1); box.scrollIntoView({ behavior: 'smooth' });
      let d; try { d = await API.get('klaim.detail', { id }, { force: true }); } catch (e) { box.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); return; }
      const k = d.klaim;
      if (can.role('RS_UMSIDA')) { box.innerHTML = UI.panel({ t: 'Status klaim ' + esc(k.id_klaim), i: 'fa-car-burst', body: `<table class="tbl">${Object.keys(k).map((x) => `<tr><td class="muted">${esc(x)}</td><td>${esc(k[x])}</td></tr>`).join('')}</table>` }); return; }
      const iCur = Math.max(0, TAHAP.findIndex((t) => t[0] === k.status)), adm = can.role('ADMIN_KEU', 'SUPER_ADMIN') && !S.viewAs, pim = can.role('PIMPINAN', 'SUPER_ADMIN') && !S.viewAs;
      const kal = d.kalkulator, editDok = adm && ['Dilaporkan', 'Dokumen Lengkap', 'Appraisal'].indexOf(k.status) > -1;
      const st = (i) => k.status === 'Ditolak' ? (i <= 3 ? 'done' : '') : (k.status === 'Selesai' || i < iCur || (k.status === 'Dibayar' && i === 5) ? 'done' : i === iCur ? 'cur' : '');
      box.innerHTML = UI.panel({ t: `Kasus Klaim: ${esc(k.id_klaim)}`, i: 'fa-car-burst', c: 'merah', tools: UI.badge(k.status) + (k.flag_terlambat_lapor ? ' <span class="badge-s s-merah">Lapor > 24 jam</span>' : '') + (k.flag_dokumen_terlambat ? ' <span class="badge-s s-merah">Dokumen > 30 hari</span>' : '') + ' <button class="tool-btn" data-tutupdet title="Tutup"><i class="fa-solid fa-xmark"></i></button>',
        body: `<div class="fs-13 mb-2">Unit: <b>${esc(k.merek_tipe_tahun)}</b> (${esc(k.jenis_kendaraan)}, ${esc(k.nopol)}) · Lokasi ${esc(namaLokasi(k.id_lokasi))} · Kejadian ${fmt.tglw(k.tgl_kejadian)} · Pelapor: ${esc(k.pemohon)} (${esc(k.status_pengguna)})</div>
          <div class="stage mb-3">${TAHAP.map((t, i) => `<div class="${st(i)}"><b>${i + 1}. ${t[1]}</b>${i === 0 ? fmt.tgl(k.waktu_lapor) : i === 1 ? (k.tgl_dok_lengkap ? fmt.tgl(k.tgl_dok_lengkap) : '—') : i === 2 ? (k.nilai_appraisal ? fmt.rps(k.nilai_appraisal) : '—') : i === 3 ? (k.keputusan || (k.tenggat_keputusan ? 'Tenggat ' + fmt.tgl(k.tenggat_keputusan) : '—')) : i === 4 ? (k.tgl_ba_penyelesaian ? fmt.tgl(k.tgl_ba_penyelesaian) : '—') : (k.tgl_bayar ? fmt.tgl(k.tgl_bayar) : k.tenggat_bayar ? 'Maks ' + fmt.tgl(k.tenggat_bayar) : '—')}</div>`).join('')}</div>
          ${k.status === 'Ditolak' ? UI.callout('fa-ban', '<b>Klaim ditolak:</b> ' + esc(k.alasan_tolak), 'merah') : ''}
          <div class="row g-3"><div class="col-lg-6"><div class="mini"><div class="lb mb-2">Kelengkapan berkas (Pasal 16 ayat 5) — ${DOK.filter((x) => k[x[0]]).length}/5</div>
            ${DOK.map((x) => `<label class="d-flex gap-2 align-items-center py-1 border-bottom"><input type="checkbox" class="form-check-input" data-dok="${x[0]}" ${k[x[0]] ? 'checked' : ''} ${editDok ? '' : 'disabled'}><span class="fs-13">${x[1]}</span></label>`).join('')}
            <div class="mt-2"><div class="lb">Berkas di folder klaim (${d.berkas.length})</div>${d.berkas.map((b) => `<a href="#" class="d-block fs-12" data-view="${esc(b.id)}"><i class="fa-solid fa-file"></i> ${esc(b.nama)}</a>`).join('') || '<span class="fs-12 muted">Belum ada</span>'}
            ${can.role('SUPERVISOR', 'ADMIN_KEU', 'SUPER_ADMIN', 'PIMPINAN') && !S.viewAs ? '<button class="btn btn-xs btn-abu mt-1" data-up><i class="fa-solid fa-upload"></i> Unggah berkas</button>' : ''}</div>
            <div class="fs-11 muted mt-2"><i class="fa-solid fa-circle-info"></i> Pasal 16 ayat (11): barang di dalam kendaraan bukan tanggung jawab Pengelola.</div></div></div>
          <div class="col-lg-6"><div class="mini mb-2"><div class="lb mb-2">Kalkulator ganti rugi (BR-10, Pasal 16 ayat 7)</div>
            <div class="row g-2 align-items-end"><div class="col-7"><label class="form-label fs-12">Appraiser</label><input class="form-control form-control-sm" data-appr value="${esc(k.appraiser || '')}" ${editDok ? '' : 'disabled'}></div><div class="col-5"><label class="form-label fs-12">Nilai pasar</label><input class="form-control form-control-sm money" data-nilai value="${fmt.n(k.nilai_appraisal || 0)}" ${editDok ? '' : 'disabled'}></div></div>
            <div class="d-flex justify-content-between fs-12 mt-2"><span>${kal.persen}% nilai pasar · batas ${esc(k.jenis_kendaraan)} ${fmt.rp(kal.batas)}</span></div>
            <div class="mini l-hijau mt-2"><div class="lb">Nilai ganti rugi ${k.ganti_rugi_disetujui ? 'disetujui' : 'diusulkan'}</div><div class="vl text-hijau">${fmt.rp(k.ganti_rugi_disetujui || k.ganti_rugi_hitung || 0)}</div></div></div>
            <div class="mini"><div class="lb mb-1">Uji kecukupan saldo Dana Cadangan (BR-11)</div><div class="row g-1 text-center fs-12"><div class="col-4">Saldo<br><b>${fmt.rp(d.saldo_dc)}</b></div><div class="col-4 text-merah">Klaim<br><b>${fmt.rp(-kal.ganti_rugi)}</b></div><div class="col-4 ${kal.cukup ? 'text-hijau' : 'text-merah'}">${kal.cukup ? 'Sisa' : 'Kekurangan'}<br><b>${fmt.rp(kal.cukup ? d.saldo_dc - kal.ganti_rugi : -kal.kekurangan)}</b></div></div>
            ${!kal.cukup ? `<div class="fs-12 mt-2 text-merah">Talangan (Pasal 16 ay. 9): Pengelola ${fmt.rp(kal.bagi.pengelola)} (75%) · RS ${fmt.rp(kal.bagi.rs)} (25%) — tanpa menunda pembayaran.</div>` : '<div class="fs-12 mt-2 text-hijau"><i class="fa-solid fa-circle-check"></i> Saldo mencukupi</div>'}</div></div></div>
          <div class="d-flex gap-2 justify-content-end flex-wrap mt-3">
            ${editDok ? '<button class="btn btn-biru" data-simpan><i class="fa-solid fa-floppy-disk"></i> Simpan dokumen & appraisal</button>' : ''}
            ${pim && ['Dilaporkan', 'Dokumen Lengkap', 'Appraisal'].indexOf(k.status) > -1 ? '<button class="btn btn-merah" data-tolak><i class="fa-solid fa-circle-xmark"></i> Tolak klaim</button>' : ''}
            ${pim && k.status === 'Appraisal' ? `<button class="btn btn-hijau" data-setuju><i class="fa-solid fa-check"></i> Setujui ganti rugi (${fmt.rp(k.ganti_rugi_hitung)})</button>` : ''}
            ${(adm || pim) && k.status === 'Diputuskan' && k.keputusan === 'Disetujui' ? '<button class="btn btn-oranye" data-ba><i class="fa-solid fa-file-signature"></i> Buat BA penyelesaian</button>' : ''}
            ${adm && k.status === 'BA Penyelesaian' ? '<button class="btn btn-hijau" data-bayar><i class="fa-solid fa-money-bill-transfer"></i> Catat pembayaran</button>' : ''}
            ${adm && k.status === 'Dibayar' ? '<button class="btn btn-abu" data-selesai><i class="fa-solid fa-flag-checkered"></i> Tutup klaim</button>' : ''}
            ${k.keputusan ? '<button class="btn btn-garis" data-pdfk><i class="fa-solid fa-file-pdf"></i> PDF keputusan (QR)</button>' : ''}</div>` });
      UI.bindForm(box);
      box.onclick = async (e) => {
        const b = e.target.closest('button,[data-view]'); if (!b) return;
        if (b.matches('[data-view]')) { e.preventDefault(); return UI.viewFile(b.dataset.view); }
        if (b.matches('[data-tutupdet]')) { box.innerHTML = ''; return; }
        const done = () => { SP.Cache.drop('dc.'); SP.Cache.drop('data.list|'); ent.load(true); detail(id); };
        if (b.matches('[data-up]')) { const f = await SP.Files.pick('image/*,application/pdf'); if (!f) return; await UI.run(b, async () => { const c = await SP.Files.compress(f, 1800, 0.85); await API.call('file.upload', { kategori: 'klaim', sub: k.id_klaim, nama: c.nama, mime: c.mime, data: c.data }, { keepCache: true }); }, 'Berkas terunggah'); detail(id); }
        if (b.matches('[data-simpan]')) { const row = { appraiser: $('[data-appr]', box).value, nilai_appraisal: UI.parseRp($('[data-nilai]', box).value) }; DOK.forEach((x) => row[x[0]] = $(`[data-dok="${x[0]}"]`, box).checked); await UI.run(b, () => API.call('klaim.update', { id, row }), (r) => 'Tersimpan — status ' + r.status); done(); }
        if (b.matches('[data-setuju]')) { const c = await UI.confirm({ title: 'Setujui klaim ' + id, msg: 'Ganti rugi <b>' + fmt.rp(k.ganti_rugi_hitung) + '</b> (nilai terendah 30% nilai pasar & batas). Dokumen keputusan ber-QR diterbitkan.', ok: 'Setujui' }); if (c) { await UI.run(b, () => API.call('klaim.putuskan', { id, keputusan: 'Disetujui' }), 'Klaim disetujui'); done(); } }
        if (b.matches('[data-tolak]')) { const c = await UI.confirm({ title: 'Tolak klaim ' + id, msg: 'Pasal 16 ayat (12): penolakan wajib memuat alasan dan bukti.', danger: true, ok: 'Tolak klaim', input: { label: 'Alasan & bukti', req: true } }); if (c) { await UI.run(b, () => API.call('klaim.putuskan', { id, keputusan: 'Ditolak', alasan: c.nilai }), 'Klaim ditolak'); done(); } }
        if (b.matches('[data-ba]')) { await UI.run(b, () => API.call('klaim.ba', { id }), (r) => 'BA penyelesaian dibuat — batas bayar ' + fmt.tgl(r.tenggat_bayar)); done(); }
        if (b.matches('[data-bayar]')) { const c = await UI.confirm({ title: 'Catat pembayaran klaim', msg: 'Ganti rugi ' + fmt.rp(k.ganti_rugi_disetujui) + ' dibukukan sebagai pembayaran dari Dana Cadangan' + (kal.cukup ? '.' : '; kekurangan ditalangi 75:25.'), ok: 'Catat pembayaran', input: { label: 'No. bukti transfer', req: true } }); if (c) { await UI.run(b, () => API.call('klaim.bayar', { id, bukti: c.nilai }), (r) => 'Pembayaran tercatat — saldo DC ' + fmt.rp(r.saldo)); done(); } }
        if (b.matches('[data-selesai]')) { await UI.run(b, () => API.call('klaim.update', { id, tutup: true }), 'Klaim ditutup'); done(); }
        if (b.matches('[data-pdfk]')) await UI.run(b, async () => { await SP.Doc.pdf('KLAIM', { klaim: k, verifikasi_url: d.verifikasi_url, pihak: { pengelola: S.boot.set.NAMA_PENGELOLA, rs: S.boot.set.NAMA_RS, nomor_pks: S.boot.set.NOMOR_PKS }, periode: SP.today().slice(0, 7) }, { nama: 'Keputusan_' + k.id_klaim + '.pdf', simpan: can.int(), kode: k.kode_verifikasi, jenisKode: 'KLAIM' }); });
      };
    }
  }
  function lapor(done) {
    const f = [{ n: 'tgl_kejadian', l: 'Waktu kejadian', t: 'datetime', req: true }, { n: 'waktu_diketahui', l: 'Waktu kehilangan diketahui', t: 'datetime', req: true },
      { n: 'id_lokasi', l: 'Lokasi', t: 'ref', ref: 'lokasi', req: true }, { n: 'nopol', l: 'Nopol', t: 'text', req: true }, { n: 'jenis_kendaraan', l: 'Jenis kendaraan', t: 'select', opts: ['Mobil', 'Motor'], req: true },
      { n: 'merek_tipe_tahun', l: 'Merek / tipe / tahun', t: 'text', req: true }, { n: 'status_pengguna', l: 'Status pengguna', t: 'select', opts: ['Berbayar', 'Gratis'], req: true },
      { n: 'bukti_masuk', l: 'No. karcis / riwayat akses', t: 'text' }, { n: 'pemohon', l: 'Nama pemohon', t: 'text', req: true }, { n: 'kontak', l: 'Kontak pemohon', t: 'text' }, { n: 'kronologi', l: 'Kronologi singkat', t: 'textarea', req: true }];
    const lok = S.user.lokasi[0] || '';
    const m = UI.modal({ title: 'Laporan Kehilangan Kendaraan', size: 'lg', static: true, body: UI.callout('fa-clock', 'Pasal 16 ayat (6): kehilangan wajib dilaporkan paling lambat 1×24 jam sejak diketahui; dokumen klaim lengkap ≤ 30 hari kalender. Waktu lapor dicatat otomatis.', 'oranye') + UI.form(f, { tgl_kejadian: nowLocal(), waktu_diketahui: nowLocal(), id_lokasi: lok, status_pengguna: 'Berbayar' }), foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-merah" data-s><i class="fa-solid fa-paper-plane"></i> Kirim laporan</button>' });
    m.$('[data-s]').onclick = async (e) => { const r = UI.readForm(m.el, f); if (!UI.validate(m.el, f, r)) return; try { const k = await UI.run(e.currentTarget, () => API.call('klaim.lapor', { row: r }), (x) => 'Laporan ' + x.id_klaim + ' tercatat' + (x.flag_terlambat_lapor ? ' (terlambat > 24 jam)' : '')); m.close(); done && done(k); } catch (x) { } };
  }
  function simulasi(el) {
    el.innerHTML = UI.skBox(1);
    API.swr('dc.simulasiAkhir', {}, (d) => {
      el.innerHTML = UI.panel({ t: 'Ketentuan Akhir Masa Perjanjian (Pasal 16 ayat 13 & 14)', i: 'fa-scale-balanced', tools: '<span class="badge-s s-biru">Rasio bagi bersih 50:50</span>',
        body: `${UI.callout('fa-quote-left', 'Saldo Akhir Bersih Dana Cadangan dibagi 50:50 paling lambat 30 hari setelah PKS berakhir; nilai klaim yang masih diproses ditahan. Saldo tidak dibagikan selama PKS berjalan.', 'biru')}
          <div class="row g-2"><div class="col-md-4">${UI.mini('Proyeksi saldo bersih akhir', fmt.rp(d.saldo_bersih), '', 'Saldo ' + fmt.rp(d.saldo) + ' − klaim ditahan ' + fmt.rp(d.klaim_ditahan) + ' (' + d.jumlah_klaim_ditahan + ')')}</div>
          <div class="col-md-4">${UI.mini('Hak PT JMBM (Pengelola) 50%', `<span class="text-hijau">${fmt.rp(d.bagian_pengelola)}</span>`, 'hijau')}</div><div class="col-md-4">${UI.mini('Hak RS UMSIDA 50%', `<span class="text-biru">${fmt.rp(d.bagian_rs)}</span>`, 'biru')}</div></div>
          <div class="fs-12 muted mt-2">Tanggal Berakhir PKS saat ini: <b>${fmt.tgl(d.tgl_berakhir)}</b> · batas pembagian: <b>${fmt.tgl(d.batas_pembagian)}</b></div>` });
    }, { onError: (e) => { el.innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
  }
})();
