import { test } from "node:test";
import assert from "node:assert/strict";
import M from "./load-model.mjs";

const { stats, aggregate, normalize, datesByDow, monthGrid, sortedLessons, fmtH, won, isPlan } = M;

const student = (over = {}) => ({
  id: "s1", name: "김민수", rate: 30000, color: "#000",
  payments: [], lessons: [], ...over,
});

test("선입금에서 완료한 수업만큼 차감된다", () => {
  const s = student({
    payments: [{ id: "p", date: "2026-08-01", amount: 300000 }],   // 10시간분
    lessons: [{ id: "l", date: "2026-08-05", hours: 3, rate: 30000, done: true }],
  });
  const t = stats(s);
  assert.equal(t.paid, 300000);
  assert.equal(t.usedAmt, 90000);
  assert.equal(t.bal, 210000);
  assert.equal(t.remainH, 7);
});

test("예정 수업은 확정 잔액을 건드리지 않고 proj에만 반영된다", () => {
  const s = student({
    payments: [{ id: "p", date: "2026-08-01", amount: 300000 }],
    lessons: [
      { id: "a", date: "2026-08-05", hours: 3, rate: 30000, done: true },
      { id: "b", date: "2026-08-07", hours: 2, rate: 30000, done: false },
      { id: "c", date: "2026-08-12", hours: 3, rate: 30000, done: false },
    ],
  });
  const t = stats(s);
  assert.equal(t.bal, 210000, "확정 잔액은 완료분만 뺀다");
  assert.equal(t.planH, 5);
  assert.equal(t.planAmt, 150000);
  assert.equal(t.proj, 60000, "예정까지 빼면 6만원 남는다");
  assert.equal(t.projRemainH, 2);
});

test("예정이 입금액을 넘으면 proj가 마이너스로 떨어진다", () => {
  const s = student({
    payments: [{ id: "p", date: "2026-08-01", amount: 300000 }],
    lessons: [
      { id: "a", date: "2026-08-05", hours: 3, rate: 30000, done: true },
      { id: "b", date: "2026-08-07", hours: 9, rate: 30000, done: false },
    ],
  });
  const t = stats(s);
  assert.equal(t.bal, 210000);
  assert.equal(t.proj, -60000);
});

test("시급을 올려도 이미 기록한 수업은 그때 시급으로 계산된다", () => {
  const s = student({
    rate: 40000,                                                   // 지금은 4만원
    payments: [{ id: "p", date: "2026-08-01", amount: 300000 }],
    lessons: [
      { id: "a", date: "2026-08-05", hours: 3, rate: 30000, done: true },   // 3만원 시절
      { id: "b", date: "2026-08-12", hours: 1.5, rate: 40000, done: true },
    ],
  });
  const t = stats(s);
  assert.equal(t.usedAmt, 90000 + 60000);
  assert.equal(t.bal, 150000);
  assert.equal(t.remainH, 3.75, "남은 시간은 현재 시급 기준으로 환산한다");
});

test("시급이 0이면 시간 환산에서 0으로 나누지 않는다", () => {
  const t = stats(student({ rate: 0, payments: [{ id: "p", date: "2026-08-01", amount: 100000 }] }));
  assert.equal(t.remainH, 0);
  assert.equal(t.projRemainH, 0);
});

test("여러 학생을 합산한다", () => {
  const a = student({ id: "a", payments: [{ id: "p1", date: "2026-08-01", amount: 300000 }] });
  const b = student({
    id: "b", rate: 40000,
    payments: [{ id: "p2", date: "2026-08-01", amount: 200000 }],
    lessons: [{ id: "l", date: "2026-08-03", hours: 2, rate: 40000, done: false }],
  });
  const agg = aggregate([a, b]);
  assert.equal(agg.paid, 500000);
  assert.equal(agg.bal, 500000);
  assert.equal(agg.planAmt, 80000);
  assert.equal(agg.proj, 420000);
});

test("상태가 없던 옛 기록은 완료로 본다", () => {
  const s = normalize({ students: [student({ lessons: [{ id: "l", date: "2026-08-05", hours: 2, rate: 30000 }] })] });
  const l = s.students[0].lessons[0];
  assert.equal(l.done, true);
  assert.equal(l.note, "");
  assert.equal(l.time, "");
  assert.equal(isPlan(l), false);
});

test("깨진 데이터도 빈 상태로 복구된다", () => {
  assert.deepEqual(normalize(null), { students: [] });
  assert.deepEqual(normalize({ nope: 1 }), { students: [] });
});

test("요일 반복으로 날짜를 뽑는다 (수·금, 8/8~8/31)", () => {
  const out = datesByDow("2026-08-08", "2026-08-31", [3, 5]);
  assert.deepEqual(out, [
    "2026-08-12", "2026-08-14", "2026-08-19",
    "2026-08-21", "2026-08-26", "2026-08-28",
  ]);
});

test("기간이 하루뿐이어도 해당 요일이면 잡힌다", () => {
  assert.deepEqual(datesByDow("2026-08-12", "2026-08-12", [3]), ["2026-08-12"]);
  assert.deepEqual(datesByDow("2026-08-12", "2026-08-12", [1]), []);
});

test("달력 격자는 6주치이고 일요일에서 시작한다", () => {
  const g = monthGrid(2026, 7);            // 2026년 8월
  assert.equal(g.length, 42);
  assert.equal(g[0].getDay(), 0);
  assert.ok(g.some((d) => d.getMonth() === 7 && d.getDate() === 1));
  assert.ok(g.some((d) => d.getMonth() === 7 && d.getDate() === 31));
});

test("예정이 위(다가오는 순), 완료가 아래(최근 순)로 정렬된다", () => {
  const s = student({
    lessons: [
      { id: "done-old", date: "2026-08-01", hours: 1, rate: 30000, done: true },
      { id: "plan-late", date: "2026-09-10", hours: 1, rate: 30000, done: false },
      { id: "done-new", date: "2026-08-20", hours: 1, rate: 30000, done: true },
      { id: "plan-soon", date: "2026-08-25", hours: 1, rate: 30000, done: false },
    ],
  });
  assert.deepEqual(
    sortedLessons([s]).map((r) => r.l.id),
    ["plan-soon", "plan-late", "done-new", "done-old"]
  );
});

test("숫자 표기", () => {
  assert.equal(fmtH(3), "3");
  assert.equal(fmtH(1.5), "1.5");
  assert.equal(fmtH(2.25), "2.25");
  assert.equal(won(300000), "₩300,000");
  assert.equal(won(-60000), "-₩60,000");
});
