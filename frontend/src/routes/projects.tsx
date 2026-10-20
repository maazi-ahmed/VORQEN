import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Folder, Sparkles, GraduationCap, ShieldCheck, Check, Archive, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  PageBody,
  PageHeader,
  Panel,
  Chip,
  Btn,
  Check2,
  IconTile,
  SectionTitle,
} from "@/components/vq/primitives";
export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Project Detective & Categories | VORQEN" },
      {
        name: "description",
        content: "Discover related projects and review semantic file categories.",
      },
      { property: "og:title", content: "VORQEN Project Detective" },
      {
        property: "og:description",
        content: "Local AI project clustering and safe category decisions.",
      },
    ],
  }),
  component: Projects,
});
const clusters = [
  {
    name: "Machine Learning Thesis Pipeline",
    files: "main.py · weights.pt · dataset.parquet · notes.pdf · README.md",
    path: "D:\\Projects\\ML-Thesis",
    confidence: "98.4",
    count: 5,
  },
  {
    name: "Distributed Systems Coursework",
    files: "raft.py · consensus_notes.pdf · syllabus.pdf · report.tex",
    path: "D:\\Projects\\Distributed-Systems",
    confidence: "96.2",
    count: 4,
  },
  {
    name: "Phoenix Video Edit",
    files: "phoenix.prproj · intro.mov · soundtrack.wav",
    path: "D:\\Projects\\Phoenix",
    confidence: "93.8",
    count: 3,
  },
];
const categories = [
  "Research & Academic Papers",
  "Software Projects",
  "Personal Documents",
  "Media",
  "Archives",
];
const research = [
  {
    name: "CS6210_Distributed_Computing_Final.pdf",
    meta: "6.2 MB • Modified Oct 14, 2024 • SHA-256 match",
    status: "Keep",
    proof: "Primary coursework syllabus & project report.",
    tags: "CS6210, FinalReport, Systems",
  },
  {
    name: "draft_notes_v1_old.docx",
    meta: "1.8 MB • Modified Aug 02, 2023 • Last opened 420 days ago",
    status: "Archive",
    proof: "Superseded by v3 report; inactive 14 months.",
    tags: "Destination: D:\\Archive\\Coursework_2023",
  },
  {
    name: "neurips2024_submission_template.tex",
    meta: "840 KB • Modified Nov 02, 2024 • In sync with Git",
    status: "Keep",
    proof: "Active LaTeX template with bibtex citations.",
    tags: "NeurIPS, LaTeX, Publication",
  },
  {
    name: "unnamed_scan_004.pdf",
    meta: "4.1 MB • Modified Sep 18, 2024 • OCR Low Confidence (68%)",
    status: "Review",
    proof: "Scanned document: OCR indicates lecture slides.",
    tags: "Suggest auto-rename: CS6210_L04_Memory.pdf",
  },
];
function Projects() {
  const [active, setActive] = useState(0),
    [grouped, setGrouped] = useState<number[]>([]),
    [category, setCategory] = useState(categories[0]),
    [rows, setRows] = useState(research),
    [selected, setSelected] = useState([0, 1, 2, 3]),
    [destination, setDestination] = useState("D:\\Organized\\Research"),
    [applied, setApplied] = useState(false);
  const switchCategory = (c: string) => {
    setCategory(c);
    const data =
      c === categories[0]
        ? research
        : [
            {
              name:
                c === "Software Projects"
                  ? "training_pipeline.py"
                  : c === "Media"
                    ? "phoenix_final.mov"
                    : c === "Archives"
                      ? "workspace_backup_2023.zip"
                      : "annual_statement_2024.pdf",
              meta: "12.4 MB • Indexed locally • Signature verified",
              status: "Keep",
              proof: `Content matches ${c.toLowerCase()} vocabulary.`,
              tags: "Local synthesis · Verified",
            },
            {
              name: c === "Media" ? "rough_cut_old.mov" : "previous_version.bak",
              meta: "8.1 MB • Older version detected",
              status: "Archive",
              proof: "Superseded version; preserve in archive.",
              tags: "No automatic deletion",
            },
          ];
    setRows(data);
    setSelected(data.map((_, i) => i));
    setApplied(false);
  };
  const decide = (status: string, ids = selected) => {
    setRows(rows.map((r, i) => (ids.includes(i) ? { ...r, status } : r)));
    setApplied(false);
    toast.success(`${ids.length} decisions staged: ${status}`);
  };
  return (
    <PageBody>
      <PageHeader
        eyebrow="ORGANIZE / CROSS-FOLDER INTELLIGENCE"
        title="Project Detective"
        description="Related files, scattered folders. Let local AI connect the dots — you stay in control."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {clusters.map((c, i) => (
          <Panel
            key={c.name}
            glow={active === i ? "primary" : undefined}
            className={`p-4 ${active === i ? "border-primary/50" : ""}`}
          >
            <button className="w-full text-left" onClick={() => setActive(i)}>
              <div className="mb-3 flex items-center justify-between">
                <IconTile icon={Folder} tone="primary" />
                <Chip tone="success">{c.confidence}% Confidence</Chip>
              </div>
              <h3 className="text-base font-semibold">{c.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{c.count} files across 3 folders</p>
              <p className="my-3 min-h-10 text-xs leading-5 text-subtle">{c.files}</p>
            </button>
            <Btn
              className="w-full text-xs"
              variant={grouped.includes(i) ? "soft-success" : "soft-primary"}
              icon={grouped.includes(i) ? Check : Folder}
              onClick={() => {
                setActive(i);
                setGrouped([...new Set([...grouped, i])]);
                toast.success("Project grouped in your local workspace", {
                  description: "Original file contents remain unchanged.",
                });
              }}
            >
              {grouped.includes(i) ? "Grouped" : `Group into ${c.path}`}
            </Btn>
          </Panel>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c, i) => (
          <Btn
            key={c}
            variant={category === c ? "soft-primary" : "ghost"}
            onClick={() => switchCategory(c)}
          >
            {c} {i === 0 ? "32" : ""}
          </Btn>
        ))}
      </div>
      <Panel className="p-5" glow="primary">
        <div className="flex flex-wrap items-start gap-4">
          <IconTile icon={GraduationCap} tone="primary" size="lg" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold">{category}</h2>
              <Chip tone="success" dot>
                94% Match Confidence
              </Chip>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              340 MB Total Size　•　4 Ingest Directories　•　D:\Coursework, D:\Drafts\2024,
              D:\Downloads, D:\Scans
            </p>
            <div className="mt-4 rounded-lg bg-surface-0/40 p-3">
              <p className="eyebrow text-primary-glow">✧ AI Local Synthesis</p>
              <p className="mt-1 text-xs text-muted-foreground">
                High-value documents identified by coursework keywords (CS6210, Hadoop, Distributed
                Systems, NeurIPS). Fully parsed on-device. Zero telemetry applied.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="eyebrow">Batch decisions (auto-grouped)</p>
            <div className="flex gap-2">
              <Btn
                variant="success"
                icon={Check}
                onClick={() =>
                  decide(
                    "Keep",
                    rows.map((_, i) => i),
                  )
                }
              >
                Keep All Verified ({category === categories[0] ? 28 : rows.length})
              </Btn>
              <Btn
                variant="primary"
                icon={Archive}
                onClick={() =>
                  decide(
                    "Archive",
                    rows.flatMap((r, i) => (r.status === "Archive" ? [i] : [])),
                  )
                }
              >
                Archive Obsolete Drafts (3)
              </Btn>
            </div>
            <Btn
              variant="soft-warning"
              icon={Clock}
              onClick={() =>
                decide(
                  "Review",
                  rows.flatMap((r, i) => (r.status === "Review" ? [i] : [])),
                )
              }
            >
              Review Ambiguous (1)
            </Btn>
          </div>
        </div>
      </Panel>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-1 p-3">
        <Check2
          checked={selected.length === rows.length}
          onChange={(v) => setSelected(v ? rows.map((_, i) => i) : [])}
        />
        <span>Select all {category === categories[0] ? 32 : rows.length} items</span>
        <span className="text-subtle">|</span>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Batch Action Destination:
          <input
            aria-label="Batch destination"
            className="rounded border border-border bg-surface-0 px-2 py-1 text-primary-glow"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </label>
        <Btn
          className="ml-auto"
          size="sm"
          onClick={() => setSelected(rows.flatMap((_, i) => (selected.includes(i) ? [] : [i])))}
        >
          Invert Selection
        </Btn>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1 text-left">
          <thead className="eyebrow">
            <tr>
              {[
                "File Name & Signature",
                "AI Tag / Status",
                "Rationale & Context",
                "Individual Action",
              ].map((t) => (
                <th className="p-3" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className="bg-surface-1">
                <td className="rounded-l-md p-3">
                  <div className="flex items-center gap-3">
                    <Check2
                      checked={selected.includes(i)}
                      onChange={(v) =>
                        setSelected(v ? [...selected, i] : selected.filter((x) => x !== i))
                      }
                    />
                    <IconTile
                      icon={Folder}
                      tone={r.status === "Review" ? "warning" : "primary"}
                      size="sm"
                    />
                    <div>
                      {r.name}
                      <p className="mt-1 text-[11px] text-subtle">{r.meta}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Chip
                    tone={
                      r.status === "Keep"
                        ? "success"
                        : r.status === "Archive"
                          ? "primary"
                          : "warning"
                    }
                    dot
                    caps
                  >
                    {r.status === "Keep"
                      ? "Keep Verified"
                      : r.status === "Archive"
                        ? "Archive Draft"
                        : "Needs Review"}
                  </Chip>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {r.proof}
                  <p className="mt-1 text-[11px] text-subtle">{r.tags}</p>
                </td>
                <td className="rounded-r-md p-3">
                  <div className="flex gap-1">
                    {["Keep", "Archive", "Review"].map((s) => (
                      <Btn
                        key={s}
                        size="xs"
                        variant={
                          r.status === s
                            ? s === "Keep"
                              ? "success"
                              : s === "Archive"
                                ? "primary"
                                : "soft-warning"
                            : "ghost"
                        }
                        onClick={() => decide(s, [i])}
                      >
                        {s}
                      </Btn>
                    ))}
                    <Btn
                      size="icon"
                      variant="ghost"
                      icon={Folder}
                      aria-label={`Show folder for ${r.name}`}
                      onClick={() =>
                        toast.info(`Location: ${destination}`, { description: r.name })
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { title: "28 Verified", sub: "Scheduled to stay in Research dir", icon: Check },
          { title: "3 Obsolete Drafts", sub: "Will compress to cold storage", icon: Archive },
          { title: "1 Pending Flag", sub: "Awaiting quick OCR inspection", icon: Clock },
        ].map((t) => (
          <Panel key={t.title} className="flex items-center gap-3 p-4">
            <IconTile
              icon={t.icon}
              tone={t.icon === Check ? "success" : t.icon === Clock ? "warning" : "primary"}
            />
            <div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-xs text-muted-foreground">{t.sub}</p>
            </div>
          </Panel>
        ))}
      </div>
      <Panel className="flex flex-wrap items-center gap-4 p-4">
        <ShieldCheck className="size-7 text-primary-glow" />
        <div className="flex-1">
          <SectionTitle title="VORQEN Safety Protocol Active" />
          <p className="mt-1 text-xs text-muted-foreground">
            No files will be moved, compressed, or archived without your explicit review and
            confirmation. Rollback snapshot is created automatically prior to disk execution.
          </p>
        </div>
        <Btn
          variant="outline"
          onClick={() => toast.info("No disk writes yet. Your originals are safe.")}
        >
          View Rollback History
        </Btn>
        <Btn
          variant={applied ? "soft-success" : "primary"}
          disabled={!selected.length || applied}
          icon={Check}
          onClick={() => {
            setApplied(true);
            toast.success(`${selected.length} decisions saved`, {
              description: "Preview only: no files moved or deleted.",
            });
          }}
        >
          {applied ? "Decisions Saved" : `Apply ${selected.length} Decisions`}
        </Btn>
      </Panel>
    </PageBody>
  );
}
