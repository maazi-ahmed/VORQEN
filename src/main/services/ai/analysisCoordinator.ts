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
import { AIProvider, GeminiAIProvider } from './aiProvider'

import { analysisStorage, AnalysisStorageService } from './analysisStorage'
import { extractFileContent, isFormatSupported } from './contentExtractor'

export class AnalysisCoordinator {
  private currentJobId: string | null = null
  private jobState: AnalysisJobState = 'idle'
  private isCancelled = false
  private abortController: AbortController | null = null

  private provider: AIProvider
  private customApiKey?: string
  private customModel = 'gemma-4-31b-it'
  private userConsentGranted = false
  private storage: AnalysisStorageService

  constructor(customStorage?: AnalysisStorageService) {
    this.storage = customStorage || analysisStorage

    // Auto-load API key from environment if present
    const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || ''
    this.provider = new GeminiAIProvider(envKey, this.customModel)
  }

  public getSettings(): AISettings {
    const hasEnvKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY)
    const hasKey = Boolean(this.customApiKey || hasEnvKey)

    return {
      provider: 'gemini',
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
      if (this.provider instanceof GeminiAIProvider) {
        this.provider.setApiKey(this.customApiKey)
      }
    }

    if (typeof settings.model === 'string' && settings.model.trim().length > 0) {
      this.customModel = settings.model.trim()
      if (this.provider instanceof GeminiAIProvider) {
        this.provider.setModel(this.customModel)
      }
    }

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

    this.userConsentGranted = true

    // Retrieve file inventory from Feature 1
    const { items: allFiles } = scanCoordinator.getFiles(options.scanId, 0, 5000)
    if (allFiles.length === 0) {
      return {
        started: false,
        jobId: '',
        error: 'No files found in scan inventory. Please perform a System Discovery scan first.'
      }
    }

    // Filter eligible files
    let candidates: FileInventoryRecord[] = []
    if (options.selectedFileIds && options.selectedFileIds.length > 0) {
      const idSet = new Set(options.selectedFileIds)
      candidates = allFiles.filter((f) => idSet.has(f.id))
    } else {
      candidates = allFiles
    }

    // Filter by supported format and valid status
    const eligibleFiles = candidates.filter(
      (f) => f.status === 'ok' && isFormatSupported(f.path)
    )

    if (eligibleFiles.length === 0) {
      return {
        started: false,
        jobId: '',
        error: 'No eligible text or document files found matching supported formats.'
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
            currentStage: `Extracting content: ${file.name}`,
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
          const extraction = await extractFileContent(file.path)

          if (extraction.status !== 'success') {
            processedCount++
            failedCount++
            errors.push({ filePath: file.path, error: extraction.errorMessage || extraction.status })

            const failedRecord: FileAnalysisRecord = {
              fileId: file.id,
              filePath: file.path,
              fileName: file.name,
              fileSizeBytes: file.sizeBytes,
              fileModifiedAt: file.modifiedAt,
              primaryCategory: 'Unknown',
              description: `Extraction failed: ${extraction.errorMessage || extraction.status}`,
              confidence: 0,
              confidenceLabel: 'Unknown',
              evidence: [],
              extractionStatus: extraction.status,
              analysisStatus: 'failed',
              modelUsed: 'none',
              promptVersion: 'none',
              analyzedAt: new Date().toISOString(),
              errorMessage: extraction.errorMessage || extraction.status
            }

            await this.storage.saveRecord(failedRecord)
            return
          }

          // Step 2: AI Classification & Summarization
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

            const record: FileAnalysisRecord = {
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

            await this.storage.saveRecord(record)

            processedCount++
            successCount++
            categoryDistribution[aiResult.primaryCategory] =
              (categoryDistribution[aiResult.primaryCategory] || 0) + 1
          } catch (err: unknown) {
            processedCount++
            failedCount++
            const errMsg = err instanceof Error ? err.message : 'AI classification failed'
            errors.push({ filePath: file.path, error: errMsg })

            const errorRecord: FileAnalysisRecord = {
              fileId: file.id,
              filePath: file.path,
              fileName: file.name,
              fileSizeBytes: file.sizeBytes,
              fileModifiedAt: file.modifiedAt,
              primaryCategory: 'Unknown',
              description: `AI inference failed: ${errMsg}`,
              confidence: 0,
              confidenceLabel: 'Unknown',
              evidence: [],
              extractedSnippet: extraction.text.slice(0, 300),
              extractionStatus: 'success',
              analysisStatus: 'failed',
              modelUsed: 'error',
              promptVersion: 'error',
              analyzedAt: new Date().toISOString(),
              errorMessage: errMsg
            }

            await this.storage.saveRecord(errorRecord)
          }
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
