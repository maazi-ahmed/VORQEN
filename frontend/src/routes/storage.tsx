import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Copy,
  FileCheck,
  GitBranch,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  Btn,
  Check2,
  Chip,
  PageBody,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/vq/primitives";
export const Route = createFileRoute("/storage")({
  head: () => ({
    meta: [
      { title: "Storage Detective | VORQEN" },
      {
        name: "description",
        content:
          "Find duplicate files and safely reclaim storage with verified, non-destructive archives.",
      },
      { property: "og:title", content: "VORQEN Storage Detective" },
      {
        property: "og:description",
        content: "SHA-256 verified duplicate detection and safe storage reclamation.",
      },
    ],
  }),
  component: StoragePage,
});
const groups = [
  {
    id: 1,
    title: "Machine Learning Training Dataset (dataset_v1_clean.parquet & copy)",
    file: "dataset_v1_clean.parquet",
    primary: "D:\\Projects\\ML-Thesis\\data",
    copy: "C:\\Users\\Admin\\Downloads",
    size: 14.2,
    exact: true,
    downloads: true,
    hash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    reason:
      "Copy A is in a version-controlled repository with 14 commits. Copy B is an orphan browser download with identical payload.",
  },
  {
    id: 2,
    title: "CS6210 Lecture 04 Hadoop Notes.pdf",
    file: "Lec04.pdf",
    primary: "D:\\Coursework\\CS6210",
    copy: "D:\\Desktop\\Scratch",
    size: 0.0184,
    exact: true,
    downloads: false,
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    reason:
      "The organized syllabus path is referenced by your coursework. The scratch copy is byte-for-byte identical.",
  },
  {
    id: 3,
    title: "Ubuntu 24.04 Desktop Installation Media",
    file: "ubuntu-24.04-desktop-amd64.iso",
    primary: "D:\\Archives\\OS Images",
    copy: "C:\\Users\\Admin\\Downloads",
    size: 5.8,
    exact: true,
    downloads: true,
    hash: "876ab204d782c2fb6805092d78df5b23c8a409db7439fd81a510831fa8c32a10",
    reason:
      "Your archived installation image has a verified checksum. The Downloads copy is safe to stage.",
  },
  {
    id: 4,
    title: "Research Paper Collection — revised export",
    file: "research_collection.zip",
    primary: "D:\\Research\\Papers",
    copy: "C:\\Users\\Admin\\Downloads",
    size: 2.4,
    exact: false,
    downloads: true,
    hash: "91bcf284a2d384e70962880fc3ca218683fa492ba48443161d732534a9ee73ac",
    reason:
      "These versions share 98% of their content. Review the metadata comparison before choosing which version to archive.",
  },
];
function StoragePage() {
  const [filter, setFilter] = useState("exact");
  const [selected, setSelected] = useState([1, 2]);
  const [closed, setClosed] = useState<number[]>([]);
  const [resolved, setResolved] = useState<number[]>([]);
  const [diff, setDiff] = useState<number | null>(null);
  const [dialog, setDialog] = useState<"rules" | "plan" | null>(null);
  const [scan, setScan] = useState<number | null>(null);
  useEffect(() => {
    if (scan === null) return;
    const timer = setInterval(
      () =>
        setScan((p) => {
          if (p === null) return null;
          if (p >= 100) {
            clearInterval(timer);
            toast.success("Re-scan complete. Originals remain protected.");
            return null;
          }
          return Math.min(100, p + 10);
        }),
      220,
    );
    return () => clearInterval(timer);
  }, [scan === null]);
  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const savings = groups
    .filter((g) => selected.includes(g.id) && !resolved.includes(g.id))
    .reduce((n, g) => n + g.size, 0);
  const finish = (ids: number[], archive: boolean) => {
    setResolved((r) => [...r, ...ids]);
    setSelected((s) => s.filter((id) => !ids.includes(id)));
    toast.success(
      archive
        ? "Copies staged to reversible archive. Originals untouched."
        : "Group resolved: both copies retained.",
    );
    setDialog(null);
  };
  return (
    <PageBody>
      <Panel glow="primary" className="p-5">
        <PageHeader
          eyebrow={
            <Chip dot tone="success">
              Cryptographic Engine • SHA-256 Verified
            </Chip>
          }
          title="Duplicate Detection & Waste Reclamation"
          description={
            <>
              Byte-exact SHA-256 cryptographic match and semantic duplicate candidates. Recover{" "}
              <span className="text-success">34.6 GB</span> safely without data loss risk.
            </>
          }
          actions={
            <>
              <Btn icon={SlidersHorizontal} onClick={() => setDialog("rules")}>
                Scan Rules
              </Btn>
              <Btn
                variant="primary"
                icon={RefreshCw}
                disabled={scan !== null}
                onClick={() => setScan(0)}
              >
                {scan !== null ? `Scanning ${scan}%` : "Quick Re-scan"}
              </Btn>
            </>
          }
        />
        {scan !== null && <Bar value={scan} gradient className="mt-4" />}
      </Panel>
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Identical Clusters"
          value="14"
          unit="Groups"
          icon={Copy}
          sub="Bit-level hash verified"
        />
        <StatCard
          label="Reclaimable Space"
          value="34.6"
          unit="GB Waste"
          tone="success"
          icon={Archive}
          sub="12% of D:\ volume recovered"
        />
        <StatCard
          label="Protection Model"
          value="Zero"
          unit="Data Risk"
          icon={ShieldCheck}
          sub="Non-destructive staging"
        />
        <StatCard
          label="AI Arbitration"
          value="14/14"
          unit="Auto-Ranked"
          icon={Sparkles}
          sub="Git & Active Paths favored"
        />
      </div>
      <Panel className="flex flex-wrap items-center gap-2 p-2">
        {[
          ["exact", "Show exact matches (SHA-256)", "11"],
          ["near", "Show near-duplicates (Versions)", "3"],
          ["downloads", "Downloads only", "7"],
        ].map(([id, label, count]) => (
          <Btn
            key={id}
            variant={filter === id ? "primary" : "ghost"}
            size="sm"
            onClick={() => setFilter(id)}
          >
            {label} <span className="mono">{count}</span>
          </Btn>
        ))}
        <span className="ml-auto text-xs text-subtle">Buffer: 128 MB Hash Queue</span>
      </Panel>
      <div className="space-y-3">
        {groups
          .filter((g) =>
            filter === "near" ? !g.exact : filter === "downloads" ? g.downloads : g.exact,
          )
          .map((g) => (
            <Panel key={g.id} className="overflow-hidden">
              <div className="flex items-center gap-3 bg-surface-2/60 p-3">
                <Check2
                  label={`Select ${g.title}`}
                  checked={selected.includes(g.id)}
                  onChange={() => !resolved.includes(g.id) && toggle(g.id)}
                />
                <FileCheck className="size-5 text-primary" />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() =>
                    setClosed((c) =>
                      c.includes(g.id) ? c.filter((id) => id !== g.id) : [...c, g.id],
                    )
                  }
                >
                  <div className="font-semibold">
                    {g.title}{" "}
                    <Chip size="xs" tone={resolved.includes(g.id) ? "success" : "primary"}>
                      {resolved.includes(g.id)
                        ? "Resolved"
                        : g.exact
                          ? "Exact Hash Match"
                          : "Near Duplicate"}
                    </Chip>
                  </div>
                  <div className="mono mt-1 truncate text-xs text-muted-foreground">
                    SHA256: {g.hash}
                  </div>
                </button>
                <div className="text-right">
                  <strong className="text-success">
                    {g.size < 1 ? "18.4 MB" : `${g.size} GB`}
                  </strong>
                  <p className="text-[11px] text-muted-foreground">Reclaimable Space</p>
                </div>
                <Btn
                  size="icon"
                  variant="ghost"
                  aria-label="Toggle group"
                  icon={closed.includes(g.id) ? ChevronDown : ChevronUp}
                  onClick={() =>
                    setClosed((c) =>
                      c.includes(g.id) ? c.filter((id) => id !== g.id) : [...c, g.id],
                    )
                  }
                />
              </div>
              {!closed.includes(g.id) && (
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-3/50 p-3">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <ShieldCheck className="size-4 text-success" /> Copy A: Primary File{" "}
                        <Chip tone="success" size="xs">
                          Recommended Original (Keep)
                        </Chip>
                        <Chip size="xs" icon={GitBranch}>
                          Git Tracked
                        </Chip>
                      </p>
                      <p className="mono mt-1 text-xs text-muted-foreground">
                        {g.primary}\{g.file}
                      </p>
                      <p className="mt-1 text-xs text-success">
                        Modified yesterday (14:32) • Inside Active Project Workspace
                      </p>
                    </div>
                    <Chip tone="success">Protected Original</Chip>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-0 p-3">
                    <div>
                      <p className="font-medium">
                        Copy B: Redundant Duplicate{" "}
                        <Chip tone="danger" size="xs">
                          Redundant Download
                        </Chip>
                      </p>
                      <p className="mono mt-1 text-xs text-muted-foreground">
                        {g.copy}\{g.file}
                      </p>
                      <p className="mt-1 text-xs text-danger">
                        Modified 3 weeks ago • Stale Unorganized Staging
                      </p>
                    </div>
                    <Chip tone="danger" icon={Archive}>
                      Stage to Archive
                    </Chip>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <p className="flex-1 text-xs text-muted-foreground">
                      <Sparkles className="mr-1 inline size-3 text-primary" />
                      AI Reason: {g.reason}
                    </p>
                    <Btn
                      size="xs"
                      variant="ghost"
                      disabled={resolved.includes(g.id)}
                      onClick={() => finish([g.id], false)}
                    >
                      Keep Both
                    </Btn>
                    <Btn size="xs" onClick={() => setDiff(diff === g.id ? null : g.id)}>
                      Inspect Diff
                    </Btn>
                    <Btn
                      size="xs"
                      variant="primary"
                      disabled={resolved.includes(g.id)}
                      onClick={() => finish([g.id], true)}
                    >
                      Keep Primary, Archive Copies
                    </Btn>
                  </div>
                  {diff === g.id && (
                    <div className="well p-4">
                      <h3 className="mb-2 font-medium">
                        Metadata comparison —{" "}
                        {g.exact ? "Byte-identical payloads" : "Version review required"}
                      </h3>
                      <div className="grid grid-cols-3 gap-2 mono text-xs">
                        <span>Property</span>
                        <span>Primary A</span>
                        <span>Copy B</span>
                        <span>Size</span>
                        <span>{g.size} GB</span>
                        <span>{g.size} GB</span>
                        <span>SHA-256</span>
                        <span>{g.hash.slice(0, 16)}…</span>
                        <span>{g.exact ? g.hash.slice(0, 16) : "a82d90fcb32180de"}…</span>
                        <span>Content delta</span>
                        <span>Protected source</span>
                        <span>{g.exact ? "0 bytes — exact match" : "2% revised documents"}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          ))}
      </div>
      <Panel className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 bg-surface-3 p-3 shadow-panel">
        <span className="font-semibold">Selected: {selected.length} duplicate groups</span>
        <span className="border-l border-border-strong pl-3 text-muted-foreground">
          <strong className="text-success">{savings.toFixed(2)} GB</strong> net storage savings
        </span>
        <div className="ml-auto flex gap-2">
          <Btn onClick={() => setSelected([])}>Cancel</Btn>
          <Btn disabled={!selected.length} onClick={() => setDialog("plan")}>
            Preview Relocation Plan
          </Btn>
          <Btn
            variant="primary"
            icon={Archive}
            disabled={!selected.length}
            onClick={() => setDialog("plan")}
          >
            Execute Safe Archive
          </Btn>
        </div>
      </Panel>
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/80 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={dialog === "rules" ? "Scan Rules" : "Relocation Plan"}
        >
          <Panel className="w-full max-w-xl space-y-4 p-6">
            <h2 className="text-lg font-semibold">
              {dialog === "rules" ? "Scan Rules" : "Safe Relocation Plan"}
            </h2>
            {dialog === "rules" ? (
              <>
                <p className="text-muted-foreground">
                  SHA-256 exact matches are verified byte-for-byte. Near-duplicates always require
                  manual review.
                </p>
                <p className="well p-3">
                  Protected: Git-tracked files, active project folders, and original files. Copies
                  are staged to a reversible archive, never deleted.
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Review {selected.length} groups • {savings.toFixed(2)} GB staged • no original
                  files removed.
                </p>
                {groups
                  .filter((g) => selected.includes(g.id))
                  .map((g) => (
                    <div key={g.id} className="well p-3">
                      <p>{g.file}</p>
                      <p className="mono text-xs text-success">
                        Copy B → D:\VORQEN Archive\Duplicates
                      </p>
                    </div>
                  ))}
                <Btn variant="primary" onClick={() => finish(selected, true)}>
                  Confirm Safe Archive
                </Btn>
              </>
            )}
            <Btn onClick={() => setDialog(null)}>Close</Btn>
          </Panel>
        </div>
      )}
    </PageBody>
  );
}
