import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import {
  ApplicationInspectionReport,
  DirectoryInventoryRecord,
  FileAssociation,
  FileInventoryRecord,
  InstalledApplication,
  ScanOptions,
  ScanProgressEvent,
  ScanState,
  ScanSummary
} from '../../../shared/types'
import { getApplicationDiscoveryProvider } from './applicationDiscovery'
import { associateApplicationsWithFiles } from './applicationAssociation'
import { FileInventoryEngine } from './fileInventory'
import { buildApplicationReport } from './reportBuilder'
import { discoverScanRoots, normalizePath } from './systemDiscovery'

interface ActiveScanSession {
  scanId: string
  options: ScanOptions
  state: ScanState
  startTime: number
  endTime?: number
  cancelled: boolean
  files: FileInventoryRecord[]
  filesMap: Map<string, FileInventoryRecord>
  directories: DirectoryInventoryRecord[]
  applications: InstalledApplication[]
  associationsByApp: Map<string, FileAssociation[]>
  summary: ScanSummary | null
}

export class ScanCoordinator {
  private activeSession: ActiveScanSession | null = null
  private lastCompletedSession: ActiveScanSession | null = null
  private cachedSessions = new Map<string, ActiveScanSession>()

  /**
   * Starts a new scan job
   */
  public async startScan(
    window: BrowserWindow,
    options: ScanOptions
  ): Promise<{ started: boolean; scanId: string; error?: string }> {
    if (this.activeSession && !['completed', 'cancelled', 'failed'].includes(this.activeSession.state)) {
      return {
        started: false,
        scanId: this.activeSession.scanId,
        error: 'A system scan is already running. Please cancel or wait for it to finish.'
      }
    }

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    const session: ActiveScanSession = {
      scanId,
      options,
      state: 'idle',
      startTime: Date.now(),
      cancelled: false,
      files: [],
      filesMap: new Map(),
      directories: [],
      applications: [],
      associationsByApp: new Map(),
      summary: null
    }

    this.activeSession = session
    this.cachedSessions.set(scanId, session)

    // Execute scan asynchronously in the background so IPC returns immediately with scanId
    this.executeScanPipeline(window, session).catch((err) => {
      console.error('Scan pipeline fatal failure:', err)
      session.state = 'failed'
      this.emitProgress(window, session, 'Fatal error in scan coordinator pipeline')
    })

    return { started: true, scanId }
  }

  /**
   * Cancels a currently running scan
   */
  public cancelScan(scanId: string): { cancelled: boolean } {
    if (this.activeSession && this.activeSession.scanId === scanId) {
      this.activeSession.cancelled = true
      this.activeSession.state = 'cancelled'
      return { cancelled: true }
    }
    return { cancelled: false }
  }

  /**
   * Retrieves summary for a scan
   */
  public getStatus(scanId?: string): ScanSummary | null {
    if (scanId && this.cachedSessions.has(scanId)) {
      return this.cachedSessions.get(scanId)!.summary
    }
    return this.activeSession?.summary || this.lastCompletedSession?.summary || null
  }

  /**
   * Retrieves discovered applications
   */
  public getApplications(scanId?: string): InstalledApplication[] {
    const session =
      (scanId && this.cachedSessions.get(scanId)) ||
      this.activeSession ||
      this.lastCompletedSession

    if (!session) return []

    // Return apps with associated file counts & sizes updated
    return session.applications.map((app) => {
      const assocs = session.associationsByApp.get(app.id) || []
      let totalSize = 0
      for (const a of assocs) {
        const f = session.filesMap.get(a.filePath)
        if (f) totalSize += f.sizeBytes
      }
      return {
        ...app,
        associatedFileCount: assocs.length,
        totalSizeBytes: totalSize
      }
    })
  }

  /**
   * Generates application inspection report
   */
  public getApplicationReport(
    appId: string,
    scanId?: string
  ): ApplicationInspectionReport | null {
    const session =
      (scanId && this.cachedSessions.get(scanId)) ||
      this.activeSession ||
      this.lastCompletedSession

    if (!session) return null

    const app = session.applications.find((a) => a.id === appId)
    if (!app) return null

    const assocs = session.associationsByApp.get(appId) || []
    return buildApplicationReport(app, assocs, session.filesMap, session.summary)
  }

  /**
   * Retrieves files with pagination and search
   */
  public getFiles(
    scanId?: string,
    offset = 0,
    limit = 100,
    query = ''
  ): { items: FileInventoryRecord[]; total: number } {
    const session =
      (scanId && this.cachedSessions.get(scanId)) ||
      this.activeSession ||
      this.lastCompletedSession

    if (!session) return { items: [], total: 0 }

    let pool = session.files
    if (query) {
      const q = query.toLowerCase()
      pool = pool.filter(
        (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
      )
    }

    const total = pool.length
    const items = pool.slice(offset, offset + limit)
    return { items, total }
  }

  /**
   * Main scan pipeline execution
   */
  private async executeScanPipeline(
    window: BrowserWindow,
    session: ActiveScanSession
  ): Promise<void> {
    const diagnostics = {
      inaccessiblePaths: [] as { path: string; reason: string; timestamp: number }[],
      skippedRoots: [] as { path: string; reason: string }[],
      failedMetadataReads: [] as { path: string; error: string }[],
      warnings: [] as string[]
    }

    const scannedRoots: string[] = []
    const skippedRoots: string[] = []
    const inaccessibleRoots: string[] = []

    // ----------------------------------------
    // Step 1: Discover Scan Roots
    // ----------------------------------------
    session.state = 'discovering_roots'
    this.emitProgress(window, session, 'Discovering filesystem scan roots...')

    let targetRoots: string[] = []
    if (session.options.rootPaths && session.options.rootPaths.length > 0) {
      targetRoots = session.options.rootPaths
    } else {
      const availableRoots = await discoverScanRoots(session.options.scopePreset)
      targetRoots = availableRoots
        .filter((r) => r.isDefaultSelected && r.isAccessible)
        .map((r) => r.path)
    }

    if (session.cancelled) {
      this.finalizeCancelled(window, session, diagnostics, scannedRoots, skippedRoots, inaccessibleRoots)
      return
    }

    // ----------------------------------------
    // Step 2: Discover Installed Applications
    // ----------------------------------------
    session.state = 'discovering_apps'
    this.emitProgress(window, session, 'Discovering installed operating system applications...')

    try {
      const appProvider = getApplicationDiscoveryProvider()
      session.applications = await appProvider.discoverApplications()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Application discovery error'
      diagnostics.warnings.push(`App discovery warning: ${errMsg}`)
    }

    if (session.cancelled) {
      this.finalizeCancelled(window, session, diagnostics, scannedRoots, skippedRoots, inaccessibleRoots)
      return
    }

    // ----------------------------------------
    // Step 3: Recursive File & Directory Walk
    // ----------------------------------------
    session.state = 'scanning_files'
    this.emitProgress(window, session, 'Beginning recursive filesystem inventory traversal...')

    const inventoryEngine = new FileInventoryEngine()
    let lastThrottledProgress = Date.now()

    for (const root of targetRoots) {
      if (session.cancelled) break

      const normRoot = normalizePath(root)
      try {
        scannedRoots.push(normRoot)

        await inventoryEngine.scanDirectoryTree(
          normRoot,
          {
            includeHidden: session.options.includeHidden,
            maxConcurrency: session.options.maxConcurrency || 12,
            customExclusions: session.options.customExclusions
          },
          {
            isCancelled: () => session.cancelled,
            onBatchDiscovered: (files, dirs) => {
              for (const f of files) {
                session.files.push(f)
                session.filesMap.set(f.path, f)
              }
              for (const d of dirs) {
                session.directories.push(d)
              }
            },
            onProgress: (currentDir) => {
              const now = Date.now()
              if (now - lastThrottledProgress > 150) {
                lastThrottledProgress = now
                this.emitProgress(window, session, `Scanning: ${currentDir}`)
              }
            },
            onError: (p, error, phase) => {
              if (phase === 'dir_open') {
                diagnostics.inaccessiblePaths.push({
                  path: p,
                  reason: error,
                  timestamp: Date.now()
                })
              } else {
                diagnostics.failedMetadataReads.push({ path: p, error })
              }
            }
          }
        )
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown traversal error'
        inaccessibleRoots.push(normRoot)
        diagnostics.inaccessiblePaths.push({
          path: normRoot,
          reason: errorMsg,
          timestamp: Date.now()
        })
      }
    }

    if (session.cancelled) {
      this.finalizeCancelled(window, session, diagnostics, scannedRoots, skippedRoots, inaccessibleRoots)
      return
    }

    // ----------------------------------------
    // Step 4: Rule-based Application Association
    // ----------------------------------------
    session.state = 'associating'
    this.emitProgress(window, session, 'Correlating files with installed application metadata...')

    try {
      session.associationsByApp = associateApplicationsWithFiles(
        session.applications,
        session.files
      )
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Association calculation error'
      diagnostics.warnings.push(`Association warning: ${errMsg}`)
    }

    // ----------------------------------------
    // Step 5: Finalization & Summary Assembly
    // ----------------------------------------
    session.state = 'completed'
    session.endTime = Date.now()

    let totalSizeBytes = 0
    for (const f of session.files) {
      totalSizeBytes += f.sizeBytes
    }

    // Determine overall coverage status
    let coverageStatus: 'complete' | 'partial' | 'incomplete' = 'complete'
    if (diagnostics.inaccessiblePaths.length > 0 || inaccessibleRoots.length > 0) {
      coverageStatus = 'partial'
    }

    const summary: ScanSummary = {
      scanId: session.scanId,
      state: 'completed',
      startTime: session.startTime,
      endTime: session.endTime,
      durationMs: session.endTime - session.startTime,
      totalFiles: session.files.length,
      totalDirs: session.directories.length,
      totalSizeBytes,
      totalAppsDiscovered: session.applications.length,
      isCancelled: false,
      coverageStatus,
      diagnostics,
      rootsSummary: {
        scanned: scannedRoots,
        skipped: skippedRoots,
        inaccessible: inaccessibleRoots
      }
    }

    session.summary = summary
    this.lastCompletedSession = session

    this.emitProgress(window, session, 'System discovery completed successfully')
    this.emitCompleted(window, summary)
  }

  private finalizeCancelled(
    window: BrowserWindow,
    session: ActiveScanSession,
    diagnostics: any,
    scannedRoots: string[],
    skippedRoots: string[],
    inaccessibleRoots: string[]
  ): void {
    session.state = 'cancelled'
    session.endTime = Date.now()

    let totalSizeBytes = 0
    for (const f of session.files) {
      totalSizeBytes += f.sizeBytes
    }

    const summary: ScanSummary = {
      scanId: session.scanId,
      state: 'cancelled',
      startTime: session.startTime,
      endTime: session.endTime,
      durationMs: session.endTime - session.startTime,
      totalFiles: session.files.length,
      totalDirs: session.directories.length,
      totalSizeBytes,
      totalAppsDiscovered: session.applications.length,
      isCancelled: true,
      coverageStatus: 'partial',
      diagnostics,
      rootsSummary: {
        scanned: scannedRoots,
        skipped: skippedRoots,
        inaccessible: inaccessibleRoots
      }
    }

    session.summary = summary
    this.emitProgress(window, session, 'Scan cancelled by user')
    this.emitCompleted(window, summary)
  }

  private emitProgress(
    window: BrowserWindow,
    session: ActiveScanSession,
    statusMessage: string
  ): void {
    if (window.isDestroyed()) return

    let totalSizeBytes = 0
    for (const f of session.files) {
      totalSizeBytes += f.sizeBytes
    }

    const payload: ScanProgressEvent = {
      scanId: session.scanId,
      state: session.state,
      currentPath: session.files[session.files.length - 1]?.parentPath || '',
      scannedFilesCount: session.files.length,
      scannedDirsCount: session.directories.length,
      totalDiscoveredSizeBytes: totalSizeBytes,
      elapsedTimeMs: Date.now() - session.startTime,
      accessibleRootsCount: session.options.rootPaths?.length || 1,
      skippedRootsCount: 0,
      failedRootsCount: 0,
      discoveredAppsCount: session.applications.length,
      statusMessage
    }

    window.webContents.send(IPC_CHANNELS.ON_SCAN_PROGRESS, payload)
  }

  private emitCompleted(window: BrowserWindow, summary: ScanSummary): void {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.ON_SCAN_COMPLETED, summary)
    }
  }
}

export const scanCoordinator = new ScanCoordinator()
