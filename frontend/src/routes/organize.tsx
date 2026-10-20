import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Archive,
  Check,
  Clock,
  Sparkles,
  ShieldCheck,
  Folder,
  X,
  Brain,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageBody,
  PageHeader,
  EngineTag,
  SegTabs,
  Panel,
  Btn,
  Chip,
  Check2,
  SectionTitle,
  Code,
} from "@/components/vq/primitives";
export const Route = createFileRoute("/organize")({
  head: () => ({
    meta: [
      { title: "Organize & Batch Decisions | VORQEN" },
      {
        name: "description",
        content: "Review AI classifications and safely organize local files.",
      },
      { property: "og:title", content: "VORQEN Organize" },
      { property: "og:description", content: "Non-destructive AI file decisions." },
    ],
  }),
  component: Organize,
});
const seed = [
  [
    "cs8803_distributed_systems_w3.pdf",
    "D:\\Downloads\\courses\\2024",
    0.0042,
    "University / Research",
    "Contains course syllabus headings, lecture notes, and professor citations.",
    "Keep",
  ],
  [
    "financial_statements_2023.xlsx",
    "D:\\Documents\\Finance",
    0.0011,
    "Personal Documents",
    "Tax records and monthly balance spreadsheets verified through 1099 keywords.",
    "Keep",
  ],
  [
    "backup_dump_nov2022.tar.gz",
    "D:\\Backups\\Cold",
    8.4,
    "Archives / Obsolete",
    "Over 2 years old, unaccessed archive with existing newer snapshot detected.",
    "Archive",
  ],
  [
    "dataset_v1_old_copy(1).csv",
    "D:\\Scratch\\Data",
    0.65,
    "Duplicate / Needs Review",
    "Exact SHA-256 match with D:\\Datasets\\v1.csv. Redundant copy.",
    "Review",
  ],
  [
    "main.py",
    "D:\\Downloads",
    0.00002,
    "Software Projects",
    "PyTorch training entry point linked to the ML thesis pipeline.",
    "Keep",
  ],
  [
    "model_weights.pt",
    "D:\\Temp\\Torch_Run",
    4.8,
    "Software Projects",
    "Model checkpoint referenced by main.py. Cross-folder linkage verified.",
    "Review",
  ],
  [
    "lecture_notes.pdf",
    "D:\\Desktop\\Scratch",
    0.012,
    "University / Research",
    "Research annotations match machine learning thesis vocabulary.",
    "Keep",
  ],
  [
    "holiday_export_copy.mov",
    "D:\\Videos\\Exports",
    2.1,
    "Duplicate / Needs Review",
    "Duplicate export signature; original footage remains untouched.",
    "Review",
  ],
].map((r, id) => ({
  id,
  name: String(r[0]),
  path: String(r[1]),
  gb: Number(r[2]),
  category: String(r[3]),
  proof: String(r[4]),
  status: String(r[5]),
}));
function Organize() {
  const [rows, setRows] = useState(seed),
    [selected, setSelected] = useState<number[]>([0, 1]),
    [tab, setTab] = useState("all"),
    [query, setQuery] = useState(""),
    [detect, setDetect] = useState(true),
    [grouped, setGrouped] = useState(false),
    [page, setPage] = useState(0);
  const filtered = rows.filter(
    (r) =>
      (tab === "all" ||
        (tab === "review" && r.status === "Review") ||
        (tab === "duplicates" && r.category.includes("Duplicate")) ||
        (tab === "projects" && [4, 5, 6].includes(r.id))) &&
      `${r.name} ${r.path} ${r.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  const visible = filtered.slice(page * 4, page * 4 + 4);
  const apply = (status: string, ids = selected) => {
    if (!ids.length) return;
    setRows(rows.map((r) => (ids.includes(r.id) ? { ...r, status } : r)));
    toast.success(`${ids.length} file${ids.length === 1 ? "" : "s"} marked ${status}`, {
      description: "Decision staged safely. No files deleted.",
    });
  };
  return (
    <PageBody className="space-y-4">
      <PageHeader
        eyebrow={
          <>
            <EngineTag>AI Decision Engine</EngineTag>
            <span className="text-subtle">WORKSPACE // D: DRIVE LOCAL</span>
          </>
        }
        title="Organize & Batch Decisions"
        description="Review AI category suggestions, cluster project files across folders, and clean duplicates with cryptographic verification."
      />
      <SegTabs
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(0);
        }}
        items={[
          { value: "all", label: "All Categories", count: 7 },
          { value: "review", label: "Needs Review", count: 18, tone: "warning" },
          { value: "duplicates", label: "Duplicate Groups", count: 5 },
          { value: "projects", label: "Project Clusters", count: 3, tone: "success" },
        ]}
      />
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 bg-surface-3/40 p-4">
          <ShieldCheck className="size-7 text-warning" />
          <div className="flex-1">
            <h3 className="font-semibold">
              18 files waiting for your decision <Chip tone="success">SAFE MODE ACTIVE</Chip>
            </h3>
            <p className="text-xs text-muted-foreground">
              SAFE MODE ACTIVE: VORQEN never deletes files automatically.
            </p>
          </div>
          {["Keep", "Archive", "Review"].map((s) => (
            <Chip
              key={s}
              dot
              tone={s === "Keep" ? "success" : s === "Archive" ? "primary" : "warning"}
            >
              {s} {rows.filter((r) => r.status === s).length}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 p-3">
          <Check2
            checked={selected.length === rows.length}
            onChange={(v) => setSelected(v ? rows.map((r) => r.id) : [])}
          />
          <span>
            Selected: {selected.length} files <span className="mx-2 text-subtle">|</span>
            <span className="text-xs text-muted-foreground">
              Total payload:{" "}
              {rows
                .filter((r) => selected.includes(r.id))
                .reduce((a, r) => a + r.gb, 0)
                .toFixed(2)}{" "}
              GB
            </span>
          </span>
          <div className="ml-auto flex gap-2">
            <Btn
              variant="success"
              icon={Check}
              disabled={!selected.length}
              onClick={() => apply("Keep")}
            >
              Keep Selected
            </Btn>
            <Btn
              variant="primary"
              icon={Archive}
              disabled={!selected.length}
              onClick={() => apply("Archive")}
            >
              Archive Selected
            </Btn>
            <Btn
              variant="soft-warning"
              icon={Clock}
              disabled={!selected.length}
              onClick={() => apply("Review")}
            >
              Review Later
            </Btn>
          </div>
        </div>
      </Panel>
      {detect && (
        <Panel glow="primary" className="border-primary/40 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <EngineTag>Feature 5 · Project Detective</EngineTag>Confidence: 98.4% ·{" "}
            <span className="text-success">Cross-folder linkage verified</span>
            <Btn
              className="ml-auto"
              size="icon"
              variant="ghost"
              icon={X}
              aria-label="Dismiss project"
              onClick={() => setDetect(false)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <h2 className="my-2 text-lg font-semibold">
                Detected Project: Machine Learning Thesis & Model Pipeline
              </h2>
              <p className="text-muted-foreground">
                <strong className="text-primary-glow">5 files</strong> across{" "}
                <strong>3 separate folders</strong> share model weights, training scripts, and
                notes:{" "}
                {[
                  "main.py",
                  "model_weights.pt",
                  "dataset_clean.parquet",
                  "lecture_notes.pdf",
                  "README.md",
                ].map((n) => (
                  <Code key={n}>{n}</Code>
                ))}
              </p>
              <p className="mt-3 text-xs text-subtle">
                D:\Downloads (2)　 ·　 D:\Temp\Torch_Run (2)　 ·　 D:\Desktop\Scratch (1)
              </p>
            </div>
            <Btn
              variant={grouped ? "soft-success" : "primary"}
              icon={Folder}
              onClick={() => {
                setGrouped(true);
                toast.success("Project grouping staged. Originals preserved.");
              }}
            >
              {grouped ? "Grouped" : "Group into D:\\Projects\\ML-Thesis".replaceAll("\\\\", "\\")}
            </Btn>
            <Link to="/projects" className="rounded-md bg-surface-3 px-3 py-2">
              Inspect Files →
            </Link>
          </div>
        </Panel>
      )}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <SectionTitle
            icon={Brain}
            title="AI Semantic File Classifier"
            subtitle="Real-time content extraction, MIME analysis, and deep reasoning"
          />
          <label className="ml-auto flex items-center gap-2 rounded bg-surface-2 px-3">
            <Search className="size-4 text-subtle" />
            <input
              aria-label="Filter current view"
              className="h-8 bg-transparent outline-none"
              placeholder="Filter current view..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-0 text-[10px] uppercase tracking-wider text-subtle">
              <tr>
                {[
                  "",
                  "File Name & Path",
                  "Size",
                  "AI Suggested Category",
                  "Rationale & Proof",
                  "Status",
                  "Direct Actions",
                ].map((s, i) => (
                  <th className="px-3 py-3" key={i}>
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border bg-surface-2/25">
                  <td className="p-3">
                    <Check2
                      checked={selected.includes(r.id)}
                      onChange={(v) =>
                        setSelected(v ? [...selected, r.id] : selected.filter((id) => id !== r.id))
                      }
                    />
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="mt-1 text-[11px] text-subtle">{r.path}</p>
                  </td>
                  <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                    {r.gb >= 1 ? `${r.gb} GB` : `${(r.gb * 1000).toFixed(1)} MB`}
                  </td>
                  <td className="p-3">
                    <select
                      aria-label={`Category for ${r.name}`}
                      className="w-44 rounded border border-border bg-surface-0 p-2 text-xs"
                      value={r.category}
                      onChange={(e) =>
                        setRows(
                          rows.map((x) => (x.id === r.id ? { ...x, category: e.target.value } : x)),
                        )
                      }
                    >
                      {[
                        "University / Research",
                        "Personal Documents",
                        "Archives / Obsolete",
                        "Duplicate / Needs Review",
                        "Software Projects",
                        "Media",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="max-w-64 p-3 text-xs text-muted-foreground">
                    <span className="flex gap-2">
                      <Sparkles className="size-4 shrink-0 text-primary-glow" />
                      {r.proof}
                    </span>
                  </td>
                  <td className="p-3">
                    <Chip
                      dot
                      tone={
                        r.status === "Keep"
                          ? "success"
                          : r.status === "Archive"
                            ? "primary"
                            : "warning"
                      }
                    >
                      {r.status}
                    </Chip>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {[
                        { s: "Keep", i: Check },
                        { s: "Archive", i: Archive },
                        { s: "Review", i: Clock },
                      ].map((a) => (
                        <Btn
                          key={a.s}
                          size="icon"
                          variant="ghost"
                          icon={a.i}
                          aria-label={`${a.s} ${r.name}`}
                          onClick={() => apply(a.s, [r.id])}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="p-8 text-center text-muted-foreground">No files match this view.</p>
          )}
        </div>
        <footer className="flex items-center gap-3 p-3 text-xs text-subtle">
          <span>Showing {visible.length} of 18 pending items</span>
          <span className="text-success">·　Zero Data Loss Guarantee</span>
          <Btn
            className="ml-auto"
            size="xs"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Btn>
          {page + 1} / {Math.max(1, Math.ceil(filtered.length / 4))}
          <Btn
            size="xs"
            disabled={(page + 1) * 4 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Btn>
        </footer>
      </Panel>
    </PageBody>
  );
}
