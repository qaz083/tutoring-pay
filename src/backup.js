/* 네이티브(아이폰/안드로이드) 백업.
   웹에서는 Metro가 backup.web.js를 대신 쓴다. */
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { iso } from "./model";

export const backupName = () => `과외정산-${iso(new Date())}.json`;

/** 백업 파일을 만들어 공유 시트를 띄운다. 취소하면 false. */
export async function exportBackup(state) {
  const uri = FileSystem.cacheDirectory + backupName();
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(state, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("이 기기에서 파일 공유를 쓸 수 없습니다");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "과외 정산 백업 저장",
  });
  return true;
}

/** 백업 파일을 골라 그 내용을 문자열로 돌려준다. 취소하면 null. */
export async function pickBackupText() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "public.json"],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  return FileSystem.readAsStringAsync(res.assets[0].uri);
}
