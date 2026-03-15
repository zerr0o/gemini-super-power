import { ipcMain, dialog, app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function getDialogWindow() {
  return BrowserWindow.getFocusedWindow() ?? win ?? void 0;
}
function sanitizeFileName(value, fallback = "export") {
  const sanitized = value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);
  return sanitized || fallback;
}
function decodeContents(contents, encoding) {
  if (encoding === "utf8") {
    return Buffer.from(contents, "utf8");
  }
  if (encoding === "data-url") {
    const base64 = contents.split(",", 2)[1] || "";
    return Buffer.from(base64, "base64");
  }
  return Buffer.from(contents, "base64");
}
async function ensureUniqueDirectory(baseDir, folderName) {
  const safeName = sanitizeFileName(folderName);
  let candidate = path.join(baseDir, safeName);
  let suffix = 2;
  while (true) {
    try {
      await access(candidate, constants.F_OK);
      candidate = path.join(baseDir, `${safeName}-${suffix}`);
      suffix += 1;
    } catch {
      await mkdir(candidate, { recursive: true });
      return candidate;
    }
  }
}
function createWindow() {
  win = new BrowserWindow({
    title: "Gemini Super Power",
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.handle("desktop:save-file", async (_event, payload) => {
  const browserWindow = getDialogWindow();
  const options = {
    title: payload.title,
    defaultPath: payload.defaultPath,
    filters: payload.filters
  };
  const result = browserWindow ? await dialog.showSaveDialog(browserWindow, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) {
    return null;
  }
  await writeFile(result.filePath, decodeContents(payload.contents, payload.encoding));
  return result.filePath;
});
ipcMain.handle("desktop:save-directory-files", async (_event, payload) => {
  const browserWindow = getDialogWindow();
  const options = {
    title: payload.title,
    properties: ["openDirectory", "createDirectory"]
  };
  const result = browserWindow ? await dialog.showOpenDialog(browserWindow, options) : await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  const exportDir = await ensureUniqueDirectory(result.filePaths[0], payload.folderName);
  for (const file of payload.files) {
    const targetPath = path.join(exportDir, file.relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, decodeContents(file.contents, file.encoding));
  }
  return exportDir;
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
