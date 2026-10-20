import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { registerIpcHandlers } from './ipc/handlers'

// Load .env file automatically in development or production
try {
  const envPath = join(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq > 0) {
        const k = trimmed.slice(0, eq).trim()
        const v = trimmed.slice(eq + 1).trim()
        if (!process.env[k]) {
          process.env[k] = v
        }
      }
    }
  }
} catch {
  // Ignore env read errors
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  registerIpcHandlers(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // In electron-vite dev mode, ELECTRON_RENDERER_URL is set
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
