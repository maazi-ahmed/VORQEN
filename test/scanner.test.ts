import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

import {
  classifyFile,
  FileInventoryEngine
} from '../src/main/services/scanner/fileInventory.ts'
import {
  isPathExcluded,
  normalizePath,
  discoverScanRoots
} from '../src/main/services/scanner/systemDiscovery.ts'
import {
  parseRegQueryOutput,
  WindowsApplicationDiscoveryProvider
} from '../src/main/services/scanner/applicationDiscovery.ts'
import {
  evaluateFileAssociation,
  associateApplicationsWithFiles
} from '../src/main/services/scanner/applicationAssociation.ts'
import { buildApplicationReport } from '../src/main/services/scanner/reportBuilder.ts'
import {
  FileInventoryRecord,
  InstalledApplication,
  ScanSummary
} from '../src/shared/types.ts'

test('Full System Discovery & Intelligence Engine Test Suite', async (t) => {
  // Setup temporary test sandbox
  const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'vorqen-test-'))

  t.after(async () => {
    try {
      await fsPromises.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignored
    }
  })

  // Test 1: Recursive discovery in a temporary directory tree & Test 2: Correct metadata extraction
  await t.test('1 & 2: Recursive discovery & metadata extraction in directory tree', async () => {
    const subDirA = path.join(tempDir, 'subA')
    const subDirB = path.join(tempDir, 'subA', 'subB')
    await fsPromises.mkdir(subDirB, { recursive: true })

    const sampleFile1 = path.join(tempDir, 'doc1.pdf')
    const sampleFile2 = path.join(subDirB, 'binary.exe')
    await fsPromises.writeFile(sampleFile1, 'Hello PDF file content')
    await fsPromises.writeFile(sampleFile2, Buffer.from([0x4d, 0x5a, 0x90, 0x00]))

    const engine = new FileInventoryEngine()
    const result = await engine.scanDirectoryTree(
      tempDir,
      { includeHidden: true },
      {
        isCancelled: () => false,
        onBatchDiscovered: () => {},
        onProgress: () => {},
        onError: () => {}
      }
    )

    assert.ok(result.files.length >= 2, 'Should discover at least 2 files')
    assert.ok(result.directories.length >= 2, 'Should discover directories')

    const pdfRecord = result.files.find((f) => f.name === 'doc1.pdf')
    assert.ok(pdfRecord, 'Should find doc1.pdf')
    assert.equal(pdfRecord.classification, 'document')
    assert.equal(pdfRecord.extension, '.pdf')
    assert.ok(pdfRecord.sizeBytes > 0)
    assert.ok(pdfRecord.createdAt)
    assert.ok(pdfRecord.modifiedAt)

    const exeRecord = result.files.find((f) => f.name === 'binary.exe')
    assert.ok(exeRecord, 'Should find binary.exe')
    assert.equal(exeRecord.classification, 'executable')
  })

  // Test 3: Hidden files when supported
  await t.test('3: Hidden files when supported vs ignored', async () => {
    const hiddenDir = path.join(tempDir, 'hidden-test')
    await fsPromises.mkdir(hiddenDir, { recursive: true })
    const hiddenFile = path.join(hiddenDir, '.env.secret')
    const normalFile = path.join(hiddenDir, 'regular.txt')
    await fsPromises.writeFile(hiddenFile, 'SECRET=123')
    await fsPromises.writeFile(normalFile, 'Normal content')

    // Scan with includeHidden = false
    const engineNoHidden = new FileInventoryEngine()
    const resultNoHidden = await engineNoHidden.scanDirectoryTree(
      hiddenDir,
      { includeHidden: false },
      {
        isCancelled: () => false,
        onBatchDiscovered: () => {},
        onProgress: () => {},
        onError: () => {}
      }
    )
    assert.ok(!resultNoHidden.files.some((f) => f.name === '.env.secret'), 'Hidden file should be ignored')
    assert.ok(resultNoHidden.files.some((f) => f.name === 'regular.txt'), 'Regular file should be present')

    // Scan with includeHidden = true
    const engineWithHidden = new FileInventoryEngine()
    const resultWithHidden = await engineWithHidden.scanDirectoryTree(
      hiddenDir,
      { includeHidden: true },
      {
        isCancelled: () => false,
        onBatchDiscovered: () => {},
        onProgress: () => {},
        onError: () => {}
      }
    )
    assert.ok(resultWithHidden.files.some((f) => f.name === '.env.secret'), 'Hidden file should be included')
    const secretRec = resultWithHidden.files.find((f) => f.name === '.env.secret')
    assert.equal(secretRec?.isHidden, true)
  })

  // Test 4: Files with no extension and multiple dots in their names
  await t.test('4: Files with no extension and multiple dots in name', async () => {
    const multiDotDir = path.join(tempDir, 'multidot')
    await fsPromises.mkdir(multiDotDir, { recursive: true })
    const noExtFile = path.join(multiDotDir, 'LICENSE')
    const multiDotFile = path.join(multiDotDir, 'archive.tar.gz')
    const dotInMiddleFile = path.join(multiDotDir, 'app.v1.0.2.config')

    await fsPromises.writeFile(noExtFile, 'MIT License')
    await fsPromises.writeFile(multiDotFile, 'tar archive')
    await fsPromises.writeFile(dotInMiddleFile, 'debug=true')

    const engine = new FileInventoryEngine()
    const result = await engine.scanDirectoryTree(
      multiDotDir,
      {},
      {
        isCancelled: () => false,
        onBatchDiscovered: () => {},
        onProgress: () => {},
        onError: () => {}
      }
    )

    const noExtRec = result.files.find((f) => f.name === 'LICENSE')
    assert.ok(noExtRec)
    assert.equal(noExtRec.extension, '')

    const multiDotRec = result.files.find((f) => f.name === 'archive.tar.gz')
    assert.ok(multiDotRec)
    assert.equal(multiDotRec.extension, '.gz')
    assert.equal(multiDotRec.classification, 'archive')

    const configRec = result.files.find((f) => f.name === 'app.v1.0.2.config')
    assert.ok(configRec)
    assert.equal(configRec.classification, 'configuration')
  })

  // Test 5: Empty directories
  await t.test('5: Empty directory handling', async () => {
    const emptyDir = path.join(tempDir, 'emptyFolder')
    await fsPromises.mkdir(emptyDir, { recursive: true })

    const engine = new FileInventoryEngine()
    const result = await engine.scanDirectoryTree(
      emptyDir,
      {},
      {
        isCancelled: () => false,
        onBatchDiscovered: () => {},
        onProgress: () => {},
        onError: () => {}
      }
    )

    assert.equal(result.files.length, 0, 'No files in empty folder')
    assert.equal(result.directories.length, 1, 'One directory recorded')
    assert.equal(result.directories[0].childFileCount, 0)
    assert.equal(result.directories[0].childDirCount, 0)
    assert.equal(result.directories[0].aggregatedSizeBytes, 0)
  })

  // Test 6 & 7: Permission or simulated access errors & disappearing files
  await t.test('6 & 7: Non-fatal error isolation on missing or inaccessible paths', async () => {
    const errorsLogged: string[] = []
    const engine = new FileInventoryEngine()

    // Non-existent path
    const nonExistentPath = path.join(tempDir, 'does-not-exist-' + Date.now())
    const result = await engine.scanDirectoryTree(
      nonExistentPath,
      {},
      {
        isCancelled: () => false,
        onBatchDiscovered: () => {},
        onProgress: () => {},
        onError: (p, err) => {
          errorsLogged.push(`${p}: ${err}`)
        }
      }
    )

    assert.equal(result.files.length, 0)
    assert.ok(errorsLogged.length > 0, 'Should isolate and report error without crashing process')
  })

  // Test 8: Cancellation
  await t.test('8: Cancellation token interrupts traversal cleanly', async () => {
    const cancelDir = path.join(tempDir, 'cancel-test')
    for (let i = 0; i < 20; i++) {
      const folder = path.join(cancelDir, `dir_${i}`)
      await fsPromises.mkdir(folder, { recursive: true })
      await fsPromises.writeFile(path.join(folder, `file_${i}.txt`), 'data')
    }

    let visits = 0
    let cancelled = false

    const engine = new FileInventoryEngine()
    const result = await engine.scanDirectoryTree(
      cancelDir,
      { maxConcurrency: 1 },
      {
        isCancelled: () => {
          visits++
          if (visits >= 5) {
            cancelled = true
            return true
          }
          return false
        },
        onBatchDiscovered: () => {},
        onProgress: () => {},
        onError: () => {}
      }
    )

    assert.ok(cancelled, 'Cancellation token was triggered')
    assert.ok(result.files.length < 20, 'Should stop before discovering all 20 files')
  })


  // Test 9: Symbolic-link / junction loop protection
  await t.test('9: Loop protection prevents circular traversals', async () => {
    const loopDir = path.join(tempDir, 'loop-test')
    const targetDir = path.join(loopDir, 'target')
    await fsPromises.mkdir(targetDir, { recursive: true })
    await fsPromises.writeFile(path.join(targetDir, 'real.txt'), 'hello')

    const linkPath = path.join(targetDir, 'circularLink')
    try {
      // Create symlink pointing back to loopDir
      await fsPromises.symlink(loopDir, linkPath, 'junction')
    } catch {
      // On Windows non-admin symlink might fail without Developer Mode
    }

    const engine = new FileInventoryEngine()
    const result = await engine.scanDirectoryTree(
      loopDir,
      {},
      {
        isCancelled: () => false,
        onBatchDiscovered: () => {},
        onProgress: () => {},
        onError: () => {}
      }
    )

    // Should complete cleanly without hanging in an infinite loop
    assert.ok(result.files.length >= 1)
  })

  // Test 10: Size aggregation & statistics
  await t.test('10: Size aggregation and folder statistics calculate accurately', async () => {
    const statsDir = path.join(tempDir, 'stats-test')
    await fsPromises.mkdir(statsDir, { recursive: true })

    const f1 = path.join(statsDir, 'f1.bin')
    const f2 = path.join(statsDir, 'f2.bin')
    await fsPromises.writeFile(f1, Buffer.alloc(1000))
    await fsPromises.writeFile(f2, Buffer.alloc(2500))

    const engine = new FileInventoryEngine()
    const result = await engine.scanDirectoryTree(
      statsDir,
      {},
      {
        isCancelled: () => false,
        onBatchDiscovered: () => {},
        onProgress: () => {},
        onError: () => {}
      }
    )

    const stats = engine.getStats()
    assert.equal(stats.files, 2)
    assert.equal(stats.totalBytes, 3500)
    assert.equal(result.directories[0].aggregatedSizeBytes, 3500)
  })

  // Test 11: Application record normalization and deduplication
  await t.test('11: Application record normalization and deduplication', () => {
    const rawRegistrySnippet = `
HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Git_is1
    DisplayName    REG_SZ    Git
    DisplayVersion    REG_SZ    2.42.0
    Publisher    REG_SZ    The Git Development Community
    InstallLocation    REG_SZ    C:\\Program Files\\Git\\
    UninstallString    REG_SZ    "C:\\Program Files\\Git\\unins001.exe"

HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Security Update (KB500123)
    DisplayName    REG_SZ    Security Update for Windows (KB500123)
    Publisher    REG_SZ    Microsoft Corporation
    SystemComponent    REG_DWORD    0x1
`
    const apps = parseRegQueryOutput(rawRegistrySnippet, 'registry_hklm64')
    assert.equal(apps.length, 2)

    const gitApp = apps.find((a) => a.displayName === 'Git')
    assert.ok(gitApp)
    assert.equal(gitApp.displayVersion, '2.42.0')
    assert.equal(gitApp.isSystemComponent, false)

    const kbApp = apps.find((a) => a.displayName.includes('KB500123'))
    assert.ok(kbApp)
    assert.equal(kbApp.isSystemComponent, true)

    // Deduplication test
    const provider = new WindowsApplicationDiscoveryProvider()
    const duplicateList: InstalledApplication[] = [
      gitApp,
      {
        ...gitApp,
        id: 'dup_git_32',
        discoverySource: 'registry_hklm32'
      }
    ]
    const deduped = provider.deduplicateApplications(duplicateList)
    assert.equal(deduped.length, 1, 'Should merge duplicate applications with identical install location')
  })

  // Test 12: Association evidence and uncertainty handling
  await t.test('12: Association evidence and confidence scoring', () => {
    const testApp: InstalledApplication = {
      id: 'app_git_test',
      displayName: 'Git',
      publisher: 'Git Community',
      displayVersion: '2.40.0',
      installLocation: 'C:\\Program Files\\Git',
      executablePath: 'C:\\Program Files\\Git\\bin\\git.exe',
      discoverySource: 'registry_hklm64',
      isSystemComponent: false,
      isPortable: false
    }

    const appDataRoots = {
      localAppData: 'C:\\Users\\Test\\AppData\\Local',
      roamingAppData: 'C:\\Users\\Test\\AppData\\Roaming',
      programData: 'C:\\ProgramData'
    }

    // Direct installation file
    const fileInRoot: FileInventoryRecord = {
      id: 'f1',
      path: 'C:\\Program Files\\Git\\cmd\\git.exe',
      parentPath: 'C:\\Program Files\\Git\\cmd',
      name: 'git.exe',
      extension: '.exe',
      sizeBytes: 50000,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      classification: 'executable',
      isHidden: false,
      isSymlink: false,
      status: 'ok'
    }

    const assocDirect = evaluateFileAssociation(fileInRoot, testApp, appDataRoots)
    assert.ok(assocDirect)
    assert.equal(assocDirect.category, 'direct_installation')
    assert.equal(assocDirect.confidenceTier, 'high')
    assert.equal(assocDirect.relationship, 'direct')

    // AppData Cache file
    const fileInCache: FileInventoryRecord = {
      id: 'f2',
      path: 'C:\\Users\\Test\\AppData\\Local\\Git\\Cache\\data.bin',
      parentPath: 'C:\\Users\\Test\\AppData\\Local\\Git\\Cache',
      name: 'data.bin',
      extension: '.bin',
      sizeBytes: 12000,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      classification: 'data',
      isHidden: false,
      isSymlink: false,
      status: 'ok'
    }

    const assocCache = evaluateFileAssociation(fileInCache, testApp, appDataRoots)
    assert.ok(assocCache)
    assert.equal(assocCache.category, 'application_cache')
    assert.equal(assocCache.confidenceTier, 'medium')
    assert.equal(assocCache.relationship, 'inferred')

    // Unrelated file
    const fileUnrelated: FileInventoryRecord = {
      id: 'f3',
      path: 'C:\\Users\\Test\\Documents\\project.docx',
      parentPath: 'C:\\Users\\Test\\Documents',
      name: 'project.docx',
      extension: '.docx',
      sizeBytes: 8000,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      classification: 'document',
      isHidden: false,
      isSymlink: false,
      status: 'ok'
    }

    const assocUnrelated = evaluateFileAssociation(fileUnrelated, testApp, appDataRoots)
    assert.equal(assocUnrelated, null, 'Unrelated file must not be associated')
  })

  // Test 13: Partial versus complete report status
  await t.test('13: Accurate reporting of complete vs partial / incomplete coverage', () => {
    const testApp: InstalledApplication = {
      id: 'app_vscode',
      displayName: 'VSCode',
      publisher: 'Microsoft',
      displayVersion: '1.85',
      installLocation: 'C:\\Program Files\\Microsoft VS Code',
      discoverySource: 'registry_hklm64',
      isSystemComponent: false,
      isPortable: false
    }

    const fileMap = new Map<string, FileInventoryRecord>()

    // Case A: Scanned roots DID NOT include the app installation root
    const partialSummary: ScanSummary = {
      scanId: 's1',
      state: 'completed',
      startTime: 1000,
      endTime: 2000,
      durationMs: 1000,
      totalFiles: 10,
      totalDirs: 2,
      totalSizeBytes: 5000,
      totalAppsDiscovered: 1,
      isCancelled: false,
      coverageStatus: 'partial',
      diagnostics: {
        inaccessiblePaths: [],
        skippedRoots: [],
        failedMetadataReads: [],
        warnings: []
      },
      rootsSummary: {
        scanned: ['C:\\Users\\Test\\Documents'],
        skipped: [],
        inaccessible: []
      }
    }

    const reportIncomplete = buildApplicationReport(testApp, [], fileMap, partialSummary)
    assert.equal(
      reportIncomplete.coverageStatus,
      'incomplete',
      'Should flag coverage as incomplete when install directory was not scanned'
    )

    // Case B: Scanned roots DID include the app installation root
    const completeSummary: ScanSummary = {
      ...partialSummary,
      rootsSummary: {
        scanned: ['C:\\Program Files\\Microsoft VS Code'],
        skipped: [],
        inaccessible: []
      }
    }

    const reportComplete = buildApplicationReport(testApp, [], fileMap, completeSummary)
    assert.equal(reportComplete.coverageStatus, 'complete', 'Should flag as complete when install root was scanned')
  })

  // Test 14: Path exclusions & normalization
  await t.test('14: Path exclusion rules protect dangerous namespaces', () => {
    assert.equal(isPathExcluded('C:\\$Recycle.Bin\\file.txt'), true)
    assert.equal(isPathExcluded('C:\\System Volume Information\\catalog'), true)
    assert.equal(isPathExcluded('C:\\pagefile.sys'), true)
    assert.equal(isPathExcluded('C:\\Users\\NormalUser\\Desktop\\file.txt'), false)
  })

  // Test 15: Root discovery categorization
  await t.test('15: Scan roots discovery returns categorized roots', async () => {
    const roots = await discoverScanRoots('user_profile')
    assert.ok(roots.length > 0)
    assert.ok(roots.some((r) => r.category === 'user_profile'))
    assert.ok(roots.some((r) => r.category === 'desktop'))
  })
})
