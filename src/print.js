/* 네이티브: HTML을 그대로 PDF로 찍어 공유 시트로 넘긴다.
   (웹에서는 인쇄 머리말이 붙어서 print.web.js가 캔버스로 직접 만든다) */
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { buildReport } from "./reportHtml";

export async function printReport(groups, madeOn) {
  const html = buildReport(groups, madeOn);
  const { uri } = await Print.printToFileAsync({ html });

  if (!(await Sharing.isAvailableAsync())) {
    await Print.printAsync({ html });      // 공유가 막혀 있으면 인쇄로 넘긴다
    return true;
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "수업 내역 보내기",
  });
  return true;
}
