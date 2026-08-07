import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalize } from "./model";

const KEY = "tutoring-pay/v1";

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch (e) {
    // 읽지 못하면 빈 상태로 시작하되, 조용히 넘기지는 않는다
    console.warn("저장된 데이터를 읽지 못했습니다:", e.message);
    return normalize(null);
  }
}

export async function saveState(state) {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}
