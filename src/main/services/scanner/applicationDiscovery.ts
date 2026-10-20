import { execFile } from 'child_process'
import path from 'path'
import fs from 'fs'
import {
  AppDiscoverySource,
  InstalledApplication
} from '../../../shared/types'
import { normalizePath } from './systemDiscovery'

export interface ApplicationDiscoveryProvider {
  discoverApplications(): Promise<InstalledApplication[]>
}

/**
 * Parses raw stdout from Windows reg.exe query
 */
export function parseRegQueryOutput(
  rawText: string,
  source: AppDiscoverySource
): InstalledApplication[] {
  const apps: InstalledApplication[] = []
  if (!rawText) return apps

  // Split by registry key sections
  const sections = rawText.split(/\r?\n\r?\n/)

  for (const section of sections) {
    const lines = section.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length === 0) continue

    const keyLine = lines[0].trim()
    if (!keyLine.startsWith('HKEY_')) continue

    const values: Record<string, string> = {}

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      // Format: <ValueName>    REG_<TYPE>    <ValueData>
      const match = line.match(/^([^\t]+?)\s+(REG_[A-Z0-9_]+)\s*(.*)$/)
      if (match) {
        const valName = match[1].trim()
        const valData = match[3] ? match[3].trim() : ''
        values[valName] = valData
      }
    }

    const displayName = values['DisplayName']
    if (!displayName) {
      // Keys without DisplayName are usually internal installer GUIDs or subcomponents
      continue
    }

    // Check if flagged as a Windows system component or hotfix
    const isSystemComponent =
      values['SystemComponent'] === '0x1' ||
      values['SystemComponent'] === '1' ||
      Boolean(values['ParentKeyName']) ||
      displayName.startsWith('Security Update') ||
      displayName.startsWith('Update for Windows') ||
      displayName.startsWith('Hotfix')

    let installLocation = values['InstallLocation'] || ''
    if (installLocation) {
      installLocation = normalizePath(installLocation.replace(/^"|"$/g, ''))
    }

    const displayIcon = values['DisplayIcon'] ? values['DisplayIcon'].replace(/^"|"$/g, '') : undefined
    let executablePath: string | undefined

    // Attempt to infer executable path from displayIcon or installLocation if it points to an .exe
    if (displayIcon && displayIcon.toLowerCase().endsWith('.exe')) {
      const cleanIconPath = displayIcon.split(',')[0].trim()
      if (fs.existsSync(cleanIconPath)) {
        executablePath = normalizePath(cleanIconPath)
      }
    }

    // Generate unique stable app ID
    const keyId = path.basename(keyLine)
    const id = `app_${Buffer.from(`${source}_${keyId}_${displayName}`).toString('base64url').slice(0, 24)}`

    apps.push({
      id,
      displayName,
      publisher: values['Publisher'] || 'Unknown Publisher',
      displayVersion: values['DisplayVersion'] || 'Unspecified',
      installLocation,
      uninstallString: values['UninstallString'] || undefined,
      displayIcon,
      installDate: values['InstallDate'] || undefined,
      executablePath,
      discoverySource: source,
      isSystemComponent,
      isPortable: false
    })
  }

  return apps
}

/**
 * Executes reg.exe query safely without shell
 */
function queryRegistryKey(
  hivePath: string,
  viewFlag?: '/reg:64' | '/reg:32'
): Promise<string> {
  return new Promise((resolve) => {
    const args = ['query', hivePath, '/s']
    if (viewFlag) {
      args.push(viewFlag)
    }

    execFile('reg.exe', args, { maxBuffer: 10 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
      if (err) {
        // Non-zero exit code usually means key does not exist or has no entries
        resolve('')
        return
      }
      resolve(stdout || '')
    })
  })
}

/**
 * Windows-specific installed application discovery provider
 */
export class WindowsApplicationDiscoveryProvider implements ApplicationDiscoveryProvider {
  public async discoverApplications(): Promise<InstalledApplication[]> {
    const isWindows = process.platform === 'win32'
    if (!isWindows) {
      return []
    }

    const hklmPath = 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
    const hkcuPath = 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'

    const [hklm64Raw, hklm32Raw, hkcuRaw] = await Promise.all([
      queryRegistryKey(hklmPath, '/reg:64'),
      queryRegistryKey(hklmPath, '/reg:32'),
      queryRegistryKey(hkcuPath)
    ])

    const apps64 = parseRegQueryOutput(hklm64Raw, 'registry_hklm64')
    const apps32 = parseRegQueryOutput(hklm32Raw, 'registry_hklm32')
    const appsUser = parseRegQueryOutput(hkcuRaw, 'registry_hkcu')

    // Discover portable applications in %LOCALAPPDATA%\Programs
    const portableApps = await this.discoverPortableApplications()

    const rawList = [...apps64, ...apps32, ...appsUser, ...portableApps]

    // Deduplicate applications: match on normalized install location or display name + publisher
    return this.deduplicateApplications(rawList)
  }

  /**
   * Discover applications installed into per-user directories like %LOCALAPPDATA%\Programs
   */
  private async discoverPortableApplications(): Promise<InstalledApplication[]> {
    const portableApps: InstalledApplication[] = []
    const localAppData = process.env.LOCALAPPDATA
    if (!localAppData) return portableApps

    const programsDir = path.join(localAppData, 'Programs')
    try {
      if (fs.existsSync(programsDir)) {
        const subDirs = await fs.promises.readdir(programsDir, { withFileTypes: true })
        for (const sub of subDirs) {
          if (sub.isDirectory()) {
            const appPath = path.join(programsDir, sub.name)
            const id = `portable_${Buffer.from(appPath).toString('base64url').slice(0, 24)}`

            // Check if there's an exe inside
            let mainExe: string | undefined
            try {
              const files = await fs.promises.readdir(appPath)
              const exes = files.filter((f) => f.toLowerCase().endsWith('.exe'))
              if (exes.length > 0) {
                mainExe = path.join(appPath, exes[0])
              }
            } catch {
              // Ignore
            }

            portableApps.push({
              id,
              displayName: sub.name,
              publisher: 'User Installed / Portable',
              displayVersion: 'Portable',
              installLocation: normalizePath(appPath),
              executablePath: mainExe ? normalizePath(mainExe) : undefined,
              discoverySource: 'user_portable',
              isSystemComponent: false,
              isPortable: true
            })
          }
        }
      }
    } catch {
      // Ignored
    }

    return portableApps
  }

  /**
   * Deduplicates applications by install location or (name + publisher)
   */
  public deduplicateApplications(apps: InstalledApplication[]): InstalledApplication[] {
    const seenByLocation = new Map<string, InstalledApplication>()
    const seenByNameAndVersion = new Map<string, InstalledApplication>()
    const result: InstalledApplication[] = []

    for (const app of apps) {
      const locKey = app.installLocation ? app.installLocation.toLowerCase().trim() : ''
      const nameKey = `${app.displayName.toLowerCase().trim()}::${app.displayVersion.toLowerCase().trim()}`

      if (locKey && seenByLocation.has(locKey)) {
        // Already registered with this exact install directory, merge metadata if richer
        const existing = seenByLocation.get(locKey)!
        if (!existing.executablePath && app.executablePath) {
          existing.executablePath = app.executablePath
        }
        if (!existing.installDate && app.installDate) {
          existing.installDate = app.installDate
        }
        continue
      }

      if (seenByNameAndVersion.has(nameKey)) {
        const existing = seenByNameAndVersion.get(nameKey)!
        // If one has an install location and other doesn't, prefer the one with install location
        if (!existing.installLocation && app.installLocation) {
          existing.installLocation = app.installLocation
          existing.executablePath = app.executablePath || existing.executablePath
        }
        continue
      }

      if (locKey) {
        seenByLocation.set(locKey, app)
      }
      seenByNameAndVersion.set(nameKey, app)
      result.push(app)
    }

    // Sort alphabetically by displayName
    result.sort((a, b) => a.displayName.localeCompare(b.displayName))

    return result
  }
}

/**
 * Fallback application discovery provider for non-Windows platforms
 */
export class GenericApplicationDiscoveryProvider implements ApplicationDiscoveryProvider {
  public async discoverApplications(): Promise<InstalledApplication[]> {
    return []
  }
}

export function getApplicationDiscoveryProvider(): ApplicationDiscoveryProvider {
  if (process.platform === 'win32') {
    return new WindowsApplicationDiscoveryProvider()
  }
  return new GenericApplicationDiscoveryProvider()
}
