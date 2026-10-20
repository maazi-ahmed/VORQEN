import fsPromises from 'fs/promises'
import path from 'path'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import { ExtractionStatus } from '../../../shared/types'


export interface ExtractedContent {
  status: ExtractionStatus
  text: string
  characterCount: number
  isTruncated: boolean
  errorMessage?: string
}

export interface ExtractionOptions {
  maxFileSizeBytes?: number
  maxCharacters?: number
}

// Supported plain text and code extensions
const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.log',
  '.json',
  '.csv',
  '.tsv',
  '.xml',
  '.yaml',
  '.yml',
  '.html',
  '.htm',
  '.ini',
  '.conf',
  '.config',
  '.env',
  '.toml',
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
  '.css',
  '.scss',
  '.sql',
  '.sh',
  '.bat',
  '.ps1'
])

export const DEFAULT_MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15MB
export const DEFAULT_MAX_EXTRACTED_CHARS = 12000 // 12k chars

/**
 * Checks whether an extension is supported for content extraction
 */
export function isFormatSupported(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.pdf' || ext === '.docx' || TEXT_EXTENSIONS.has(ext)
}

/**
 * Sanitizes extracted content to mitigate prompt-injection attempts inside user documents
 */
export function sanitizeDocumentText(rawText: string): string {
  if (!rawText) return ''

  // Replace null bytes and non-printable control characters except standard whitespace
  let clean = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')

  // Neutralize common prompt injection patterns by escaping or marking them
  clean = clean.replace(/(\n|^)\s*(ignore\s+(all\s+)?(previous|prior)\s+instructions)/gi, '$1[Document text attempt: $2]')
  clean = clean.replace(/(\n|^)\s*(system\s*:)/gi, '$1[Document-label: sys:]')
  clean = clean.replace(/(\n|^)\s*(assistant\s*:)/gi, '$1[Document-label: asst:]')

  return clean.trim()
}

/**
 * Extracts text content from a file safely without executing it
 */
export async function extractFileContent(
  filePath: string,
  options: ExtractionOptions = {}
): Promise<ExtractedContent> {
  const maxBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES
  const maxChars = options.maxCharacters ?? DEFAULT_MAX_EXTRACTED_CHARS

  try {
    const stat = await fsPromises.stat(filePath)

    if (stat.isDirectory()) {
      return {
        status: 'error',
        text: '',
        characterCount: 0,
        isTruncated: false,
        errorMessage: 'Path is a directory, not a file'
      }
    }

    if (stat.size === 0) {
      return {
        status: 'empty',
        text: '',
        characterCount: 0,
        isTruncated: false
      }
    }

    if (stat.size > maxBytes) {
      return {
        status: 'too_large',
        text: '',
        characterCount: 0,
        isTruncated: false,
        errorMessage: `File size (${(stat.size / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${(maxBytes / (1024 * 1024)).toFixed(0)}MB`
      }
    }

    const ext = path.extname(filePath).toLowerCase()

    // 1. PDF Documents
    if (ext === '.pdf') {
      try {
        const buffer = await fsPromises.readFile(filePath)
        const parser = new (PDFParse as any)({ data: buffer })
        await parser.load()
        const pdfData = await parser.getText()
        const rawText = pdfData?.text || ''
        await parser.destroy()
        const sanitized = sanitizeDocumentText(rawText)


        if (!sanitized) {
          return { status: 'empty', text: '', characterCount: 0, isTruncated: false }
        }

        const isTruncated = sanitized.length > maxChars
        const text = isTruncated ? sanitized.slice(0, maxChars) : sanitized

        return {
          status: 'success',
          text,
          characterCount: text.length,
          isTruncated
        }
      } catch (err: unknown) {
        return {
          status: 'corrupted',
          text: '',
          characterCount: 0,
          isTruncated: false,
          errorMessage: err instanceof Error ? err.message : 'Corrupted or password-protected PDF'
        }
      }
    }

    // 2. DOCX Word Documents
    if (ext === '.docx') {
      try {
        const buffer = await fsPromises.readFile(filePath)
        const result = await mammoth.extractRawText({ buffer })
        const rawText = result.value || ''
        const sanitized = sanitizeDocumentText(rawText)

        if (!sanitized) {
          return { status: 'empty', text: '', characterCount: 0, isTruncated: false }
        }

        const isTruncated = sanitized.length > maxChars
        const text = isTruncated ? sanitized.slice(0, maxChars) : sanitized

        return {
          status: 'success',
          text,
          characterCount: text.length,
          isTruncated
        }
      } catch (err: unknown) {
        return {
          status: 'corrupted',
          text: '',
          characterCount: 0,
          isTruncated: false,
          errorMessage: err instanceof Error ? err.message : 'Failed to parse DOCX archive'
        }
      }
    }

    // 3. Text & Code Formats
    if (TEXT_EXTENSIONS.has(ext)) {
      try {
        // Read directly with utf-8 encoding
        const rawText = await fsPromises.readFile(filePath, { encoding: 'utf-8' })
        const sanitized = sanitizeDocumentText(rawText)

        if (!sanitized) {
          return { status: 'empty', text: '', characterCount: 0, isTruncated: false }
        }

        const isTruncated = sanitized.length > maxChars
        const text = isTruncated ? sanitized.slice(0, maxChars) : sanitized

        return {
          status: 'success',
          text,
          characterCount: text.length,
          isTruncated
        }
      } catch (err: unknown) {
        return {
          status: 'error',
          text: '',
          characterCount: 0,
          isTruncated: false,
          errorMessage: err instanceof Error ? err.message : 'Encoding or read failure'
        }
      }
    }

    // 4. Unsupported Format
    return {
      status: 'unsupported_format',
      text: '',
      characterCount: 0,
      isTruncated: false,
      errorMessage: `Unsupported file extension (${ext || 'no extension'})`
    }
  } catch (err: unknown) {
    return {
      status: 'error',
      text: '',
      characterCount: 0,
      isTruncated: false,
      errorMessage: err instanceof Error ? err.message : 'File access error'
    }
  }
}
