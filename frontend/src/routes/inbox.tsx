import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Folder,
  FileCode,
  Files,
  X,
  Sparkles,
  ShieldCheck,
  Activity,
  Settings,
  ArrowRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageBody,
  PageHeader,
  Panel,
  Chip,
  Btn,
  SegTabs,
  Check2,
  IconTile,
  Bar,
  SectionTitle,
} from "@/components/vq/primitives";
import { ContextDialog, type ContextItem } from "@/components/vq/context-dialog";
export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "New Items Inbox | VORQEN" },
      {
        name: "description",
        content: "Review new local files and provide private organizing context.",
      },
      { property: "og:title", content: "VORQEN New Items Inbox" },
      {
        property: "og:description",
        content: "Continuous local file monitoring and context review.",
      },
    ],
  }),
  component: Inbox,
});
const initial = [
  {
    id: "FL-8802",
    name: "Deep Learning Project",
    path: "D:\\Projects\\Deep Learning Project",
    kind: "folder" as const,
    suggestion:
      "Contains 6 internal payloads (train.py, dataset.parquet, weights.pth). High confidence machine learning software bundle.",
    label: "DIRECTORY",
    time: "4 min ago",
    category: "Software Projects / ML",
    match: "96% match",
    status: "pending",
    tone: "warning" as const,
    icon: Folder,
  },
  {
    id: "FL-8803",
    name: "setup_cuda_12.run",
    path: "C:\\Users\\Dev\\Downloads\\setup_cuda_12.run",
    kind: "file" as const,
    suggestion:
      "Linux NVIDIA CUDA binary package discovered on host Windows download cache. Marked as critical migration dependency for target Arch Linux workspace.",
    label: "SHELL INSTALLER (ELF)",
    time: "18 min ago",
    category: "Migration Tools / Drivers",
    match: "x86_64 ELF payload",
    status: "pending",
    tone: "success" as const,
    icon: FileCode,
  },
  {
    id: "FL-8804",
    name: "5 Research PDFs batch detected",
    path: "D:\\Coursework\\Spring2025\\DistributedSystems",
    kind: "batch" as const,
    suggestion:
      "5 academic lecture transcripts and syllabus documents synchronized simultaneously into root directory.",
    label: "CLUSTER ARRIVAL",
    time: "45 min ago",
    category: "University / Research",
    match: "Auto-structure ready",
    status: "pending",
    tone: "primary" as const,
    icon: Files,
  },
];
function Inbox() {
  const [items, setItems] = useState(initial),
    [tab, setTab] = useState("pending"),
    [query, setQuery] = useState(""),
    [root, setRoot] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [context, setContext] = useState<ContextItem | null>(null),
    [open, setOpen] = useState(false);
  const visible = items.filter(
    (i) =>
      i.status === tab &&
      `${i.name} ${i.path}`.toLowerCase().includes(query.toLowerCase()) &&
      (root === "all" || i.path.startsWith(root)),
  );
  const mark = (ids: string[], status: string) => {
    if (!ids.length) {
      toast.info("Select items first");
      return;
    }
    setItems(items.map((i) => (ids.includes(i.id) ? { ...i, status } : i)));
    setSelected(selected.filter((id) => !ids.includes(id)));
    toast.success(
      `${ids.length} item${ids.length === 1 ? "" : "s"} ${status === "dismissed" ? "dismissed" : "reviewed & tagged"}`,
      { description: "No files moved or deleted." },
    );
  };
  const add = (item: ContextItem) => {
    setContext(item);
    setOpen(true);
  };
  return (
    <PageBody className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          Inbox　›　<span className="text-primary-glow">Detected Changes</span>　/　
          <span className="rounded bg-surface-3 px-2 py-1 text-subtle">
            IO-EVENT-STREAM::DEV_POLL
          </span>
        </span>
        <Chip tone="success" dot pulse>
          Continuous Watcher Active:　D:\Projects, C:\Users\Dev\Downloads
        </Chip>
      </div>
      <PageHeader
        title="New Items Inbox"
        badge={
          <Chip tone="warning">
            {items.filter((i) => i.status === "pending").length} Requiring Context
          </Chip>
        }
        description="Files and directories captured live across your local watch tree. Provide high-level context now or authorize automatic semantic filing."
        actions={
          <>
            <div className="rounded bg-surface-1 px-3 py-2 text-xs">
              <p className="text-subtle">Scan Latency</p>
              <p className="text-success">12ms (Native)</p>
            </div>
            <div className="rounded bg-surface-1 px-3 py-2 text-xs">
              <p className="text-subtle">Offline LLM</p>
              <p className="text-primary-glow">Mistral-7B Q4</p>
            </div>
          </>
        }
      />
      <div className="flex flex-wrap gap-3">
        <SegTabs
          value={tab}
          onChange={setTab}
          items={[
            {
              value: "pending",
              label: "Pending Context",
              count: items.filter((i) => i.status === "pending").length,
            },
            {
              value: "reviewed",
              label: "Reviewed & Tagged",
              count: 24 + items.filter((i) => i.status === "reviewed").length,
            },
            {
              value: "dismissed",
              label: "Dismissed / Ignored",
              count: 12 + items.filter((i) => i.status === "dismissed").length,
            },
          ]}
        />
        <select
          aria-label="Monitored root"
          className="ml-auto rounded border border-border bg-surface-1 px-3 text-xs"
          value={root}
          onChange={(e) => setRoot(e.target.value)}
        >
          <option value="all">All Monitored Roots (2 paths)</option>
          <option value="D:">D: Drive</option>
          <option value="C:">Downloads</option>
        </select>
        <label className="flex items-center gap-2 rounded bg-surface-1 px-3">
          <Search className="size-3 text-subtle" />
          <input
            className="h-8 bg-transparent outline-none"
            placeholder="Filter by token or path..."
            aria-label="Filter inbox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-y border-border py-3">
        <Check2
          checked={visible.length > 0 && visible.every((i) => selected.includes(i.id))}
          onChange={(v) =>
            setSelected(
              v
                ? [...new Set([...selected, ...visible.map((i) => i.id)])]
                : selected.filter((id) => !visible.some((i) => i.id === id)),
            )
          }
        />
        <span>
          {visible.length} {tab === "pending" ? "new unclassified" : "matching"} items detected
        </span>
        <span className="ml-2 text-xs text-subtle">◉ Local indexing engine active</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Btn
            size="sm"
            onClick={() =>
              mark(
                visible.map((i) => i.id),
                "reviewed",
              )
            }
          >
            Mark All Reviewed
          </Btn>
          <Btn
            size="sm"
            variant="soft-primary"
            icon={Sparkles}
            onClick={() => mark(selected.length ? selected : visible.map((i) => i.id), "reviewed")}
          >
            Apply AI Suggestions
          </Btn>
          <Btn size="sm" variant="primary" onClick={() => mark(selected, "reviewed")}>
            Organize All Selected
          </Btn>
        </div>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          {visible.map((item) => (
            <Panel
              key={item.id}
              className={`border-l-4 p-4 ${item.tone === "warning" ? "border-l-warning" : item.tone === "success" ? "border-l-success" : "border-l-primary"}`}
            >
              <div className="flex items-center gap-3">
                <Check2
                  checked={selected.includes(item.id)}
                  onChange={(v) =>
                    setSelected(
                      v ? [...selected, item.id] : selected.filter((id) => id !== item.id),
                    )
                  }
                />
                <IconTile icon={item.icon} tone={item.tone} />
                <div className="min-w-0 flex-1">
                  <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold">
                    {item.name}
                    <Chip tone={item.tone} size="xs">
                      {item.label}
                    </Chip>
                  </h3>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {item.path} · <span className="text-success">Detected {item.time}</span>
                  </p>
                </div>
                <Btn
                  variant="ghost"
                  size="icon"
                  icon={X}
                  aria-label={`Dismiss ${item.name}`}
                  onClick={() => mark([item.id], "dismissed")}
                />
              </div>
              {item.kind === "batch" && (
                <div className="my-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {[
                    "raft_consensus_v2.pdf",
                    "byzantine_fault_notes.pdf",
                    "syllabus_spring25.pdf",
                    "+2 more",
                  ].map((n) => (
                    <span key={n} className="rounded bg-surface-3 px-2 py-1">
                      {n}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 rounded-lg bg-surface-0 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs leading-5">{item.suggestion}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-subtle">Target Category:</span>
                      <Chip tone={item.tone} dot>
                        {item.category}
                      </Chip>
                      <span className="text-success">{item.match}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Btn size="sm" variant="soft-primary" onClick={() => add(item)}>
                      {item.kind === "batch" ? "Add Details to Group" : "Add Details"}
                    </Btn>
                    <Btn
                      size="sm"
                      variant={item.tone === "success" ? "success" : "soft"}
                      onClick={() => mark([item.id], "reviewed")}
                    >
                      {item.kind === "file"
                        ? "Tag as Migration Asset"
                        : item.kind === "batch"
                          ? "Review Batch"
                          : "Organize"}
                    </Btn>
                  </div>
                </div>
              </div>
              {tab !== "pending" && (
                <Btn
                  size="xs"
                  className="mt-3"
                  onClick={() => {
                    setItems(
                      items.map((i) => (i.id === item.id ? { ...i, status: "pending" } : i)),
                    );
                    toast.info("Item returned to pending context");
                  }}
                >
                  Return to Pending
                </Btn>
              )}
            </Panel>
          ))}
          {!visible.length && (
            <Panel className="p-10 text-center">
              <ShieldCheck className="mx-auto mb-3 size-8 text-success" />
              <h3 className="font-semibold">You're all caught up</h3>
              <p className="mt-2 text-muted-foreground">
                No items in this view. Your files are safe and unchanged.
              </p>
            </Panel>
          )}
        </div>
        <aside className="space-y-3">
          <Panel className="space-y-3 p-4">
            <SectionTitle icon={ShieldCheck} title="Why Provide Context?" />
            <p className="text-xs leading-6 text-muted-foreground">
              VORQEN uses your annotations to construct your local semantic vector graph. Context
              tags allow zero-shot auto classification on future file operations without
              transmitting any metadata to external APIs.
            </p>
            <div className="text-xs">
              <p className="text-success">100% On-Device Inference</p>
              <p className="mt-1 text-subtle">
                Embeddings remain inside your encrypted SQLite vault.
              </p>
              <p className="mt-3 text-primary-glow">Adaptive Folder Archetypes</p>
              <p className="mt-1 text-subtle">
                After 2 manual tags, VORQEN handles similar payloads autonomously.
              </p>
            </div>
          </Panel>
          <Panel className="space-y-3 p-4">
            <SectionTitle
              icon={Folder}
              title="Active Watchpoints"
              right={<Chip tone="success">2 Active</Chip>}
            />
            {[
              { path: "D:\\Projects", sub: "Software & AI models", count: "14,209 files" },
              {
                path: "C:\\Users\\Dev\\Downloads",
                sub: "Inbound staging area",
                count: "184 files",
              },
            ].map((w) => (
              <div className="rounded bg-surface-0 p-3 text-xs" key={w.path}>
                <div className="flex justify-between gap-2">
                  <span>{w.path}</span>
                  <span className="text-success">● Active</span>
                </div>
                <div className="mt-2 flex justify-between text-subtle">
                  <span>{w.sub}</span>
                  <span>{w.count}</span>
                </div>
              </div>
            ))}
            <Link
              to="/settings"
              className="flex items-center justify-center gap-2 rounded bg-surface-3 p-3 text-xs"
            >
              <Settings className="size-3" />
              Manage Monitored Folders in Settings
            </Link>
          </Panel>
          <Panel className="space-y-3 p-4">
            <SectionTitle
              icon={Activity}
              title="Linux Migration Staging"
              right={<Chip tone="primary">1 Ready</Chip>}
            />
            <p className="text-xs text-muted-foreground">
              Incoming files cross-referenced with your destination Arch Linux system packages.
            </p>
            <div className="flex justify-between text-xs text-subtle">
              <span>Staged Drivers & Packages</span>
              <span className="text-success">420 MB / 1.2 GB</span>
            </div>
            <Bar value={35} tone="success" />
            <Link to="/migration" className="flex items-center gap-2 text-xs text-primary-glow">
              View migration staging <ArrowRight className="size-3" />
            </Link>
          </Panel>
        </aside>
      </div>
      {context && (
        <ContextDialog key={context.id} item={context} open={open} onOpenChange={setOpen} />
      )}
    </PageBody>
  );
}
