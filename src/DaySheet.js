import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Sheet, Btn, Field, Input, Tag, Dot, Card, Row } from "./ui";
import { won, fmtH, fmtDate, isPlan, eventsOn } from "./model";
import { notify, confirmAction } from "./dialog";
import { tint } from "./theme";

const HOUR_PRESETS = [1, 1.5, 2, 2.5, 3];

function StudentPicker({ t, students, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Row style={{ gap: 6 }}>
        {students.map((s) => {
          const on = s.id === value;
          return (
            <Pressable
              key={s.id}
              onPress={() => onChange(s.id)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                backgroundColor: on ? tint(s.color, 0.18) : t.sunk,
                borderWidth: 1, borderColor: on ? s.color : "transparent",
              }}
            >
              <Dot color={s.color} size={8} />
              <Text style={{ color: on ? t.ink : t.muted, fontWeight: "700", fontSize: 13 }}>{s.name}</Text>
            </Pressable>
          );
        })}
      </Row>
    </ScrollView>
  );
}

export default function DaySheet({ t, visible, date, students, scope, onClose, api }) {
  const [who, setWho] = useState(null);
  const [time, setTime] = useState("");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [payWho, setPayWho] = useState(null);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!visible) return;
    const first = scope[0]?.id ?? null;
    setWho(first); setPayWho(first);
    setTime(""); setHours(""); setNote(""); setAmount(""); setMemo("");
  }, [visible, date]);

  if (!date) return null;

  const evs = eventsOn(scope, date);
  const lessons = evs.filter((e) => e.type === "lesson");
  const pays = evs.filter((e) => e.type === "pay");

  const addLesson = (done) => {
    const h = parseFloat(hours);
    if (!who) return;
    if (!(h > 0)) { notify("수업 시간을 입력해 주세요."); return; }
    api.addLesson(who, { date, hours: h, time: time.trim(), note: note.trim(), done });
    setHours(""); setNote(""); setTime("");
  };

  const addPay = () => {
    const v = parseFloat(amount);
    if (!payWho) return;
    if (!(v > 0)) { notify("입금액을 입력해 주세요."); return; }
    api.addPayment(payWho, { date, amount: v, memo: memo.trim() });
    setAmount(""); setMemo("");
  };

  const payStudent = students.find((s) => s.id === payWho);
  const payHint = payStudent && payStudent.rate > 0 && parseFloat(amount) > 0
    ? `${payStudent.name} 시급 기준 ${fmtH(parseFloat(amount) / payStudent.rate)}시간 분량입니다.`
    : "";

  return (
    <Sheet
      t={t}
      visible={visible}
      title={`${date.replace(/-/g, ".")} · ${fmtDate(date).split(" ")[1]}`}
      onClose={onClose}
      footer={<Btn t={t} label="닫기" onPress={onClose} style={{ flex: 1 }} />}
    >
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: "800", marginBottom: 8 }}>수업</Text>

      {lessons.length === 0 && (
        <Text style={{ color: t.muted, fontSize: 13, marginBottom: 12 }}>이 날 기록된 수업이 없습니다.</Text>
      )}

      {lessons.map(({ s, l }) => (
        <Card key={l.id} t={t} style={{ marginBottom: 10, padding: 12 }}>
          <Row style={{ flexWrap: "wrap", marginBottom: 10 }}>
            <Dot color={s.color} />
            <Text style={{ color: t.ink, fontWeight: "800", fontSize: 15 }}>{s.name}</Text>
            <Tag t={t} label={isPlan(l) ? "예정" : "완료"} tone={isPlan(l) ? "muted" : "ok"} />
            <View style={{ flex: 1 }} />
            <Text style={{ color: t.muted, fontSize: 12 }}>
              {isPlan(l) ? "예정" : "차감"} {won(l.hours * l.rate)}
            </Text>
          </Row>

          <Row style={{ marginBottom: 10 }}>
            <Btn
              t={t} small
              kind={isPlan(l) ? "ok" : "plain"}
              label={isPlan(l) ? "수업 완료로" : "예정으로 되돌리기"}
              onPress={() => api.setDone(s.id, l.id, isPlan(l))}
              style={{ flex: 1 }}
            />
            <Btn
              t={t} small kind="danger" label="삭제"
              onPress={() => confirmAction({
                title: "수업 삭제", message: `${fmtDate(l.date)} 수업을 지울까요?`,
                confirmLabel: "삭제", destructive: true,
                onConfirm: () => api.deleteLesson(s.id, l.id),
              })}
            />
          </Row>

          <Row style={{ gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.muted, fontSize: 11, fontWeight: "700", marginBottom: 4 }}>시각</Text>
              <Input
                t={t} defaultValue={l.time} placeholder="16:00"
                onEndEditing={(e) => api.editLesson(s.id, l.id, { time: e.nativeEvent.text.trim() })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.muted, fontSize: 11, fontWeight: "700", marginBottom: 4 }}>수업 시간</Text>
              <Input
                t={t} defaultValue={String(l.hours)} keyboardType="decimal-pad"
                onEndEditing={(e) => {
                  const v = parseFloat(e.nativeEvent.text);
                  if (v > 0) api.editLesson(s.id, l.id, { hours: v });
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.muted, fontSize: 11, fontWeight: "700", marginBottom: 4 }}>적용 시급</Text>
              <Input
                t={t} defaultValue={String(l.rate)} keyboardType="number-pad"
                onEndEditing={(e) => {
                  const v = parseFloat(e.nativeEvent.text);
                  if (v >= 0) api.editLesson(s.id, l.id, { rate: v });
                }}
              />
            </View>
          </Row>

          <Text style={{ color: t.muted, fontSize: 11, fontWeight: "700", marginBottom: 4 }}>진도 · 특이사항</Text>
          <Input
            t={t} multiline defaultValue={l.note}
            placeholder="예) 수1 지수로그 3단원까지. 숙제 오답 많음"
            onEndEditing={(e) => api.editLesson(s.id, l.id, { note: e.nativeEvent.text.trim() })}
          />
        </Card>
      ))}

      {/* 새 수업 */}
      <Card t={t} style={{ padding: 12, marginBottom: 22, borderStyle: "dashed" }}>
        <Field t={t} label="학생">
          <StudentPicker t={t} students={scope} value={who} onChange={setWho} />
        </Field>

        <Row style={{ gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field t={t} label="시각 (선택)">
              <Input t={t} value={time} onChangeText={setTime} placeholder="16:00" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field t={t} label="수업 시간">
              <Input t={t} value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder="3" />
            </Field>
          </View>
        </Row>

        <Row style={{ gap: 6, marginTop: -4, marginBottom: 12, flexWrap: "wrap" }}>
          {HOUR_PRESETS.map((h) => (
            <Pressable
              key={h}
              onPress={() => setHours(String(h))}
              style={{ backgroundColor: t.sunk, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}
            >
              <Text style={{ color: t.ink, fontWeight: "700", fontSize: 13 }}>{fmtH(h)}시간</Text>
            </Pressable>
          ))}
        </Row>

        <Field t={t} label="진도 · 특이사항 (선택)">
          <Input t={t} multiline value={note} onChangeText={setNote} placeholder="예) 수1 지수로그 3단원까지" />
        </Field>

        <Row style={{ gap: 8 }}>
          <Btn t={t} kind="ok" label="완료로 추가" onPress={() => addLesson(true)} style={{ flex: 1 }} />
          <Btn t={t} label="예정으로 추가" onPress={() => addLesson(false)} style={{ flex: 1 }} />
        </Row>
      </Card>

      {/* 입금 */}
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: "800", marginBottom: 8 }}>입금</Text>

      {pays.length === 0 && (
        <Text style={{ color: t.muted, fontSize: 13, marginBottom: 12 }}>이 날 기록된 입금이 없습니다.</Text>
      )}

      {pays.map(({ s, p }) => (
        <Card key={p.id} t={t} style={{ marginBottom: 10, padding: 12 }}>
          <Row>
            <Dot color={s.color} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.ink, fontWeight: "700" }}>{s.name} 입금</Text>
              {!!p.memo && <Text style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{p.memo}</Text>}
              {s.rate > 0 && (
                <Text style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>
                  {fmtH(p.amount / s.rate)}시간 분량
                </Text>
              )}
            </View>
            <Text style={{ color: t.ok, fontWeight: "800" }}>+{won(p.amount)}</Text>
            <Btn
              t={t} small kind="danger" label="삭제"
              onPress={() => confirmAction({
                title: "입금 삭제", message: `${won(p.amount)} 기록을 지울까요?`,
                confirmLabel: "삭제", destructive: true,
                onConfirm: () => api.deletePayment(s.id, p.id),
              })}
            />
          </Row>
        </Card>
      ))}

      <Card t={t} style={{ padding: 12, borderStyle: "dashed" }}>
        <Field t={t} label="학생">
          <StudentPicker t={t} students={scope} value={payWho} onChange={setPayWho} />
        </Field>
        <Field t={t} label="입금액 (원)" hint={payHint}>
          <Input t={t} value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="300000" />
        </Field>
        <Field t={t} label="메모 (선택)">
          <Input t={t} value={memo} onChangeText={setMemo} placeholder="예) 10시간분 선입금" />
        </Field>
        <Btn t={t} label="입금 추가" onPress={addPay} />
      </Card>
    </Sheet>
  );
}
