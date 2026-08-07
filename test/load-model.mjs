/* src/model.js 는 앱 쪽 ESM이라 Node가 그대로 못 읽는다.
   의존성이 하나도 없는 순수 모듈이므로 그대로 메모리에서 불러온다. */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/model.js", import.meta.url), "utf8");
const mod = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));

export default mod;
