import React from "react";
import { View, Text, Pressable } from "react-native";
import { DOW, iso, monthGrid, isPlan } from "./model";
import { tint } from "./theme";

/**
 * 월 달력.
 *  mode "view" — 그 날의 수업·입금을 점으로 보여준다 (완료는 채운 점, 예정은 빈 점)
 *  mode "pick" — 여러 날짜를 골라 담는다 (일괄 추가용)
 */
export default function MonthCalendar({
  t, year, month, students = [], mode = "view",
  picked = [], today, onPressDate, pickColor,
}) {
  const cells = monthGrid(year, month);
  const pickedSet = new Set(picked);

  return (
    <View>
      <View style={{ flexDirection: "row" }}>
        {DOW.map((d, i) => (
          <View key={d} style={{ flex: 1, alignItems: "center", paddingVertical: 7 }}>
            <Text style={{
              fontSize: 11, fontWeight: "800",
              color: i === 0 ? t.danger : i === 6 ? t.accent : t.muted,
            }}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((d) => {
          const ds = iso(d);
          const out = d.getMonth() !== month;
          const dw = d.getDay();
          const on = pickedSet.has(ds);
          const isToday = ds === today;

          const evs = [];
          for (const s of students) {
            for (const l of s.lessons) if (l.date === ds) evs.push({ c: s.color, plan: isPlan(l) });
            for (const p of s.payments) if (p.date === ds) evs.push({ c: t.ok, pay: true });
          }

          const numColor = on ? t.onAccent
            : out ? tint(t.muted, 0.5)
            : dw === 0 ? t.danger : dw === 6 ? t.accent : t.ink;

          return (
            <Pressable
              key={ds}
              onPress={() => onPressDate(ds)}
              style={({ pressed }) => ({
                width: `${100 / 7}%`,
                height: mode === "pick" ? 46 : 58,
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: 6,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <View style={{
                width: 26, height: 26, borderRadius: 13,
                alignItems: "center", justifyContent: "center",
                backgroundColor: on ? (pickColor || t.accent)
                  : isToday ? tint(t.accent, 0.16) : "transparent",
                borderWidth: isToday && !on ? 1 : 0, borderColor: t.accent,
              }}>
                <Text style={{ fontSize: 13.5, fontWeight: on || isToday ? "800" : "600", color: numColor }}>
                  {d.getDate()}
                </Text>
              </View>

              {mode === "view" && evs.length > 0 && (
                <View style={{ flexDirection: "row", gap: 2.5, marginTop: 4, height: 6 }}>
                  {evs.slice(0, 4).map((e, i) => (
                    <View key={i} style={{
                      width: 5, height: 5, borderRadius: 2.5,
                      backgroundColor: e.plan ? "transparent" : e.c,
                      borderWidth: e.plan ? 1.2 : 0, borderColor: e.c,
                      opacity: out ? 0.45 : 1,
                    }} />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
