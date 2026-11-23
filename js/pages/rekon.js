/* Bagi Hasil & Rekonsiliasi — Tutup Buku (F-09): Cek Kesiapan → Hitung → Tinjau → Terbitkan → Konfirmasi BA → Setor */
(function () {
  'use strict';
  const { $, $$, esc, fmt, S, API, can, namaLokasi, Router, addMonth, periodeNow } = SP;
  const URUT = { '': 0, Draft: 2, Ditinjau: 3, Terbit: 4, 'BA Dikonfirmasi': 5, Lunas: 6 };

  SP.Pages.rekon = {
    title: 'Bagi Hasil & Rekonsiliasi', sub: 'Tutup buku bulanan, kalkulasi PNBH 75:25 & Berita Acara (Pasal 9–10 PKS)',
    prefetch() { API.prefetch('rekon.get', { periode: addMonth(periodeNow(), -1) }); },
    render(el, p, ctx) {
      const per = p.periode || (S.periode < periodeNow() ? S.periode : addMonth(periodeNow(), -1));
      const isRS = can.role('RS_UMSIDA'), ro = !!S.viewAs;
      el.innerHTML = `<div class="panel p-polos"><div class="panel-b d-flex gap-2 align-items-center flex-wrap"><span class="fw-600 fs-12 muted">PERIODE</span><input type="month" class="form-control form-control-sm" style="max-width:170px" value="${per}" max="${periodeNow()}" data-per><span data-st></span><div class="flex-fill"></div><div class="d-flex gap-2 flex-wrap" data-docs></div></div></div>
        <div data-main>${UI.skBox(3)}</div>
        ${UI.panel({ t: 'Riwayat Rekonsiliasi & Status Tutup Buku', i: 'fa-clock-rotate-left', p0: true, body: '<div data-hist></div>', foot: '<span><i class="fa-solid fa-lock"></i> Periode "BA Dikonfirmasi/Lunas" terkunci; perubahan hanya lewat Koreksi (Pasal 9 ayat 7)</span>' })}
        ${!isRS ? UI.panel({ t: 'Koreksi Periode Terkunci', i: 'fa-pen-to-square', c: 'oranye', p0: true, body: '<div data-kor></div>' }) : ''}`;
      $('[data-per]', el).onchange = (e) => e.target.value && Router.go('rekon', { periode: e.target.value });
      UI.bindForm(el);
      API.swr('rekon.daftar', {}, (rows) => {
        const h = $('[data-hist]', el); if (!h) return;
        UI.table(h, { key: 'periode', rows, size: 6, excel: 'Riwayat_Rekon', onClick: (r) => Router.go('rekon', { periode: r.periode }),
          cols: [{ k: 'periode', l: 'Periode', f: (v) => `<b>${fmt.per(v)}</b>` }, { k: 'ppk_total', l: 'Total PPK', t: 'rp' }, { k: 'pnbh', l: 'PNBH', t: 'rp' }, { k: 'hak_pengelola', l: 'Pengelola', t: 'rp' }, { k: 'hak_rs_neto', l: 'Disetor ke RS', t: 'rp' }, { k: 'tgl_laporan', l: 'Terbit', t: 'tgl' }, { k: 'tgl_setor', l: 'Setor', t: 'tgl' }, { k: 'status', l: 'Status', f: (v, r) => UI.badge(v) + (r.terkunci ? ' <i class="fa-solid fa-lock muted"></i>' : '') }] });
      });
      if (!isRS) { const k = $('[data-kor]', el); if (k) UI.entity(k, 'koreksi', { defaults: { periode_dibukukan: periodeNow() }, formNote: () => UI.callout('fa-circle-info', 'Koreksi atas periode terkunci dibukukan ke periode berjalan setelah disetujui Pimpinan (BR-21). Nilai negatif mengurangi.', 'biru'), canEdit: (r) => r.status !== 'Disetujui', canDel: (r) => r.status !== 'Disetujui' }); }
      load();
      function load(force) {
        if (force) { SP.Cache.drop('rekon.'); SP.Cache.drop('dash.'); }
        API.swr('rekon.get', { periode: per }, (d) => { if (ctx.live()) draw(d); }, { ttl: force ? 0 : 10000, onError: (e) => { $('[data-main]', el).innerHTML = UI.callout('fa-circle-xmark', esc(e.message), 'merah'); } });
      }
      function draw(d) {
        const r = d.rekon, st = r ? r.status : '', h = r || d.berjalan, k = d.kesiapan;
        const main = $('[data-main]', el);
        $('[data-st]', el).innerHTML = r ? UI.badge(st) + (r.terkunci ? ' <span class="badge-s s-hitam"><i class="fa-solid fa-lock"></i> Terkunci</span>' : '') : '<span class="badge-s s-abu">Belum dihitung</span>';
        if (isRS && !r) { main.innerHTML = UI.callout('fa-hourglass-half', 'Laporan periode ' + fmt.per(per) + ' belum diterbitkan oleh Pengelola. Tenggat laporan: ' + fmt.tgl(d.tenggat.laporan) + '.', 'biru'); $('[data-docs]', el).innerHTML = ''; return; }
        const terbit = ['Terbit', 'BA Dikonfirmasi', 'Lunas'].indexOf(st) > -1;
        $('[data-docs]', el).innerHTML = terbit ? `<button class="btn btn-sm btn-biru" data-doc="LB"><i class="fa-solid fa-file-pdf"></i> Laporan Bulanan</button><button class="btn btn-sm btn-biru" data-doc="BA"><i class="fa-solid fa-file-signature"></i> BA Rekonsiliasi</button><button class="btn btn-sm btn-biru" data-doc="DC"><i class="fa-solid fa-shield-halved"></i> Laporan Dana Cadangan</button>${r.pdf_ba_ttd ? `<button class="btn btn-sm btn-garis" data-view="${esc(r.pdf_ba_ttd)}"><i class="fa-solid fa-signature"></i> Scan BA bertanda tangan</button>` : ''}` : '';
        const cur = r ? URUT[st] : (k && k.siap ? 1 : 0);
        const steps = [{ nm: 'Cek kesiapan', ds: k ? (k.siap ? 'Lolos' : 'Belum lengkap') : '' }, { nm: 'Hitung PNBH', ds: r ? 'Formula BR-01..04' : '' }, { nm: 'Tinjau Pimpinan', ds: st === 'Ditinjau' ? 'Sedang berjalan' : '' },
          { nm: 'Terbitkan laporan & BA', ds: r && r.tgl_laporan ? fmt.tgl(r.tgl_laporan) : 'Tenggat ' + fmt.tgl(d.tenggat.laporan) }, { nm: 'Konfirmasi RS', ds: r && r.ba_dikonfirmasi_pada ? fmt.tgl(r.ba_dikonfirmasi_pada) : 'Maks ' + fmt.tgl(d.tenggat.ba) }, { nm: 'Penyetoran', ds: r && r.jatuh_tempo_setor ? 'Batas ' + fmt.tgl(r.jatuh_tempo_setor) : '' }];
        const ri = (r && r.rincian) || { per_lokasi: h.per_lokasi || [] };
        const baris = (lbl, ket, v, kls) => `<tr class="${kls || ''}"><td>${lbl}</td><td class="fs-12 muted">${ket}</td><td class="num">${v}</td></tr>`;
        main.innerHTML = `${UI.panel({ cls: 'mb-3', body: UI.stepper(steps, cur), collapse: false })}
          ${k && !isRS ? UI.panel({ t: 'Pemeriksaan Kesiapan Rekonsiliasi (Audit Gate)', i: 'fa-list-check', tools: `<span class="badge-s ${k.siap ? 's-hijau' : 's-merah'}">${k.cek.filter((c) => c.ok).length}/${k.cek.length} lolos</span>`,
            body: `<div class="row g-2">${k.cek.map((c) => `<div class="col-md-6 col-xl-4"><div class="cekbox ${c.ok ? 'ok' : c.bisaLewat ? 'warn' : 'no'}"><i class="fa-solid ${c.ok ? 'fa-circle-check' : c.bisaLewat ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}"></i><div><div class="jd">${esc(c.judul)}</div><div class="dt">${esc(c.detail)}</div></div></div></div>`).join('')}</div>` }) : ''}
          <div class="row g-3"><div class="col-lg-7">${UI.panel({ t: 'Kalkulasi PNBH & Bagi Hasil ' + (S.boot.set.PERSEN_PENGELOLA || 75) + ':' + (S.boot.set.PERSEN_RS || 25), i: 'fa-calculator', tools: !r ? '<span class="badge-s s-aqua">Estimasi berjalan</span>' : '', p0: true,
            body: `<table class="tbl"><thead><tr><th>Komponen</th><th>Dasar / klausul</th><th class="num">Nilai (IDR)</th></tr></thead><tbody>
              ${baris('<b>Pendapatan Parkir Kotor (PPK)</b>', 'Tunai, QRIS, inap, denda tiket, tarif zonasi, iklan/sewa', '<b>' + fmt.rp(h.ppk_total) + '</b>')}
              ${baris('<span class="text-merah">− PBJT ' + (S.boot.set.PBJT_PERSEN || '') + '%</span>', 'Pajak daerah per komponen kena PBJT (BR-07)', '<span class="text-merah">' + fmt.rp(-h.pbjt) + '</span>')}
              ${baris('<span class="text-merah">− Kontribusi DC trx berbayar</span>', fmt.n(h.trx_berbayar) + ' trx × Rp' + (S.boot.set.DC_PER_TRX || 500), '<span class="text-merah">' + fmt.rp(-h.dc_berbayar) + '</span>')}
              ${baris('<span class="text-merah">− Refund sah</span>', 'Bukti + persetujuan Pimpinan (BR-09)', '<span class="text-merah">' + fmt.rp(-h.refund) + '</span>')}
              ${baris('<span class="text-merah">− MDR QRIS & biaya transaksi</span>', h.mdr_estimasi ? '<span class="text-oranye">Estimasi — impor mutasi bank</span>' : 'QRIS rekap − settlement bank (BR-08)', '<span class="text-merah">' + fmt.rp(-h.mdr) + '</span>')}
              ${h.koreksi ? baris('Koreksi dibukukan', 'Koreksi periode terkunci (BR-21)', fmt.rp(h.koreksi)) : ''}
              <tr style="background:#e3f4ea"><td><b class="text-hijau">(=) PNBH</b></td><td class="fs-12">Pendapatan Neto yang Dapat Dibagihasilkan</td><td class="num"><b class="text-hijau fs-5">${fmt.rp(h.pnbh)}</b></td></tr></tbody></table>
              <div class="p-2"><div class="d-flex justify-content-between fs-12 fw-700 mb-1"><span class="text-hijau">PORSI PENGELOLA ${S.boot.set.PERSEN_PENGELOLA || 75}% (${fmt.rp(h.hak_pengelola)})</span><span class="text-biru">PORSI RS BRUTO ${S.boot.set.PERSEN_RS || 25}% (${fmt.rp(h.hak_rs_bruto)})</span></div>
              <div class="bar-2"><div style="width:${S.boot.set.PERSEN_PENGELOLA || 75}%;background:var(--hijau)">${S.boot.set.PERSEN_PENGELOLA || 75}% PENGELOLA</div><div style="flex:1;background:var(--biru)">${S.boot.set.PERSEN_RS || 25}% RS</div></div></div>` })}</div>
          <div class="col-lg-5">${UI.panel({ t: 'Penyesuaian Hak Bersih RS (BR-04)', i: 'fa-hospital', c: 'biru',
            body: `<table class="tbl mb-2"><tbody><tr><td>Porsi RS bruto</td><td class="num">${fmt.rp(h.hak_rs_bruto)}</td></tr><tr class="row-merah"><td class="text-merah">(−) Kompensasi parkir gratis<div class="fs-11 muted">${fmt.n(h.trx_gratis)} trx × Rp${S.boot.set.DC_PER_TRX || 500} (Pasal 16 ay. 3)</div></td><td class="num text-merah">${fmt.rp(-h.dc_gratis)}</td></tr>
              <tr><td>Carry-over bulan lalu</td><td class="num">${fmt.rp(h.carry_masuk)}</td></tr>${h.carry_keluar ? `<tr class="row-oranye"><td>Carry-over ke bulan berikut</td><td class="num">${fmt.rp(h.carry_keluar)}</td></tr>` : ''}${h.tagihan_rs ? `<tr class="row-oranye"><td>Ditagihkan ke RS</td><td class="num">${fmt.rp(h.tagihan_rs)}</td></tr>` : ''}</tbody></table>
              <div class="mini l-biru"><div class="lb">Kewajiban bersih setor ke RS (hak RS neto)</div><div class="vl text-biru" style="font-size:28px">${fmt.rp(h.hak_rs_neto)}</div>${S.boot.set.REKENING_RS ? `<div class="fs-12 muted">Rekening: ${esc(S.boot.set.REKENING_RS)}</div>` : ''}
              ${r && r.tgl_setor ? `<div class="fs-12 text-hijau mt-1"><i class="fa-solid fa-circle-check"></i> Disetor ${fmt.rp(r.nominal_setor)} pada ${fmt.tgl(r.tgl_setor)}${r.denda_telat ? ' · denda telat ' + fmt.rp(r.denda_telat) : ''}</div>` : ''}</div>` })}
            ${UI.panel({ t: 'Linimasa Kepatuhan (Pasal 10 PKS)', i: 'fa-calendar-check', c: 'oranye', body: `<div class="tl">
              <div class="ev ${r && r.tgl_laporan ? '' : 'cur'}"><b>Penerbitan Laporan Bulanan</b> ${r && r.tgl_laporan ? UI.badge(r.tgl_laporan <= d.tenggat.laporan ? 'Tepat waktu' : 'Terlambat', r.tgl_laporan <= d.tenggat.laporan ? 'hijau' : 'merah') : ''}<div class="fs-12 muted">Tenggat ${fmt.tgl(d.tenggat.laporan)}${r && r.tgl_laporan ? ' · terbit ' + fmt.tgl(r.tgl_laporan) : ''}</div></div>
              <div class="ev ${r && r.ba_dikonfirmasi_pada ? '' : (st === 'Terbit' ? 'cur' : 'no')}"><b>Penandatanganan BA</b><div class="fs-12 muted">Tenggat ${fmt.tgl(r && r.tgl_ba ? r.tgl_ba : d.tenggat.ba)} (tgl ${S.boot.set.TGL_BA || 12} atau +4 HK)${r && r.ba_dikonfirmasi_oleh ? ' · dikonfirmasi ' + esc(r.ba_dikonfirmasi_oleh) : ''}</div></div>
              <div class="ev ${st === 'Lunas' ? '' : (st === 'BA Dikonfirmasi' ? 'cur' : 'no')}"><b>Penyetoran bagian RS</b><div class="fs-12 muted">${r && r.jatuh_tempo_setor ? 'Jatuh tempo ' + fmt.tgl(r.jatuh_tempo_setor) : 'Maks 8 Hari Kerja setelah BA'}</div></div></div>
              ${UI.callout('fa-triangle-exclamation', '<b>Denda keterlambatan (Pasal 10 ay. 5):</b> ' + (S.boot.set.DENDA_TELAT ? esc(S.boot.set.DENDA_TELAT) + '% per hari dari nilai tertunggak.' : 'menunggu kesepakatan Lampiran Komersial.'), 'merah')}` })}</div></div>
          ${UI.panel({ t: 'Rincian Kontribusi per Lokasi Parkir', i: 'fa-location-dot', p0: true, body: '<div data-lok></div>', foot: '<span>*Pendapatan lain & MDR tidak dialokasikan per lokasi</span>' })}
          ${aksiBar(r, k, st, d)}`;
        UI.table($('[data-lok]', main), { key: 'id_lokasi', rows: ri.per_lokasi || [], search: false, excel: 'Rincian_Lokasi_' + per,
          cols: [{ k: 'id_lokasi', l: 'Lokasi', f: (v) => `<b class="text-biru">${esc(namaLokasi(v))}</b>` }, { k: 'trx_berbayar', l: 'Trx bayar', t: 'n', sum: true }, { k: 'trx_gratis', l: 'Trx gratis', t: 'n', sum: true }, { k: 'ppk', l: 'PPK kotor', t: 'rp', sum: true }, { k: 'pbjt', l: 'PBJT', t: 'rp', sum: true }, { k: 'pnbh', l: 'PNBH', t: 'rp', sum: true }, { k: 'hak_pengelola', l: 'Pengelola', t: 'rp', sum: true }, { k: 'hak_rs', l: 'RS bruto', t: 'rp', sum: true }] });
        el._d = d;
      }
      function aksiBar(r, k, st, d) {
        if (ro) return '';
        const b = [];
        if (can.int() && (!r || st === 'Draft' || st === 'Ditinjau') && per < periodeNow()) b.push(`<div class="d-flex gap-2 align-items-center flex-wrap"><select class="form-select form-select-sm" style="max-width:240px" data-opsi><option value="CARRY">Hak RS negatif → carry-over</option><option value="TAGIH" ${r && r.opsi_negatif === 'TAGIH' ? 'selected' : ''}>Hak RS negatif → tagih RS</option></select>
          <input class="form-control form-control-sm money" style="max-width:170px" placeholder="MDR manual (opsional)" data-mdr><button class="btn btn-garis" data-hitung><i class="fa-solid fa-calculator"></i> ${r ? 'Hitung Ulang' : 'Hitung Tutup Buku'}</button></div>`);
        if (can.role('ADMIN_KEU', 'SUPER_ADMIN') && st === 'Draft') b.push('<button class="btn btn-oranye" data-tinjau><i class="fa-solid fa-paper-plane"></i> Ajukan Tinjauan Pimpinan</button>');
        if (can.role('PIMPINAN', 'SUPER_ADMIN') && (st === 'Draft' || st === 'Ditinjau')) b.push(`${r.mdr_estimasi ? '<label class="form-check"><input type="checkbox" class="form-check-input" data-mdrok> <span class="fs-12">Setujui MDR estimasi</span></label>' : ''}<button class="btn btn-hijau" data-terbit><i class="fa-solid fa-stamp"></i> Finalisasi & Terbitkan ke RS UMSIDA</button>`);
        if (can.role('RS_UMSIDA', 'SUPER_ADMIN') && st === 'Terbit') b.push('<button class="btn btn-hijau" data-konfirm><i class="fa-solid fa-file-signature"></i> Konfirmasi BA Rekonsiliasi</button>');
        if (can.role('ADMIN_KEU', 'SUPER_ADMIN') && (st === 'BA Dikonfirmasi')) b.push('<button class="btn btn-biru" data-setor><i class="fa-solid fa-money-bill-transfer"></i> Catat Setoran ke RS</button>');
        if (can.role('SUPER_ADMIN') && r && r.terkunci) b.push('<button class="btn btn-merah" data-buka><i class="fa-solid fa-lock-open"></i> Buka Kunci Periode</button>');
        if (!b.length) return '';
        return `<div class="panel p-polos"><div class="panel-b d-flex gap-3 align-items-center justify-content-between flex-wrap"><div class="d-flex gap-2 align-items-center"><i class="fa-solid fa-shield-halved text-oranye fa-lg"></i><div><b>Otorisasi tutup buku ${fmt.per(per)}</b><div class="fs-12 muted">Setiap langkah tercatat di Audit_Log</div></div></div><div class="d-flex gap-2 flex-wrap align-items-center">${b.join('')}</div></div></div>`;
      }
      el.addEventListener('click', async (e) => {
        const t = e.target.closest('button'); if (!t) return;
        if (t.matches('[data-view]')) return UI.viewFile(t.dataset.view);
        if (t.matches('[data-hitung]')) {
          const mdr = $('[data-mdr]', el).value; const r = await UI.run(t, () => API.call('rekon.hitung', { periode: per, opsi_negatif: $('[data-opsi]', el).value, mdr_manual: mdr ? UI.parseRp(mdr) : undefined }), 'Perhitungan tersimpan (Draft)');
          load(true);
        }
        if (t.matches('[data-tinjau]')) { await UI.run(t, () => API.call('rekon.tinjau', { periode: per }), 'Diajukan ke Pimpinan'); load(true); }
        if (t.matches('[data-terbit]')) {
          const c = await UI.confirm({ title: 'Terbitkan laporan ' + fmt.per(per), msg: 'Laporan Bulanan, draf BA Rekonsiliasi & Laporan Dana Cadangan akan terbit dengan kode QR, kontribusi Dana Cadangan dibukukan, dan email dikirim ke pejabat penghubung RS.', ok: 'Terbitkan' });
          if (!c) return;
          const mok = $('[data-mdrok]', el);
          const res = await UI.run(t, () => API.call('rekon.terbitkan', { periode: per, setujui_mdr_estimasi: mok ? mok.checked : false }), 'Laporan terbit — kode QR dibuat');
          load(true);
          setTimeout(async () => { try { const d = await API.get('rekon.dokumen', { periode: per }, { force: true }); for (const j of ['LB', 'BA', 'DC']) await SP.Doc.pdf(j, d, { simpan: true, kode: d.dok[j].kode, nama: j + '_' + per + '.pdf' }); } catch (x) { UI.err(x); } }, 400);
        }
        if (t.matches('[data-doc]')) { const j = t.dataset.doc; await UI.run(t, async () => { const d = await API.get('rekon.dokumen', { periode: per }, { ttl: 60000 }); await SP.Doc.pdf(j, d, { simpan: can.int(), kode: d.dok[j].kode, nama: j + '_' + per + '.pdf' }); }); }
        if (t.matches('[data-konfirm]')) konfirmasiBA(per, () => load(true));
        if (t.matches('[data-setor]')) catatSetor(per, el._d.rekon, () => load(true));
        if (t.matches('[data-buka]')) {
          const c = await UI.confirm({ title: 'Buka kunci ' + fmt.per(per), msg: 'Periode akan kembali ke status Draft dan perlu diterbitkan & dikonfirmasi ulang. Pimpinan menerima notifikasi otomatis.', danger: true, ok: 'Buka kunci', input: { label: 'Alasan (wajib)', req: true } });
          if (c) { await UI.run(t, () => API.call('rekon.bukaKunci', { periode: per, alasan: c.nilai }), 'Periode dibuka kuncinya'); load(true); }
        }
      });
    }
  };
  function konfirmasiBA(per, done) {
    const m = UI.modal({ title: 'Konfirmasi BA Rekonsiliasi ' + fmt.per(per), static: true,
      body: `${UI.callout('fa-circle-info', 'Dengan mengonfirmasi, periode ini terkunci dan jatuh tempo setor bagian RS dihitung 8 Hari Kerja sejak hari ini. Unggah pindaian BA bertanda tangan basah bila sudah tersedia.', 'biru')}
        <label class="form-label">Catatan RS</label><textarea class="form-control" rows="2" data-cat></textarea>
        <label class="form-label mt-2">Pindaian BA bertanda tangan (PDF/JPG, opsional)</label><input type="file" class="form-control" accept="application/pdf,image/*" data-f>`,
      foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-hijau" data-ok><i class="fa-solid fa-check"></i> Konfirmasi BA</button>' });
    m.$('[data-ok]').onclick = async (e) => {
      const f = m.$('[data-f]').files[0]; let file = null;
      if (f) { const c = await SP.Files.compress(f, 1800, 0.85); file = { data: c.data, mime: c.mime }; }
      try { const r = await UI.run(e.currentTarget, () => API.call('rekon.konfirmasiBA', { periode: per, catatan: m.$('[data-cat]').value, file }), (x) => 'BA dikonfirmasi — jatuh tempo setor ' + fmt.tgl(x.jatuh_tempo_setor)); m.close(); done(); } catch (x) { }
    };
  }
  function catatSetor(per, r, done) {
    const sisa = Math.max(0, (r.hak_rs_neto || 0) - (r.nominal_setor || 0));
    const f = [{ n: 'tgl_setor', l: 'Tanggal setor', t: 'date', req: true }, { n: 'nominal', l: 'Nominal disetor', t: 'money', req: true }, { n: 'bukti_setor', l: 'Bukti transfer', t: 'file' }];
    const m = UI.modal({ title: 'Catat setoran bagian RS — ' + fmt.per(per), body: `${UI.callout('fa-circle-info', `Hak RS neto ${fmt.rp(r.hak_rs_neto)}, sudah disetor ${fmt.rp(r.nominal_setor || 0)}. Jumlah tidak disengketakan tetap dapat dicatat (Pasal 10 ay. 5).`, 'biru')}` + UI.form(f, { tgl_setor: SP.today(), nominal: sisa }, { cols: 1, fileKat: 'laporan' }), foot: '<button class="btn btn-abu" data-x>Batal</button><button class="btn btn-biru" data-ok>Simpan</button>' });
    UI.bindForm(m.el);
    m.$('[data-ok]').onclick = async (e) => { const d = UI.readForm(m.el, f); if (!UI.validate(m.el, f, d)) return; d.periode = per; try { await UI.run(e.currentTarget, () => API.call('rekon.catatSetor', d), (x) => 'Tersimpan — status ' + x.status); m.close(); done(); } catch (x) { } };
  }
})();
