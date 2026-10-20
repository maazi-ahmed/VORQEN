import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import {
  DirectoryInventoryRecord,
  FileClassification,
  FileInventoryRecord
} from '../../../shared/types'
import { isPathExcluded, normalizePath } from './systemDiscovery'

// Helper for classifying file types based on extension hints
export function classifyFile(ext: string, name: string): FileClassification {
  const cleanExt = ext.toLowerCase()
  const lowerName = name.toLowerCase()

  if (['.exe', '.msi', '.cmd', '.bat', '.ps1', '.vbs', '.app', '.com'].includes(cleanExt)) {
    return 'executable'
  }
  if (['.dll', '.so', '.dylib', '.sys', '.drv', '.node', '.ocx'].includes(cleanExt)) {
    return 'library'
  }
  if (
    [
      '.txt',
      '.pdf',
      '.docx',
      '.doc',
      '.xlsx',
      '.xls',
      '.pptx',
      '.ppt',
      '.csv',
      '.rtf',
      '.odt',
      '.md'
    ].includes(cleanExt)
  ) {
    return 'document'
  }
  if (
    [
      '.json',
      '.xml',
      '.yaml',
      '.yml',
      '.ini',
      '.conf',
      '.config',
      '.toml',
      '.properties',
      '.env'
    ].includes(cleanExt) ||
    lowerName === 'config' ||
    lowerName === 'settings'
  ) {
    return 'configuration'
  }
  if (['.db', '.sqlite', '.sqlite3', '.dat', '.bin', '.mdb', '.parquet', '.bak'].includes(cleanExt)) {
    return 'data'
  }
  if (
    ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso', '.cab', '.tgz'].includes(cleanExt)
  ) {
    return 'archive'
  }
  if (
    [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.svg',
      '.webp',
      '.bmp',
      '.ico',
      '.mp4',
      '.mkv',
      '.avi',
      '.mov',
      '.mp3',
      '.wav',
      '.flac',
      '.ogg',
      '.webm'
    ].includes(cleanExt)
  ) {
    return 'media'
  }
  if (
    [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.py',
      '.java',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.cs',
      '.go',
      '.rs',
      '.php',
      '.rb',
      '.html',
      '.css',
      '.scss'
    ].includes(cleanExt)
  ) {
    return 'code'
  }
  if (['.log', '.trace', '.etl'].includes(cleanExt) || lowerName.endsWith('.log')) {
    return 'log'
  }

  return 'other'
}

export interface InventoryScanHooks {
  isCancelled: () => boolean
  onBatchDiscovered: (files: FileInventoryRecord[], dirs: DirectoryInventoryRecord[]) => void
  onProgress: (currentDir: string, filesCount: number, dirsCount: number, totalBytes: number) => void
  onError: (path: string, error: string, phase: 'dir_open' | 'stat') => void
}

export interface InventoryScanOptions {
  includeHidden?: boolean
  maxConcurrency?: number
  customExclusions?: string[]
}

/**
 * Robust recursive directory walker with loop protection, bounded concurrency,
 * cancellation support, and non-fatal error isolation.
 */
export class FileInventoryEngine {
  private visitedRealPaths = new Set<string>()
  private fileCounter = 0
  private dirCounter = 0
  private totalDiscoveredBytes = 0

  public async scanDirectoryTree(
    rootPath: string,
    options: InventoryScanOptions,
    hooks: InventoryScanHooks
  ): Promise<{
    files: FileInventoryRecord[]
    directories: DirectoryInventoryRecord[]
  }> {
    const normalizedRoot = normalizePath(rootPath)
    const allFiles: FileInventoryRecord[] = []
    const allDirectories: DirectoryInventoryRecord[] = []

    // Verify root is accessible
    try {
      const rootStat = await fsPromises.stat(normalizedRoot)
      if (!rootStat.isDirectory()) {
        hooks.onError(normalizedRoot, 'Root path is not a directory', 'dir_open')
        return { files: [], directories: [] }
      }
    } catch (err: unknown) {
      hooks.onError(
        normalizedRoot,
        err instanceof Error ? err.message : 'Cannot access root',
        'dir_open'
      )
      return { files: [], directories: [] }
    }

    // Work queue of directory paths to visit
    const queue: string[] = [normalizedRoot]
    const maxConcurrency = Math.max(1, Math.min(options.maxConcurrency || 8, 32))

    let pendingFilesBatch: FileInventoryRecord[] = []
    let pendingDirsBatch: DirectoryInventoryRecord[] = []
    let lastFlushTime = Date.now()

    const flushBatches = () => {
      if (pendingFilesBatch.length > 0 || pendingDirsBatch.length > 0) {
        hooks.onBatchDiscovered(pendingFilesBatch, pendingDirsBatch)
        pendingFilesBatch = []
        pendingDirsBatch = []
      }
      hooks.onProgress(
        queue[0] || normalizedRoot,
        this.fileCounter,
        this.dirCounter,
        this.totalDiscoveredBytes
      )
      lastFlushTime = Date.now()
    }

    while (queue.length > 0) {
      if (hooks.isCancelled()) {
        break
      }

      // Dequeue a batch of directories up to maxConcurrency
      const currentBatch = queue.splice(0, maxConcurrency)

      await Promise.all(
        currentBatch.map(async (dirPath) => {
          if (hooks.isCancelled()) return

          // Prevent infinite loops and link traversal
          try {
            const realPath = await fsPromises.realpath(dirPath)
            if (this.visitedRealPaths.has(realPath)) {
              return
            }
            this.visitedRealPaths.add(realPath)
          } catch {
            // Realpath might fail on long paths or locked folders; continue carefully
          }

          let dirEntries: fs.Dirent[] = []
          try {
            dirEntries = await fsPromises.readdir(dirPath, { withFileTypes: true })
          } catch (err: unknown) {
            hooks.onError(
              dirPath,
              err instanceof Error ? err.message : 'Permission denied / unreadable',
              'dir_open'
            )
            return
          }

          let childFileCount = 0
          let childDirCount = 0
          let aggregatedDirSize = 0

          for (const entry of dirEntries) {
            if (hooks.isCancelled()) break

            const fullPath = normalizePath(path.join(dirPath, entry.name))
            const isDotHidden = entry.name.startsWith('.')

            // Skip if hidden files not included
            if (isDotHidden && !options.includeHidden) {
              continue
            }

            // Exclude dangerous / system files
            if (isPathExcluded(fullPath, options.customExclusions)) {
              continue
            }

            // Detect symlinks or reparse points
            const isSymlink = entry.isSymbolicLink()
            const isDirectory = entry.isDirectory()

            if (isDirectory) {
              childDirCount += 1
              this.dirCounter += 1

              // Never follow symlinks/junctions into recursive loops
              if (!isSymlink) {
                queue.push(fullPath)
              }
            } else {
              childFileCount += 1
              this.fileCounter += 1

              try {
                // Use lstat to inspect entry without following target link
                const stat = await fsPromises.lstat(fullPath)
                const sizeBytes = stat.size
                aggregatedDirSize += sizeBytes
                this.totalDiscoveredBytes += sizeBytes

                const ext = path.extname(entry.name).toLowerCase()
                const classification = classifyFile(ext, entry.name)

                const record: FileInventoryRecord = {
                  id: `f_${this.fileCounter}_${Buffer.from(fullPath).toString('base64url').slice(-12)}`,
                  path: fullPath,
                  parentPath: dirPath,
                  name: entry.name,
                  extension: ext,
                  sizeBytes,
                  createdAt: stat.birthtime?.toISOString() || new Date(0).toISOString(),
                  modifiedAt: stat.mtime?.toISOString() || new Date(0).toISOString(),
                  accessedAt: stat.atime?.toISOString(),
                  classification,
                  isHidden: isDotHidden,
                  isSymlink,
                  status: 'ok'
                }

                pendingFilesBatch.push(record)
                allFiles.push(record)
              } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : 'Failed to read file stat'
                hooks.onError(fullPath, errMsg, 'stat')

                const failedRecord: FileInventoryRecord = {
                  id: `f_err_${this.fileCounter}`,
                  path: fullPath,
                  parentPath: dirPath,
                  name: entry.name,
                  extension: path.extname(entry.name).toLowerCase(),
                  sizeBytes: 0,
                  createdAt: new Date(0).toISOString(),
                  modifiedAt: new Date(0).toISOString(),
                  classification: 'other',
                  isHidden: isDotHidden,
                  isSymlink,
                  status: 'error',
                  errorMessage: errMsg
                }

                pendingFilesBatch.push(failedRecord)
                allFiles.push(failedRecord)
              }
            }
          }

          const dirRecord: DirectoryInventoryRecord = {
            path: dirPath,
            parentPath: path.dirname(dirPath),
            name: path.basename(dirPath) || dirPath,
            childFileCount,
            childDirCount,
            aggregatedSizeBytes: aggregatedDirSize,
            traversalStatus: 'completed'
          }

          pendingDirsBatch.push(dirRecord)
          allDirectories.push(dirRecord)

          // Throttle batch flushes
          if (
            pendingFilesBatch.length >= 250 ||
            pendingDirsBatch.length >= 50 ||
            Date.now() - lastFlushTime > 200
          ) {
            flushBatches()
          }
        })
      )
    }

    // Final flush
    flushBatches()

    return { files: allFiles, directories: allDirectories }
  }

  public getStats() {
    return {
      files: this.fileCounter,
      directories: this.dirCounter,
      totalBytes: this.totalDiscoveredBytes
    }
  }
}
