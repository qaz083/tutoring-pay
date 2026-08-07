export function makeTheme(scheme) {
  const dark = scheme === "dark";
  return {
    dark,
    bg: dark ? "#101216" : "#f4f5f7",
    card: dark ? "#1b1e24" : "#ffffff",
    sunk: dark ? "#23262d" : "#eef0f3",
    ink: dark ? "#e9ebee" : "#1b1e24",
    muted: dark ? "#98a0ab" : "#6b7280",
    line: dark ? "#2b2f37" : "#e5e7eb",
    accent: dark ? "#6b93ff" : "#3b6ef5",
    ok: dark ? "#4ade80" : "#16a34a",
    warn: dark ? "#fbbf24" : "#d97706",
    danger: dark ? "#ef6a5d" : "#e0483b",
    onAccent: "#ffffff",
  };
}

/** 배경 위에 옅게 깔 색 (RN에는 color-mix가 없어 알파를 직접 붙인다) */
export function tint(hex, alpha) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
