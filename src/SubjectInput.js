import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Input, Row } from "./ui";
import { SUBJECT_GROUPS } from "./message";

const ALL = SUBJECT_GROUPS.flatMap(([, list]) => list);
const COMMON = ["국어", "수학", "영어", "문학", "독서", "수학Ⅰ", "수학Ⅱ"];

/**
 * 과목 입력. 고를 수 있는 과목이 마흔 개 가까워 목록으로 늘어놓으면 오히려 느리다.
 * 그래서 자유 입력을 기본으로 두고, 친 글자로 좁힌 것만 아래에 보여준다.
 */
export default function SubjectInput({ t, value, onChange, placeholder = "예) 수학Ⅰ" }) {
  const q = (value || "").trim();
  const hits = (q ? ALL.filter((s) => s.includes(q) && s !== q) : COMMON).slice(0, 8);
  return (
    <View>
      <Input t={t} value={value} onChangeText={onChange} placeholder={placeholder} />
      {hits.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Row style={{ gap: 6, marginTop: 6 }}>
            {hits.map((s) => (
              <Pressable
                key={s}
                onPress={() => onChange(s)}
                style={{ backgroundColor: t.sunk, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 8 }}
              >
                <Text style={{ color: t.ink, fontWeight: "700", fontSize: 13 }}>{s}</Text>
              </Pressable>
            ))}
          </Row>
        </ScrollView>
      )}
    </View>
  );
}
