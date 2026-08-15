/* 만든 문자를 다른 앱(문자·카톡)으로 넘긴다. 웹에서는 Metro가 share.web.js를 고른다. */
import { Share } from "react-native";

/** @returns "shared" | "cancel" */
export async function shareText(text) {
  const r = await Share.share({ message: text });
  return r.action === Share.dismissedAction ? "cancel" : "shared";
}
