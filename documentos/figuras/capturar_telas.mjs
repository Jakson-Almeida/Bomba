import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = dirname(fileURLToPath(import.meta.url));
const debugUrl = "http://127.0.0.1:9222";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTarget(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${debugUrl}/json/list`);
      const list = await res.json();
      const page = list.find(
        (item) =>
          item.type === "page" &&
          typeof item.webSocketDebuggerUrl === "string" &&
          !String(item.url).startsWith("devtools://"),
      );
      if (page) {
        return page;
      }
    } catch {
      // app still starting
    }
    await sleep(400);
  }
  throw new Error("Não achei a janela do Painel de Bombas no porto 9222.");
}

function openCdp(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        reject(new Error(JSON.stringify(msg.error)));
      } else {
        resolve(msg.result ?? {});
      }
    }
  });

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve());
    ws.addEventListener("error", (err) => reject(err));
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
    }
  });

  async function send(method, params = {}) {
    await ready;
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return { send, close: () => ws.close() };
}

async function screenshot(cdp, fileName, clip) {
  const params = { format: "png", fromSurface: true };
  if (clip) {
    params.clip = { ...clip, scale: 1 };
  }
  const result = await cdp.send("Page.captureScreenshot", params);
  writeFileSync(join(outDir, fileName), Buffer.from(result.data, "base64"));
  console.log(fileName);
}

async function evalInPage(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate falhou");
  }
  return result.result?.value;
}

async function boxOf(cdp, selector) {
  return evalInPage(
    cdp,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`,
  );
}

const SEED = `
(() => {
  const emptyCal = () => ({
    both: { a: 3, pwm0: 70 },
    forward: null,
    reverse: null,
    history: [],
  });
  const cals = Array.from({ length: 6 }, emptyCal);
  cals[0] = {
    both: { a: 5, pwm0: 60 },
    forward: null,
    reverse: null,
    history: [{
      id: "guia-1",
      name: "ensaio bancada",
      savedAt: Date.parse("2026-09-16T22:00:00"),
      scope: "both",
      calibration: { a: 5, pwm0: 60 },
    }],
  };
  localStorage.setItem("bomba.calibration.v3", JSON.stringify(cals));
  const charts = Array.from({ length: 6 }, () => []);
  charts[0] = [{
    id: "guia-chart-1",
    series: ["flow", "volume"],
    timeMode: "60",
    visible: true,
  }];
  localStorage.setItem("bomba.charts.v1", JSON.stringify(charts));
  return true;
})()
`;

async function connectPage() {
  const target = await waitForTarget();
  const cdp = openCdp(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  return cdp;
}

try {
  let cdp = await connectPage();
  await evalInPage(cdp, SEED);
  await evalInPage(cdp, `location.hash = "#/"; location.reload();`);
  cdp.close();
  await sleep(1500);

  cdp = await connectPage();
  await screenshot(cdp, "tela_painel.png");

  await evalInPage(cdp, `location.hash = "#/bomba/1";`);
  await sleep(900);
  await screenshot(cdp, "tela_bomba.png");

  await evalInPage(
    cdp,
    `(() => {
      const p = [...document.querySelectorAll("p")].find((n) =>
        /Calibra/i.test(n.textContent || ""),
      );
      const card = p && p.parentElement;
      if (!card) return false;
      const pwm = card.querySelector("input");
      (pwm || card).scrollIntoView({ block: "center", inline: "nearest" });
      return true;
    })()`,
  );
  await sleep(400);
  await screenshot(cdp, "tela_calibracao.png");

  await evalInPage(
    cdp,
    `(() => {
      const nodes = [...document.querySelectorAll("p, h2, h3, span, button")];
      const mon = nodes.find((n) => /Monitoramento/i.test(n.textContent || ""));
      mon?.parentElement?.parentElement?.scrollIntoView({ block: "start" });
      return Boolean(mon);
    })()`,
  );
  await sleep(400);
  await screenshot(cdp, "tela_graficos.png");

  cdp.close();
  console.log("ok");
} catch (error) {
  console.error(error);
  process.exit(1);
}
