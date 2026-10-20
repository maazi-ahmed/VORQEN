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
  // Existing folder & script APIs
  selectFolder: () => Promise<string | null>
  getFolderStats: (folderPath: string) => Promise<FolderStats>
  openFolderInExplorer: (folderPath: string) => Promise<void>
  runScript: (request: ScriptRunRequest) => Promise<{ started: boolean; error?: string }>
  stopScript: (runId: string) => Promise<{ stopped: boolean }>
  onScriptLog: (callback: (payload: ScriptLogPayload) => void) => () => void
  onScriptExit: (callback: (payload: ScriptExitPayload) => void) => () => void

  // System Discovery & Scanner APIs
  scanGetRoots: (scopePreset?: ScanScopePreset) => Promise<DiscoveredRoot[]>
  scanGetVolumes: () => Promise<DiscoveredVolume[]>
  scanStart: (options: ScanOptions) => Promise<{ started: boolean; scanId: string; error?: string }>
  scanCancel: (scanId: string) => Promise<{ cancelled: boolean }>
  scanGetStatus: (scanId?: string) => Promise<ScanSummary | null>
  scanGetApplications: (scanId?: string) => Promise<InstalledApplication[]>
  scanGetAppReport: (appId: string, scanId?: string) => Promise<ApplicationInspectionReport | null>
  scanGetFiles: (
    scanId?: string,
    offset?: number,
    limit?: number,
    query?: string
  ) => Promise<{ items: FileInventoryRecord[]; total: number }>
  onScanProgress: (callback: (payload: ScanProgressEvent) => void) => () => void
  onScanCompleted: (callback: (summary: ScanSummary) => void) => () => void

  // Feature 2: AI File Understanding & Semantic Classification
  aiStartAnalysis: (
    options: AnalysisJobOptions
  ) => Promise<{ started: boolean; jobId: string; error?: string }>
  aiCancelAnalysis: (jobId: string) => Promise<{ cancelled: boolean }>
  aiGetResults: (
    offset?: number,
    limit?: number,
    category?: string,
    query?: string
  ) => Promise<{ items: FileAnalysisRecord[]; total: number }>
  aiGetSettings: () => Promise<AISettings>
  aiUpdateSettings: (
    settings: Partial<AISettings> & { apiKey?: string }
  ) => Promise<{ success: boolean; error?: string }>
  aiTestConnection: () => Promise<{ ok: boolean; message: string; models?: string[] }>
  onAIProgress: (callback: (payload: AnalysisJobProgress) => void) => () => void
  onAICompleted: (callback: (summary: AnalysisJobSummary) => void) => () => void
}


// ==========================================
// Full System Discovery & App Intelligence Types
// ==========================================

export type DriveType = 'fixed' | 'removable' | 'network' | 'ram' | 'unknown'

export interface DiscoveredVolume {
  driveLetter: string
  label: string
  fileSystem: string
  totalSizeBytes: number
  freeSizeBytes: number
  isAccessible: boolean
  driveType: DriveType
}

export type RootCategory =
  | 'user_profile'
  | 'desktop'
  | 'documents'
  | 'downloads'
  | 'pictures'
  | 'videos'
  | 'program_files'
  | 'program_files_x86'
  | 'program_data'
  | 'local_appdata'
  | 'roaming_appdata'
  | 'volume'
  | 'custom'

export interface DiscoveredRoot {
  id: string
  path: string
  name: string
  category: RootCategory
  isAccessible: boolean
  isDefaultSelected: boolean
  status: 'available' | 'inaccessible' | 'skipped_by_policy'
  reason?: string
}

export type ScanScopePreset = 'user_profile' | 'applications' | 'system_drives' | 'custom'

export interface ScanOptions {
  scopePreset: ScanScopePreset
  rootPaths: string[]
  includeHidden: boolean
  scanRemovableVolumes?: boolean
  scanNetworkVolumes?: boolean
  maxConcurrency?: number
  customExclusions?: string[]
}

export type FileClassification =
  | 'executable'
  | 'library'
  | 'document'
  | 'configuration'
  | 'data'
  | 'archive'
  | 'media'
  | 'code'
  | 'log'
  | 'other'

export interface FileInventoryRecord {
  id: string
  path: string
  parentPath: string
  name: string
  extension: string
  sizeBytes: number
  createdAt: string
  modifiedAt: string
  accessedAt?: string
  classification: FileClassification
  isHidden: boolean
  isSymlink: boolean
  status: 'ok' | 'error'
  errorMessage?: string
}

export interface DirectoryInventoryRecord {
  path: string
  parentPath: string
  name: string
  childFileCount: number
  childDirCount: number
  aggregatedSizeBytes: number
  traversalStatus: 'completed' | 'partial' | 'inaccessible' | 'skipped'
  errorMessage?: string
}

export type AppDiscoverySource =
  | 'registry_hklm64'
  | 'registry_hklm32'
  | 'registry_hkcu'
  | 'user_portable'
  | 'system_component'

export interface InstalledApplication {
  id: string
  displayName: string
  publisher: string
  displayVersion: string
  installLocation: string
  uninstallString?: string
  displayIcon?: string
  installDate?: string
  executablePath?: string
  discoverySource: AppDiscoverySource
  isSystemComponent: boolean
  isPortable: boolean
  associatedFileCount?: number
  totalSizeBytes?: number
}

export type AssociationCategory =
  | 'direct_installation'
  | 'application_user_data'
  | 'application_configuration'
  | 'application_cache'
  | 'log_diagnostic'
  | 'dependency_or_shared_runtime'
  | 'potentially_related'
  | 'uncertain'
  | 'shared_or_system'

export type EvidenceType =
  | 'exact_install_root_containment'
  | 'executable_path_verified'
  | 'appdata_user_directory'
  | 'appdata_cache_directory'
  | 'appdata_config_structure'
  | 'log_directory_or_extension'
  | 'shared_runtime_reference'
  | 'name_similarity_heuristic'
  | 'user_confirmed'

export type ConfidenceTier = 'high' | 'medium' | 'low' | 'uncertain'

export type AssociationRelationship = 'direct' | 'inferred' | 'shared' | 'uncertain'

export interface FileAssociation {
  appId: string
  filePath: string
  category: AssociationCategory
  evidenceType: EvidenceType
  explanation: string
  confidenceTier: ConfidenceTier
  confidenceScore: number
  relationship: AssociationRelationship
}

export type ScanState =
  | 'idle'
  | 'discovering_roots'
  | 'scanning_files'
  | 'discovering_apps'
  | 'associating'
  | 'completed'
  | 'cancelled'
  | 'failed'

export interface ScanProgressEvent {
  scanId: string
  state: ScanState
  currentPath: string
  scannedFilesCount: number
  scannedDirsCount: number
  totalDiscoveredSizeBytes: number
  elapsedTimeMs: number
  accessibleRootsCount: number
  skippedRootsCount: number
  failedRootsCount: number
  discoveredAppsCount: number
  statusMessage: string
}

export interface ScanDiagnostics {
  inaccessiblePaths: { path: string; reason: string; timestamp: number }[]
  skippedRoots: { path: string; reason: string }[]
  failedMetadataReads: { path: string; error: string }[]
  warnings: string[]
}

export interface ScanSummary {
  scanId: string
  state: ScanState
  startTime: number
  endTime: number
  durationMs: number
  totalFiles: number
  totalDirs: number
  totalSizeBytes: number
  totalAppsDiscovered: number
  isCancelled: boolean
  coverageStatus: 'complete' | 'partial' | 'incomplete'
  diagnostics: ScanDiagnostics
  rootsSummary: {
    scanned: string[]
    skipped: string[]
    inaccessible: string[]
  }
}

export interface ApplicationInspectionReport {
  application: InstalledApplication
  coverageStatus: 'complete' | 'partial' | 'incomplete'
  totalAssociatedFiles: number
  totalAssociatedSizeBytes: number
  categoryBreakdown: {
    category: AssociationCategory
    fileCount: number
    totalSizeBytes: number
  }[]
  directorySummary: {
    directoryPath: string
    fileCount: number
    totalSizeBytes: number
    category: AssociationCategory
  }[]
  associatedFiles: (FileInventoryRecord & {
    association: FileAssociation
  })[]
  inaccessibleLocations: string[]
  uncertainLocations: string[]
  diagnostics: {
    unresolvedLocations: string[]
    missingMetadata: string[]
    scanCoverageNotes: string
  }
}

// ==========================================
// Feature 2: AI File Understanding & Semantic Classification
// ==========================================

export type SemanticCategory =
  | 'University Notes'
  | 'Research Papers'
  | 'Educational Materials'
  | 'Invoices and Receipts'
  | 'Personal Documents'
  | 'Administrative Documents'
  | 'Source Code'
  | 'Software Project Assets'
  | 'Configuration Files'
  | 'Datasets'
  | 'AI Models and Model Artifacts'
  | 'Images and Media'
  | 'Archives'
  | 'Logs and Diagnostic Files'
  | 'Temporary or Cache Candidates'
  | 'Other'
  | 'Unknown'

export type ExtractionStatus =
  | 'success'
  | 'empty'
  | 'unsupported_format'
  | 'too_large'
  | 'corrupted'
  | 'error'

export type AnalysisStatus = 'pending' | 'success' | 'failed' | 'skipped'

export interface FileAnalysisRecord {
  fileId: string
  filePath: string
  fileName: string
  fileSizeBytes: number
  fileModifiedAt: string
  primaryCategory: SemanticCategory
  secondaryCategories?: SemanticCategory[]
  summary?: string
  description: string
  detectedLanguage?: string
  confidence: number
  confidenceLabel: 'High' | 'Medium' | 'Low' | 'Estimated' | 'Unknown'
  evidence: string[]
  extractedSnippet?: string
  extractionStatus: ExtractionStatus
  analysisStatus: AnalysisStatus
  modelUsed: string
  promptVersion: string
  analyzedAt: string
  errorMessage?: string
  tokensUsed?: { input: number; output: number }
}

export interface AnalysisJobOptions {
  scanId?: string
  targetFolder?: string
  selectedFileIds?: string[]
  generateSummaries: boolean
  forceReanalyze: boolean
  maxConcurrency?: number
  userConsentGiven: boolean
}

export type AnalysisJobState =
  | 'idle'
  | 'preparing'
  | 'extracting'
  | 'analyzing'
  | 'completed'
  | 'cancelled'
  | 'failed'

export interface AnalysisJobProgress {
  jobId: string
  state: AnalysisJobState
  totalEligible: number
  processedCount: number
  successCount: number
  failedCount: number
  skippedCount: number
  currentFileName: string
  currentStage: string
  elapsedMs: number
}

export interface AnalysisJobSummary {
  jobId: string
  state: 'completed' | 'cancelled' | 'failed'
  startTime: number
  endTime: number
  durationMs: number
  totalEligible: number
  successCount: number
  failedCount: number
  skippedCount: number
  categoryDistribution: Record<string, number>
  errors: { filePath: string; error: string }[]
}

export interface AISettings {
  provider: 'gemini' | 'openrouter' | 'mock'
  apiKeyConfigured: boolean
  model: string
  consentGranted: boolean
}


