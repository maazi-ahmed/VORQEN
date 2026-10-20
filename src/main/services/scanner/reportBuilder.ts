import {
  ApplicationInspectionReport,
  AssociationCategory,
  FileAssociation,
  FileInventoryRecord,
  InstalledApplication,
  ScanSummary
} from '../../../shared/types'
import { normalizePath } from './systemDiscovery'


/**
 * Builds an evidence-backed Application Inspection Report for a selected application
 */
export function buildApplicationReport(
  app: InstalledApplication,
  associations: FileAssociation[],
  filesMap: Map<string, FileInventoryRecord>,
  scanSummary: ScanSummary | null
): ApplicationInspectionReport {
  let totalSizeBytes = 0
  const categoryCounts = new Map<AssociationCategory, { count: number; bytes: number }>()
  const dirSummaries = new Map<
    string,
    { count: number; bytes: number; category: AssociationCategory }
  >()

  const associatedFilesWithEvidence: (FileInventoryRecord & { association: FileAssociation })[] = []

  for (const assoc of associations) {
    const file = filesMap.get(assoc.filePath)
    if (!file) continue

    const size = file.sizeBytes || 0
    totalSizeBytes += size

    // Category aggregation
    const catEntry = categoryCounts.get(assoc.category) || { count: 0, bytes: 0 }
    catEntry.count += 1
    catEntry.bytes += size
    categoryCounts.set(assoc.category, catEntry)

    // Directory aggregation
    const dir = file.parentPath
    const dirEntry = dirSummaries.get(dir) || { count: 0, bytes: 0, category: assoc.category }
    dirEntry.count += 1
    dirEntry.bytes += size
    dirSummaries.set(dir, dirEntry)

    associatedFilesWithEvidence.push({
      ...file,
      association: assoc
    })
  }

  // Format category breakdown list
  const categoryBreakdown = Array.from(categoryCounts.entries()).map(([category, stats]) => ({
    category,
    fileCount: stats.count,
    totalSizeBytes: stats.bytes
  }))

  // Format directory summary list, sorted by size descending
  const directorySummary = Array.from(dirSummaries.entries())
    .map(([directoryPath, stats]) => ({
      directoryPath,
      fileCount: stats.count,
      totalSizeBytes: stats.bytes,
      category: stats.category
    }))
    .sort((a, b) => b.totalSizeBytes - a.totalSizeBytes)

  // Sort associated files by size descending
  associatedFilesWithEvidence.sort((a, b) => b.sizeBytes - a.sizeBytes)

  // Assess coverage: check if app install directory was included in scanned roots
  let coverageStatus: 'complete' | 'partial' | 'incomplete' = 'complete'
  const unresolvedLocations: string[] = []
  const missingMetadata: string[] = []
  const inaccessibleLocations: string[] = []
  const uncertainLocations: string[] = []

  if (!app.installLocation) {
    missingMetadata.push('Installation location not registered in operating system metadata')
    coverageStatus = 'partial'
  } else {
    // Check if install location was actually scanned
    const normInstall = normalizePath(app.installLocation)
    const wasScanned = scanSummary?.rootsSummary.scanned.some((root) => {
      const normRoot = normalizePath(root)
      return normInstall.startsWith(normRoot) || normRoot.startsWith(normInstall)
    })

    if (!wasScanned) {
      unresolvedLocations.push(
        `Installation directory (${app.installLocation}) was not included in the selected scan scope.`
      )
      coverageStatus = 'incomplete'
    }
  }

  // Check diagnostics from scan summary
  if (scanSummary?.diagnostics.inaccessiblePaths && scanSummary.diagnostics.inaccessiblePaths.length > 0) {
    for (const inacc of scanSummary.diagnostics.inaccessiblePaths) {
      if (app.installLocation && inacc.path.startsWith(app.installLocation)) {
        inaccessibleLocations.push(inacc.path)
        coverageStatus = 'partial'
      }
    }
  }

  // Collect uncertain file locations
  for (const item of associatedFilesWithEvidence) {
    if (item.association.confidenceTier === 'uncertain' || item.association.confidenceTier === 'low') {
      uncertainLocations.push(item.path)
    }
  }

  // Coverage notes
  let scanCoverageNotes =
    coverageStatus === 'complete'
      ? 'All expected application installation and user data directories were accessible and inspected.'
      : coverageStatus === 'partial'
        ? 'Some files or directories were inaccessible due to system locks, permissions, or were outside current scope.'
        : 'The application installation directory was outside the selected scan roots. Results represent only inferred files.'

  return {
    application: app,
    coverageStatus,
    totalAssociatedFiles: associatedFilesWithEvidence.length,
    totalAssociatedSizeBytes: totalSizeBytes,
    categoryBreakdown,
    directorySummary,
    associatedFiles: associatedFilesWithEvidence,
    inaccessibleLocations,
    uncertainLocations,
    diagnostics: {
      unresolvedLocations,
      missingMetadata,
      scanCoverageNotes
    }
  }
}
