import { Archive, Bookmark, Eye, FileArchive, FileCode2, FileText, Folder, FolderOpen, Cpu, Database, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { FileHit } from "@/lib/assistant";
import { cn } from "@/lib/utils";

import { Btn, Chip, IconTile, type Tone } from "./primitives";

const kindIcon = {
  pdf: FileText,
  code: FileCode2,
  data: Database,
  archive: FileArchive,
  folder: Folder,
  binary: Cpu,
};
const kindTone: Record<FileHit["kind"], Tone> = {
  pdf: "danger",
  code: "primary",
  data: "success",
  archive: "warning",
  folder: "primary",
  binary: "neutral",
};

const compatChip: Record<FileHit["compat"], { tone: Tone; label: string }> = {
  safe: { tone: "success", label: "Safe for Ubuntu/Fedora" },
  review: { tone: "warning", label: "Review before migration" },
  blocked: { tone: "danger", label: "Windows-only" },
};

export function FileHitCard({ file, compact }: { file: FileHit; compact?: boolean }) {
  const c = compatChip[file.compat];
  return (
    <div className="well group p-3 transition-colors hover:border-primary/30">
      <div className="flex items-start gap-3">
        <IconTile icon={kindIcon[file.kind]} tone={kindTone[file.kind]} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="truncate text-[14px] font-medium text-foreground">{file.name}</p>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {file.size} • {file.date}
            </span>
          </div>
          <p className="mono truncate text-[11px] text-subtle">{file.path}</p>
          <p className="mt-1.5 flex gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
            <span className={cn(compact && "line-clamp-2")}>{file.summary}</span>
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone={c.tone} size="xs" dot>
            {c.label}
          </Chip>
          {!compact &&
            file.tags.map((t) => (
              <Chip key={t} size="xs">
                {t}
              </Chip>
            ))}
        </div>
        <div className="flex items-center gap-1">
          <Btn size="xs" variant="ghost" icon={Eye} onClick={() => toast(`Opening ${file.name}`)}>
            Open File
          </Btn>
          {!compact && (
            <Btn size="xs" variant="ghost" icon={FolderOpen} onClick={() => toast(`Revealing ${file.path}`)}>
              View Folder
            </Btn>
          )}
          <Btn size="xs" variant="soft-success" icon={Bookmark} onClick={() => toast.success(`${file.name} marked as Keep`)}>
            Keep
          </Btn>
          <Btn size="xs" variant="soft-primary" icon={Archive} onClick={() => toast(`${file.name} staged for archive`, { description: "Nothing is moved until you approve the batch." })}>
            Archive
          </Btn>
        </div>
      </div>
    </div>
  );
}
