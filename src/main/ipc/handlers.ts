import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { ScriptRunRequest } from '../../shared/types'
import { inspectFolder } from '../services/fileSystem'
import { scriptRunner } from '../services/scriptRunner'
import { discoverScanRoots, discoverVolumes } from '../services/scanner/systemDiscovery'
import { scanCoordinator } from '../services/scanner/scanCoordinator'
import { analysisCoordinator } from '../services/ai/analysisCoordinator'



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

  // Full System Discovery & Application Intelligence Handlers
  ipcMain.handle(IPC_CHANNELS.SCAN_GET_ROOTS, async (_event, scopePreset?: any) => {
    const validPresets = ['user_profile', 'applications', 'system_drives', 'custom']
    const preset = validPresets.includes(scopePreset) ? scopePreset : 'user_profile'
    return await discoverScanRoots(preset)
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_GET_VOLUMES, async () => {
    return await discoverVolumes()
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_START, async (_event, options: any) => {
    if (!options || typeof options !== 'object') {
      return { started: false, scanId: '', error: 'Invalid scan options payload' }
    }

    const safeOptions = {
      scopePreset: options.scopePreset || 'user_profile',
      rootPaths: Array.isArray(options.rootPaths)
        ? options.rootPaths.filter((p: unknown) => typeof p === 'string' && p.trim().length > 0)
        : [],
      includeHidden: Boolean(options.includeHidden),
      scanRemovableVolumes: Boolean(options.scanRemovableVolumes),
      scanNetworkVolumes: Boolean(options.scanNetworkVolumes),
      maxConcurrency: typeof options.maxConcurrency === 'number' ? options.maxConcurrency : 12,
      customExclusions: Array.isArray(options.customExclusions)
        ? options.customExclusions.filter((e: unknown) => typeof e === 'string')
        : []
    }

    return await scanCoordinator.startScan(mainWindow, safeOptions)
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_CANCEL, async (_event, scanId: string) => {
    if (!scanId || typeof scanId !== 'string') {
      return { cancelled: false }
    }
    return scanCoordinator.cancelScan(scanId)
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_GET_STATUS, async (_event, scanId?: string) => {
    return scanCoordinator.getStatus(typeof scanId === 'string' ? scanId : undefined)
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_GET_APPLICATIONS, async (_event, scanId?: string) => {
    return scanCoordinator.getApplications(typeof scanId === 'string' ? scanId : undefined)
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_GET_APP_REPORT, async (_event, appId: string, scanId?: string) => {
    if (!appId || typeof appId !== 'string') {
      return null
    }
    return scanCoordinator.getApplicationReport(appId, typeof scanId === 'string' ? scanId : undefined)
  })

  ipcMain.handle(
    IPC_CHANNELS.SCAN_GET_FILES,
    async (_event, scanId?: string, offset?: number, limit?: number, query?: string) => {
      const safeOffset = typeof offset === 'number' && offset >= 0 ? offset : 0
      const safeLimit = typeof limit === 'number' && limit > 0 && limit <= 500 ? limit : 100
      const safeQuery = typeof query === 'string' ? query.trim() : ''
      return scanCoordinator.getFiles(
        typeof scanId === 'string' ? scanId : undefined,
        safeOffset,
        safeLimit,
        safeQuery
      )
    }
  )

  // Feature 2: AI File Understanding & Semantic Classification
  ipcMain.handle(IPC_CHANNELS.AI_START_ANALYSIS, async (_event, options: any) => {
    if (!options || typeof options !== 'object') {
      return { started: false, jobId: '', error: 'Invalid analysis options payload' }
    }

    const safeOptions = {
      scanId: typeof options.scanId === 'string' ? options.scanId : undefined,
      selectedFileIds: Array.isArray(options.selectedFileIds)
        ? options.selectedFileIds.filter((id: unknown) => typeof id === 'string')
        : undefined,
      generateSummaries: Boolean(options.generateSummaries),
      forceReanalyze: Boolean(options.forceReanalyze),
      maxConcurrency: typeof options.maxConcurrency === 'number' ? options.maxConcurrency : 3,
      userConsentGiven: Boolean(options.userConsentGiven)
    }

    return await analysisCoordinator.startAnalysis(mainWindow, safeOptions)
  })

  ipcMain.handle(IPC_CHANNELS.AI_CANCEL_ANALYSIS, async (_event, jobId: string) => {
    if (!jobId || typeof jobId !== 'string') {
      return { cancelled: false }
    }
    return analysisCoordinator.cancelAnalysis(jobId)
  })

  ipcMain.handle(
    IPC_CHANNELS.AI_GET_RESULTS,
    async (_event, offset?: number, limit?: number, category?: string, query?: string) => {
      const safeOffset = typeof offset === 'number' && offset >= 0 ? offset : 0
      const safeLimit = typeof limit === 'number' && limit > 0 && limit <= 500 ? limit : 100
      const safeCategory = typeof category === 'string' ? category : 'all'
      const safeQuery = typeof query === 'string' ? query.trim() : ''
      return analysisCoordinator.getResults(safeOffset, safeLimit, safeCategory, safeQuery)
    }
  )

  ipcMain.handle(IPC_CHANNELS.AI_GET_SETTINGS, async () => {
    return analysisCoordinator.getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.AI_UPDATE_SETTINGS, async (_event, settings: any) => {
    if (!settings || typeof settings !== 'object') {
      return { success: false, error: 'Invalid settings payload' }
    }
    return analysisCoordinator.updateSettings(settings)
  })

  ipcMain.handle(IPC_CHANNELS.AI_TEST_CONNECTION, async () => {
    return await analysisCoordinator.testConnection()
  })
}


