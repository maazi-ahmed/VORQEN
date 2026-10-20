import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Archive,
  BellRing,
  Database,
  FileText,
  FolderPlus,
  HardDrive,
  History,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  Btn,
  Chip,
  Dot,
  EngineTag,
  IconTile,
  PageBody,
  PageHeader,
  Panel,
  SectionTitle,
  StatCard,
  btnVariants,
} from "@/components/vq/primitives";
import { useAssistant } from "@/components/vq/assistant-context";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | VORQEN" },
      {
        name: "description",
        content:
          "Your local storage, file intelligence, backup integrity and migration readiness at a glance.",
      },
      { property: "og:title", content: "Dashboard | VORQEN" },
      {
        property: "og:description",
        content: "Your files, under control. Local AI storage intelligence.",
      },
    ],
  }),
  component: Dashboard,
});
const categories = [
  { name: "Documents", count: "4,120", gb: "62.4", width: 28, color: "bg-primary-glow" },
  { name: "Media", count: "5,980", gb: "142.1", width: 40, color: "bg-success" },
  { name: "Code & Projects", count: "3,240", gb: "56.8", width: 18, color: "bg-primary" },
  { name: "Archives", count: "820", gb: "18.5", width: 7, color: "bg-warning" },
  { name: "Uncategorized", count: "660", gb: "4.8", width: 7, color: "bg-subtle" },
];
function Dashboard() {
  const { ask } = useAssistant();
  const [scan, setScan] = useState<number | null>(null);
  const [items, setItems] = useState([
    "Deep Learning Project",
    "setup_cuda_12.run",
    "arch_spec_2025.pdf",
  ]);
  const [folderDialog, setFolderDialog] = useState(false);
  const [folder, setFolder] = useState("D:\\Projects");
  const [monitored, setMonitored] = useState(2);
  const [reviewed, setReviewed] = useState<string[]>([]);
  useEffect(() => {
    if (scan === null) return;
    if (scan >= 100) {
      toast.success("Rescan complete · 42 modified files indexed. No files changed.");
      return;
    }
    const t = setTimeout(() => setScan((v) => (v ?? 0) + 20), 350);
    return () => clearTimeout(t);
  }, [scan]);
  const resolve = (name: string, action: string) => {
    setItems((v) => v.filter((x) => x !== name));
    toast.success(`${name}: ${action}`);
  };
  return (
    <PageBody>
      <PageHeader
        eyebrow={
          <>
            <EngineTag>Neural v1.4 engine ready</EngineTag>
            <span className="mono text-subtle">WORKSPACE://LOCAL_DRIVES</span>
          </>
        }
        title="Your files, under control."
        description="Continuous file analysis, AI categorization, and migration readiness across your drives."
      />
      <div className="flex flex-wrap gap-2">
        <Btn icon={FolderPlus} onClick={() => setFolderDialog(true)}>
          Add Monitored Folder
        </Btn>
        <Link to="/storage" className={btnVariants({ variant: "soft" })}>
          <Zap />
          Run Storage Analysis
        </Link>
        <Link to="/migration-plan" className={btnVariants({ variant: "primary" })}>
          <ScanLine />
          Start Migration Simulation
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-1 px-3 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Dot pulse />
          <span className="text-success">Continuous Monitoring</span>
          <span className="text-subtle">/</span>
          <span>
            Active on {"D:\\Projects"} and {"C:\\Users\\Dev\\Downloads"}
          </span>
        </div>
        <span className="mono text-subtle">{monitored} folders · IO 3.8 MB/s · Polling 250ms</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Storage Indexed"
          value="284.6"
          unit="GB"
          sub="14,820 items · Drive D: (Internal NVMe)"
          icon={HardDrive}
        />
        <Link to="/storage">
          <StatCard
            className="h-full"
            label="Storage Reclaimable"
            value="34.6"
            unit="GB"
            tone="warning"
            sub="Across 14 duplicate groups →"
            icon={Database}
          />
        </Link>
        <StatCard
          label="Backup Integrity"
          value="94%"
          unit="Verified"
          tone="success"
          sub="Target: /mnt/backup"
          progress={94}
          icon={ShieldCheck}
        />
        <Link to="/migration">
          <StatCard
            className="h-full"
            label="Migration Readiness Index"
            value="83%"
            unit="Portable"
            tone="primary"
            sub="Ready for Linux Ext4 →"
            progress={83}
            icon={Terminal}
          />
        </Link>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <Panel className="p-5">
            <SectionTitle
              icon={ScanLine}
              title="Smart File Scanner Progress & Status"
              subtitle="AI deep indexer running semantic embeddings on local project files."
              right={<Chip tone="success">Real-time sync</Chip>}
            />
            <div className="my-5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                Storage Footprint · Overall Topology Coverage
              </span>
              <span>{scan !== null && scan < 100 ? `${scan}% rescanning` : "98.2% mapped"}</span>
            </div>
            {scan !== null && scan < 100 ? (
              <Bar value={scan} gradient />
            ) : (
              <div className="flex h-2.5 overflow-hidden rounded border border-border">
                {categories.map((c) => (
                  <div
                    key={c.name}
                    title={`${c.name}: ${c.gb} GB`}
                    className={`${c.color} border-r border-surface-1`}
                    style={{ width: `${c.width}%` }}
                  />
                ))}
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {categories.map((c) => (
                <div key={c.name} className="rounded bg-surface-2 p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={`size-1.5 shrink-0 rounded-full ${c.color}`} />
                    {c.name}
                  </div>
                  <div className="mt-1 font-semibold">{c.count}</div>
                  <div className="text-[11px] text-subtle">{c.gb} GB</div>
                </div>
              ))}
            </div>
            <Btn
              className="mt-4"
              variant="soft-primary"
              size="sm"
              icon={RefreshCw}
              disabled={scan !== null && scan < 100}
              onClick={() => setScan(0)}
            >
              {scan !== null && scan < 100
                ? "Rescanning modified files…"
                : "Rescan Modified Files (42 changes)"}
            </Btn>
          </Panel>
          <Panel className="p-5">
            <SectionTitle
              icon={Search}
              iconTone="warning"
              title="Storage Detective"
              subtitle="High footprint candidates identified for optimization or migration prep."
              right={<Chip>34.6 GB reclaimable</Chip>}
            />
            <div className="mt-4 space-y-2">
              {[
                {
                  name: "Downloads / node_modules cache",
                  size: "18.4 GB",
                  desc: "Inactive for > 90 days",
                  status: "Safe to prune",
                  tone: "success" as const,
                  icon: Archive,
                },
                {
                  name: "VirtualBox VMs / win10_dev.vdi",
                  size: "42.0 GB",
                  desc: "NTFS image container",
                  status: "Review before migration",
                  tone: "warning" as const,
                  icon: HardDrive,
                },
                {
                  name: "Duplicate dataset archives (.tar.gz)",
                  size: "12.2 GB total",
                  desc: "Matches in C: and D:",
                  status: "Review 4 copies",
                  tone: "primary" as const,
                  icon: Database,
                },
              ].map((r, i) => (
                <div
                  key={r.name}
                  className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-2 p-3"
                >
                  <IconTile icon={r.icon} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">{r.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className={i === 1 ? "text-warning" : "text-success"}>{r.size}</span> ·{" "}
                      {r.desc}
                    </div>
                  </div>
                  {i < 2 ? (
                    <>
                      <Chip tone={r.tone}>
                        {reviewed.includes(r.name) ? "Review queued" : r.status}
                      </Chip>
                      <Btn
                        size="xs"
                        onClick={() => {
                          setReviewed((v) => [...v, r.name]);
                          toast.info("Queued for review. Nothing will be deleted automatically.");
                        }}
                      >
                        {i === 0 ? "Review" : "Inspect"}
                      </Btn>
                    </>
                  ) : (
                    <Link
                      to="/storage"
                      className={btnVariants({ variant: "soft-primary", size: "xs" })}
                    >
                      {r.status}
                      <ArrowRight />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <Panel glow="primary" className="flex items-center justify-between gap-4 p-4">
            <div>
              <SectionTitle icon={Sparkles} title="Ask VORQEN" />
              <p className="mt-2 text-xs text-muted-foreground">
                Which files can I delete before formatting?
              </p>
            </div>
            <Btn
              variant="soft-primary"
              icon={ArrowRight}
              onClick={() => ask("Which files can I delete before formatting?")}
            >
              Ask Your Files
            </Btn>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel className="p-4">
            <SectionTitle
              icon={BellRing}
              iconTone="warning"
              title="Newly Detected Items"
              right={<Chip tone="warning">{items.length} pending</Chip>}
            />
            <div className="mt-4 space-y-2">
              {items.map((name, i) => (
                <div key={name} className="rounded-lg bg-surface-2 p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className="size-3.5 text-primary-glow" />
                    <span className="flex-1">{name}</span>
                    <span className="text-[10px] text-subtle">
                      {i === 0 ? "D:\\Projects" : "Downloads"}
                    </span>
                  </div>
                  <p className="my-2 text-xs text-muted-foreground">
                    {name === "Deep Learning Project"
                      ? "Contains untracked Python virtualenv (.venv, 1.4 GB) and uncommitted git state."
                      : name.endsWith(".run")
                        ? "Linux binary shell script detected on Windows partition. Ready for migration bundle."
                        : "New research document ready for AI classification."}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Btn
                      size="xs"
                      variant="ghost"
                      onClick={() => resolve(name, "ignored; file preserved")}
                    >
                      Ignore
                    </Btn>
                    <Btn
                      size="xs"
                      variant="soft-primary"
                      onClick={() => resolve(name, "details added and indexed")}
                    >
                      Add Details
                    </Btn>
                  </div>
                </div>
              ))}
              {!items.length && (
                <p className="py-4 text-xs text-success">All detected items reviewed.</p>
              )}
            </div>
            <Link
              to="/inbox"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary-glow"
            >
              Open New Items <ArrowRight className="size-3" />
            </Link>
          </Panel>
          <Panel className="p-4">
            <SectionTitle
              icon={History}
              title="Recent Activity"
              right={
                <Link to="/activity" className="text-xs text-primary-glow">
                  View Log
                </Link>
              }
            />
            <div className="mt-4 space-y-5 border-l border-border pl-4">
              {[
                {
                  title: "Backup verified: 3,420 files",
                  text: "Copied to /mnt/backup with SHA256 integrity match.",
                  time: "15 min ago",
                },
                {
                  title: "Auto-clustered 14 files",
                  text: "Assigned to semantic topic ML Research Project.",
                  time: "1 hour ago",
                },
                {
                  title: "Auto-classified 8 new items",
                  text: "Duplicate .NEF images flagged for review. Originals preserved.",
                  time: "3 hours ago",
                },
                {
                  title: "System Mount Sync",
                  text: "Drive D: index updated; 14,820 inodes registered.",
                  time: "5 hours ago",
                },
              ].map((a, i) => (
                <div key={a.title} className="relative">
                  <Dot
                    tone={i === 0 ? "success" : "primary"}
                    className="absolute -left-[20px] top-1"
                  />
                  <div className="text-xs font-medium">{a.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.text}</p>
                  <p className="mt-1 text-[10px] text-subtle">{a.time}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-border pt-3 text-[10px] text-success">
              <Activity className="size-3" />
              Integrity daemon: PID 4821 · Zero errors
            </div>
          </Panel>
        </div>
      </div>
      {folderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/85 p-6">
          <Panel
            role="dialog"
            aria-modal="true"
            aria-label="Add Monitored Folder"
            className="w-full max-w-md p-6"
          >
            <SectionTitle
              icon={FolderPlus}
              title="Add Monitored Folder"
              subtitle="Local-only processing. Files never leave your workstation."
            />
            <label className="mt-5 block text-xs">
              Directory Path
              <input
                className="mt-2 w-full rounded border border-border bg-surface-0 p-3 outline-none focus:border-primary"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Btn onClick={() => setFolderDialog(false)}>Cancel</Btn>
              <Btn
                variant="primary"
                disabled={!folder.trim()}
                onClick={() => {
                  setMonitored((v) => v + 1);
                  setFolderDialog(false);
                  toast.success(`Monitoring added for ${folder}`);
                }}
              >
                Start Initial Analysis
              </Btn>
            </div>
          </Panel>
        </div>
      )}
    </PageBody>
  );
}
