import { ipcMain as p, dialog as a, app as c, BrowserWindow as d } from "electron";
import { fileURLToPath as D } from "node:url";
import t from "node:path";
import { writeFile as m, mkdir as h, access as E } from "node:fs/promises";
import { constants as j } from "node:fs";
const P = t.dirname(D(import.meta.url));
process.env.APP_ROOT = t.join(P, "..");
const f = process.env.VITE_DEV_SERVER_URL, S = t.join(process.env.APP_ROOT, "dist-electron"), v = t.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = f ? t.join(process.env.APP_ROOT, "public") : v;
let s;
function _() {
  return d.getFocusedWindow() ?? s ?? void 0;
}
function O(o, e = "export") {
  return o.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || e;
}
function g(o, e) {
  if (e === "utf8")
    return Buffer.from(o, "utf8");
  if (e === "data-url") {
    const i = o.split(",", 2)[1] || "";
    return Buffer.from(i, "base64");
  }
  return Buffer.from(o, "base64");
}
async function T(o, e) {
  const i = O(e);
  let r = t.join(o, i), n = 2;
  for (; ; )
    try {
      await E(r, j.F_OK), r = t.join(o, `${i}-${n}`), n += 1;
    } catch {
      return await h(r, { recursive: !0 }), r;
    }
}
function R() {
  s = new d({
    icon: t.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: t.join(P, "preload.mjs")
    }
  }), s.webContents.on("did-finish-load", () => {
    s == null || s.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), f ? s.loadURL(f) : s.loadFile(t.join(v, "index.html"));
}
p.handle("desktop:save-file", async (o, e) => {
  const i = _(), r = {
    title: e.title,
    defaultPath: e.defaultPath,
    filters: e.filters
  }, n = i ? await a.showSaveDialog(i, r) : await a.showSaveDialog(r);
  return n.canceled || !n.filePath ? null : (await m(n.filePath, g(e.contents, e.encoding)), n.filePath);
});
p.handle("desktop:save-directory-files", async (o, e) => {
  const i = _(), r = {
    title: e.title,
    properties: ["openDirectory", "createDirectory"]
  }, n = i ? await a.showOpenDialog(i, r) : await a.showOpenDialog(r);
  if (n.canceled || n.filePaths.length === 0)
    return null;
  const u = await T(n.filePaths[0], e.folderName);
  for (const l of e.files) {
    const w = t.join(u, l.relativePath);
    await h(t.dirname(w), { recursive: !0 }), await m(w, g(l.contents, l.encoding));
  }
  return u;
});
c.on("window-all-closed", () => {
  process.platform !== "darwin" && (c.quit(), s = null);
});
c.on("activate", () => {
  d.getAllWindows().length === 0 && R();
});
c.whenReady().then(R);
export {
  S as MAIN_DIST,
  v as RENDERER_DIST,
  f as VITE_DEV_SERVER_URL
};
