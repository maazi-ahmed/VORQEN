import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  Database,
  FileText,
  Folder,
  FolderOpen,
  Grid2X2,
  HardDrive,
  Info,
  List,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  Btn,
  Check2,
  Chip,
  Dot,
  IconTile,
  btnVariants,
  type Tone,
} from "@/components/vq/primitives";
export const Route = createFileRoute("/files")({
  head: () => ({
    meta: [
      { title: "My Files | VORQEN" },
      {
        name: "description",
        content:
          "Browse local files with AI smart tags, file insights and Linux migration compatibility.",
      },
      { property: "og:title", content: "My Files | VORQEN" },
      {
        property: "og:description",
        content: "Your intelligent local file browser and migration inspector.",
      },
    ],
  }),
  component: FilesPage,
});
const initialFiles = [
  {
    name: "checkpoints",
    size: "1.82 GB",
    modified: "Today, 11:20 AM",
    tag: "Model Binaries",
    icon: Folder,
    tone: "success" as Tone,
    note: "4 weights",
  },
  {
    name: "raw_datasets",
    size: "348 MB",
    modified: "Oct 12, 2:10 PM",
    tag: "Dataset",
    icon: Folder,
    tone: "neutral" as Tone,
  },
  {
    name: "logs_tensorboard",
    size: "14.2 MB",
    modified: "Yesterday, 9:04 AM",
    tag: "Telemetry",
    icon: Folder,
    tone: "neutral" as Tone,
  },
  {
    name: "model_pipeline.py",
    size: "42.4 KB",
    modified: "Yesterday, 4:18 PM",
    tag: "Software Project",
    icon: Code2,
    tone: "primary" as Tone,
    note: "active hook",
  },
  {
    name: "train_eval_loop.py",
    size: "28.1 KB",
    modified: "Oct 14, 6:45 PM",
    tag: "Software Project",
    icon: Code2,
    tone: "primary" as Tone,
  },
  {
    name: "thesis_draft_final_v2.pdf",
    size: "6.4 MB",
    modified: "Oct 14, 10:30 AM",
    tag: "Research",
    icon: FileText,
    tone: "warning" as Tone,
  },
  {
    name: "hyperparams_matrix.parquet",
    size: "18.7 MB",
    modified: "Oct 13, 11:15 AM",
    tag: "Dataset",
    icon: Database,
    tone: "neutral" as Tone,
  },
  {
    name: "benchmark_metrics.csv",
    size: "2.1 MB",
    modified: "Oct 11, 8:40 PM",
    tag: "Telemetry",
    icon: FileText,
    tone: "success" as Tone,
  },
  {
    name: "resnet_backbone.pt",
    size: "94.3 MB",
    modified: "Oct 09, 3:22 PM",
    tag: "Weights",
    icon: Cpu,
    tone: "success" as Tone,
    note: "PyTorch",
  },
  {
    name: "legacy_dataset_cache.tmp",
    size: "612 MB",
    modified: "Sep 28, 1:12 PM",
    tag: "Needs Review",
    icon: TriangleAlert,
    tone: "danger" as Tone,
  },
];
function FilesPage() {
  const [files, setFiles] = useState(initialFiles);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState(["model_pipeline.py"]);
  const [active, setActive] = useState("model_pipeline.py");
  const [sort, setSort] = useState("category");
  const [sortChanged, setSortChanged] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [organized, setOrganized] = useState<string[]>([]);
  const [backedUp, setBackedUp] = useState<string[]>([]);
  const current = files.find((f) => f.name === active) ?? initialFiles[0]!;
  const rows = files
    .filter((f) => `${f.name} ${f.tag}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      !sortChanged
        ? 0
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "size"
            ? parseFloat(b.size) *
                (b.size.includes("GB") ? 1000000 : b.size.includes("MB") ? 1000 : 1) -
              parseFloat(a.size) *
                (a.size.includes("GB") ? 1000000 : a.size.includes("MB") ? 1000 : 1)
            : a.tag.localeCompare(b.tag),
    );
  const toggle = (name: string, checked: boolean) =>
    setSelected((v) => (checked ? [...new Set([...v, name])] : v.filter((n) => n !== name)));
  const choose = (name: string) => {
    setActive(name);
    setSelected([name]);
  };
  async function copyChecksum() {
    try {
      await navigator.clipboard.writeText("e9b42fc0d88ef5f87b321a4f6bd9170ac");
      toast.success("MD5 checksum copied");
    } catch {
      toast.error("Clipboard unavailable. Select the checksum to copy manually.");
    }
  }
  return (
    <div className="flex h-full min-h-[700px] flex-col bg-surface-0 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-1 px-4 py-2">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <HardDrive className="size-3.5 text-primary-glow" />
            D:
          </span>
          <span className="text-subtle">/</span>
          <span>Projects</span>
          <span className="text-subtle">/</span>
          <span className="flex items-center gap-1.5">
            <FolderOpen className="size-4 text-warning" />
            Machine Learning Thesis
          </span>
          <Chip tone="success" size="xs" caps>
            Indexed (Local AI)
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded border border-border bg-surface-0 px-2">
            <Search className="size-3.5 text-subtle" />
            <input
              aria-label="Search current directory"
              placeholder="Search current directory…"
              className="h-7 w-40 bg-transparent text-xs outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Sort files"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setSortChanged(true);
            }}
            className="h-7 rounded border border-border bg-surface-2 px-2 text-xs"
          >
            <option value="category">Sort: AI Category</option>
            <option value="name">Sort: Name</option>
            <option value="size">Sort: Size</option>
          </select>
          <div className="flex rounded bg-surface-0">
            <Btn
              size="icon"
              aria-label="List view"
              variant={view === "list" ? "soft-primary" : "ghost"}
              icon={List}
              onClick={() => setView("list")}
            />
            <Btn
              size="icon"
              aria-label="Grid view"
              variant={view === "grid" ? "soft-primary" : "ghost"}
              icon={Grid2X2}
              onClick={() => setView("grid")}
            />
          </div>
          <Btn variant="primary" size="sm" icon={Plus} onClick={() => setNewOpen(true)}>
            New
          </Btn>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-w-0 flex-1 flex-col" aria-label="File browser">
          {view === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-0 text-[10px] uppercase text-subtle">
                  <tr>
                    <th className="w-8 px-3 py-2">
                      <Check2
                        label="Select all visible files"
                        checked={rows.length > 0 && rows.every((f) => selected.includes(f.name))}
                        onChange={(v) => setSelected(v ? rows.map((f) => f.name) : [])}
                      />
                    </th>
                    <th className="w-10">Type</th>
                    <th className="py-2 font-medium">Name</th>
                    <th className="px-3 text-right font-medium">Size</th>
                    <th className="whitespace-nowrap px-3 font-medium">Last Modified</th>
                    <th className="px-3 font-medium">AI Smart Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f) => (
                    <tr
                      key={f.name}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") choose(f.name);
                      }}
                      onClick={() => choose(f.name)}
                      className={`h-11 cursor-pointer border-l-2 transition-colors hover:bg-surface-2 ${active === f.name ? "border-primary bg-primary/15" : "border-transparent"}`}
                    >
                      <td className="px-3">
                        <Check2
                          label={`Select ${f.name}`}
                          checked={selected.includes(f.name)}
                          onChange={(v) => toggle(f.name, v)}
                        />
                      </td>
                      <td>
                        <f.icon
                          className={`size-4 ${f.icon === Folder ? "text-warning" : f.tone === "danger" ? "text-danger" : f.tone === "success" ? "text-success" : "text-primary-glow"}`}
                        />
                      </td>
                      <td className="min-w-48 py-3">
                        <span className={active === f.name ? "font-semibold" : ""}>{f.name}</span>
                        {f.note && (
                          <span className="ml-2 rounded bg-surface-2 px-1 py-0.5 text-[9px] text-subtle">
                            {f.note}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 text-right text-muted-foreground">
                        {f.size}
                      </td>
                      <td className="whitespace-nowrap px-3 text-muted-foreground">{f.modified}</td>
                      <td className="px-3">
                        <Chip size="xs" tone={f.tone}>
                          {organized.includes(f.name) ? "Organized" : f.tag}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4 xl:grid-cols-3">
              {rows.map((f) => (
                <div
                  key={f.name}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") choose(f.name);
                  }}
                  onClick={() => choose(f.name)}
                  className={`cursor-pointer rounded-lg border p-4 hover:bg-surface-2 ${active === f.name ? "border-primary bg-primary/10" : "border-border bg-surface-1"}`}
                >
                  <div className="flex items-center justify-between">
                    <IconTile icon={f.icon} tone={f.tone} />
                    <Check2
                      label={`Select ${f.name}`}
                      checked={selected.includes(f.name)}
                      onChange={(v) => toggle(f.name, v)}
                    />
                  </div>
                  <div className="my-3 break-all text-xs font-medium">{f.name}</div>
                  <div className="mb-2 text-[11px] text-subtle">
                    {f.size} · {f.modified}
                  </div>
                  <Chip size="xs" tone={f.tone}>
                    {f.tag}
                  </Chip>
                </div>
              ))}
            </div>
          )}
          {!rows.length && (
            <p className="p-8 text-center text-muted-foreground">No files match “{query}”.</p>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-1/40 p-3 text-[10px] text-subtle">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-success" />
                All symlinks resolved
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="size-3.5 text-primary-glow" />
                Auto-tagging active (Ollama: Codellama 13B)
              </span>
            </div>
            <span>NTFS Access: rw-r--r--</span>
          </div>
        </section>
        <aside className="w-full shrink-0 border-l border-border bg-surface-1 lg:w-[310px] xl:w-[330px]">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-xs font-semibold">
            <Info className="size-4 text-primary-glow" />
            Inspector
          </div>
          <div className="p-4">
            <div className="flex gap-3">
              <IconTile icon={current.icon} tone={current.tone} size="lg" />
              <div className="min-w-0">
                <h2 className="break-all text-sm font-semibold">{current.name}</h2>
                <p className="mt-0.5 break-all text-[10px] text-subtle">{`D:\\Projects\\Thesis\\${current.name}`}</p>
                <div
                  className={`mt-1 flex items-center gap-1 text-[10px] ${current.tone === "danger" ? "text-warning" : "text-success"}`}
                >
                  <Dot tone={current.tone === "danger" ? "warning" : "success"} />
                  {current.tone === "danger"
                    ? "Review before Linux migration"
                    : "Ready for Linux Target"}
                </div>
              </div>
            </div>
            <div className="my-4 grid grid-cols-2 gap-2">
              <Btn
                size="sm"
                variant="primary"
                icon={Code2}
                onClick={() =>
                  toast.info(
                    `Local preview prepared for ${current.name}. External app launch is unavailable in this demo.`,
                  )
                }
              >
                {current.name.endsWith(".py") ? "Open Code" : "Open Preview"}
              </Btn>
              <Btn
                size="sm"
                icon={Sparkles}
                onClick={() => {
                  setOrganized((v) => [...v, current.name]);
                  toast.success("AI category applied. Original file preserved.");
                }}
              >
                {organized.includes(current.name) ? "Organized" : "Organize"}
              </Btn>
            </div>
            <h3 className="eyebrow">File Attributes</h3>
            <div className="mt-2 rounded bg-surface-0 p-3 text-xs">
              <dl className="space-y-2">
                {[
                  [
                    "Type",
                    current.name.endsWith(".py")
                      ? "Python 3 Source (.py)"
                      : current.icon === Folder
                        ? "File folder"
                        : current.tag,
                  ],
                  [
                    "Size",
                    current.name === "model_pipeline.py" ? "42,410 bytes (42.4 KB)" : current.size,
                  ],
                  ["Modified", current.modified],
                  [
                    "Encoding",
                    current.name.endsWith(".py") ? "UTF-8 / LF (UNIX)" : "Auto-detected",
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex items-center justify-between text-[10px] text-subtle">
                MD5 Checksum
                <Btn size="xs" variant="ghost" icon={Copy} onClick={copyChecksum}>
                  Copy
                </Btn>
              </div>
              <code className="block select-text break-all rounded bg-surface-2 px-1 py-1 text-[10px] text-muted-foreground">
                e9b42fc0d88ef5f87b321a4f6bd9170ac
              </code>
            </div>
            <div className="mb-2 mt-4 flex items-center justify-between text-[10px]">
              <h3 className="flex items-center gap-1 font-semibold uppercase tracking-wide text-primary-glow">
                <Sparkles className="size-3.5" />
                AI Metadata & Insights
              </h3>
              <span className="text-success">
                {current.tone === "danger" ? "Review needed" : "99.4% Match"}
              </span>
            </div>
            <div className="rounded bg-surface-2/50 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">Classification</span>
                <Chip tone={current.tone} size="xs">
                  {current.tag}
                  {current.name === "model_pipeline.py" ? " - ML Pipeline" : ""}
                </Chip>
              </div>
              <p className="my-3 leading-relaxed text-muted-foreground">
                {current.name === "model_pipeline.py"
                  ? "Constructs ThesisDataLoader and inherits torch.nn.Module with customized gradient checkpoints."
                  : current.tone === "danger"
                    ? "Legacy cache detected. Review dependencies before migration; no automatic deletion."
                    : `${current.name} is indexed locally as ${current.tag.toLowerCase()}. Original data remains unchanged.`}
              </p>
              <div className="flex flex-wrap gap-1">
                <Chip size="xs">
                  {current.name.endsWith(".py") ? "import torch" : "Local index"}
                </Chip>
                <Chip size="xs">Ext4 Clean</Chip>
                <Chip size="xs">No CRLF Conflicts</Chip>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded bg-surface-0 p-3 text-[10px]">
                <ArrowRightLeft className="mt-1 size-4 shrink-0 text-success" />
                <div>
                  Target: Ubuntu 24.04 WSL2
                  <p className="mt-1 break-all text-success">{`/mnt/d/Projects/Thesis/${current.name}`}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link
                to="/migration"
                className={`${btnVariants({ variant: "soft", size: "sm" })} w-full justify-between`}
              >
                <span>Check Migration Compatibility</span>
                <ArrowRight />
              </Link>
              <Btn
                className="w-full"
                size="sm"
                icon={backedUp.includes(current.name) ? CheckCircle2 : Upload}
                onClick={() => {
                  setBackedUp((v) => [...v, current.name]);
                  toast.success(
                    `Backup snapshot verified for ${current.name}. Original preserved.`,
                  );
                }}
              >
                {backedUp.includes(current.name) ? "Snapshot Verified" : "Backup Snapshot to Vault"}
              </Btn>
            </div>
          </div>
          <div className="px-4 pb-3 text-[10px] text-subtle">
            Inode: #849202 <span className="float-right">CRC-32: 7F41A9B0</span>
          </div>
        </aside>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-0 px-4 py-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            {files.length} items ({files.filter((f) => f.icon === Folder).length} folders,{" "}
            {files.filter((f) => f.icon !== Folder).length} files)
          </span>
          <span className="text-primary-glow">
            {selected.length} item{selected.length !== 1 ? "s" : ""} selected
            {selected.length === 1 ? ` (${files.find((f) => f.name === selected[0])?.size})` : ""}
          </span>
          <span className="flex items-center gap-1 text-success">
            <Terminal className="size-3" />
            POSIX-ready
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Dot />
          Daemon Sync: 0.14ms <span className="text-subtle">| UTF-8</span>
        </div>
      </footer>
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/85 p-5">
          <form
            className="panel w-full max-w-sm p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (files.some((f) => f.name === newName.trim())) {
                toast.error("A folder with that name already exists.");
                return;
              }
              const name = newName.trim();
              setFiles((v) => [
                ...v,
                {
                  name,
                  size: "0 KB",
                  modified: "Just now",
                  tag: "Uncategorized",
                  icon: Folder,
                  tone: "neutral",
                },
              ]);
              setNewOpen(false);
              setNewName("");
              choose(name);
              toast.success("New folder added to the local workspace preview.");
            }}
          >
            <h2 className="text-base font-semibold">New Folder</h2>
            <label className="mt-4 block text-xs">
              Folder name
              <input
                autoFocus
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-2 w-full rounded border border-border bg-surface-0 p-2 outline-none focus:border-primary"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Btn type="button" onClick={() => setNewOpen(false)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit" disabled={!newName.trim()}>
                Create Folder
              </Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
