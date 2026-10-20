import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import os from 'os'
import { app } from 'electron'
import { FileAnalysisRecord } from '../../../shared/types'

export class AnalysisStorageService {
  private filePath: string
  private cache = new Map<string, FileAnalysisRecord>()
  private isLoaded = false

  constructor(customStoragePath?: string) {
    if (customStoragePath) {
      this.filePath = customStoragePath
    } else {
      let userDataDir: string
      try {
        userDataDir = app?.getPath('userData') || path.join(os.homedir(), '.vorqen')
      } catch {
        userDataDir = path.join(os.homedir(), '.vorqen')
      }
      this.filePath = path.join(userDataDir, 'analysis_store.json')
    }
  }

  public async initialize(): Promise<void> {
    if (this.isLoaded) return

    try {
      const dir = path.dirname(this.filePath)
      await fsPromises.mkdir(dir, { recursive: true })

      if (fs.existsSync(this.filePath)) {
        const raw = await fsPromises.readFile(this.filePath, 'utf-8')
        const items: FileAnalysisRecord[] = JSON.parse(raw)
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.fileId) {
              this.cache.set(item.fileId, item)
              // Also map by path for fast lookups
              this.cache.set(item.filePath, item)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to initialize analysis storage:', err)
    } finally {
      this.isLoaded = true
    }
  }

  public getRecord(fileIdOrPath: string): FileAnalysisRecord | undefined {
    return this.cache.get(fileIdOrPath)
  }

  /**
   * Checks if a file is unchanged since last analysis
   */
  public isFileUnchanged(
    fileIdOrPath: string,
    currentSizeBytes: number,
    currentModifiedAt: string
  ): boolean {
    const existing = this.getRecord(fileIdOrPath)
    if (!existing || existing.analysisStatus !== 'success') {
      return false
    }

    return (
      existing.fileSizeBytes === currentSizeBytes &&
      existing.fileModifiedAt === currentModifiedAt
    )
  }

  public async saveRecord(record: FileAnalysisRecord): Promise<void> {
    await this.initialize()
    this.cache.set(record.fileId, record)
    this.cache.set(record.filePath, record)
    await this.persist()
  }

  public async saveBatch(records: FileAnalysisRecord[]): Promise<void> {
    await this.initialize()
    for (const r of records) {
      this.cache.set(r.fileId, r)
      this.cache.set(r.filePath, r)
    }
    await this.persist()
  }

  public getAllRecords(): FileAnalysisRecord[] {
    // Deduplicate between fileId and filePath entries
    const seen = new Set<string>()
    const result: FileAnalysisRecord[] = []

    for (const record of this.cache.values()) {
      if (!seen.has(record.fileId)) {
        seen.add(record.fileId)
        result.push(record)
      }
    }

    return result
  }

  public async clear(): Promise<void> {
    this.cache.clear()
    await this.persist()
  }

  private async persist(): Promise<void> {
    try {
      const records = this.getAllRecords()
      const dir = path.dirname(this.filePath)
      await fsPromises.mkdir(dir, { recursive: true })
      await fsPromises.writeFile(this.filePath, JSON.stringify(records, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to write analysis store:', err)
    }
  }
}

export const analysisStorage = new AnalysisStorageService()
