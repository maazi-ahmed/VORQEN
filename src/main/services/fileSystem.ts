import fs from 'fs/promises'
import path from 'path'
import { FolderItem, FolderStats } from '../../shared/types'

export async function inspectFolder(targetPath: string): Promise<FolderStats> {
  const stat = await fs.stat(targetPath)
  if (!stat.isDirectory()) {
    throw new Error('Target path is not a directory')
  }

  const folderName = path.basename(targetPath) || targetPath
  const entries = await fs.readdir(targetPath, { withFileTypes: true })

  let totalFiles = 0
  let totalDirs = 0
  let totalSizeBytes = 0
  const items: FolderItem[] = []

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name)
    try {
      const entryStat = await fs.stat(fullPath)
      const isDir = entry.isDirectory()
      const sizeBytes = isDir ? 0 : entryStat.size
      const extension = isDir ? '' : path.extname(entry.name).toLowerCase()

      if (isDir) {
        totalDirs += 1
      } else {
        totalFiles += 1
        totalSizeBytes += sizeBytes
      }

      items.push({
        name: entry.name,
        path: fullPath,
        isDir,
        sizeBytes,
        extension,
        modifiedAt: entryStat.mtime.toISOString()
      })
    } catch {
      // Skip files that cannot be accessed due to system locks / permissions
    }
  }

  // Sort: directories first, then alphabetically
  items.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1
    if (!a.isDir && b.isDir) return 1
    return a.name.localeCompare(b.name)
  })

  return {
    path: targetPath,
    name: folderName,
    totalFiles,
    totalDirs,
    totalSizeBytes,
    items
  }
}
