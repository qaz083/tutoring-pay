/* 화면과 무관한 계산·변환만 모아둔 곳. 여기가 정산의 진실이라 테스트로 고정한다. */

export const COLORS = [
  "#3b6ef5", "#e0483b", "#16a34a", "#d97706",
  "#8b5cf6", "#0891b2", "#db2777", "#65a30d",
];
export const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parseDate = (ds) => {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const won = (n) =>
  (n < 0 ? "-" : "") + "₩" + Math.abs(Math.round(n)).toLocaleString("ko-KR");

/** 1 → "1", 1.5 → "1.5" (불필요한 0을 남기지 않는다) */
export const fmtH = (h) =>
  (Math.round(h * 100) / 100).toString().replace(/\.0+$/, "");

export const dowOf = (ds) => parseDate(ds).getDay();
export const fmtDate = (ds) => {
  const [, m, d] = ds.split("-");
  return `${+m}/${+d} (${DOW[dowOf(ds)]})`;
};

/** 아직 하지 않은 수업 */
export const isPlan = (l) => l.done === false;

/**
 * 학생 한 명의 정산 상태.
 *  bal  = 실제로 한 수업만 뺀 확정 잔액
 *  proj = 잡혀 있는 예정 수업까지 미리 뺀 잔액 (선입금이라 이쪽이 중요하다)
 */
export function stats(s) {
  const paid = s.payments.reduce((a, p) => a + (+p.amount || 0), 0);
  let usedAmt = 0, doneH = 0, planAmt = 0, planH = 0;
  for (const l of s.lessons) {
    const h = +l.hours || 0;
    const amt = h * (+l.rate || 0);
    if (isPlan(l)) { planAmt += amt; planH += h; }
    else { usedAmt += amt; doneH += h; }
  }
  const bal = paid - usedAmt;
  const proj = bal - planAmt;
  return {
    paid, usedAmt, doneH, planAmt, planH, bal, proj,
    remainH: s.rate > 0 ? bal / s.rate : 0,
    projRemainH: s.rate > 0 ? proj / s.rate : 0,
  };
}

/** 여러 학생을 합친 요약 */
export function aggregate(list) {
  return list.reduce((a, s) => {
    const t = stats(s);
    a.paid += t.paid; a.usedAmt += t.usedAmt; a.planAmt += t.planAmt;
    a.bal += t.bal; a.proj += t.proj; a.doneH += t.doneH; a.planH += t.planH;
    return a;
  }, { paid: 0, usedAmt: 0, planAmt: 0, bal: 0, proj: 0, doneH: 0, planH: 0 });
}

/** 저장된 데이터를 지금 버전 형태로 맞춘다 */
export function normalize(raw) {
  const state = raw && Array.isArray(raw.students) ? raw : { students: [] };
  for (const s of state.students) {
    if (!Array.isArray(s.payments)) s.payments = [];
    if (!Array.isArray(s.lessons)) s.lessons = [];
    if (!s.color) s.color = COLORS[0];
    if (s.guardian === undefined) s.guardian = "";   // 학부모 호칭. 비면 "학부모님"
    if (s.subject === undefined) s.subject = "";     // 새 수업에 미리 채워 넣을 과목
    s.rate = +s.rate || 0;
    for (const l of s.lessons) {
      // 상태 구분이 없던 시절 기록은 '완료'로 본다
      if (l.done === undefined) l.done = true;
      if (l.time === undefined) l.time = "";
      if (l.note === undefined) l.note = "";
      if (l.subject === undefined) l.subject = "";
      if (l.homework === undefined) l.homework = "";
      l.hours = +l.hours || 0;
      l.rate = +l.rate || 0;
    }
  }
  return state;
}

/** 달력에 그릴 6주치 날짜 (앞뒤 달 포함) */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/** 기간 안에서 특정 요일에 해당하는 날짜들 */
export function datesByDow(fromISO, toISO, dows) {
  const out = [];
  const end = parseDate(toISO);
  for (const d = parseDate(fromISO); d <= end; d.setDate(d.getDate() + 1)) {
    if (dows.includes(d.getDay())) out.push(iso(d));
  }
  return out;
}

/** 그 날 그 학생들에게 있었던 일 */
export function eventsOn(students, date) {
  const out = [];
  for (const s of students) {
    for (const l of s.lessons) if (l.date === date) out.push({ type: "lesson", s, l });
    for (const p of s.payments) if (p.date === date) out.push({ type: "pay", s, p });
  }
  out.sort((a, b) => (a.l?.time || "").localeCompare(b.l?.time || ""));
  return out;
}

/** 예정을 위로(다가오는 순), 완료는 아래로(최근 순) */
export function sortedLessons(students) {
  const out = [];
  for (const s of students) for (const l of s.lessons) out.push({ s, l });
  out.sort((a, b) => {
    const pa = isPlan(a.l) ? 0 : 1, pb = isPlan(b.l) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return pa === 0
      ? a.l.date.localeCompare(b.l.date)
      : b.l.date.localeCompare(a.l.date);
  });
  return out;
}
