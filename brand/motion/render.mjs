// usage: node render.mjs <page.html> <w> <h> <outdir> [fps] [stills t1,t2|-] [extra query, e.g. bg=none&tone=cream]
// Playwright: `npm i -D playwright` here, or point PLAYWRIGHT at an installed index.mjs
const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
import fs from "fs"; import path from "path";
const [page, w, h, outdir, fps = "30", stills = "-", extra = ""] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const transparent = extra.includes("bg=none");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto("file://" + path.resolve(page) + `?w=${w}&h=${h}&${extra}`);
await p.waitForFunction(() => window.ready);
const dur = await p.evaluate(() => window.DUR);
const st = stills !== "-";
const times = st ? stills.split(",").map(Number) : [...Array(Math.round(dur * +fps) + 1).keys()].map((i) => i / +fps);
let i = 0;
for (const t of times) {
  await p.evaluate((t) => render(t), t);
  await p.screenshot({ path: path.join(outdir, (st ? "still_" + t : "f" + String(i).padStart(4, "0")) + ".png"), omitBackground: transparent });
  i++;
}
await b.close();
console.log("frames", times.length);
