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
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error('Failed to expose context bridge API:', error)
}
