import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { ElectronAPI, ScriptExitPayload, ScriptLogPayload, ScriptRunRequest } from '../shared/types'

const api: ElectronAPI = {
  selectFolder: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER)
  },
  getFolderStats: (folderPath: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_FOLDER_STATS, folderPath)
  },
  openFolderInExplorer: (folderPath: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_FOLDER_IN_EXPLORER, folderPath)
  },
  runScript: (request: ScriptRunRequest) => {
    return ipcRenderer.invoke(IPC_CHANNELS.RUN_SCRIPT, request)
  },
  stopScript: (runId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOP_SCRIPT, runId)
  },
  onScriptLog: (callback: (payload: ScriptLogPayload) => void) => {
    const handler = (_event: IpcRendererEvent, payload: ScriptLogPayload) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.ON_SCRIPT_LOG, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_SCRIPT_LOG, handler)
    }
  },
  onScriptExit: (callback: (payload: ScriptExitPayload) => void) => {
    const handler = (_event: IpcRendererEvent, payload: ScriptExitPayload) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.ON_SCRIPT_EXIT, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_SCRIPT_EXIT, handler)
    }
  },

  // System Discovery & Scanner
  scanGetRoots: (scopePreset) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_ROOTS, scopePreset)
  },
  scanGetVolumes: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_VOLUMES)
  },
  scanStart: (options) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SCAN_START, options)
  },
  scanCancel: (scanId) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SCAN_CANCEL, scanId)
  },
  scanGetStatus: (scanId) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_STATUS, scanId)
  },
  scanGetApplications: (scanId) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_APPLICATIONS, scanId)
  },
  scanGetAppReport: (appId, scanId) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_APP_REPORT, appId, scanId)
  },
  scanGetFiles: (scanId, offset, limit, query) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_FILES, scanId, offset, limit, query)
  },
  onScanProgress: (callback) => {
    const handler = (_event: IpcRendererEvent, payload: any) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.ON_SCAN_PROGRESS, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_SCAN_PROGRESS, handler)
    }
  },
  onScanCompleted: (callback) => {
    const handler = (_event: IpcRendererEvent, payload: any) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.ON_SCAN_COMPLETED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_SCAN_COMPLETED, handler)
    }
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error('Failed to expose context bridge API:', error)
}
