import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  DiscoveredRoot,
  DiscoveredVolume,
  DriveType,
  RootCategory,
  ScanScopePreset
} from '../../../shared/types'

// Default exclusions for dangerous, virtual, or system-reserved namespaces
export const DEFAULT_EXCLUSIONS = [
  '$Recycle.Bin',
  'System Volume Information',
  'Recovery',
  '$WinREAgent',
  'pagefile.sys',
  'hiberfil.sys',
  'swapfile.sys',
  'dumpstack.log',
  'Windows\\WinSxS'
]

/**
 * Normalizes a filesystem path safely for cross-check and consistency
 */
export function normalizePath(p: string): string {
  if (!p) return ''
  let normalized = path.resolve(p)
  // Ensure Windows drive letters are uppercase
  if (/^[a-z]:\\/i.test(normalized)) {
    normalized = normalized[0].toUpperCase() + normalized.slice(1)
  }
  return normalized
}

/**
 * Checks whether a path matches any exclusion rule
 */
export function isPathExcluded(filePath: string, customExclusions: string[] = []): boolean {
  const normalized = normalizePath(filePath).toLowerCase()
  const allExclusions = [...DEFAULT_EXCLUSIONS, ...customExclusions]

  for (const exclusion of allExclusions) {
    const normExclusion = exclusion.toLowerCase()
    if (
      normalized.endsWith('\\' + normExclusion) ||
      normalized === normExclusion ||
      normalized.includes('\\' + normExclusion + '\\') ||
      normalized.includes('/' + normExclusion + '/')
    ) {
      return true
    }
  }

  return false
}

/**
 * Discover mounted volumes / drives on the host
 */
export async function discoverVolumes(): Promise<DiscoveredVolume[]> {
  const volumes: DiscoveredVolume[] = []
  const isWindows = process.platform === 'win32'

  if (isWindows) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    for (const letter of letters) {
      const driveRoot = `${letter}:\\`
      try {
        fs.accessSync(driveRoot, fs.constants.R_OK)
        let totalSize = 0
        let freeSize = 0
        let isAccessible = true

        try {
          const statFs = fs.statfsSync(driveRoot)
          totalSize = statFs.blocks * statFs.bsize
          freeSize = statFs.bavail * statFs.bsize
        } catch {
          // Drive might be a CD-ROM or restricted
        }

        // Standard Windows drive type inference
        let driveType: DriveType = 'fixed'
        if (letter === 'A' || letter === 'B') {
          driveType = 'removable'
        }

        volumes.push({
          driveLetter: driveRoot,
          label: `Local Disk (${letter}:)`,
          fileSystem: 'NTFS',
          totalSizeBytes: totalSize,
          freeSizeBytes: freeSize,
          isAccessible,
          driveType
        })
      } catch {
        // Drive does not exist or is not mounted
      }
    }
  } else {
    // Unix fallback
    try {
      const statFs = fs.statfsSync('/')
      volumes.push({
        driveLetter: '/',
        label: 'Root Filesystem',
        fileSystem: 'ext4',
        totalSizeBytes: statFs.blocks * statFs.bsize,
        freeSizeBytes: statFs.bavail * statFs.bsize,
        isAccessible: true,
        driveType: 'fixed'
      })
    } catch {
      // Ignored
    }
  }

  return volumes
}

/**
 * Discovers accessible filesystem roots and categorizes them
 */
export async function discoverScanRoots(
  scopePreset: ScanScopePreset = 'user_profile'
): Promise<DiscoveredRoot[]> {
  const roots: DiscoveredRoot[] = []
  const userProfile = process.env.USERPROFILE || os.homedir()

  const candidateRoots: {
    id: string
    name: string
    path: string
    category: RootCategory
  }[] = [
    {
      id: 'root-user-profile',
      name: 'User Profile',
      path: userProfile,
      category: 'user_profile'
    },
    {
      id: 'root-desktop',
      name: 'Desktop',
      path: path.join(userProfile, 'Desktop'),
      category: 'desktop'
    },
    {
      id: 'root-documents',
      name: 'Documents',
      path: path.join(userProfile, 'Documents'),
      category: 'documents'
    },
    {
      id: 'root-downloads',
      name: 'Downloads',
      path: path.join(userProfile, 'Downloads'),
      category: 'downloads'
    },
    {
      id: 'root-pictures',
      name: 'Pictures',
      path: path.join(userProfile, 'Pictures'),
      category: 'pictures'
    },
    {
      id: 'root-videos',
      name: 'Videos',
      path: path.join(userProfile, 'Videos'),
      category: 'videos'
    },
    {
      id: 'root-local-appdata',
      name: 'Local AppData',
      path: process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local'),
      category: 'local_appdata'
    },
    {
      id: 'root-roaming-appdata',
      name: 'Roaming AppData',
      path: process.env.APPDATA || path.join(userProfile, 'AppData', 'Roaming'),
      category: 'roaming_appdata'
    }
  ]

  // Add system / program roots if on Windows
  if (process.platform === 'win32') {
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files'
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    const progData = process.env.ProgramData || 'C:\\ProgramData'

    candidateRoots.push(
      {
        id: 'root-program-files',
        name: 'Program Files',
        path: progFiles,
        category: 'program_files'
      },
      {
        id: 'root-program-files-x86',
        name: 'Program Files (x86)',
        path: progFilesX86,
        category: 'program_files_x86'
      },
      {
        id: 'root-program-data',
        name: 'ProgramData',
        path: progData,
        category: 'program_data'
      }
    )
  }

  // Also include discovered volumes
  const volumes = await discoverVolumes()
  for (const vol of volumes) {
    candidateRoots.push({
      id: `root-vol-${vol.driveLetter.replace(/[^a-zA-Z0-9]/g, '')}`,
      name: `${vol.label} [${vol.driveLetter}]`,
      path: vol.driveLetter,
      category: 'volume'
    })
  }

  // Check accessibility and default selection for each candidate
  for (const cand of candidateRoots) {
    const normalized = normalizePath(cand.path)
    let isAccessible = false
    let status: 'available' | 'inaccessible' | 'skipped_by_policy' = 'inaccessible'
    let reason: string | undefined

    try {
      fs.accessSync(normalized, fs.constants.R_OK)
      isAccessible = true
      status = 'available'
    } catch (err: unknown) {
      reason = err instanceof Error ? err.message : 'Path cannot be accessed'
      status = 'inaccessible'
    }

    // Determine if default selected based on scopePreset
    let isDefaultSelected = false
    if (isAccessible) {
      switch (scopePreset) {
        case 'user_profile':
          isDefaultSelected = [
            'user_profile',
            'desktop',
            'documents',
            'downloads',
            'pictures',
            'videos'
          ].includes(cand.category)
          break
        case 'applications':
          isDefaultSelected = [
            'program_files',
            'program_files_x86',
            'program_data',
            'local_appdata',
            'roaming_appdata'
          ].includes(cand.category)
          break
        case 'system_drives':
          isDefaultSelected = cand.category === 'volume' && cand.path.toUpperCase().startsWith('C:')
          break
        case 'custom':
          isDefaultSelected = cand.category === 'user_profile'
          break
      }
    }

    roots.push({
      id: cand.id,
      path: normalized,
      name: cand.name,
      category: cand.category,
      isAccessible,
      isDefaultSelected,
      status,
      reason
    })
  }

  return roots
}
