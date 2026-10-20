import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  HardDrive,
  ShieldCheck,
  FileStack,
  TriangleAlert,
  Lock,
  Download,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  Btn,
  Chip,
  PageBody,
  PageHeader,
  Panel,
  SegTabs,
  StatCard,
} from "@/components/vq/primitives";
import { useAssistant } from "@/components/vq/assistant-context";
import { SSD_PHOTO_URL } from "@/lib/images";
export const Route = createFileRoute("/backup")({
  head: () => ({
    meta: [
      { title: "Backup Safety Checker | VORQEN" },
      {
        name: "description",
        content:
          "Verify backup integrity with dual-hash checks and non-destructive snapshot protection.",
      },
      { property: "og:title", content: "VORQEN Backup Safety Checker" },
      {
        property: "og:description",
        content: "Inspect manifests, resolve locked files, and verify safe backup snapshots.",
      },
    ],
  }),
  component: BackupPage,
});
const manifest = [
  {
    name: "model_weights.pt",
    source: "D:\\Projects\\ML-Thesis",
    target: "Projects/ML-Thesis/model_weights.pt",
    size: "4.2 GB",
    hash: "e9b42fc0…3d5a4",
    status: "VERIFIED",
  },
  {
    name: "Lec04.pdf",
    source: "D:\\Coursework\\CS6210",
    target: "Coursework/CS6210/Lec04.pdf",
    size: "18.4 MB",
    hash: "7f83b165…bda2",
    status: "VERIFIED",
  },
  {
    name: "extensions.json",
    source: "C:\\Users\\Admin\\.vscode",
    target: "config/extensions.json",
    size: "240 KB",
    hash: "14f8ab2e…a02",
    status: "VERIFIED",
  },
  {
    name: "python.exe",
    source: "D:\\Projects\\ai-engine\\.venv\\Scripts",
    target: "SKIPPED (Win32 wrapper → reqs.txt)",
    size: "120 KB",
    hash: "EXCLUDED_RULES",
    status: "SKIPPED",
  },
  {
    name: "dataset_cache.tmp",
    source: "D:\\Scratch",
    target: "Lock held by PID 4192 (python.exe)",
    size: "612 MB",
    hash: "LOCKED_FILE",
    status: "PENDING RETRY",
  },
  {
    name: "requirements.txt",
    source: "D:\\Projects\\ai-engine",
    target: "Projects/ai-engine/requirements.txt",
    size: "4 KB",
    hash: "bf813dc9…e12a",
    status: "VERIFIED",
  },
  {
    name: "research_notes.md",
    source: "D:\\Research",
    target: "Research/research_notes.md",
    size: "82 KB",
    hash: "81e701ab…c432",
    status: "VERIFIED",
  },
  {
    name: "dataset_v1_clean.parquet",
    source: "D:\\Projects\\ML-Thesis\\data",
    target: "Projects/ML-Thesis/data/dataset_v1_clean.parquet",
    size: "14.2 GB",
    hash: "7f83b165…9069",
    status: "VERIFIED",
  },
];
function BackupPage() {
  const { ask } = useAssistant();
  const [progress, setProgress] = useState(99.2);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [retried, setRetried] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [inspect, setInspect] = useState<number | null>(null);
  const [sealed, setSealed] = useState(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setProgress((p) => Math.min(100, p + 0.04)), 550);
    return () => clearInterval(timer);
  }, []);
  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );
  const rows = manifest.map((r, i) =>
    i === 4 && retried
      ? { ...r, status: "VERIFIED", hash: "bc79f200…81e2", target: "Scratch/dataset_cache.tmp" }
      : r,
  );
  const retry = () => {
    setRetrying(true);
    retryTimer.current = setTimeout(() => {
      setRetried(true);
      setRetrying(false);
      toast.success("File lock released. Cache file verified successfully.");
    }, 1800);
  };
  const exportReceipt = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              snapshot: "snap_20241029_0942",
              verified: retried ? 18939 : 18938,
              bitrot: 0,
              sealed,
              manifest: rows,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "vorqen-verification-receipt.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Verification receipt exported.");
  };
  return (
    <PageBody>
      <Panel className="p-4">
        <PageHeader
          eyebrow={
            <span className="text-muted-foreground">
              Backup Engine / Safe Storage Verification /{" "}
              <span className="mono text-primary-glow">snap_20241029_0942</span>
            </span>
          }
          title="Backup Safety Checker"
          badge={
            <>
              <Chip tone="success" dot>
                SHA-256 Block Verification Active
              </Chip>
              <Chip icon={ShieldCheck}>Non-Destructive Target Mode</Chip>
            </>
          }
          actions={
            <>
              <Btn
                onClick={() => {
                  setProgress(99.2);
                  toast.info("Read-only backup verification started.");
                }}
              >
                Verify Existing Backup
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setProgress(99.2);
                  setSealed(false);
                  toast.success("New snapshot created locally. Integrity verification started.");
                }}
              >
                Create New Snapshot
              </Btn>
            </>
          }
        />
      </Panel>
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Target Drive"
          value="Samsung T7 Shield"
          className="[&_span.text-\[26px\]]:text-base"
          icon={HardDrive}
          sub="UUID: 8f4a-912b • Read/Write"
          progress={36}
        >
          <p className="mt-2 text-xs text-subtle">
            640 GB free <span className="float-right">1.0 TB ExFAT</span>
          </p>
        </StatCard>
        <StatCard
          label="Payload Size"
          value="18,940"
          unit="Files"
          icon={FileStack}
          sub="142.8 GB • avg 7.5 MB/f"
        >
          <p className="mt-2 text-xs text-subtle">3 Source Trees Mapped</p>
        </StatCard>
        <StatCard
          label="Verification Pass"
          value={retried ? "18,939" : "18,938"}
          unit="Verified"
          tone="success"
          icon={ShieldCheck}
          sub="99.99% • Zero Bitrot Detected"
        />
        <StatCard
          label="Action Items"
          value={retried ? "1" : "2"}
          unit="Flagged Items"
          tone="warning"
          icon={TriangleAlert}
          sub={retried ? "1 Skipped by rule" : "1 Skipped, 1 Pending Lock"}
        >
          <Btn variant="ghost" size="xs" onClick={() => setTab("attention")}>
            Resolve Now →
          </Btn>
        </StatCard>
      </div>
      <Panel className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Integrity Pipeline Status</h2>
          <Chip>Engine: BLAKE3 & SHA-256 Dual-Hash</Chip>
          <span className="ml-auto text-xs text-success">
            {progress < 100
              ? `${812 + (Math.floor(progress * 10) % 27)} MB/s readback`
              : "Verification pass complete"}
          </span>
        </div>
        <div className="grid gap-1 sm:grid-cols-4">
          {["Index & Snapshot", "Copied to Target", "Hash Verification", "Lock & Seal"].map(
            (s, i) => (
              <div
                key={s}
                className={`flex gap-2 rounded p-2 ${i === 2 ? "bg-primary/20" : "bg-surface-2"}`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full ${i < 2 ? "bg-success text-success-foreground" : "bg-surface-4 text-primary-glow"}`}
                >
                  {i < 2 ? <Check className="size-3" /> : i + 1}
                </span>
                <div className="text-xs">
                  {i + 1}. {s}
                  <p className="text-[11px] text-muted-foreground">
                    {
                      [
                        "18,940 items staged",
                        "142.8 GB mirrored",
                        `${retried ? "18,939" : "18,938"} / 18,940`,
                        sealed ? "Snapshot sealed" : "Awaiting review",
                      ][i]
                    }
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
        <div className="flex justify-between text-xs">
          <span>
            {progress < 100
              ? "Verifying destination blocks against source manifest…"
              : "Block verification complete — review flagged items before sealing."}
          </span>
          <strong className="text-primary-glow">{progress.toFixed(2)}% Complete</strong>
        </div>
        <Bar value={progress} gradient />
        <div className="flex flex-wrap justify-between gap-2 text-xs">
          <span className="text-success">
            Source files are locked in read-only mode during pass
          </span>
          <span className="mono text-muted-foreground">
            Current chunk: 0x
            {Math.floor(progress * 8137)
              .toString(16)
              .toUpperCase()}
            …C84B (Pass 2 of 2)
          </span>
        </div>
        <Chip tone="success" dot>
          0 bit-rot detected • 99.98% verified
        </Chip>
      </Panel>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3">
          <SegTabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "all", label: "All Manifest", count: "18,940" },
              {
                value: "verified",
                label: "Verified",
                count: retried ? "18,939" : "18,938",
                tone: "success",
              },
              {
                value: "attention",
                label: "Attention Needed",
                count: retried ? 1 : 2,
                tone: "warning",
              },
              { value: "logs", label: "Daemon Logs" },
            ]}
          />
          <input
            aria-label="Filter manifest paths or hashes"
            placeholder="Filter paths or hash…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded border border-border bg-surface-0 px-3 py-2 text-xs outline-none focus:border-primary"
          />
        </div>
        {tab === "logs" ? (
          <div className="m-3 rounded-lg bg-surface-0 p-5 mono text-xs leading-7 text-success">
            <p>[09:42:00] daemon: target Samsung T7 Shield mounted rw</p>
            <p>[09:42:01] manifest: 18,940 source files indexed</p>
            <p>[09:42:03] engine: BLAKE3 & SHA-256 dual-hash initialized</p>
            <p>[09:42:12] verify: 0 bit-rot detected</p>
            <p className="text-warning">
              [09:42:13] rules: python.exe excluded; requirements.txt preserved
            </p>
            <p className={retried ? "text-success" : "text-danger"}>
              [09:42:14] cache:{" "}
              {retried
                ? "retry succeeded; checksum verified"
                : "lock held by PID 4192; waiting for manual retry"}
            </p>
            <p>[live] pass: {progress.toFixed(2)}% complete</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-3/60 text-[10px] uppercase tracking-wider text-subtle">
                <tr>
                  {[
                    "Source File Path",
                    "Target Backup Path",
                    "Size",
                    "SHA-256 Integrity",
                    "Verification Status",
                    "Action",
                  ].map((h) => (
                    <th key={h} className="px-3 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows
                  .map((r, i) => ({ r, i }))
                  .filter(
                    ({ r }) =>
                      (tab === "all" ||
                        (tab === "verified" ? r.status === "VERIFIED" : r.status !== "VERIFIED")) &&
                      `${r.name} ${r.source} ${r.hash}`.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map(({ r, i }) => (
                    <tr
                      key={r.name}
                      className={`border-b border-border ${r.status === "VERIFIED" ? "" : "bg-warning/5"}`}
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium">{r.name}</p>
                        <p className="mt-1 text-[10px] text-subtle">{r.source}\</p>
                      </td>
                      <td className="max-w-64 truncate px-3 text-muted-foreground" title={r.target}>
                        {r.status === "VERIFIED" ? "…/" : ""}
                        {r.target}
                      </td>
                      <td className="whitespace-nowrap px-3">{r.size}</td>
                      <td
                        className={`mono px-3 ${r.status === "VERIFIED" ? "text-success" : "text-subtle"}`}
                      >
                        {r.hash}
                      </td>
                      <td className="px-3">
                        <Chip
                          size="xs"
                          tone={
                            r.status === "VERIFIED"
                              ? "success"
                              : r.status === "SKIPPED"
                                ? "warning"
                                : "danger"
                          }
                          dot
                        >
                          {r.status}
                        </Chip>
                      </td>
                      <td className="px-3 text-right">
                        <Btn
                          size="xs"
                          disabled={i === 4 && retrying}
                          variant={r.status === "PENDING RETRY" ? "soft-danger" : "soft"}
                          onClick={() => (r.status === "PENDING RETRY" ? retry() : setInspect(i))}
                        >
                          {r.status === "VERIFIED"
                            ? "Inspect"
                            : r.status === "SKIPPED"
                              ? "View Reason"
                              : retrying
                                ? "Retrying…"
                                : "Force Retry"}
                        </Btn>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-[11px] text-subtle">
              Preview manifest • 8 of 18,940 items • Non-destructive verification
            </p>
          </div>
        )}
      </Panel>
      <div className="grid gap-3 md:grid-cols-3">
        <Panel className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4 text-primary" />
            Immutable Seal Protocol
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Each snapshot is signed with your local ed25519 device key and stamped with Merkle-tree
            nodes to guard against silent bit-rot.
          </p>
          <p className="well p-2 mono text-xs text-primary-glow">SIG: ed25519:78e2…00fa99</p>
          <Chip tone="success" icon={Check}>
            USB 3.2 Gen 2 (10 Gbps)
          </Chip>
        </Panel>
        <Panel className="overflow-hidden">
          <img
            src={SSD_PHOTO_URL}
            alt="Samsung T7 Shield external solid state backup drive"
            className="h-36 w-full object-cover"
          />
          <div className="p-3">
            <p className="font-semibold">
              Samsung T7 Shield{" "}
              <Chip tone="success" size="xs">
                Mounted rw
              </Chip>
            </p>
            <p className="mt-1 mono text-[11px] text-muted-foreground">
              Mount point: /mnt/backup/vorqen_snap/
            </p>
          </div>
        </Panel>
        <Panel glow="primary" className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-primary" />
            VORQEN Assistant Note
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            “1 locked temporary cache file is safe to skip if this is an archival snapshot. Your
            codebases, datasets, and configurations are 100% secured.”
          </p>
          <Btn
            variant="soft-primary"
            size="sm"
            onClick={() =>
              ask("How can I safely resolve the backup file lock on dataset_cache.tmp?")
            }
          >
            Ask AI to resolve lock →
          </Btn>
          <p className="text-[11px] text-subtle">Confidence: 99.4%</p>
        </Panel>
      </div>
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-success">Zero corruption detected</p>
          <p className="mt-1 text-xs text-subtle">
            Last full snapshot verified 14 minutes ago • BLAKE3_HASH_e3b0c442…8b056be148
          </p>
        </div>
        <div className="flex gap-2">
          <Btn icon={Download} onClick={exportReceipt}>
            Export Verification Receipt (.json)
          </Btn>
          <Btn
            variant="primary"
            icon={Lock}
            disabled={progress < 100 || !retried || sealed}
            onClick={() => {
              setSealed(true);
              toast.success("Snapshot sealed. Excluded executable recorded in manifest.");
            }}
          >
            {sealed ? "Snapshot Sealed" : "Finalize Backup & Lock Snapshot"}
          </Btn>
        </div>
      </Panel>
      {inspect !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/80 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Manifest file details"
        >
          <Panel className="w-full max-w-lg space-y-4 p-6">
            <h2 className="text-lg font-semibold">{rows[inspect]!.name}</h2>
            <p className="text-muted-foreground">
              {inspect === 3
                ? "EXCLUDED_RULES: Windows virtual-environment executables are platform-specific. requirements.txt is backed up so the environment can be recreated. No source file was removed."
                : "Source and target checksums match. Destination bytes verified by BLAKE3 and SHA-256."}
            </p>
            <p className="well break-all p-3 mono text-xs">
              {rows[inspect]!.source}\{rows[inspect]!.name}
              <br />
              {rows[inspect]!.hash} • {rows[inspect]!.size}
            </p>
            <Btn onClick={() => setInspect(null)}>Close</Btn>
          </Panel>
        </div>
      )}
    </PageBody>
  );
}
