import React, { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Sheet, Btn, Card, Row } from "./ui";
import { fmtDate, isPlan } from "./model";
import { notify, confirmAction } from "./dialog";
import { exportBackup, pickBackupText } from "./backup";
import { tint } from "./theme";

function summarize(state) {
  const students = state.students.length;
  let done = 0, plan = 0, pays = 0;
  for (const s of state.students) {
    for (const l of s.lessons) (isPlan(l) ? plan++ : done++);
    pays += s.payments.length;
  }
  return { students, done, plan, pays };
}

export default function BackupSheet({ t, visible, state, onClose, onRestore, onExported }) {
  const [busy, setBusy] = useState(null);   // "export" | "import" | null

  if (!state) return null;
  const n = summarize(state);
  const last = state.lastBackupAt;

  const doExport = async () => {
    setBusy("export");
    try {
      const ok = await exportBackup(state);
      if (ok) { onExported(); notify("백업 파일을 저장했습니다.\n파일 앱이나 메일에 보관해 두세요."); }
    } catch (e) {
      notify(e.message, "백업 실패");
    } finally { setBusy(null); }
  };

  const doImport = async () => {
    setBusy("import");
    try {
      const text = await pickBackupText();
      if (!text) return;
      let data;
      try { data = JSON.parse(text); }
      catch { throw new Error("백업 파일이 아니거나 내용이 깨졌습니다"); }
      if (!data || !Array.isArray(data.students)) throw new Error("과외 정산 백업 파일이 아닙니다");

      const inc = summarize(data);
      confirmAction({
        title: "백업 불러오기",
        message:
          `지금 기록을 백업 내용으로 완전히 바꿉니다. 되돌릴 수 없습니다.\n\n` +
          `지금:   학생 ${n.students}명 · 수업 ${n.done + n.plan}건 · 입금 ${n.pays}건\n` +
          `불러올 것: 학생 ${inc.students}명 · 수업 ${inc.done + inc.plan}건 · 입금 ${inc.pays}건`,
        confirmLabel: "바꾸기",
        destructive: true,
        onConfirm: () => { onRestore(data); onClose(); },
      });
    } catch (e) {
      notify(e.message, "불러오기 실패");
    } finally { setBusy(null); }
  };

  return (
    <Sheet
      t={t}
      visible={visible}
      title="백업"
      onClose={onClose}
      footer={<Btn t={t} label="닫기" onPress={onClose} style={{ flex: 1 }} />}
    >
      <Card t={t} style={{ padding: 16, marginBottom: 14 }}>
        <Text style={{ color: t.muted, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>
          지금 담겨 있는 기록
        </Text>
        <Row style={{ gap: 0 }}>
          <Cell t={t} k="학생" v={`${n.students}명`} />
          <Cell t={t} k="수업" v={`${n.done + n.plan}건`} sub={`완료 ${n.done} · 예정 ${n.plan}`} />
          <Cell t={t} k="입금" v={`${n.pays}건`} />
        </Row>
        <View style={{ height: 1, backgroundColor: t.line, marginVertical: 14 }} />
        <Text style={{ color: last ? t.muted : t.warn, fontSize: 13, fontWeight: "600" }}>
          {last ? `마지막 백업 ${fmtDate(last)}` : "아직 백업한 적이 없습니다"}
        </Text>
      </Card>

      <Btn
        t={t} kind="primary"
        label={busy === "export" ? "저장 중…" : "백업 파일 저장"}
        disabled={!!busy}
        onPress={doExport}
        style={{ marginBottom: 8 }}
      />
      <Text style={{ color: t.muted, fontSize: 12.5, lineHeight: 19, marginBottom: 20 }}>
        파일 하나로 내려받습니다. 공유 창이 뜨면 <Text style={{ fontWeight: "700" }}>"파일에 저장"</Text>을
        골라 iCloud Drive에 두시면 기기를 바꿔도 그대로 옮길 수 있습니다.
      </Text>

      <Btn
        t={t}
        label={busy === "import" ? "여는 중…" : "백업 불러오기"}
        disabled={!!busy}
        onPress={doImport}
        style={{ marginBottom: 8 }}
      />
      <Text style={{ color: t.muted, fontSize: 12.5, lineHeight: 19, marginBottom: 20 }}>
        불러오면 지금 기록을 <Text style={{ fontWeight: "700", color: t.danger }}>전부 덮어씁니다.</Text>{" "}
        바꾸기 전에 무엇이 들어오는지 한 번 더 확인해 드립니다.
      </Text>

      {!!busy && (
        <Row style={{ justifyContent: "center", marginBottom: 12 }}>
          <ActivityIndicator color={t.accent} />
        </Row>
      )}

      <Card t={t} style={{ padding: 14, backgroundColor: tint(t.warn, 0.12), borderColor: "transparent" }}>
        <Text style={{ color: t.ink, fontSize: 12.5, lineHeight: 20 }}>
          기록은 <Text style={{ fontWeight: "700" }}>이 기기 안에만</Text> 저장됩니다. 서버로 보내지 않습니다.
          그래서 브라우저 데이터를 지우거나 앱을 삭제하면 함께 사라집니다.
          한 달에 한 번쯤 백업해 두시길 권합니다.
        </Text>
      </Card>
    </Sheet>
  );
}

function Cell({ t, k, v, sub }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: t.muted, fontSize: 11, fontWeight: "700" }}>{k}</Text>
      <Text style={{ color: t.ink, fontSize: 17, fontWeight: "800", marginTop: 2 }}>{v}</Text>
      {!!sub && <Text style={{ color: t.muted, fontSize: 11, marginTop: 1 }}>{sub}</Text>}
    </View>
  );
}
