import { Alert, Platform } from "react-native";

/* react-native-web에는 Alert가 없다. 웹에서는 브라우저 기본 대화상자를 쓴다. */
const isWeb = Platform.OS === "web";

/** 단순 알림 */
export function notify(message, title) {
  if (isWeb) {
    window.alert(title ? `${title}\n\n${message}` : message);
    return;
  }
  title ? Alert.alert(title, message) : Alert.alert(message);
}

/** 되돌릴 수 없는 동작을 묻는다 */
export function confirmAction({ title, message, confirmLabel = "확인", destructive = false, onConfirm }) {
  if (isWeb) {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "취소", style: "cancel" },
    { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}
