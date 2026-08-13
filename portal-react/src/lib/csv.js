/**
 * Hand the reader a real file, not a toast saying one was made.
 *
 * The leading BOM is not decoration: without it Excel reads the file in the
 * system codepage and any non-ASCII in a device name arrives as mojibake.
 */
export function downloadCsv(filename, header, rows) {
  const q = s => (/[",\r\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s));
  const body = [header.map(q).join(',')]
    .concat(rows.map(r => r.map(q).join(',')))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
