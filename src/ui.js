import React from "react";
import {
  View, Text, TextInput, Pressable, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tint } from "./theme";

export function Btn({ t, label, onPress, kind = "plain", small, style, disabled }) {
  const bg =
    kind === "primary" ? t.accent :
    kind === "ok" ? t.ok :
    kind === "ghost" ? "transparent" : t.card;
  const fg =
    kind === "primary" || kind === "ok" ? t.onAccent :
    kind === "danger" ? t.danger : t.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{
        backgroundColor: bg,
        borderWidth: kind === "primary" || kind === "ok" || kind === "ghost" ? 0 : 1,
        borderColor: t.line,
        paddingVertical: small ? 7 : 12,
        paddingHorizontal: small ? 11 : 16,
        borderRadius: small ? 9 : 12,
        alignItems: "center",
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
      }, style]}
    >
      <Text style={{ color: fg, fontWeight: "700", fontSize: small ? 13 : 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ t, label, tone = "muted" }) {
  const c = tone === "ok" ? t.ok : tone === "warn" ? t.warn : tone === "danger" ? t.danger : t.muted;
  return (
    <View style={{ backgroundColor: tint(c, 0.15), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
      <Text style={{ color: c, fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

export function Dot({ color, size = 9, hollow }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: hollow ? "transparent" : color,
      borderWidth: hollow ? 1.5 : 0, borderColor: color,
    }} />
  );
}

export function Field({ t, label, hint, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {!!label && (
        <Text style={{ color: t.muted, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>{label}</Text>
      )}
      {children}
      {!!hint && <Text style={{ color: t.muted, fontSize: 12, marginTop: 6 }}>{hint}</Text>}
    </View>
  );
}

export function Input({ t, style, multiline, ...rest }) {
  return (
    <TextInput
      placeholderTextColor={t.muted}
      multiline={multiline}
      style={[{
        backgroundColor: t.sunk,
        color: t.ink,
        borderWidth: 1,
        borderColor: t.line,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 15,
        minHeight: multiline ? 74 : undefined,
        textAlignVertical: multiline ? "top" : "center",
      }, style]}
      {...rest}
    />
  );
}

export function Seg({ t, options, value, onChange }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.sunk, borderRadius: 9, padding: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              paddingVertical: 5, paddingHorizontal: 12, borderRadius: 7,
              backgroundColor: on ? t.card : "transparent",
            }}
          >
            <Text style={{ color: on ? t.ink : t.muted, fontSize: 12.5, fontWeight: "700" }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 아래에서 올라오는 시트. 화면 대부분을 덮고 안쪽은 스크롤된다. */
export function Sheet({ t, visible, title, onClose, children, footer }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{
            backgroundColor: t.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
            maxHeight: "92%", overflow: "hidden",
          }}>
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
              borderBottomWidth: 1, borderBottomColor: t.line,
            }}>
              <Text style={{ color: t.ink, fontSize: 17, fontWeight: "800", flex: 1 }}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={{ color: t.muted, fontSize: 20, fontWeight: "600" }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ paddingHorizontal: 18 }}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {!!footer && (
              <View style={{
                borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.card,
                flexDirection: "row", gap: 8,
                paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14 + insets.bottom,
              }}>
                {footer}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function Card({ t, style, children }) {
  return (
    <View style={[{
      backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: t.line,
      overflow: "hidden",
    }, style]}>
      {children}
    </View>
  );
}

export function Row({ children, style }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>{children}</View>;
}
