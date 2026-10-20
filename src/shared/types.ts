export type ScriptType = 'powershell' | 'cmd' | 'bash' | 'node' | 'python' | 'custom'

export interface ScriptDefinition {
  id: string
  name: string
  description: string
  scriptType: ScriptType
  commandTemplate: string
  category: 'cleanup' | 'analysis' | 'organization' | 'custom'
  requiresConfirmation?: boolean
}

export interface FolderItem {
  name: string
  path: string
  isDir: boolean
  sizeBytes: number
  extension: string
  modifiedAt: string
}

export interface FolderStats {
  path: string
  name: string
  totalFiles: number
  totalDirs: number
  totalSizeBytes: number
  items: FolderItem[]
}

export interface ScriptRunRequest {
  id: string
  command: string
  scriptType: ScriptType
  targetDirectory: string
  args?: string[]
}

export interface ScriptLogPayload {
  runId: string
  type: 'stdout' | 'stderr' | 'system'
  message: string
  timestamp: number
}

export interface ScriptExitPayload {
  runId: string
  exitCode: number | null
  signal: string | null
  durationMs: number
  success: boolean
}

export interface ElectronAPI {
  selectFolder: () => Promise<string | null>
  getFolderStats: (folderPath: string) => Promise<FolderStats>
  openFolderInExplorer: (folderPath: string) => Promise<void>
  runScript: (request: ScriptRunRequest) => Promise<{ started: boolean; error?: string }>
  stopScript: (runId: string) => Promise<{ stopped: boolean }>
  onScriptLog: (callback: (payload: ScriptLogPayload) => void) => () => void
  onScriptExit: (callback: (payload: ScriptExitPayload) => void) => () => void
}
