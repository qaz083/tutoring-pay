import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View, Text, ScrollView, Pressable, useColorScheme,
  ActivityIndicator, StatusBar,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { makeTheme, tint } from "./src/theme";
import {
  COLORS, uid, iso, won, fmtH, fmtDate, isPlan,
  stats, aggregate, sortedLessons, normalize,
} from "./src/model";
import { loadState, saveState } from "./src/storage";
import { notify, confirmAction } from "./src/dialog";
import { printReport } from "./src/print";
import { Btn, Card, Row, Dot, Tag, Seg } from "./src/ui";
import MonthCalendar from "./src/MonthCalendar";
import DaySheet from "./src/DaySheet";
import StudentSheet from "./src/StudentSheet";
import BulkSheet from "./src/BulkSheet";
import BackupSheet from "./src/BackupSheet";

const now = new Date();

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const t = makeTheme(useColorScheme());
  const [state, setState] = useState(null);
  const [sel, setSel] = useState("all");
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [filter, setFilter] = useState("all");
  const [checked, setChecked] = useState([]);
  const [dayDate, setDayDate] = useState(null);
  const [studentSheet, setStudentSheet] = useState(null); // {mode:'new'} | {mode:'edit', id}
  const [bulkOpen, setBulkOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => { loadState().then((s) => { setState(s); loaded.current = true; }); }, []);
  useEffect(() => {
    if (!state || !loaded.current) return;
    saveState(state).catch((e) => notify(e.message, "저장 실패"));
  }, [state]);

  const mutate = (fn) => setState((prev) => {
    const next = JSON.parse(JSON.stringify(prev));
    fn(next);
    return next;
  });
  const findS = (next, id) => next.students.find((s) => s.id === id);

  const api = useMemo(() => ({
    addLesson: (sid, d) => mutate((n) => {
      const s = findS(n, sid); if (!s) return;
      s.lessons.push({ id: uid(), rate: s.rate, ...d });
    }),
    editLesson: (sid, lid, patch) => mutate((n) => {
      const l = findS(n, sid)?.lessons.find((x) => x.id === lid);
      if (l) Object.assign(l, patch);
    }),
    setDone: (sid, lid, done) => mutate((n) => {
      const l = findS(n, sid)?.lessons.find((x) => x.id === lid);
      if (l) l.done = done;
    }),
    deleteLesson: (sid, lid) => mutate((n) => {
      const s = findS(n, sid); if (!s) return;
      s.lessons = s.lessons.filter((x) => x.id !== lid);
    }),
    addPayment: (sid, d) => mutate((n) => {
      findS(n, sid)?.payments.push({ id: uid(), ...d });
    }),
    deletePayment: (sid, pid) => mutate((n) => {
      const s = findS(n, sid); if (!s) return;
      s.payments = s.payments.filter((x) => x.id !== pid);
    }),
  }), []);

  if (!state) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  const students = state.students;
  const scope = sel === "all" ? students : students.filter((s) => s.id === sel);
  const one = sel === "all" ? null : students.find((s) => s.id === sel);
  const agg = aggregate(scope);
  const today = iso(new Date());
  const monthKey = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}`;
  const monthDoneH = scope.reduce((a, s) =>
    a + s.lessons.filter((l) => !isPlan(l) && l.date.startsWith(monthKey))
      .reduce((x, l) => x + l.hours, 0), 0);

  let rows = sortedLessons(scope);
  if (filter === "plan") rows = rows.filter((r) => isPlan(r.l));
  if (filter === "done") rows = rows.filter((r) => !isPlan(r.l));
  const rowKeys = rows.map((r) => `${r.s.id}|${r.l.id}`);
  const nSel = rowKeys.filter((k) => checked.includes(k)).length;

  // 기록이 쌓였는데 백업이 없거나 오래됐으면 알린다 (30일)
  const hasRecords = students.some((s) => s.lessons.length || s.payments.length);
  const backupAge = state.lastBackupAt
    ? (Date.now() - new Date(state.lastBackupAt + "T00:00:00").getTime()) / 86400000
    : Infinity;
  const needsBackup = hasRecords && backupAge > 30;

  const shiftMonth = (n) => setYm(({ y, m }) => {
    const d = new Date(y, m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const bulkApply = (act) => {
    if (act === "del") {
      confirmAction({
        title: "수업 삭제",
        message: `선택한 ${checked.length}건을 지웁니다. 되돌릴 수 없습니다.`,
        confirmLabel: "삭제", destructive: true, onConfirm: () => runBulk(act),
      });
    } else runBulk(act);
  };
  const runBulk = (act) => {
    mutate((n) => {
      for (const key of checked) {
        const [sid, lid] = key.split("|");
        const s = findS(n, sid); if (!s) continue;
        if (act === "del") s.lessons = s.lessons.filter((l) => l.id !== lid);
        else {
          const l = s.lessons.find((x) => x.id === lid);
          if (l) l.done = act === "done";
        }
      }
    });
    setChecked([]);
  };

  /** 선택한 수업으로 학부모께 보낼 내역서를 만든다 */
  const makeReport = async () => {
    const groups = [];
    for (const s of students) {
      const picked = s.lessons.filter((l) => checked.includes(`${s.id}|${l.id}`));
      if (picked.length) groups.push({ student: s, lessons: picked });
    }
    if (!groups.length) { notify("먼저 내역에 넣을 수업을 선택해 주세요."); return; }
    try {
      await printReport(groups, iso(new Date()));
    } catch (e) {
      notify(e.message, "내역서를 만들지 못했습니다");
    }
  };

  const saveStudent = ({ name, rate, color, guardian = "", subject = "" }) => {
    if (studentSheet?.mode === "edit") {
      mutate((n) => {
        const s = findS(n, studentSheet.id);
        if (s) Object.assign(s, { name, rate, color, guardian, subject });
      });
    } else {
      const id = uid();
      mutate((n) => n.students.push({ id, name, rate, color, guardian, subject, payments: [], lessons: [] }));
      setSel(id);
    }
    setStudentSheet(null);
  };
  const deleteStudent = () => {
    const id = studentSheet.id;
    mutate((n) => { n.students = n.students.filter((s) => s.id !== id); });
    if (sel === id) setSel("all");
    setStudentSheet(null);
  };

  const addBulkLessons = (sid, dates, base) => {
    mutate((n) => {
      const s = findS(n, sid); if (!s) return;
      for (const date of dates) s.lessons.push({ id: uid(), date, rate: s.rate, ...base });
    });
    setSel(sid); setChecked([]); setBulkOpen(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={t.dark ? "light-content" : "dark-content"} />

      {/* flex를 주지 않으면 내용 높이만큼 늘어나 아래쪽이 화면 밖에서 잘린다 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 56 }}
      >
        <Row style={{ marginBottom: 14 }}>
          <Text style={{ color: t.ink, fontSize: 24, fontWeight: "800", flex: 1, letterSpacing: -0.5 }}>
            과외 정산
          </Text>
          <Btn t={t} small label="백업" onPress={() => setBackupOpen(true)} />
          <Btn t={t} small label="＋ 학생" kind="primary" onPress={() => setStudentSheet({ mode: "new" })} />
        </Row>

        {needsBackup && (
          <Pressable
            onPress={() => setBackupOpen(true)}
            style={{
              backgroundColor: tint(t.warn, 0.14), borderRadius: 12,
              paddingVertical: 11, paddingHorizontal: 14, marginBottom: 14,
            }}
          >
            <Text style={{ color: t.warn, fontSize: 12.5, fontWeight: "700" }}>
              {state.lastBackupAt
                ? `마지막 백업이 ${fmtDate(state.lastBackupAt)}입니다 — 백업해 두세요`
                : "아직 백업한 적이 없습니다 — 기록은 이 기기에만 있습니다"}
            </Text>
          </Pressable>
        )}

        {students.length === 0 ? (
          <Card t={t} style={{ padding: 28, alignItems: "center" }}>
            <Text style={{ color: t.ink, fontSize: 16, fontWeight: "700", marginBottom: 6 }}>
              아직 학생이 없습니다
            </Text>
            <Text style={{ color: t.muted, fontSize: 13.5, textAlign: "center", lineHeight: 21, marginBottom: 18 }}>
              학생을 추가하고 시급과 입금액을 넣으면{"\n"}수업할 때마다 잔액이 자동으로 깎입니다.
            </Text>
            <Btn t={t} kind="primary" label="첫 학생 추가하기" onPress={() => setStudentSheet({ mode: "new" })} />
          </Card>
        ) : (
          <>
            {/* 학생 고르기 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <Row style={{ gap: 7 }}>
                <StudentChip
                  t={t} label="전체" color={t.muted} on={sel === "all"}
                  onPress={() => { setSel("all"); setChecked([]); }}
                />
                {students.map((s) => {
                  const st = stats(s);
                  return (
                    <StudentChip
                      key={s.id} t={t} label={s.name} color={s.color} on={sel === s.id}
                      sub={`${fmtH(st.projRemainH)}시간`}
                      alert={st.proj < 0}
                      onPress={() => { setSel(s.id); setChecked([]); }}
                    />
                  );
                })}
              </Row>
            </ScrollView>

            {/* 요약 */}
            <Card t={t} style={{ padding: 16, marginBottom: 14 }}>
              <Row>
                {!!one && <Dot color={one.color} />}
                <Text style={{ color: t.muted, fontSize: 12.5, fontWeight: "700", flex: 1 }}>
                  {one ? `${one.name} · 예정까지 하면 남는 돈` : "전체 · 예정까지 하면 남는 돈"}
                </Text>
                {!!one && (
                  <Pressable onPress={() => setStudentSheet({ mode: "edit", id: one.id })} hitSlop={8}>
                    <Text style={{ color: t.accent, fontSize: 12.5, fontWeight: "700" }}>정보 수정</Text>
                  </Pressable>
                )}
              </Row>

              <Text style={{
                color: agg.proj < 0 ? t.danger : t.ink,
                fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 6,
              }}>
                {won(agg.proj)}
              </Text>
              {!!one && one.rate > 0 && (
                <Text style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>
                  시급 {won(one.rate)} 기준 {fmtH(agg.proj / one.rate)}시간분
                </Text>
              )}

              <View style={{ height: 1, backgroundColor: t.line, marginVertical: 14 }} />

              <Row style={{ gap: 0 }}>
                <Mini t={t} k="확정 잔액" v={won(agg.bal)} tone={agg.bal < 0 ? t.danger : t.ink} />
                <Mini t={t} k={`예정 ${fmtH(agg.planH)}시간`} v={`−${won(agg.planAmt)}`} tone={t.muted} />
                <Mini t={t} k={`${ym.m + 1}월 완료`} v={`${fmtH(monthDoneH)}시간`} tone={t.ink} />
              </Row>
            </Card>

            {/* 달력 */}
            <Card t={t} style={{ marginBottom: 14 }}>
              <Row style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line }}>
                <Pressable onPress={() => shiftMonth(-1)} hitSlop={12}>
                  <Text style={{ color: t.ink, fontSize: 22, fontWeight: "700" }}>‹</Text>
                </Pressable>
                <Pressable onPress={() => shiftMonth(1)} hitSlop={12}>
                  <Text style={{ color: t.ink, fontSize: 22, fontWeight: "700" }}>›</Text>
                </Pressable>
                <Text style={{ color: t.ink, fontSize: 17, fontWeight: "800", marginLeft: 6 }}>
                  {ym.y}년 {ym.m + 1}월
                </Text>
                <View style={{ flex: 1 }} />
                <Btn
                  t={t} small kind="ghost" label="오늘"
                  onPress={() => setYm({ y: now.getFullYear(), m: new Date().getMonth() })}
                />
              </Row>

              <View style={{ paddingBottom: 8 }}>
                <MonthCalendar
                  t={t} year={ym.y} month={ym.m} students={scope}
                  today={today} onPressDate={setDayDate}
                />
              </View>

              <Row style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 14 }}>
                <Row style={{ gap: 5 }}>
                  <Dot color={t.muted} size={6} />
                  <Text style={{ color: t.muted, fontSize: 11.5 }}>완료</Text>
                </Row>
                <Row style={{ gap: 5 }}>
                  <Dot color={t.muted} size={6} hollow />
                  <Text style={{ color: t.muted, fontSize: 11.5 }}>예정</Text>
                </Row>
                <View style={{ flex: 1 }} />
                <Text style={{ color: t.muted, fontSize: 11.5 }}>날짜를 누르면 기록합니다</Text>
              </Row>
            </Card>

            <Btn
              t={t} label="📅 수업 일정 한번에 추가"
              onPress={() => setBulkOpen(true)} style={{ marginBottom: 18 }}
            />

            {/* 수업 목록 */}
            <Row style={{ marginBottom: 10 }}>
              <Text style={{ color: t.ink, fontSize: 15, fontWeight: "800" }}>수업</Text>
              <View style={{ flex: 1 }} />
              <Seg
                t={t} value={filter} onChange={setFilter}
                options={[
                  { value: "all", label: "전체" },
                  { value: "plan", label: "예정" },
                  { value: "done", label: "완료" },
                ]}
              />
            </Row>

            {rows.length > 0 && (
              <Row style={{ marginBottom: 8 }}>
                <Pressable
                  onPress={() => {
                    const allOn = rowKeys.length > 0 && rowKeys.every((k) => checked.includes(k));
                    setChecked(allOn
                      ? checked.filter((k) => !rowKeys.includes(k))
                      : [...new Set([...checked, ...rowKeys])]);
                  }}
                  hitSlop={8}
                >
                  <Text style={{ color: t.accent, fontSize: 13, fontWeight: "700" }}>
                    {nSel === rows.length ? "선택 해제" : "보이는 것 전체 선택"}
                  </Text>
                </Pressable>
              </Row>
            )}

            {nSel > 0 && (
              <Card t={t} style={{ padding: 10, marginBottom: 10, backgroundColor: tint(t.accent, 0.1) }}>
                <Row style={{ marginBottom: 8 }}>
                  <Text style={{ color: t.ink, fontWeight: "800", fontSize: 13 }}>{nSel}건 선택됨</Text>
                </Row>
                <Row style={{ gap: 6, marginBottom: 6 }}>
                  <Btn t={t} small kind="ok" label="완료로 (차감)" onPress={() => bulkApply("done")} style={{ flex: 1 }} />
                  <Btn t={t} small label="예정으로" onPress={() => bulkApply("plan")} style={{ flex: 1 }} />
                  <Btn t={t} small kind="danger" label="삭제" onPress={() => bulkApply("del")} />
                </Row>
                <Btn t={t} small kind="primary" label="📄 내역서 만들기 (학부모 전달용)" onPress={makeReport} />
              </Card>
            )}

            <Card t={t} style={{ marginBottom: 18 }}>
              {rows.length === 0 ? (
                <Text style={{ color: t.muted, fontSize: 13, textAlign: "center", padding: 26 }}>
                  해당하는 수업이 없습니다.
                </Text>
              ) : rows.map(({ s, l }, i) => {
                const key = `${s.id}|${l.id}`;
                const on = checked.includes(key);
                return (
                  <Row key={key} style={{
                    padding: 12, gap: 10, alignItems: "flex-start",
                    borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.line,
                  }}>
                    <Pressable
                      onPress={() => setChecked(on ? checked.filter((k) => k !== key) : [...checked, key])}
                      hitSlop={10}
                      style={{
                        width: 21, height: 21, borderRadius: 6, marginTop: 1,
                        borderWidth: 1.5, borderColor: on ? t.accent : t.line,
                        backgroundColor: on ? t.accent : "transparent",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {on && <Text style={{ color: "#fff", fontSize: 13, fontWeight: "900" }}>✓</Text>}
                    </Pressable>

                    <Pressable onPress={() => setDayDate(l.date)} style={{ flex: 1 }}>
                      <Row style={{ flexWrap: "wrap", gap: 6 }}>
                        <Text style={{ color: t.muted, fontSize: 12.5, fontWeight: "700" }}>{fmtDate(l.date)}</Text>
                        {sel === "all" && (
                          <>
                            <Dot color={s.color} size={7} />
                            <Text style={{ color: t.ink, fontSize: 13, fontWeight: "700" }}>{s.name}</Text>
                          </>
                        )}
                        <Text style={{ color: t.ink, fontSize: 13, fontWeight: "600" }}>
                          {l.time ? `${l.time} · ` : ""}{fmtH(l.hours)}시간
                        </Text>
                        <Tag t={t} label={isPlan(l) ? "예정" : "완료"} tone={isPlan(l) ? "muted" : "ok"} />
                      </Row>
                      {!!l.note && (
                        <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 3 }} numberOfLines={2}>
                          {l.note}
                        </Text>
                      )}
                    </Pressable>

                    <Text style={{
                      color: isPlan(l) ? t.muted : t.ink, fontWeight: "700", fontSize: 13.5,
                    }}>
                      {isPlan(l) ? "" : "−"}{won(l.hours * l.rate)}
                    </Text>
                  </Row>
                );
              })}
            </Card>

            {/* 입금 */}
            <Text style={{ color: t.ink, fontSize: 15, fontWeight: "800", marginBottom: 10 }}>입금</Text>
            <Card t={t}>
              {(() => {
                const list = scope.flatMap((s) => s.payments.map((p) => ({ s, p })))
                  .sort((a, b) => b.p.date.localeCompare(a.p.date));
                if (!list.length) {
                  return (
                    <Text style={{ color: t.muted, fontSize: 13, textAlign: "center", padding: 26 }}>
                      입금 기록이 없습니다.
                    </Text>
                  );
                }
                return list.map(({ s, p }, i) => (
                  <Pressable
                    key={p.id} onPress={() => setDayDate(p.date)}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 10, padding: 12,
                      borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.line,
                    }}
                  >
                    <Text style={{ color: t.muted, fontSize: 12.5, fontWeight: "700" }}>{fmtDate(p.date)}</Text>
                    {sel === "all" && <Dot color={s.color} size={7} />}
                    <View style={{ flex: 1 }}>
                      {sel === "all" && (
                        <Text style={{ color: t.ink, fontSize: 13, fontWeight: "700" }}>{s.name}</Text>
                      )}
                      {!!p.memo && <Text style={{ color: t.muted, fontSize: 12 }}>{p.memo}</Text>}
                    </View>
                    <Text style={{ color: t.ok, fontWeight: "800", fontSize: 13.5 }}>+{won(p.amount)}</Text>
                  </Pressable>
                ));
              })()}
            </Card>
          </>
        )}
      </ScrollView>

      <DaySheet
        t={t} visible={!!dayDate} date={dayDate} students={students}
        scope={scope.length ? scope : students}
        onClose={() => setDayDate(null)} api={api}
      />

      <StudentSheet
        t={t}
        visible={!!studentSheet}
        student={studentSheet?.mode === "edit" ? students.find((s) => s.id === studentSheet.id) : null}
        nextColor={COLORS[students.length % COLORS.length]}
        onClose={() => setStudentSheet(null)}
        onSave={saveStudent}
        onDelete={deleteStudent}
      />

      <BulkSheet
        t={t} visible={bulkOpen} students={students}
        initialStudentId={sel === "all" ? null : sel}
        month={ym}
        onClose={() => setBulkOpen(false)}
        onAdd={addBulkLessons}
      />

      <BackupSheet
        t={t} visible={backupOpen} state={state}
        onClose={() => setBackupOpen(false)}
        onExported={() => mutate((n) => { n.lastBackupAt = iso(new Date()); })}
        onRestore={(data) => {
          setState(normalize(data));
          setSel("all"); setChecked([]);
        }}
      />
    </SafeAreaView>
  );
}

function StudentChip({ t, label, color, sub, on, alert, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row", alignItems: "center", gap: 7,
        paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12,
        backgroundColor: on ? tint(color, 0.18) : t.card,
        borderWidth: 1, borderColor: on ? color : t.line,
      }}
    >
      <Dot color={color} size={8} />
      <Text style={{ color: t.ink, fontWeight: "700", fontSize: 14 }}>{label}</Text>
      {!!sub && (
        <Text style={{ color: alert ? t.danger : t.muted, fontWeight: "700", fontSize: 12 }}>{sub}</Text>
      )}
    </Pressable>
  );
}

function Mini({ t, k, v, tone }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: t.muted, fontSize: 11, fontWeight: "700" }}>{k}</Text>
      <Text style={{ color: tone, fontSize: 15, fontWeight: "800", marginTop: 2 }}>{v}</Text>
    </View>
  );
}
