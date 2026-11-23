/* =====================================================================
   doc.js — dokumen resmi PDF ber-QR (dibuat di browser, diarsipkan ke Drive)
   Laporan Bulanan (Pasal 10 ay. 2), BA Rekonsiliasi, Laporan Dana Cadangan (Pasal 16 ay. 15),
   Keputusan/BA klaim, Kalkulasi kompensasi pengakhiran.
   QR berisi URL …/exec?v=<kode HMAC> → halaman verifikasi publik "Dokumen ASLI/TIDAK DIKENAL".
   ===================================================================== */
(function () {
  'use strict';
  const { esc, fmt, S, API, Lib, Files, LS, namaLokasi } = SP;

  async function logo() {
    let l = LS.get('sp_logo', null);
    if (!l || (!l.pengelola && !l.rs)) { try { l = await API.get('publik.logo', {}, { ttl: 3600000 }); LS.set('sp_logo', l); } catch (e) { l = { pengelola: '', rs: '' }; } }
    return l;
  }
  async function qrImg(url) {
    if (!url) return '';
    const q = await Lib.qr(); const qr = q(0, 'M'); qr.addData(url); qr.make();
    return qr.createDataURL(4, 2);
  }
  function kop(l, judul, nomor, d) {
    return `<div class="kop">${l.rs ? `<img src="${l.rs}" alt="">` : '<div style="width:120px"></div>'}<div class="tx"><b>${esc(d.pihak.pengelola || 'PT Jenggolo Manik Bangkit Makmur')}</b>Pengelola Perparkiran ${esc(d.pihak.rs || 'Rumah Sakit UMSIDA Sidoarjo')}<div style="font-size:10.5px">PKS No. ${esc(d.pihak.nomor_pks || '-')}</div></div>${l.pengelola ? `<img src="${l.pengelola}" alt="">` : '<div style="width:120px"></div>'}</div>
      <h3>${esc(judul)}</h3><div class="no">Nomor: ${esc(nomor)} · Periode ${esc(d.nama_periode || '')}</div>`;
  }
  const qrBlok = (src, kode, ket) => src ? `<div class="qr"><img src="${src}" alt="QR"><div><b>Verifikasi keaslian dokumen</b><br>Pindai QR atau buka tautan verifikasi. Kode: <b>${esc(kode)}</b><br>${esc(ket || '')}<br>Dicetak ${esc(fmt.tglw(SP.nowLocal()))} dari SiParkir UMSIDA.</div></div>` : '';
  const tr = (a, b, bold) => `<tr><td>${a}</td><td class="r">${bold ? '<b>' + b + '</b>' : b}</td></tr>`;

  function tabelBagiHasil(r, persen) {
    return `<table><tbody>
      ${tr('Pendapatan parkir reguler', fmt.rp(r.ppk_parkir))}${tr('Tarif menginap', fmt.rp(r.ppk_menginap))}${tr('Denda kehilangan tiket', fmt.rp(r.ppk_tiket_hilang))}${tr('Tarif umum pelanggaran zonasi', fmt.rp(r.ppk_zonasi))}${tr('Pendapatan lain (iklan, sewa area)', fmt.rp(r.ppk_lain))}
      ${r.koreksi ? tr('Koreksi periode terkunci (dibukukan)', fmt.rp(r.koreksi)) : ''}${tr('Pendapatan Parkir Kotor (PPK)', fmt.rp(r.ppk_total), 1)}
      ${tr('− PBJT ' + (persen.pbjt || '') + '%', fmt.rp(-r.pbjt))}${tr('− Kontribusi Dana Cadangan transaksi berbayar (' + fmt.n(r.trx_berbayar) + ' × ' + fmt.rp(persen.dc) + ')', fmt.rp(-r.dc_berbayar))}
      ${tr('− Refund/pembatalan sah', fmt.rp(-r.refund))}${tr('− MDR QRIS & biaya transaksi' + (r.mdr_estimasi ? ' (estimasi)' : ''), fmt.rp(-r.mdr))}
      ${tr('Pendapatan Neto yang Dapat Dibagihasilkan (PNBH)', fmt.rp(r.pnbh), 1)}
      ${tr('Hak Pengelola ' + persen.pengelola + '%', fmt.rp(r.hak_pengelola))}${tr('Hak RS ' + persen.rs + '% (bruto)', fmt.rp(r.hak_rs_bruto))}
      ${tr('− Kontribusi Dana Cadangan transaksi gratis (' + fmt.n(r.trx_gratis) + ' × ' + fmt.rp(persen.dc) + ')', fmt.rp(-r.dc_gratis))}${r.carry_masuk ? tr('Carry-over bulan lalu', fmt.rp(r.carry_masuk)) : ''}
      ${tr('Hak RS neto (disetor ke RS)', fmt.rp(r.hak_rs_neto), 1)}${r.carry_keluar ? tr('Carry-over ke bulan berikutnya', fmt.rp(r.carry_keluar)) : ''}${r.tagihan_rs ? tr('Tagihan kepada RS', fmt.rp(r.tagihan_rs)) : ''}
    </tbody></table>`;
  }

  const TEMPLAT = {
    async LB(d) {
      const l = await logo(), r = d.rekon, ri = r.rincian || {}, v = ri.volume || {}, q = await qrImg(d.dok.LB.url);
      const lok = (ri.per_lokasi || []).map((x) => `<tr><td>${esc(namaLokasi(x.id_lokasi))}</td><td class="r">${fmt.n(x.masuk)}</td><td class="r">${fmt.n(x.trx_berbayar)}</td><td class="r">${fmt.n(x.trx_gratis)}</td><td class="r">${fmt.rp(x.ppk)}</td><td class="r">${fmt.rp(x.pnbh)}</td></tr>`).join('');
      return `${kop(l, 'Laporan Bulanan Pengelolaan Parkir', d.dok.LB.nomor, d)}
        <div class="sec">1. Volume & transaksi per lokasi</div><table><thead><tr><th>Lokasi</th><th class="r">Kendaraan masuk</th><th class="r">Trx berbayar</th><th class="r">Trx gratis</th><th class="r">PPK</th><th class="r">PNBH</th></tr></thead><tbody>${lok || '<tr><td colspan="6">-</td></tr>'}</tbody></table>
        <table><tbody>${tr('Kendaraan masuk mobil / motor', fmt.n(v.masuk_mobil) + ' / ' + fmt.n(v.masuk_motor))}${tr('Transaksi menginap · tiket hilang · pelanggaran zonasi', fmt.n(v.trx_menginap) + ' · ' + fmt.n(v.tiket_hilang) + ' · ' + fmt.n(v.trx_pelanggaran_zonasi))}${tr('Pengecualian darurat · kendaraan kedaruratan', fmt.n(v.trx_darurat) + ' · ' + fmt.n(v.kendaraan_kedaruratan))}${tr('Penerimaan tunai · QRIS', fmt.rp(v.tunai) + ' · ' + fmt.rp(v.qris))}</tbody></table>
        <div class="sec">2. Perhitungan PNBH & bagi hasil (Pasal 9)</div>${tabelBagiHasil(r, d.persen)}
        <div class="sec">3. Parkir gratis & zonasi</div><table><tbody>${tr('Transaksi gratis (termasuk pengecualian darurat)', fmt.n(r.trx_gratis))}${tr('Pelanggaran zonasi tercatat', fmt.n(d.pelanggaran.total) + ' kasus · ' + fmt.rp(d.pelanggaran.total_tarif))}</tbody></table>
        ${d.pelanggaran.rekap.length ? `<table><thead><tr><th>Penerima</th><th>Nopol</th><th>Kategori</th><th class="r">Pelanggaran</th></tr></thead><tbody>${d.pelanggaran.rekap.slice(0, 15).map((x) => `<tr><td>${esc(x.nama)}</td><td>${esc(x.nopol)}</td><td>${esc(x.kategori)}</td><td class="r">${x.jumlah}</td></tr>`).join('')}</tbody></table>` : ''}
        <div class="sec">4. Okupansi Lahan Parkir Sementara</div>${d.okupansi_lps.length ? `<table><tbody>${Array.from({ length: Math.ceil(d.okupansi_lps.length / 16) }, (_, i) => d.okupansi_lps.slice(i * 16, i * 16 + 16)).map((baris) => `<tr>${baris.map((x) => `<td style="text-align:center;font-size:9.5px;width:6.25%">${x.tanggal.slice(8)}<br><b>${x.persen === null ? x.puncak : x.persen + '%'}</b></td>`).join('')}</tr>`).join('')}</tbody></table><div style="font-size:10px;color:#666">Puncak harian kendaraan terparkir terhadap kapasitas lokasi.</div>` : '<p>Belum ada data okupansi.</p>'}
        <div class="sec">5. Dana Cadangan Risiko Kehilangan</div><table><tbody>${tr('Saldo awal', fmt.rp(d.dc.saldo_awal))}${tr('Kontribusi berbayar + gratis', fmt.rp(d.dc.kontribusi_berbayar + d.dc.kontribusi_gratis))}${tr('Pembayaran klaim', fmt.rp(-d.dc.pembayaran_klaim))}${tr('Saldo akhir', fmt.rp(d.dc.saldo_akhir), 1)}</tbody></table>
        <div class="sec">6. Klaim kehilangan & SLA</div><table><tbody>${d.klaim.length ? d.klaim.map((k) => tr(esc(k.id_klaim) + ' · ' + esc(k.jenis_kendaraan) + ' · ' + esc(k.status), fmt.rp(k.ganti_rugi_disetujui))).join('') : tr('Klaim', 'Tidak ada')}${d.sla ? tr('Skor SLA triwulan ' + d.sla.triwulan, d.sla.skor === null ? '-' : fmt.pct(d.sla.skor, 1)) : ''}</tbody></table>
        <div class="ttd"><div>Mengetahui,<br>${esc(d.pihak.rs || 'PIHAK RUMAH SAKIT')}<div class="sp"></div>( ........................................ )</div><div>Sidoarjo, ${esc(fmt.tgl(r.tgl_laporan || SP.today()))}<br>${esc(d.pihak.pengelola || 'PIHAK PENGELOLA')}<div class="sp"></div>( ........................................ )</div></div>
        ${qrBlok(q, d.dok.LB.kode, 'Nilai utama (PNBH): ' + fmt.rp(r.pnbh))}`;
    },
    async BA(d) {
      const l = await logo(), r = d.rekon, q = await qrImg(d.dok.BA.url);
      return `${kop(l, 'Berita Acara Rekonsiliasi Bulanan', d.dok.BA.nomor, d)}
        <p>Pada hari ini, kami yang bertanda tangan di bawah ini, mewakili <b>${esc(d.pihak.rs)}</b> (PIHAK RUMAH SAKIT) dan <b>${esc(d.pihak.pengelola)}</b> (PIHAK PENGELOLA), berdasarkan Perjanjian Kerja Sama Nomor ${esc(d.pihak.nomor_pks || '-')} Pasal 10, telah melakukan rekonsiliasi atas pendapatan pengelolaan parkir periode <b>${esc(d.nama_periode)}</b> dengan hasil sebagai berikut:</p>
        ${tabelBagiHasil(r, d.persen)}
        <p>Bagian PIHAK RUMAH SAKIT sebesar <b>${fmt.rp(r.hak_rs_neto)}</b> akan disetorkan oleh PIHAK PENGELOLA paling lambat 8 (delapan) Hari Kerja setelah Berita Acara ini ditandatangani${d.pihak.rekening_rs ? ', ke rekening ' + esc(d.pihak.rekening_rs) : ''}. Kontribusi Dana Cadangan bulan ini sebesar ${fmt.rp(r.dc_berbayar + r.dc_gratis)} dibukukan pada rekening khusus Dana Cadangan.</p>
        <p>Demikian Berita Acara ini dibuat dengan sebenarnya dalam rangkap 2 (dua), masing-masing mempunyai kekuatan hukum yang sama.</p>
        <div class="ttd"><div>PIHAK RUMAH SAKIT<br>${esc(d.pihak.rs)}<div class="sp"></div>( ........................................ )<br>Pejabat penghubung</div><div>PIHAK PENGELOLA<br>${esc(d.pihak.pengelola)}<div class="sp"></div>( ........................................ )<br>Direktur</div></div>
        ${qrBlok(q, d.dok.BA.kode, 'Nilai utama (Hak RS neto): ' + fmt.rp(r.hak_rs_neto))}`;
    },
    async DC(d) {
      const l = await logo(), c = d.dc, q = await qrImg(d.dok.DC.url);
      return `${kop(l, 'Laporan Dana Cadangan Risiko Kehilangan Kendaraan', d.dok.DC.nomor, d)}
        <p>Disusun sesuai Pasal 16 ayat (15) PKS. Dana Cadangan dibukukan terpisah dan tidak dibagikan selama PKS berjalan.</p>
        <table><tbody>${tr('Saldo awal', fmt.rp(c.saldo_awal))}${tr('Kontribusi transaksi berbayar', fmt.rp(c.kontribusi_berbayar))}${tr('Kontribusi transaksi gratis', fmt.rp(c.kontribusi_gratis))}${tr('Pembayaran klaim', fmt.rp(-c.pembayaran_klaim))}${tr('Penyesuaian (tambahan kekurangan 75:25)', fmt.rp(c.penyesuaian))}${tr('Jasa giro', fmt.rp(c.jasa_giro))}${tr('Biaya bank', fmt.rp(-c.biaya_bank))}${tr('Saldo akhir', fmt.rp(c.saldo_akhir), 1)}</tbody></table>
        <div class="sec">Mutasi periode</div><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Uraian</th><th class="r">Debit</th><th class="r">Kredit</th></tr></thead><tbody>${c.mutasi.map((m) => `<tr><td>${fmt.tgl(m.tanggal)}</td><td>${esc(m.jenis)}</td><td>${esc(m.uraian)}</td><td class="r">${fmt.rp(m.debit)}</td><td class="r">${fmt.rp(m.kredit)}</td></tr>`).join('') || '<tr><td colspan="5">-</td></tr>'}</tbody></table>
        <div class="ttd"><div>Mengetahui,<br>${esc(d.pihak.rs)}<div class="sp"></div>( ........................................ )</div><div>${esc(d.pihak.pengelola)}<div class="sp"></div>( ........................................ )</div></div>
        ${qrBlok(q, d.dok.DC.kode, 'Nilai utama (saldo akhir): ' + fmt.rp(c.saldo_akhir))}`;
    },
    async KLAIM(d) {
      const l = await logo(), k = d.klaim, q = await qrImg(d.verifikasi_url);
      const disetujui = k.keputusan === 'Disetujui';
      return `${kop(l, 'Keputusan Klaim Kehilangan Kendaraan', k.id_klaim, { pihak: d.pihak, nama_periode: fmt.tgl(k.tgl_keputusan) })}
        <table><tbody>${tr('Nomor klaim', esc(k.id_klaim))}${tr('Waktu kejadian · lokasi', fmt.tglw(k.tgl_kejadian) + ' · ' + esc(namaLokasi(k.id_lokasi)))}${tr('Kendaraan', esc(k.jenis_kendaraan) + ' ' + esc(k.merek_tipe_tahun) + ' (' + esc(k.nopol) + ')')}${tr('Pemohon', esc(k.pemohon))}${tr('Nilai pasar (appraisal ' + esc(k.appraiser || '-') + ')', fmt.rp(k.nilai_appraisal))}</tbody></table>
        <p>Berdasarkan Pasal 16 PKS dan kelengkapan dokumen yang diterima, klaim dinyatakan <b>${esc(k.keputusan || '-')}</b>${disetujui ? ` dengan ganti rugi sebesar <b>${fmt.rp(k.ganti_rugi_disetujui)}</b> (nilai terendah antara ${esc(S.boot.set.GR_PERSEN || 30)}% nilai pasar dan batas maksimum).` : '. Alasan: ' + esc(k.alasan_tolak || '-')}</p>
        <p style="font-size:11px">Barang di dalam kendaraan tidak termasuk pertanggungan (Pasal 16 ayat 11). Pembayaran paling lambat 14 Hari Kerja setelah BA penyelesaian ditandatangani.</p>
        <div class="ttd"><div>Pemohon<div class="sp"></div>( ${esc(k.pemohon)} )</div><div>${esc(d.pihak.pengelola)}<div class="sp"></div>( ........................................ )</div></div>
        ${qrBlok(q, k.kode_verifikasi, 'Nilai utama: ' + fmt.rp(k.ganti_rugi_disetujui))}`;
    },
    async KOMPENSASI(d) {
      const l = await logo(), v = d.nilai;
      return `${kop(l, 'Kalkulasi Kompensasi Pengakhiran (Pasal 24 ayat 2)', 'KMP/' + SP.today(), { pihak: d.pihak, nama_periode: fmt.tgl(SP.today()) })}
        <table><tbody>${tr('Tagihan belum dibayar', fmt.rp(v.tagihan))}${tr('Nilai investasi belum pulih (CAPEX disetujui)', fmt.rp(v.investasi))}${tr('Biaya pembatalan kontrak pihak ketiga', fmt.rp(v.pembatalan))}${tr('Biaya demobilisasi', fmt.rp(v.demobilisasi))}${tr('Kewajiban ketenagakerjaan', fmt.rp(v.ketenagakerjaan))}${tr('TOTAL KOMPENSASI', fmt.rp(v.total), 1)}</tbody></table>
        <p style="font-size:11px">Dihitung oleh ${esc(v.oleh)} pada ${esc(fmt.tglw(v.dihitung))}. Pembayaran kompensasi oleh RS paling lambat 30 hari setelah nilai final disepakati (Pasal 24 ayat 3). Dokumen internal — bukan tagihan resmi.</p>`;
    }
  };

  SP.Doc = {
    /** buat PDF; opsi: simpan (arsip ke Drive), kode, periode, jenis */
    async pdf(jenis, data, opt) {
      opt = opt || {};
      const html = await TEMPLAT[jenis](data);
      const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1';
      box.innerHTML = `<div class="doc">${html}</div>`; document.body.appendChild(box);
      try {
        const h2p = await Lib.pdf();
        const nama = opt.nama || (jenis + '_' + (data.periode || SP.today()) + '.pdf');
        const blob = await h2p().set({ margin: [8, 8, 10, 8], filename: nama, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.ttd', '.qr', '.kop'] } }).from(box.firstChild).outputPdf('blob');
        Files.download(blob, nama, 'application/pdf');
        if (opt.simpan && SP.can.role('SUPER_ADMIN', 'PIMPINAN', 'ADMIN_KEU') && !S.viewAs) {
          const b64 = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
          API.call('dok.simpanPdf', { jenis: opt.jenisKode || jenis, periode: data.periode, kode: opt.kode, nama, data: b64 }, { keepCache: true }).then(() => UI.toast('PDF diarsipkan ke Drive (05 Laporan & BA)')).catch(UI.err);
        }
        return blob;
      } finally { box.remove(); }
    },
    /** pratinjau HTML (tanpa PDF) */
    async preview(jenis, data) {
      const html = await TEMPLAT[jenis](data);
      const m = UI.modal({ title: 'Pratinjau dokumen', size: 'xl', body: `<div style="overflow:auto;background:#eee;padding:10px"><div class="doc mx-auto">${html}</div></div>`,
        foot: '<button class="btn btn-abu" data-x>Tutup</button><button class="btn btn-biru" data-pdf><i class="fa-solid fa-file-pdf"></i> Unduh PDF</button>' });
      m.$('[data-pdf]').onclick = (e) => UI.run(e.currentTarget, () => SP.Doc.pdf(jenis, data, {}));
    }
  };
})();
