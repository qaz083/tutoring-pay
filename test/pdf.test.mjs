import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/pdf.js", import.meta.url), "utf8");
const { jpegToPdf } = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));

/** 최소한의 JPEG 흉내 — 내용은 그대로 실려야 한다 */
const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]);
const text = (u8) => Buffer.from(u8).toString("latin1");

test("PDF 머리말과 꼬리말이 있다", () => {
  const pdf = text(jpegToPdf(fakeJpeg, 1600, 2000));
  assert.ok(pdf.startsWith("%PDF-1.4"));
  assert.ok(pdf.trimEnd().endsWith("%%EOF"));
});

test("xref 표의 위치가 실제 객체 위치와 맞는다", () => {
  const bytes = jpegToPdf(fakeJpeg, 1600, 2000);
  const pdf = text(bytes);

  const startxref = +pdf.match(/startxref\n(\d+)/)[1];
  assert.equal(pdf.slice(startxref, startxref + 4), "xref", "startxref가 xref 표를 정확히 가리킨다");

  const rows = [...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => +m[1]);
  assert.equal(rows.length, 5, "객체 5개");
  rows.forEach((off, i) => {
    assert.equal(pdf.slice(off, off + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`,
      `${i + 1}번 객체 위치가 맞는다`);
  });
});

test("그림이 손상 없이 그대로 들어간다", () => {
  const bytes = jpegToPdf(fakeJpeg, 1600, 2000);
  const pdf = text(bytes);
  const at = pdf.indexOf("stream\n", pdf.indexOf("/DCTDecode")) + "stream\n".length;
  assert.deepEqual([...bytes.slice(at, at + fakeJpeg.length)], [...fakeJpeg]);
  assert.match(pdf, new RegExp(`/Length ${fakeJpeg.length}`));
});

test("종이 폭은 A4이고 높이는 그림 비율을 따른다", () => {
  const pdf = text(jpegToPdf(fakeJpeg, 1000, 2000));
  const [, w, h] = pdf.match(/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/).map(Number);
  assert.equal(w, 595.28, "A4 폭");
  assert.ok(Math.abs(h - 1190.56) < 0.05, "가로:세로 1:2 → 높이도 두 배");
});

test("내용이 길면 종이도 길어진다", () => {
  const shortDoc = text(jpegToPdf(fakeJpeg, 1600, 1000));
  const longDoc = text(jpegToPdf(fakeJpeg, 1600, 4000));
  const hOf = (s) => +s.match(/MediaBox \[0 0 [\d.]+ ([\d.]+)\]/)[1];
  assert.ok(hOf(longDoc) > hOf(shortDoc) * 3.9);
});

test("그림 크기가 헤더에 그대로 적힌다", () => {
  const pdf = text(jpegToPdf(fakeJpeg, 1640, 2360));
  assert.match(pdf, /\/Width 1640/);
  assert.match(pdf, /\/Height 2360/);
});
