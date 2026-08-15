/* 만든 문자를 다른 앱으로 넘긴다. 네이티브에서는 Metro가 share.js를 고른다.
   공유 시트를 쓸 수 없는 브라우저에서는 클립보드로 물러선다. */

/** @returns "shared" | "copied" | "cancel" */
export async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") return "cancel";
      // 그 밖의 실패(권한·미지원)는 복사로 물러선다
    }
  }
  await copyText(text);
  return "copied";
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // clipboard API가 없는 옛 사파리
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("복사할 수 없습니다. 문자를 길게 눌러 직접 복사해 주세요.");
}
