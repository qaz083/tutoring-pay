/* message.js는 model.js를 import하므로, 둘을 한 덩어리로 묶어 메모리에서 불러온다. */
import { readFileSync } from "node:fs";

const model = readFileSync(new URL("../src/model.js", import.meta.url), "utf8");
const message = readFileSync(new URL("../src/message.js", import.meta.url), "utf8")
  .replace(/^import .*from "\.\/model";$/m, "");   // model을 위에 이어 붙이므로 import는 뺀다

const src = model + "\n" + message;
const mod = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));

export default mod;
