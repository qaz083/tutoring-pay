/* JPEG 한 장을 A4 폭 PDF로 감싼다.
   글자를 PDF 안에 직접 넣으려면 한글 폰트를 통째로 심어야 해서 파일이 몇 MB가 된다.
   그림으로 넣으면 폰트가 필요 없고, 브라우저 인쇄처럼 주소·시각이 찍히지도 않는다. */

const A4_WIDTH_PT = 595.28;

const latin1 = (str) => {
  const a = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) & 0xff;
  return a;
};

/**
 * @param {Uint8Array} jpeg
 * @param {number} pxW @param {number} pxH  그림의 픽셀 크기
 * @returns {Uint8Array} PDF 바이트
 */
export function jpegToPdf(jpeg, pxW, pxH) {
  const scale = A4_WIDTH_PT / pxW;
  const pageW = +A4_WIDTH_PT.toFixed(2);
  const pageH = +(pxH * scale).toFixed(2);   // 내용이 길면 종이도 길어진다

  const chunks = [];
  const offsets = [];
  let size = 0;
  const push = (u8) => { chunks.push(u8); size += u8.length; };
  const put = (s) => push(latin1(s));

  put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const obj = (n, dict, stream) => {
    offsets[n] = size;
    put(`${n} 0 obj\n${dict}\n`);
    if (stream) { put("stream\n"); push(stream); put("\nendstream\n"); }
    put("endobj\n");
  };

  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
         `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} ` +
         `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
         `/Length ${jpeg.length} >>`, jpeg);

  const content = latin1(`q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`);
  obj(5, `<< /Length ${content.length} >>`, content);

  const xrefAt = size;
  let tail = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) tail += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  tail += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  put(tail);

  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}
