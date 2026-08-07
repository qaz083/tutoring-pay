/* 웹(아이폰 홈 화면 앱 포함) 백업.
   아이폰에서는 다운로드가 어색하게 동작할 때가 있어, 쓸 수 있으면 공유 시트를 먼저 쓴다. */
import { iso } from "./model";

export const backupName = () => `과외정산-${iso(new Date())}.json`;

export async function exportBackup(state) {
  const name = backupName();
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  // 아이폰: 공유 시트 → 파일 앱, 카카오톡, AirDrop 등으로 바로 보낼 수 있다
  try {
    const file = new File([blob], name, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return true;
    }
  } catch (e) {
    if (e?.name === "AbortError") return false;   // 사용자가 취소함
    // 공유가 막힌 환경이면 아래 내려받기로 넘어간다
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function pickBackupText() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.style.position = "fixed";
    input.style.left = "-9999px";       // 아이폰 Safari는 DOM에 붙어 있어야 열린다
    document.body.appendChild(input);

    input.onchange = () => {
      const f = input.files?.[0];
      input.remove();
      if (!f) return resolve(null);
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("파일을 읽지 못했습니다"));
      r.readAsText(f);
    };
    // 취소는 이벤트가 오지 않는 브라우저가 있어 따로 처리하지 않는다 (그대로 대기)
    input.click();
  });
}
