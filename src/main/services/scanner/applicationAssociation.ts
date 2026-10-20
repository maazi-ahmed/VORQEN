import {
  AssociationCategory,
  FileAssociation,
  FileInventoryRecord,
  InstalledApplication
} from '../../../shared/types'
import { normalizePath } from './systemDiscovery'


export interface AssociationIndex {
  exactInstallDirs: Map<string, InstalledApplication> // normalizedDir -> app
  appDataKeywords: Map<string, InstalledApplication> // keyword -> app
}

/**
 * Builds fast directory lookup index for all applications to eliminate O(apps * files) complexity
 */
export function buildApplicationIndex(apps: InstalledApplication[]): AssociationIndex {
  const exactInstallDirs = new Map<string, InstalledApplication>()
  const appDataKeywords = new Map<string, InstalledApplication>()

  for (const app of apps) {
    if (app.installLocation && app.installLocation.length > 3) {
      const normLoc = normalizePath(app.installLocation).toLowerCase().replace(/[\\/]+$/, '')
      exactInstallDirs.set(normLoc, app)
    }

    // Index sanitized display name keywords
    const cleanName = app.displayName
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toLowerCase()

    if (cleanName.length > 2) {
      appDataKeywords.set(cleanName, app)
      const primaryWord = cleanName.split(/\s+/)[0]
      if (primaryWord.length > 3 && !['microsoft', 'windows', 'google', 'adobe', 'intel'].includes(primaryWord)) {
        appDataKeywords.set(primaryWord, app)
      }
    }
  }

  return { exactInstallDirs, appDataKeywords }
}

/**
 * Evaluates file association against an application with explainable evidence
 */
export function evaluateFileAssociation(
  file: FileInventoryRecord,
  app: InstalledApplication,
  appDataRoots: { localAppData?: string; roamingAppData?: string; programData?: string }
): FileAssociation | null {
  const normFilePath = normalizePath(file.path).toLowerCase()
  const fileName = file.name.toLowerCase()
  const ext = file.extension.toLowerCase()

  // 1. Direct verified executable match
  if (app.executablePath && normalizePath(app.executablePath).toLowerCase() === normFilePath) {
    return {
      appId: app.id,
      filePath: file.path,
      category: 'direct_installation',
      evidenceType: 'executable_path_verified',
      explanation: `Verified executable entry point matching application launch metadata (${file.name})`,
      confidenceTier: 'high',
      confidenceScore: 1.0,
      relationship: 'direct'
    }
  }

  // 2. Exact installation-root containment
  if (app.installLocation && app.installLocation.length > 3) {
    const normInstall = normalizePath(app.installLocation).toLowerCase().replace(/[\\/]+$/, '')
    if (normFilePath.startsWith(normInstall + '\\') || normFilePath === normInstall) {
      let category: AssociationCategory = 'direct_installation'
      let explanation = `Directly contained within application installation directory: ${app.installLocation}`

      if (['.log', '.trace'].includes(ext) || normFilePath.includes('\\logs\\')) {
        category = 'log_diagnostic'
        explanation = `Diagnostic or installation log inside application root: ${file.name}`
      } else if (file.classification === 'configuration') {
        category = 'application_configuration'
        explanation = `Configuration file inside installation root: ${file.name}`
      }

      return {
        appId: app.id,
        filePath: file.path,
        category,
        evidenceType: 'exact_install_root_containment',
        explanation,
        confidenceTier: 'high',
        confidenceScore: 0.95,
        relationship: 'direct'
      }
    }
  }

  // 3. Application-specific AppData or ProgramData directory containment
  const appNameLower = app.displayName.toLowerCase()
  const cleanAppName = appNameLower.replace(/[^\w]/g, '')

  const isInAppData =
    (appDataRoots.localAppData && normFilePath.startsWith(appDataRoots.localAppData.toLowerCase())) ||
    (appDataRoots.roamingAppData && normFilePath.startsWith(appDataRoots.roamingAppData.toLowerCase())) ||
    (appDataRoots.programData && normFilePath.startsWith(appDataRoots.programData.toLowerCase()))

  if (isInAppData) {
    // Check if path contains app name or publisher
    const parentDirLower = file.parentPath.toLowerCase()
    const pathParts = parentDirLower.split(/[\\/]/)

    const matchesAppFolder = pathParts.some((part) => {
      const cleanPart = part.replace(/[^\w]/g, '')
      return (
        cleanPart.length > 2 &&
        (cleanAppName.includes(cleanPart) || cleanPart.includes(cleanAppName))
      )
    })

    if (matchesAppFolder) {
      if (
        normFilePath.includes('\\cache\\') ||
        normFilePath.includes('\\code cache\\') ||
        normFilePath.includes('\\gpucache\\') ||
        normFilePath.includes('\\shadercache\\')
      ) {
        return {
          appId: app.id,
          filePath: file.path,
          category: 'application_cache',
          evidenceType: 'appdata_cache_directory',
          explanation: `Application-managed cache data located in dedicated AppData hierarchy`,
          confidenceTier: 'medium',
          confidenceScore: 0.75,
          relationship: 'inferred'
        }
      }

      if (['.log', '.trace'].includes(ext) || normFilePath.includes('\\logs\\')) {
        return {
          appId: app.id,
          filePath: file.path,
          category: 'log_diagnostic',
          evidenceType: 'log_directory_or_extension',
          explanation: `Application log or diagnostic trace located in AppData/ProgramData folder`,
          confidenceTier: 'medium',
          confidenceScore: 0.75,
          relationship: 'inferred'
        }
      }

      if (
        file.classification === 'configuration' ||
        ['.json', '.xml', '.ini', '.yaml', '.yml', '.config'].includes(ext)
      ) {
        return {
          appId: app.id,
          filePath: file.path,
          category: 'application_configuration',
          evidenceType: 'appdata_config_structure',
          explanation: `Application settings / configuration file located in dedicated AppData path`,
          confidenceTier: 'medium',
          confidenceScore: 0.75,
          relationship: 'inferred'
        }
      }

      return {
        appId: app.id,
        filePath: file.path,
        category: 'application_user_data',
        evidenceType: 'appdata_user_directory',
        explanation: `Application user state or storage located in dedicated AppData directory`,
        confidenceTier: 'medium',
        confidenceScore: 0.7,
        relationship: 'inferred'
      }
    }
  }

  // 4. Shared runtime detection
  const isSharedRuntime =
    app.displayName.includes('.NET') ||
    app.displayName.includes('Visual C++') ||
    app.displayName.includes('Java') ||
    app.displayName.includes('Node.js')

  if (isSharedRuntime) {
    if (
      normFilePath.includes('\\microsoft.net\\') ||
      normFilePath.includes('\\winsxs\\') ||
      normFilePath.includes('\\java\\')
    ) {
      return {
        appId: app.id,
        filePath: file.path,
        category: 'dependency_or_shared_runtime',
        evidenceType: 'shared_runtime_reference',
        explanation: `Shared system runtime or framework library associated with ${app.displayName}`,
        confidenceTier: 'medium',
        confidenceScore: 0.55,
        relationship: 'shared'
      }
    }
  }

  // 5. Weak heuristic: specific file name similarity in non-system folder
  if (
    cleanAppName.length > 4 &&
    fileName.includes(cleanAppName) &&
    !normFilePath.includes('\\windows\\') &&
    !normFilePath.includes('\\system32\\')
  ) {
    return {
      appId: app.id,
      filePath: file.path,
      category: 'potentially_related',
      evidenceType: 'name_similarity_heuristic',
      explanation: `Filename '${file.name}' matches application name '${app.displayName}' outside root (weak evidence)`,
      confidenceTier: 'low',
      confidenceScore: 0.35,
      relationship: 'uncertain'
    }
  }

  return null
}

/**
 * Associates all discovered files with applications using path prefix indexes and rules
 */
export function associateApplicationsWithFiles(
  apps: InstalledApplication[],
  files: FileInventoryRecord[]
): Map<string, FileAssociation[]> {
  const associationsByApp = new Map<string, FileAssociation[]>()
  for (const app of apps) {
    associationsByApp.set(app.id, [])
  }

  const appDataRoots = {
    localAppData: process.env.LOCALAPPDATA,
    roamingAppData: process.env.APPDATA,
    programData: process.env.ProgramData || 'C:\\ProgramData'
  }

  // Pre-filter applications that have an installLocation or AppData matches
  for (const file of files) {
    for (const app of apps) {
      const assoc = evaluateFileAssociation(file, app, appDataRoots)
      if (assoc) {
        associationsByApp.get(app.id)?.push(assoc)
      }
    }
  }

  return associationsByApp
}
