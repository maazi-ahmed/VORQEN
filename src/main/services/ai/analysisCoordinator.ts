import fs from 'fs'
import path from 'path'
import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import {
  AISettings,
  AnalysisJobOptions,
  AnalysisJobProgress,
  AnalysisJobState,
  AnalysisJobSummary,
  FileAnalysisRecord,
  FileInventoryRecord
} from '../../../shared/types'
import { scanCoordinator } from '../scanner/scanCoordinator'
import { AIProvider, createAIProvider, classifyByMetadataAndPath } from './aiProvider'

import { analysisStorage, AnalysisStorageService } from './analysisStorage'
import { extractFileContent, isFormatSupported } from './contentExtractor'

/**
 * Direct file traversal for target folders when not yet in Feature 1 scan inventory
 */
async function listFilesInDirectory(dirPath: string, maxFiles = 3000): Promise<FileInventoryRecord[]> {
  const records: FileInventoryRecord[] = []
  async function walk(curr: string) {
    if (records.length >= maxFiles) return
    try {
      const entries = await fs.promises.readdir(curr, { withFileTypes: true })
      for (const ent of entries) {
        if (records.length >= maxFiles) break
        const full = path.join(curr, ent.name)
        if (ent.isDirectory()) {
          if (!ent.name.startsWith('.') && ent.name !== 'node_modules') {
            await walk(full)
          }
        } else if (ent.isFile()) {
          try {
            const stat = await fs.promises.stat(full)
            records.push({
              id: Buffer.from(full).toString('base64').slice(0, 24),
              path: full,
              parentPath: curr,
              name: ent.name,
              extension: path.extname(ent.name).toLowerCase(),
              sizeBytes: stat.size,
              createdAt: stat.birthtime.toISOString(),
              modifiedAt: stat.mtime.toISOString(),
              accessedAt: stat.atime.toISOString(),
              classification: 'other',
              status: 'ok',
              isSymlink: false,
              isHidden: ent.name.startsWith('.')
            })
          } catch {
            // ignore inaccessible file
          }
        }
      }
    } catch {
      // ignore directory access error
    }
  }

  await walk(dirPath)
  return records
}

export class AnalysisCoordinator {
  private currentJobId: string | null = null
  private jobState: AnalysisJobState = 'idle'
  private isCancelled = false
  private abortController: AbortController | null = null

  private provider: AIProvider
  private customApiKey?: string
  private customModel = 'google/gemma-4-31b-it:free'
  private userConsentGranted = false
  private storage: AnalysisStorageService

  constructor(customStorage?: AnalysisStorageService) {
    this.storage = customStorage || analysisStorage

    const key = this.getEffectiveApiKey()
    if (key.startsWith('sk-or-')) {
      this.customModel = 'google/gemma-4-31b-it:free'
    } else if (key) {
      this.customModel = 'gemma-4-31b-it'
    }

    this.provider = createAIProvider(key, this.customModel)
  }

  public getEffectiveApiKey(): string {
    if (this.customApiKey) return this.customApiKey

    let envKey =
      process.env.OPENROUTER_API_KEY ||
      process.env.AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      ''

    if (!envKey) {
      try {
        const envPath = path.resolve(process.cwd(), '.env')
        if (fs.existsSync(envPath)) {
          const raw = fs.readFileSync(envPath, 'utf8')
          for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) continue
            const eq = trimmed.indexOf('=')
            if (eq > 0) {
              const k = trimmed.slice(0, eq).trim()
              const v = trimmed.slice(eq + 1).trim()
              if (
                k === 'OPENROUTER_API_KEY' ||
                k === 'AI_API_KEY' ||
                k === 'GEMINI_API_KEY' ||
                k === 'GOOGLE_AI_API_KEY'
              ) {
                process.env[k] = v
                if (!envKey) envKey = v
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return envKey
  }

  public getSettings(): AISettings {
    const effectiveKey = this.getEffectiveApiKey()
    const hasKey = Boolean(effectiveKey)
    const isOr = effectiveKey.startsWith('sk-or-')

    return {
      provider: isOr ? 'openrouter' : 'gemini',
      apiKeyConfigured: hasKey,
      model: this.customModel,
      consentGranted: this.userConsentGranted
    }
  }

  public updateSettings(settings: Partial<AISettings> & { apiKey?: string }): {
    success: boolean
    error?: string
  } {
    if (typeof settings.apiKey === 'string') {
      this.customApiKey = settings.apiKey.trim()
    }

    if (typeof settings.model === 'string' && settings.model.trim().length > 0) {
      this.customModel = settings.model.trim()
    }

    const envKey =
      process.env.OPENROUTER_API_KEY ||
      process.env.AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      ''
    const effectiveKey = this.customApiKey || envKey

    // Recreate or update provider
    this.provider = createAIProvider(effectiveKey, this.customModel)

    if (typeof settings.consentGranted === 'boolean') {
      this.userConsentGranted = settings.consentGranted
    }

    return { success: true }
  }

  public setProvider(provider: AIProvider): void {
    this.provider = provider
  }

  public async testConnection(): Promise<{ ok: boolean; message: string; models?: string[] }> {
    return this.provider.testConnection()
  }

  /**
   * Starts semantic understanding & classification job
   */
  public async startAnalysis(
    window: BrowserWindow,
    options: AnalysisJobOptions
  ): Promise<{ started: boolean; jobId: string; error?: string }> {
    if (this.jobState === 'extracting' || this.jobState === 'analyzing') {
      return {
        started: false,
        jobId: this.currentJobId || '',
        error: 'An analysis job is already in progress. Please cancel or wait for it to finish.'
      }
    }

    if (!options.userConsentGiven && !this.userConsentGranted) {
      return {
        started: false,
        jobId: '',
        error: 'User consent is required before sending document contents for AI analysis.'
      }
    }

    const apiKey = this.getEffectiveApiKey()
    if (!apiKey) {
      return {
        started: false,
        jobId: '',
        error: 'No AI API Key is configured. Please click "AI Settings" to enter your key or configure OPENROUTER_API_KEY in .env.'
      }
    }

    // Refresh provider
    this.provider = createAIProvider(apiKey, this.customModel)

    this.userConsentGranted = true

    // Retrieve file inventory from Feature 1
    let { items: allFiles } = scanCoordinator.getFiles(options.scanId, 0, 10000)

    // Direct folder classification fallback if targetFolder selected but not in scan inventory
    if (options.targetFolder && options.targetFolder !== 'all') {
      const normTarget = path.normalize(options.targetFolder).toLowerCase()
      const matching = allFiles.filter((f) => path.normalize(f.path).toLowerCase().startsWith(normTarget))
      if (matching.length === 0 && fs.existsSync(options.targetFolder)) {
        allFiles = await listFilesInDirectory(options.targetFolder)
      }
    }

    if (allFiles.length === 0) {
      return {
        started: false,
        jobId: '',
        error: options.targetFolder
          ? `No files found in folder "${options.targetFolder}".`
          : 'No files found in scan inventory. Please perform a System Discovery scan or select a folder.'
      }
    }

    // Filter eligible files
    let candidates: FileInventoryRecord[] = allFiles

    // Folder Filter: If user selected a specific target folder
    if (options.targetFolder && options.targetFolder !== 'all') {
      const normTarget = path.normalize(options.targetFolder).toLowerCase()
      candidates = candidates.filter((f) => {
        const normPath = path.normalize(f.path).toLowerCase()
        return normPath.startsWith(normTarget)
      })
    }

    if (options.selectedFileIds && options.selectedFileIds.length > 0) {
      const idSet = new Set(options.selectedFileIds)
      candidates = candidates.filter((f) => idSet.has(f.id))
    }

    // Candidate files with status ok
    const eligibleFiles = candidates.filter((f) => f.status === 'ok')

    if (eligibleFiles.length === 0) {
      return {
        started: false,
        jobId: '',
        error: options.targetFolder && options.targetFolder !== 'all'
          ? `No accessible files found in folder: ${options.targetFolder}`
          : 'No accessible files found in scan inventory.'
      }
    }

    const jobId = `ai_job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    this.currentJobId = jobId
    this.isCancelled = false
    this.abortController = new AbortController()

    // Execute job asynchronously in background
    this.executeAnalysisPipeline(window, jobId, eligibleFiles, options).catch((err) => {
      console.error('Analysis pipeline fatal error:', err)
      this.jobState = 'failed'
    })

    return { started: true, jobId }
  }

  public cancelAnalysis(jobId: string): { cancelled: boolean } {
    if (this.currentJobId === jobId && (this.jobState === 'extracting' || this.jobState === 'analyzing')) {
      this.isCancelled = true
      this.jobState = 'cancelled'
      this.abortController?.abort()
      return { cancelled: true }
    }
    return { cancelled: false }
  }

  public getResults(
    offset = 0,
    limit = 100,
    category = 'all',
    query = ''
  ): { items: FileAnalysisRecord[]; total: number } {
    let records = this.storage.getAllRecords()

    if (category !== 'all') {
      records = records.filter((r) => r.primaryCategory === category)
    }

    if (query) {
      const q = query.toLowerCase()
      records = records.filter(
        (r) =>
          r.fileName.toLowerCase().includes(q) ||
          r.filePath.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.summary && r.summary.toLowerCase().includes(q))
      )
    }

    const total = records.length
    const items = records.slice(offset, offset + limit)

    return { items, total }
  }

  /**
   * Internal pipeline execution
   */
  private async executeAnalysisPipeline(
    window: BrowserWindow,
    jobId: string,
    files: FileInventoryRecord[],
    options: AnalysisJobOptions
  ): Promise<void> {
    const startTime = Date.now()
    this.jobState = 'preparing'
    await this.storage.initialize()

    let processedCount = 0
    let successCount = 0
    let failedCount = 0
    let skippedCount = 0
    const errors: { filePath: string; error: string }[] = []
    const categoryDistribution: Record<string, number> = {}

    this.emitProgress(window, {
      jobId,
      state: 'preparing',
      totalEligible: files.length,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      currentFileName: '',
      currentStage: 'Preparing files for analysis...',
      elapsedMs: 0
    })

    const concurrency = Math.max(1, Math.min(options.maxConcurrency || 3, 5))
    const queue = [...files]

    while (queue.length > 0) {
      if (this.isCancelled) break

      const batch = queue.splice(0, concurrency)

      await Promise.all(
        batch.map(async (file) => {
          if (this.isCancelled) return

          this.jobState = 'extracting'
          this.emitProgress(window, {
            jobId,
            state: 'extracting',
            totalEligible: files.length,
            processedCount,
            successCount,
            failedCount,
            skippedCount,
            currentFileName: file.name,
            currentStage: `Inspecting: ${file.name}`,
            elapsedMs: Date.now() - startTime
          })

          // Check incremental caching
          if (
            !options.forceReanalyze &&
            this.storage.isFileUnchanged(file.path, file.sizeBytes, file.modifiedAt)
          ) {
            processedCount++
            skippedCount++
            const cached = this.storage.getRecord(file.path)!
            categoryDistribution[cached.primaryCategory] =
              (categoryDistribution[cached.primaryCategory] || 0) + 1
            return
          }

          // Step 1: Content Extraction
          const extraction = isFormatSupported(file.path)
            ? await extractFileContent(file.path)
            : { status: 'unsupported_format' as const, text: '', characterCount: 0, isTruncated: false }

          let record: FileAnalysisRecord

          if (extraction.status === 'success' && extraction.text.trim().length > 0) {
            // Content is readable: Execute AI Classification!
            this.jobState = 'analyzing'
            this.emitProgress(window, {
              jobId,
              state: 'analyzing',
              totalEligible: files.length,
              processedCount,
              successCount,
              failedCount,
              skippedCount,
              currentFileName: file.name,
              currentStage: `AI Semantic Classification: ${file.name}`,
              elapsedMs: Date.now() - startTime
            })

            try {
              const aiResult = await this.provider.classifyAndSummarize({
                fileName: file.name,
                extension: file.extension,
                fileSizeBytes: file.sizeBytes,
                extractedText: extraction.text,
                generateSummary: options.generateSummaries,
                signal: this.abortController?.signal
              })

              record = {
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                fileSizeBytes: file.sizeBytes,
                fileModifiedAt: file.modifiedAt,
                primaryCategory: aiResult.primaryCategory,
                secondaryCategories: aiResult.secondaryCategories,
                summary: aiResult.summary,
                description: aiResult.description,
                detectedLanguage: aiResult.detectedLanguage,
                confidence: aiResult.confidence,
                confidenceLabel: aiResult.confidenceLabel,
                evidence: aiResult.evidence,
                extractedSnippet: extraction.text.slice(0, 300),
                extractionStatus: 'success',
                analysisStatus: 'success',
                modelUsed: aiResult.modelUsed,
                promptVersion: aiResult.promptVersion,
                analyzedAt: new Date().toISOString(),
                tokensUsed: aiResult.tokensUsed
              }

              processedCount++
              successCount++
              categoryDistribution[aiResult.primaryCategory] =
                (categoryDistribution[aiResult.primaryCategory] || 0) + 1
            } catch (aiErr: unknown) {
              // Individual AI request error: Fallback to filename & folder classification
              const fallback = classifyByMetadataAndPath(file.name, file.path, file.sizeBytes)
              record = {
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                fileSizeBytes: file.sizeBytes,
                fileModifiedAt: file.modifiedAt,
                primaryCategory: fallback.primaryCategory,
                secondaryCategories: fallback.secondaryCategories,
                description: fallback.description,
                confidence: fallback.confidence,
                confidenceLabel: 'Estimated',
                evidence: [
                  `Classified from file name and directory context (AI fallback: ${aiErr instanceof Error ? aiErr.message : 'transient error'})`,
                  ...fallback.evidence
                ],
                extractionStatus: 'success',
                analysisStatus: 'success',
                modelUsed: 'name-folder-fallback',
                promptVersion: 'v1.0-fallback',
                analyzedAt: new Date().toISOString()
              }

              processedCount++
              successCount++
              categoryDistribution[fallback.primaryCategory] =
                (categoryDistribution[fallback.primaryCategory] || 0) + 1
            }
          } else {
            // Cannot extract text content (binary, empty, unsupported, or too large):
            // Fallback starting from the name and folder path!
            const fallback = classifyByMetadataAndPath(file.name, file.path, file.sizeBytes)
            record = {
              fileId: file.id,
              filePath: file.path,
              fileName: file.name,
              fileSizeBytes: file.sizeBytes,
              fileModifiedAt: file.modifiedAt,
              primaryCategory: fallback.primaryCategory,
              secondaryCategories: fallback.secondaryCategories,
              description: fallback.description,
              confidence: fallback.confidence,
              confidenceLabel: 'Estimated',
              evidence: [
                `Classified from file name and folder path (${extraction.status})`,
                ...fallback.evidence
              ],
              extractionStatus: extraction.status,
              analysisStatus: 'success',
              modelUsed: 'name-folder-classifier',
              promptVersion: 'v1.0-metadata',
              analyzedAt: new Date().toISOString()
            }

            processedCount++
            successCount++
            categoryDistribution[fallback.primaryCategory] =
              (categoryDistribution[fallback.primaryCategory] || 0) + 1
          }

          await this.storage.saveRecord(record)
        })
      )
    }

    const endTime = Date.now()
    const finalState: 'completed' | 'cancelled' | 'failed' = this.isCancelled ? 'cancelled' : 'completed'
    this.jobState = finalState

    const summary: AnalysisJobSummary = {
      jobId,
      state: finalState,
      startTime,
      endTime,
      durationMs: endTime - startTime,
      totalEligible: files.length,
      successCount,
      failedCount,
      skippedCount,
      categoryDistribution,
      errors
    }

    this.emitProgress(window, {
      jobId,
      state: finalState,
      totalEligible: files.length,
      processedCount,
      successCount,
      failedCount,
      skippedCount,
      currentFileName: '',
      currentStage: this.isCancelled ? 'Analysis cancelled by user' : 'Analysis job completed',
      elapsedMs: endTime - startTime
    })

    this.emitCompleted(window, summary)
  }

  private emitProgress(window: BrowserWindow, payload: AnalysisJobProgress): void {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.ON_AI_PROGRESS, payload)
    }
  }

  private emitCompleted(window: BrowserWindow, summary: AnalysisJobSummary): void {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.ON_AI_COMPLETED, summary)
    }
  }
}

export const analysisCoordinator = new AnalysisCoordinator()
