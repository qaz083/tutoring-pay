import { test } from "node:test";
import assert from "node:assert/strict";
import M from "./load-message.mjs";

const { progressMessage, reminderMessage, nickname, hasBatchim } = M;

const student = (over = {}) => ({ id: "s1", name: "김민준", guardian: "어머님", rate: 30000, ...over });
const lesson = (over = {}) =>
  ({ id: "l1", date: "2026-08-05", time: "16:00", hours: 2, rate: 30000, done: true,
     note: "", subject: "", homework: "", ...over });

test("받침이 있으면 이름 뒤에 '이'가 붙는다", () => {
  assert.equal(nickname("김민준"), "김민준이");
  assert.equal(nickname("이지수"), "이지수");
  assert.equal(hasBatchim("김민준"), true);
  assert.equal(hasBatchim("이지수"), false);
});

test("한글이 아닌 이름에는 조사를 붙이지 않는다", () => {
  assert.equal(nickname("Kevin"), "Kevin");
  assert.equal(nickname(""), "");
});

test("호칭이 없으면 '학부모님'으로 부른다", () => {
  const msg = progressMessage(student({ guardian: "" }), lesson());
  assert.match(msg, /^안녕하세요, 김민준이 학부모님\./);
});

test("과목과 진도가 한 줄로 합쳐진다", () => {
  const msg = progressMessage(student(), lesson({ subject: "수학Ⅰ", note: "지수로그 3단원까지" }));
  assert.match(msg, /· 수학Ⅰ — 지수로그 3단원까지/);
});

test("숙제는 따로 한 줄로 나간다", () => {
  const msg = progressMessage(student(), lesson({ note: "지수로그", homework: "워크북 42~48쪽" }));
  assert.match(msg, /· 숙제: 워크북 42~48쪽/);
});

test("적지 않은 항목은 줄째로 빠진다", () => {
  const msg = progressMessage(student(), lesson());
  assert.doesNotMatch(msg, /숙제/);
  assert.doesNotMatch(msg, /·/);
  assert.match(msg, /8\/5 \(수\) 수업 잘 마쳤습니다\./);
});

test("잔액이 남으면 알리기만 한다", () => {
  const msg = progressMessage(student(), lesson(), { balance: { bal: 240000, remainH: 8 } });
  assert.match(msg, /남은 수업료는 ₩240,000 \(8시간분\)입니다\./);
  assert.doesNotMatch(msg, /입금 부탁/);
});

test("잔액이 모자랄 때만 입금을 청한다", () => {
  const msg = progressMessage(student(), lesson(), { balance: { bal: -60000, remainH: -2 } });
  assert.match(msg, /₩60,000 추가 입금 부탁드립니다\./);
});

test("잔액이 딱 0이면 청구하지 않는다", () => {
  const msg = progressMessage(student(), lesson(), { balance: { bal: 0, remainH: 0 } });
  assert.match(msg, /모두 채워졌습니다\./);
  assert.doesNotMatch(msg, /부탁드립니다/);
});

test("당일 안내는 '오늘'로 적는다", () => {
  const msg = reminderMessage(student(), lesson(), "2026-08-05");
  assert.match(msg, /오늘 16:00에 수업 있습니다\./);
});

test("다른 날 수업은 날짜로 적는다", () => {
  const msg = reminderMessage(student(), lesson(), "2026-08-04");
  assert.match(msg, /8\/5 \(수\) 16:00에 수업 있습니다\./);
});

test("시각을 안 적었으면 시각 없이 안내한다", () => {
  const msg = reminderMessage(student(), lesson({ time: "" }), "2026-08-05");
  assert.match(msg, /오늘 수업 있습니다\./);
});
