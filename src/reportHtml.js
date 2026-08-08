/* 학부모께 보낼 수업 내역서 HTML을 만든다.
   화면도 파일도 모르는 순수 함수라 그대로 테스트한다. */
import { DOW, won, fmtH, isPlan, stats } from "./model";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const kdate = (ds) => {
  const [y, m, d] = ds.split("-");
  return `${y}년 ${+m}월 ${+d}일`;
};
const row = (ds) => {
  const [, m, d] = ds.split("-");
  return `${+m}/${+d}`;
};

/**
 * @param groups [{ student, lessons }] — lessons는 이미 골라 놓은 것
 * @param madeOn "YYYY-MM-DD"
 */
export function buildReport(groups, madeOn) {
  const body = groups.map(({ student, lessons }) => {
    const sorted = [...lessons].sort((a, b) => a.date.localeCompare(b.date));
    const hours = sorted.reduce((a, l) => a + l.hours, 0);
    const amount = sorted.reduce((a, l) => a + l.hours * l.rate, 0);
    const from = sorted[0]?.date, to = sorted[sorted.length - 1]?.date;
    const st = stats(student);

    const rows = sorted.map((l) => `
      <tr>
        <td class="d">${row(l.date)} <span class="dow">(${DOW[new Date(l.date + "T00:00:00").getDay()]})</span></td>
        <td class="t">${l.time ? esc(l.time) : "—"}</td>
        <td class="h">${fmtH(l.hours)}시간</td>
        <td class="s">${isPlan(l) ? '<span class="plan">예정</span>' : ""}</td>
      </tr>`).join("");

    return `
    <section>
      <h2>${esc(student.name)}</h2>
      <p class="range">${from ? `${kdate(from)} ~ ${kdate(to)}` : "기간 없음"}</p>

      <table>
        <thead><tr><th>날짜</th><th>시각</th><th>수업 시간</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="none">선택한 수업이 없습니다</td></tr>`}</tbody>
        <tfoot>
          <tr>
            <td>합계</td>
            <td>${sorted.length}회</td>
            <td>${fmtH(hours)}시간</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <table class="sum">
        <tr><td>시급</td><td>${won(student.rate)}</td></tr>
        <tr><td>수업료 합계</td><td class="big">${won(amount)}</td></tr>
        <tr><td>남은 시간 (예정 반영)</td><td>${fmtH(st.projRemainH)}시간 · ${won(st.proj)}</td></tr>
      </table>
    </section>`;
  }).join("");

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>수업 내역</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: #1b1e24; background: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    font-size: 13px; line-height: 1.55; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { padding: 24px 20px; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 2px; letter-spacing: -0.02em; }
  .made { color: #6b7280; font-size: 12px; margin: 0 0 22px; }
  section { margin-bottom: 30px; page-break-inside: avoid; }
  h2 { font-size: 16px; margin: 0 0 2px; letter-spacing: -0.02em; }
  .range { color: #6b7280; font-size: 12px; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 7px 8px; text-align: left; }
  thead th {
    font-size: 11px; color: #6b7280; font-weight: 700;
    border-bottom: 1.5px solid #1b1e24;
  }
  tbody td { border-bottom: 1px solid #e5e7eb; font-variant-numeric: tabular-nums; }
  td.d { font-weight: 600; }
  .dow { color: #6b7280; font-weight: 400; }
  td.t, td.h { font-variant-numeric: tabular-nums; }
  td.h { font-weight: 600; }
  .plan {
    font-size: 10.5px; font-weight: 700; color: #6b7280;
    border: 1px solid #d1d5db; border-radius: 4px; padding: 1px 5px;
  }
  td.none { color: #6b7280; text-align: center; padding: 18px 0; }
  tfoot td {
    font-weight: 800; border-top: 1.5px solid #1b1e24; padding-top: 9px;
    font-variant-numeric: tabular-nums;
  }
  table.sum { margin-top: 14px; width: auto; min-width: 260px; }
  table.sum td { border: none; padding: 3px 0; color: #4b5563; }
  table.sum td:last-child { text-align: right; padding-left: 28px; color: #1b1e24; font-weight: 700; font-variant-numeric: tabular-nums; }
  table.sum td.big { font-size: 16px; }
</style></head>
<body><div class="page">
  <h1>수업 내역</h1>
  <p class="made">${kdate(madeOn)} 작성</p>
  ${body}
</div></body></html>`;
}
