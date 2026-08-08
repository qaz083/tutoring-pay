import { test } from "node:test";
import assert from "node:assert/strict";
import M from "./load-report.mjs";

const { buildReport } = M;

const student = (over = {}) => ({
  id: "s1", name: "김민수", rate: 30000, color: "#000",
  payments: [{ id: "p", date: "2026-08-01", amount: 300000 }],
  lessons: [], ...over,
});

const lesson = (date, hours, over = {}) =>
  ({ id: date, date, hours, rate: 30000, done: true, time: "16:00", note: "", ...over });

test("고른 수업의 날짜·시간·합계가 내역서에 들어간다", () => {
  const lessons = [lesson("2026-08-05", 2), lesson("2026-08-12", 2), lesson("2026-08-19", 1.5)];
  const s = student({ lessons });
  const html = buildReport([{ student: s, lessons }], "2026-08-20");

  assert.match(html, /김민수/);
  assert.match(html, /2026년 8월 5일 ~ 2026년 8월 19일/);
  assert.match(html, /8\/5/); assert.match(html, /8\/12/); assert.match(html, /8\/19/);
  assert.match(html, /3회/, "수업 횟수");
  assert.match(html, /5\.5시간/, "시간 합계 2+2+1.5");
  assert.match(html, /₩165,000/, "수업료 합계 5.5 × 30,000");
  assert.match(html, /2026년 8월 20일 작성/);
});

test("고르지 않은 수업은 내역서에 들어가지 않는다", () => {
  const all = [lesson("2026-08-05", 2), lesson("2026-08-12", 2), lesson("2026-08-26", 3)];
  const s = student({ lessons: all });
  const html = buildReport([{ student: s, lessons: all.slice(0, 2) }], "2026-08-20");

  assert.match(html, /8\/5/);
  assert.match(html, /8\/12/);
  assert.doesNotMatch(html, /8\/26/, "선택하지 않은 8/26은 빠진다");
  assert.match(html, /2회/);
  assert.match(html, /4시간/);
});

test("날짜 순서가 뒤섞여 들어와도 오름차순으로 정리된다", () => {
  const lessons = [lesson("2026-08-19", 1), lesson("2026-08-05", 1), lesson("2026-08-12", 1)];
  const html = buildReport([{ student: student({ lessons }), lessons }], "2026-08-20");
  const order = [...html.matchAll(/(8\/\d+) <span class="dow"/g)].map((m) => m[1]);
  assert.deepEqual(order, ["8/5", "8/12", "8/19"]);
});

test("예정 수업은 표시가 붙는다", () => {
  const lessons = [lesson("2026-08-05", 2), lesson("2026-08-26", 2, { done: false })];
  const html = buildReport([{ student: student({ lessons }), lessons }], "2026-08-20");
  assert.match(html, /class="plan">예정</);
});

test("학생이 여럿이면 사람마다 구역이 나뉜다", () => {
  const a = student({ id: "a", name: "김민수", lessons: [lesson("2026-08-05", 2)] });
  const b = student({ id: "b", name: "박지우", rate: 40000, lessons: [lesson("2026-08-06", 1, { rate: 40000 })] });
  const html = buildReport([
    { student: a, lessons: a.lessons },
    { student: b, lessons: b.lessons },
  ], "2026-08-20");

  assert.equal((html.match(/<section>/g) || []).length, 2);
  assert.match(html, /김민수/);
  assert.match(html, /박지우/);
  assert.match(html, /₩60,000/, "김민수 2시간 × 30,000");
  assert.match(html, /₩40,000/, "박지우 1시간 × 40,000");
});

test("이름에 든 꺾쇠는 태그로 새지 않는다", () => {
  const s = student({ name: '김<script>alert(1)</script>' , lessons: [lesson("2026-08-05", 1)] });
  const html = buildReport([{ student: s, lessons: s.lessons }], "2026-08-20");
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

test("고른 수업이 없어도 깨지지 않는다", () => {
  const html = buildReport([{ student: student(), lessons: [] }], "2026-08-20");
  assert.match(html, /선택한 수업이 없습니다/);
  assert.match(html, /기간 없음/);
});
