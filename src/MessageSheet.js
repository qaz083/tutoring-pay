import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { Sheet, Btn, Input, Row } from "./ui";
import { notify, confirmAction } from "./dialog";
import { shareText } from "./share";
import { progressMessage, reminderMessage } from "./message";

/**
 * 만들어진 문자를 보여주고, 고쳐 쓴 뒤 문자·카톡으로 넘긴다.
 * 보내기 전에 반드시 눈으로 확인하게 한다 — 학부모께 나가는 글이라 되돌릴 수 없다.
 */
export default function MessageSheet({ t, visible, kind, student, lesson, balance, today, onClose }) {
  const [withBalance, setWithBalance] = useState(false);
  const [draft, setDraft] = useState("");
  const [touched, setTouched] = useState(false);

  const build = (wb) =>
    kind === "reminder"
      ? reminderMessage(student, lesson, today)
      : progressMessage(student, lesson, { balance: wb ? balance : null });

  useEffect(() => {
    if (!visible || !student || !lesson) return;
    setWithBalance(false);
    setTouched(false);
    setDraft(build(false));
  }, [visible, kind, lesson?.id]);

  if (!student || !lesson) return null;

  const rebuild = (wb) => { setWithBalance(wb); setDraft(build(wb)); setTouched(false); };

  const toggleBalance = () => {
    const next = !withBalance;
    if (!touched) { rebuild(next); return; }
    confirmAction({
      title: "문자를 다시 만들까요?",
      message: "고쳐 쓴 내용이 사라집니다.",
      confirmLabel: "다시 만들기",
      onConfirm: () => rebuild(next),
    });
  };

  const send = async () => {
    if (!draft.trim()) { notify("보낼 내용이 비어 있습니다."); return; }
    try {
      const r = await shareText(draft);
      if (r === "copied") notify("문자를 복사했습니다. 카톡이나 문자에 붙여넣어 주세요.");
      else if (r === "shared") onClose();
    } catch (e) {
      notify(e?.message || "보내기에 실패했습니다.");
    }
  };

  const isProgress = kind !== "reminder";
  const noProgress = isProgress && !(lesson.note || "").trim() && !(lesson.subject || "").trim();

  return (
    <Sheet
      t={t}
      visible={visible}
      title={isProgress ? "수업 보고 문자" : "수업 안내 문자"}
      onClose={onClose}
      footer={
        <>
          <Btn t={t} label="닫기" onPress={onClose} style={{ flex: 1 }} />
          <Btn t={t} kind="primary" label="보내기" onPress={send} style={{ flex: 2 }} />
        </>
      }
    >
      {noProgress && (
        <Text style={{ color: t.warn, fontSize: 13, marginBottom: 10 }}>
          진도를 적지 않아 인사말만 만들어졌습니다. 수업 카드의 "진도 · 특이사항"을 채우면 본문이 함께 들어갑니다.
        </Text>
      )}

      <Input
        t={t}
        multiline
        value={draft}
        onChangeText={(v) => { setDraft(v); setTouched(true); }}
        style={{ minHeight: 190, lineHeight: 21 }}
      />

      <Text style={{ color: t.muted, fontSize: 12, marginTop: 8 }}>
        보내기 전에 그대로 고쳐 쓸 수 있습니다. 보내기를 누르면 문자·카톡 중에 고르게 됩니다.
      </Text>

      {isProgress && !!balance && (
        <Row style={{ marginTop: 14 }}>
          <Btn
            t={t} small
            kind={withBalance ? "ok" : "plain"}
            label={withBalance ? "잔액 안내 빼기" : "잔액 안내 넣기"}
            onPress={toggleBalance}
          />
          <View style={{ flex: 1 }} />
        </Row>
      )}
    </Sheet>
  );
}
