/**
 * KONFIGURASI FRONTEND — isi GAS_URL dengan URL Web App (berakhiran /exec)
 * dari Apps Script: Deploy → Manage deployments → salin "Web app URL".
 */
window.CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxaZqmkBAF8JxofPTBKZg2MyOAWkeTvTnTQLCmE4owL7tolWJREJFVqX0r7rwzWBNUZaA/exec',
  APP_NAME: 'SiParkir UMSIDA',
  VERSION: '1.0.0',
  // SheetJS terbaru dimuat dari CDN resmi bila tersedia; cadangan lokal di vendor/
  XLSX_CDN: 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
};