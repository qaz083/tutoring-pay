/* 웹: 내역서를 캔버스에 그려 PDF 한 장으로 만든 뒤 공유 시트로 넘긴다.
   브라우저 인쇄를 쓰면 종이 밑에 주소와 시각이 찍혀 학부모께 보내기 어렵다. */
import { DOW, won, fmtH, isPlan, stats } from "./model";
import { jpegToPdf } from "./pdf";

const W = 820;                 // 도면 기준 폭
const PAD = 56;
const S = 2;                   // 선명하게 뽑기 위한 배율
const FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

const INK = "#1b1e24", MUTED = "#6b7280", LINE = "#e5e7eb";

const kdate = (ds) => { const [y, m, d] = ds.split("-"); return `${y}년 ${+m}월 ${+d}일`; };
const short = (ds) => { const [, m, d] = ds.split("-"); return `${+m}/${+d}`; };
const dow = (ds) => DOW[new Date(ds + "T00:00:00").getDay()];

/** 그리기 전에 필요한 높이를 먼저 센다 */
function measure(groups) {
  let h = PAD + 46 + 26 + 30;                       // 제목 + 작성일 + 여백
  for (const g of groups) {
    h += 34 + 24 + 16;                              // 이름 + 기간
    h += 34;                                        // 표 머리
    h += Math.max(g.lessons.length, 1) * 40;        // 줄
    h += 46;                                        // 합계
    h += 24 + 3 * 28;                               // 요약
    h += 42;                                        // 구역 사이
  }
  return h + PAD - 42;
}

function draw(ctx, groups, madeOn) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, 10000);
  ctx.textBaseline = "alphabetic";

  const line = (y, color = LINE, width = 1) => {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(PAD, y + 0.5); ctx.lineTo(W - PAD, y + 0.5); ctx.stroke();
  };
  const text = (s, x, y, { size = 16, weight = "400", color = INK, align = "left" } = {}) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color; ctx.textAlign = align;
    ctx.fillText(s, x, y);
  };

  let y = PAD + 30;
  text("수업 내역", PAD, y, { size: 30, weight: "800" });
  y += 26;
  text(`${kdate(madeOn)} 작성`, PAD, y, { size: 14, color: MUTED });
  y += 40;

  // 표 칸 위치
  const cDate = PAD, cTime = PAD + 210, cHours = PAD + 390, cRight = W - PAD;

  for (const { student, lessons } of groups) {
    const sorted = [...lessons].sort((a, b) => a.date.localeCompare(b.date));
    const hours = sorted.reduce((a, l) => a + l.hours, 0);
    const amount = sorted.reduce((a, l) => a + l.hours * l.rate, 0);
    const st = stats(student);

    y += 22;
    text(student.name, PAD, y, { size: 22, weight: "800" });
    y += 22;
    text(sorted.length ? `${kdate(sorted[0].date)} ~ ${kdate(sorted[sorted.length - 1].date)}` : "기간 없음",
      PAD, y, { size: 14, color: MUTED });
    y += 30;

    text("날짜", cDate, y, { size: 13, weight: "700", color: MUTED });
    text("시각", cTime, y, { size: 13, weight: "700", color: MUTED });
    text("수업 시간", cHours, y, { size: 13, weight: "700", color: MUTED });
    y += 12;
    line(y, INK, 1.5);

    if (!sorted.length) {
      y += 40;
      text("선택한 수업이 없습니다", W / 2, y - 12, { size: 15, color: MUTED, align: "center" });
      line(y);
    }
    for (const l of sorted) {
      y += 40;
      text(`${short(l.date)}`, cDate, y - 13, { size: 17, weight: "600" });
      text(`(${dow(l.date)})`, cDate + 52, y - 13, { size: 15, color: MUTED });
      text(l.time || "—", cTime, y - 13, { size: 16 });
      text(`${fmtH(l.hours)}시간`, cHours, y - 13, { size: 17, weight: "600" });
      if (isPlan(l)) text("예정", cRight, y - 13, { size: 13, weight: "700", color: MUTED, align: "right" });
      line(y);
    }

    y += 12;
    line(y - 12, INK, 1.5);
    y += 22;
    text("합계", cDate, y, { size: 17, weight: "800" });
    text(`${sorted.length}회`, cTime, y, { size: 17, weight: "800" });
    text(`${fmtH(hours)}시간`, cHours, y, { size: 17, weight: "800" });
    y += 36;

    const sum = (label, value, big) => {
      text(label, cDate, y, { size: 15, color: MUTED });
      text(value, cRight, y, { size: big ? 20 : 16, weight: "700", align: "right" });
      y += 28;
    };
    sum("시급", won(student.rate));
    sum("수업료 합계", won(amount), true);
    sum("남은 시간 (예정 반영)", `${fmtH(st.projRemainH)}시간 · ${won(st.proj)}`);

    y += 14;
  }
}

export async function printReport(groups, madeOn) {
  const h = measure(groups);
  const canvas = document.createElement("canvas");
  canvas.width = W * S;
  canvas.height = h * S;
  const ctx = canvas.getContext("2d");
  ctx.scale(S, S);
  draw(ctx, groups, madeOn);

  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  const pdf = jpegToPdf(jpeg, canvas.width, canvas.height);

  const name = `수업내역-${madeOn}.pdf`;
  const file = new File([pdf], name, { type: "application/pdf" });

  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return true;
    }
  } catch (e) {
    if (e?.name === "AbortError") return false;
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
