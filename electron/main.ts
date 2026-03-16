import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { autoUpdater } from 'electron-updater'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

type ExportFileEncoding = 'utf8' | 'base64' | 'data-url'

interface SaveFilePayload {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
  contents: string
  encoding: ExportFileEncoding
}

interface SaveDirectoryFilesPayload {
  title?: string
  folderName: string
  files: Array<{
    relativePath: string
    contents: string
    encoding: ExportFileEncoding
  }>
}

type AppUpdateStatus =
  | 'unsupported'
  | 'disabled'
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error'

interface AppUpdateState {
  enabled: boolean
  status: AppUpdateStatus
  currentVersion: string
  availableVersion: string | null
  progress: number | null
  message: string
  feedUrl: string | null
}

const APP_UPDATE_FEED_URL = 'https://github.com/zerr0o/gemini-super-power/releases'

function getDialogWindow() {
  return BrowserWindow.getFocusedWindow() ?? win ?? undefined
}

function sanitizeFileName(value: string, fallback = 'export') {
  const sanitized = value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)

  return sanitized || fallback
}

function decodeContents(contents: string, encoding: ExportFileEncoding) {
  if (encoding === 'utf8') {
    return Buffer.from(contents, 'utf8')
  }

  if (encoding === 'data-url') {
    const base64 = contents.split(',', 2)[1] || ''
    return Buffer.from(base64, 'base64')
  }

  return Buffer.from(contents, 'base64')
}

async function ensureUniqueDirectory(baseDir: string, folderName: string) {
  const safeName = sanitizeFileName(folderName)
  let candidate = path.join(baseDir, safeName)
  let suffix = 2

  while (true) {
    try {
      await access(candidate, fsConstants.F_OK)
      candidate = path.join(baseDir, `${safeName}-${suffix}`)
      suffix += 1
    } catch {
      await mkdir(candidate, { recursive: true })
      return candidate
    }
  }
}

let isAutoUpdaterConfigured = false
let hasAutoUpdaterListeners = false
let isCheckingForUpdates = false

function buildAppUpdateState(status?: AppUpdateStatus, message?: string): AppUpdateState {
  if (!app.isPackaged) {
    return {
      enabled: false,
      status: 'unsupported',
      currentVersion: app.getVersion(),
      availableVersion: null,
      progress: null,
      message: 'Auto updates are disabled in development builds.',
      feedUrl: APP_UPDATE_FEED_URL,
    }
  }

  return {
    enabled: true,
    status: status ?? 'idle',
    currentVersion: app.getVersion(),
    availableVersion: null,
    progress: null,
    message: message ?? 'Automatic updates are ready.',
    feedUrl: APP_UPDATE_FEED_URL,
  }
}

let appUpdateState = buildAppUpdateState()

function sendAppUpdateState(targetWindow?: BrowserWindow) {
  const windows = targetWindow ? [targetWindow] : BrowserWindow.getAllWindows()
  for (const browserWindow of windows) {
    browserWindow.webContents.send('app-updater:state', appUpdateState)
  }
}

function setAppUpdateState(nextState: Partial<AppUpdateState>) {
  appUpdateState = {
    ...appUpdateState,
    ...nextState,
    currentVersion: app.getVersion(),
  }
  sendAppUpdateState()
}

function ensureAutoUpdaterConfigured() {
  appUpdateState = buildAppUpdateState(appUpdateState.status, appUpdateState.message)

  if (!appUpdateState.enabled) {
    sendAppUpdateState()
    return false
  }

  if (!hasAutoUpdaterListeners) {
    hasAutoUpdaterListeners = true

    autoUpdater.on('checking-for-update', () => {
      isCheckingForUpdates = true
      setAppUpdateState({
        status: 'checking',
        progress: null,
        message: 'Checking for updates...',
      })
    })

    autoUpdater.on('update-available', (info) => {
      setAppUpdateState({
        status: 'available',
        availableVersion: info?.version ?? null,
        progress: 0,
        message: `Update ${info?.version ?? 'available'} found. Downloading in the background...`,
      })
    })

    autoUpdater.on('download-progress', (progressInfo) => {
      setAppUpdateState({
        status: 'downloading',
        progress: typeof progressInfo?.percent === 'number' ? progressInfo.percent : null,
        message: `Downloading update${typeof progressInfo?.percent === 'number' ? ` (${Math.round(progressInfo.percent)}%)` : '...'}`,
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      isCheckingForUpdates = false
      setAppUpdateState({
        status: 'downloaded',
        availableVersion: info?.version ?? appUpdateState.availableVersion,
        progress: 100,
        message: 'Update downloaded. It will install on quit, or you can restart now.',
      })
    })

    autoUpdater.on('update-not-available', () => {
      isCheckingForUpdates = false
      setAppUpdateState({
        status: 'up-to-date',
        availableVersion: null,
        progress: null,
        message: 'You already have the latest version.',
      })
    })

    autoUpdater.on('error', (error) => {
      isCheckingForUpdates = false
      setAppUpdateState({
        status: 'error',
        progress: null,
        message: error instanceof Error ? error.message : 'Auto update failed.',
      })
    })
  }

  if (!isAutoUpdaterConfigured) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowPrerelease = false
    isAutoUpdaterConfigured = true
    setAppUpdateState({
      status: appUpdateState.status === 'up-to-date' ? 'up-to-date' : 'idle',
      message: 'Automatic updates are enabled.',
    })
  }

  return true
}

async function checkForAppUpdates() {
  if (!ensureAutoUpdaterConfigured()) {
    return appUpdateState
  }

  if (isCheckingForUpdates || appUpdateState.status === 'downloading') {
    return appUpdateState
  }

  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    isCheckingForUpdates = false
    setAppUpdateState({
      status: 'error',
      progress: null,
      message: error instanceof Error ? error.message : 'Auto update failed.',
    })
  }

  return appUpdateState
}

function createWindow() {
  win = new BrowserWindow({
    title: 'Gemini Super Power',
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.setMenuBarVisibility(false)

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
    if (win) {
      sendAppUpdateState(win)
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

ipcMain.handle('app-updater:get-state', () => appUpdateState)

ipcMain.handle('app-updater:check', async () => {
  await checkForAppUpdates()
  return appUpdateState
})

ipcMain.handle('app-updater:install', () => {
  if (appUpdateState.status !== 'downloaded') {
    return false
  }

  setAppUpdateState({
    message: 'Restarting to install update...',
  })

  setImmediate(() => {
    autoUpdater.quitAndInstall()
  })

  return true
})

ipcMain.handle('desktop:save-file', async (_event, payload: SaveFilePayload) => {
  const browserWindow = getDialogWindow()
  const options: SaveDialogOptions = {
    title: payload.title,
    defaultPath: payload.defaultPath,
    filters: payload.filters,
  }
  const result = browserWindow
    ? await dialog.showSaveDialog(browserWindow, options)
    : await dialog.showSaveDialog(options)

  if (result.canceled || !result.filePath) {
    return null
  }

  await writeFile(result.filePath, decodeContents(payload.contents, payload.encoding))
  return result.filePath
})

ipcMain.handle('desktop:save-directory-files', async (_event, payload: SaveDirectoryFilesPayload) => {
  const browserWindow = getDialogWindow()
  const options: OpenDialogOptions = {
    title: payload.title,
    properties: ['openDirectory', 'createDirectory'],
  }
  const result = browserWindow
    ? await dialog.showOpenDialog(browserWindow, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const exportDir = await ensureUniqueDirectory(result.filePaths[0], payload.folderName)

  for (const file of payload.files) {
    const targetPath = path.join(exportDir, file.relativePath)
    await mkdir(path.dirname(targetPath), { recursive: true })
    await writeFile(targetPath, decodeContents(file.contents, file.encoding))
  }

  return exportDir
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  createWindow()
  ensureAutoUpdaterConfigured()

  if (appUpdateState.enabled) {
    setTimeout(() => {
      void checkForAppUpdates()
    }, 1400)
  }
})
