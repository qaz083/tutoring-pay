/* 학부모께 보낼 문자를 만든다. 화면을 모르는 순수 함수만 둔다.
   문장을 매번 다르게 굴리지 않는다 — 같은 형식으로 꾸준히 가는 편이
   받는 쪽에서 읽기 편하고, 보내는 쪽도 뭘 적어야 할지 헷갈리지 않는다. */

import { fmtDate, fmtH, won } from "./model";

/**
 * 자주 쓰는 과목. 과목은 자유 입력이 원칙이고 이 목록은 눌러서 넣기 위한 것이다.
 * 여기 없는 과목은 그냥 타이핑하면 된다.
 */
export const SUBJECT_GROUPS = [
  ["국어", ["국어", "문학", "독서", "화법과 작문", "언어와 매체"]],
  ["수학", ["수학", "수학Ⅰ", "수학Ⅱ", "미적분", "확률과 통계", "기하"]],
  ["영어", ["영어", "영어Ⅰ", "영어Ⅱ", "영어 독해와 작문"]],
  ["탐구", ["통합사회", "한국사", "생활과 윤리", "사회·문화", "정치와 법", "경제",
           "한국지리", "세계지리", "동아시아사", "세계사", "윤리와 사상"]],
  ["과학", ["통합과학", "물리학Ⅰ", "화학Ⅰ", "생명과학Ⅰ", "지구과학Ⅰ",
           "물리학Ⅱ", "화학Ⅱ", "생명과학Ⅱ", "지구과학Ⅱ"]],
];

/** 이름 끝 글자에 받침이 있는지. 한글이 아니면 없는 것으로 본다 */
export function hasBatchim(name) {
  const s = (name || "").trim();
  if (!s) return false;
  const c = s.charCodeAt(s.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}

/** 호칭 앞에 놓는 형태. "민준" → "민준이", "지수" → "지수" */
export function nickname(name) {
  const s = (name || "").trim();
  return hasBatchim(s) ? s + "이" : s;
}

const greeting = (student) => {
  const who = nickname(student?.name);
  const g = (student?.guardian || "").trim();
  if (!who) return "안녕하세요.";
  return `안녕하세요, ${who} ${g || "학부모님"}.`;
};

/** 잔액 한 줄. 모자랄 때만 입금을 청하고, 남았을 때는 알리기만 한다 */
function balanceLine({ bal, remainH }) {
  if (bal > 0) return `남은 수업료는 ${won(bal)}${remainH > 0 ? ` (${fmtH(remainH)}시간분)` : ""}입니다.`;
  if (bal === 0) return "선입금분이 이번 수업으로 모두 채워졌습니다.";
  return `다음 수업 전까지 ${won(-bal)} 추가 입금 부탁드립니다.`;
}

/**
 * 수업이 끝난 뒤 보낼 진도 보고.
 * 비어 있는 항목은 줄째로 빠진다 — 무엇을 안 적었는지 학부모가 알 필요는 없다.
 * balance를 넘기면 잔액 줄이 붙는다 (stats()의 { bal, remainH }).
 */
export function progressMessage(student, lesson, { balance } = {}) {
  const lines = [greeting(student), `${fmtDate(lesson.date)} 수업 잘 마쳤습니다.`];

  const body = [];
  const subject = (lesson.subject || "").trim();
  const progress = (lesson.note || "").trim();
  if (subject || progress) body.push(`· ${[subject, progress].filter(Boolean).join(" — ")}`);

  const homework = (lesson.homework || "").trim();
  if (homework) body.push(`· 숙제: ${homework}`);

  if (body.length) lines.push("", ...body);
  if (balance) lines.push("", balanceLine(balance));

  lines.push("", "감사합니다.");
  return lines.join("\n");
}

/** 수업 당일 아침에 보낼 안내. today를 주면 그날 수업은 "오늘"로 적는다 */
export function reminderMessage(student, lesson, today) {
  const when = lesson.date === today ? "오늘" : fmtDate(lesson.date);
  const time = (lesson.time || "").trim();
  return [
    greeting(student),
    time ? `${when} ${time}에 수업 있습니다.` : `${when} 수업 있습니다.`,
    "잘 부탁드립니다.",
  ].join("\n");
}
