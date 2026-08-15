import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Sheet, Btn, Field, Input, Row, Seg } from "./ui";
import { COLORS } from "./model";
import { notify, confirmAction } from "./dialog";
import SubjectInput from "./SubjectInput";
import { nickname } from "./message";

const GUARDIANS = [
  { label: "학부모님", value: "" },
  { label: "어머님", value: "어머님" },
  { label: "아버님", value: "아버님" },
];

export default function StudentSheet({ t, visible, student, onClose, onSave, onDelete, nextColor }) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [guardian, setGuardian] = useState("");
  const [subject, setSubject] = useState("");

  useEffect(() => {
    if (!visible) return;
    setName(student ? student.name : "");
    setRate(student ? String(student.rate) : "");
    setColor(student ? student.color : nextColor);
    setGuardian(student?.guardian || "");
    setSubject(student?.subject || "");
  }, [visible, student]);

  const submit = () => {
    const n = name.trim();
    const r = parseFloat(rate);
    if (!n) { notify("이름을 입력해 주세요."); return; }
    if (!(r > 0)) { notify("시급을 0보다 큰 숫자로 입력해 주세요."); return; }
    onSave({ name: n, rate: r, color, guardian, subject: subject.trim() });
  };

  return (
    <Sheet
      t={t}
      visible={visible}
      title={student ? "학생 정보 수정" : "학생 추가"}
      onClose={onClose}
      footer={
        <>
          {!!student && (
            <Btn
              t={t} kind="danger" label="삭제"
              onPress={() => confirmAction({
                title: "학생 삭제",
                message: `"${student.name}"의 모든 수업·입금 기록이 함께 지워집니다. 되돌릴 수 없습니다.`,
                confirmLabel: "삭제", destructive: true, onConfirm: onDelete,
              })}
            />
          )}
          <View style={{ flex: 1 }} />
          <Btn t={t} label="취소" onPress={onClose} />
          <Btn t={t} kind="primary" label="저장" onPress={submit} />
        </>
      }
    >
      <Field t={t} label="이름">
        <Input t={t} value={name} onChangeText={setName} placeholder="예) 김민수 (고2 수학)" />
      </Field>

      <Field
        t={t}
        label="시급 (원)"
        hint="시급을 나중에 바꿔도 이미 기록한 수업은 그때의 시급으로 계산됩니다."
      >
        <Input t={t} value={rate} onChangeText={setRate} keyboardType="number-pad" placeholder="30000" />
      </Field>

      <Field
        t={t}
        label="학부모 호칭"
        hint={name.trim() ? `문자 첫 줄 — 안녕하세요, ${nickname(name.trim())} ${guardian || "학부모님"}.` : ""}
      >
        <Seg t={t} options={GUARDIANS} value={guardian} onChange={setGuardian} />
      </Field>

      <Field t={t} label="주로 가르치는 과목 (선택)" hint="새 수업을 적을 때 이 과목이 미리 채워집니다.">
        <SubjectInput t={t} value={subject} onChange={setSubject} />
      </Field>

      <Field t={t} label="색상">
        <Row style={{ flexWrap: "wrap", gap: 10 }}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={{
                width: 34, height: 34, borderRadius: 17, backgroundColor: c,
                borderWidth: 3, borderColor: c === color ? t.ink : "transparent",
              }}
            />
          ))}
        </Row>
      </Field>
    </Sheet>
  );
}
