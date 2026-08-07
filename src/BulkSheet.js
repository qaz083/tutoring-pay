import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Sheet, Btn, Field, Input, Seg, Dot, Card, Row } from "./ui";
import MonthCalendar from "./MonthCalendar";
import { DOW, iso, won, fmtH, fmtDate, monthGrid, stats } from "./model";
import { notify, confirmAction } from "./dialog";
import { tint } from "./theme";

const HOUR_PRESETS = [1, 1.5, 2, 2.5, 3];

export default function BulkSheet({ t, visible, students, initialStudentId, month, onClose, onAdd }) {
  const [who, setWho] = useState(null);
  const [time, setTime] = useState("");
  const [hours, setHours] = useState("2");
  const [done, setDone] = useState("plan");
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState([]);
  const [ym, setYm] = useState({ y: month.y, m: month.m });

  useEffect(() => {
    if (!visible) return;
    setWho(initialStudentId ?? students[0]?.id ?? null);
    setTime(""); setHours("2"); setDone("plan"); setNote("");
    setPicked([]); setYm({ y: month.y, m: month.m });
  }, [visible]);

  const student = students.find((s) => s.id === who);

  const toggleDate = (ds) =>
    setPicked((p) => (p.includes(ds) ? p.filter((x) => x !== ds) : [...p, ds]));

  /** 보고 있는 달에서 그 요일인 날들을 한꺼번에 켜고 끈다 */
  const toggleDow = (dw) => {
    const inMonth = monthGrid(ym.y, ym.m)
      .filter((d) => d.getMonth() === ym.m && d.getDay() === dw)
      .map(iso);
    setPicked((p) => {
      const allOn = inMonth.every((d) => p.includes(d));
      return allOn ? p.filter((d) => !inMonth.includes(d)) : [...new Set([...p, ...inMonth])];
    });
  };

  const preview = useMemo(() => {
    const h = parseFloat(hours) || 0;
    const n = picked.length;
    const amt = n * h * (student ? student.rate : 0);
    const st = student ? stats(student) : null;
    return { h, n, amt, st, after: st ? st.proj - amt : 0 };
  }, [hours, picked, student]);

  const submit = () => {
    const h = parseFloat(hours);
    if (!student) return;
    if (!(h > 0)) { notify("수업 시간을 입력해 주세요."); return; }
    if (!picked.length) { notify("날짜를 하나 이상 골라 주세요."); return; }

    const dup = picked.filter((d) => student.lessons.some((l) => l.date === d));
    const go = () => {
      onAdd(student.id, [...picked].sort(), {
        hours: h, time: time.trim(), note: note.trim(), done: done === "done",
      });
    };
    if (dup.length) {
      confirmAction({
        title: "이미 수업이 있는 날",
        message: `${dup.length}일에 이미 수업이 잡혀 있습니다. 그래도 추가할까요?`,
        confirmLabel: "추가", onConfirm: go,
      });
    } else go();
  };

  const monthLabel = `${ym.y}년 ${ym.m + 1}월`;
  const shift = (n) => setYm(({ y, m }) => {
    const d = new Date(y, m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  return (
    <Sheet
      t={t}
      visible={visible}
      title="수업 일정 한번에 추가"
      onClose={onClose}
      footer={
        <>
          <Btn t={t} label="취소" onPress={onClose} />
          <Btn
            t={t} kind="primary" label={picked.length ? `${picked.length}일 추가` : "추가"}
            onPress={submit} style={{ flex: 1 }}
          />
        </>
      }
    >
      <Field t={t} label="학생">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Row style={{ gap: 6 }}>
            {students.map((s) => {
              const on = s.id === who;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setWho(s.id)}
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
      </Field>

      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field t={t} label="시작 시각 (선택)">
            <Input t={t} value={time} onChangeText={setTime} placeholder="16:00" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field t={t} label="수업 시간">
            <Input t={t} value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder="2" />
          </Field>
        </View>
      </Row>

      <Row style={{ gap: 6, marginTop: -4, marginBottom: 14, flexWrap: "wrap" }}>
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

      <Field t={t} label="상태">
        <Seg
          t={t} value={done} onChange={setDone}
          options={[
            { value: "plan", label: "예정 (아직 안 함)" },
            { value: "done", label: "완료 (바로 차감)" },
          ]}
        />
      </Field>

      <Field t={t} label="메모 (선택)">
        <Input t={t} value={note} onChangeText={setNote} placeholder="예) 정규 수업" />
      </Field>

      <Field t={t} label="요일 누르면 이 달의 그 요일이 전부 선택됩니다">
        <Row style={{ gap: 5 }}>
          {DOW.map((d, i) => {
            const inMonth = monthGrid(ym.y, ym.m)
              .filter((x) => x.getMonth() === ym.m && x.getDay() === i).map(iso);
            const on = inMonth.length > 0 && inMonth.every((x) => picked.includes(x));
            return (
              <Pressable
                key={d}
                onPress={() => toggleDow(i)}
                style={{
                  flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9,
                  backgroundColor: on ? (student ? student.color : t.accent) : t.sunk,
                }}
              >
                <Text style={{ color: on ? "#fff" : t.muted, fontWeight: "800", fontSize: 13 }}>{d}</Text>
              </Pressable>
            );
          })}
        </Row>
      </Field>

      <Card t={t} style={{ marginBottom: 14 }}>
        <Row style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.line }}>
          <Pressable onPress={() => shift(-1)} hitSlop={10}>
            <Text style={{ color: t.ink, fontSize: 20, fontWeight: "700" }}>‹</Text>
          </Pressable>
          <Pressable onPress={() => shift(1)} hitSlop={10}>
            <Text style={{ color: t.ink, fontSize: 20, fontWeight: "700" }}>›</Text>
          </Pressable>
          <Text style={{ color: t.ink, fontWeight: "800", fontSize: 15, marginLeft: 4 }}>{monthLabel}</Text>
          <View style={{ flex: 1 }} />
          <Btn t={t} small kind="ghost" label="전체 해제" onPress={() => setPicked([])} />
        </Row>
        <View style={{ paddingBottom: 6 }}>
          <MonthCalendar
            t={t} year={ym.y} month={ym.m} mode="pick"
            students={student ? [student] : []}
            picked={picked} today={iso(new Date())}
            pickColor={student ? student.color : t.accent}
            onPressDate={toggleDate}
          />
        </View>
      </Card>

      {picked.length > 0 && (
        <Row style={{ flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
          {[...picked].sort().map((d) => (
            <View key={d} style={{ backgroundColor: t.sunk, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7 }}>
              <Text style={{ color: t.muted, fontSize: 12, fontWeight: "700" }}>{fmtDate(d)}</Text>
            </View>
          ))}
        </Row>
      )}

      {/* 넣기 전에 돈이 되는지 먼저 보여준다 */}
      {!!student && (
        <Card t={t} style={{ padding: 14, backgroundColor: t.sunk }}>
          <Text style={{ color: t.ink, fontSize: 14, fontWeight: "700", lineHeight: 22 }}>
            {preview.n}일 × {fmtH(preview.h)}시간 = {fmtH(preview.n * preview.h)}시간 · {won(preview.amt)}
            <Text style={{ color: t.muted, fontWeight: "600" }}>{done === "done" ? " (즉시 차감)" : " (예정)"}</Text>
          </Text>
          <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 4 }}>
            지금 확정 잔액 {won(preview.st.bal)} · 예정 반영 {won(preview.st.proj)}
          </Text>
          <Text style={{ color: t.ink, fontSize: 13.5, marginTop: 6, fontWeight: "600" }}>
            추가하면 예정 반영 잔액 →{" "}
            <Text style={{ color: preview.after < 0 ? t.danger : t.ok, fontWeight: "800" }}>
              {won(preview.after)}
            </Text>
            {student.rate > 0 ? ` (${fmtH(preview.after / student.rate)}시간분)` : ""}
          </Text>
          {preview.after < 0 && (
            <Text style={{ color: t.danger, fontSize: 13, fontWeight: "800", marginTop: 6 }}>
              입금액이 {won(-preview.after)} 모자랍니다.
            </Text>
          )}
        </Card>
      )}
    </Sheet>
  );
}
