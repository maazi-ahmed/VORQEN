import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { ScriptRunRequest } from '../../shared/types'
import { inspectFolder } from '../services/fileSystem'
import { scriptRunner } from '../services/scriptRunner'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Folder selector dialog
  ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Folder for Script Execution & Analysis',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // Folder statistics and content inspection
  ipcMain.handle(IPC_CHANNELS.GET_FOLDER_STATS, async (_event, folderPath: string) => {
    if (!folderPath) {
      throw new Error('Folder path is required')
    }
    return await inspectFolder(folderPath)
  })

  // Reveal folder in Native OS Explorer / Finder
  ipcMain.handle(IPC_CHANNELS.OPEN_FOLDER_IN_EXPLORER, async (_event, folderPath: string) => {
    if (!folderPath) return
    await shell.openPath(folderPath)
  })

  // Run script inside target directory
  ipcMain.handle(IPC_CHANNELS.RUN_SCRIPT, async (_event, request: ScriptRunRequest) => {
    return scriptRunner.runScript(mainWindow, request)
  })

  // Stop / kill script
  ipcMain.handle(IPC_CHANNELS.STOP_SCRIPT, async (_event, runId: string) => {
    return scriptRunner.stopScript(runId)
  })
}
