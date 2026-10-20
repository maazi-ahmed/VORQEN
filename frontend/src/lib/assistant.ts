// Mock on-device "Local File LLM" used by the Ask Your Files page and the
// embedded assistant drawer. Answers are deterministic and file-aware.

export type Lang = "en" | "fr" | "ar";

export interface FileHit {
  name: string;
  path: string;
  size: string;
  date: string;
  summary: string;
  tags: string[];
  compat: "safe" | "review" | "blocked";
  kind: "pdf" | "code" | "data" | "archive" | "folder" | "binary";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  intro?: string;
  health?: { tone: "success" | "warning"; text: string };
  files?: FileHit[];
  latency?: string;
}

export const PRESET_PROMPTS = [
  "Find my machine learning projects",
  "Show university PDFs about Hadoop",
  "Which files can I delete before formatting?",
  "Find duplicate files taking up space",
  "Help me organize my Downloads folder",
];

const HADOOP: FileHit[] = [
  {
    name: "CS6210_Lec04_Hadoop_MapReduce.pdf",
    path: "D:\\GeorgiaTech\\CS6210\\Lectures\\",
    size: "3.8 MB",
    date: "Oct 14, 2023",
    summary: "Covers Hadoop distributed architecture, HDFS namenode replication, and MapReduce task runners.",
    tags: ["HDFS", "MapReduce", "CS6210"],
    compat: "safe",
    kind: "pdf",
  },
  {
    name: "Hadoop_Cluster_Lab_Report_Final.pdf",
    path: "D:\\GeorgiaTech\\CS6210\\Labs\\Lab2\\",
    size: "1.4 MB",
    date: "Nov 02, 2023",
    summary: "Lab evaluation on 4-node cluster with benchmark charts.",
    tags: ["Lab", "4-node cluster"],
    compat: "safe",
    kind: "pdf",
  },
  {
    name: "YARN_Scheduling_Survey.pdf",
    path: "D:\\Coursework\\Spring2025\\DistributedSystems\\",
    size: "2.2 MB",
    date: "Feb 11, 2025",
    summary: "Survey of YARN capacity and fair schedulers with citations to Google Borg.",
    tags: ["YARN", "Survey"],
    compat: "safe",
    kind: "pdf",
  },
];

const ML: FileHit[] = [
  {
    name: "Machine Learning Thesis",
    path: "D:\\Projects\\Machine Learning Thesis\\",
    size: "2.4 GB",
    date: "Yesterday",
    summary: "Primary PyTorch pipeline: model_pipeline.py, train_eval_loop.py, checkpoints and parquet datasets.",
    tags: ["PyTorch", "Thesis", "Git tracked"],
    compat: "review",
    kind: "folder",
  },
  {
    name: "weights.pt",
    path: "D:\\Temp\\Torch_Run\\",
    size: "1.1 GB",
    date: "Oct 09, 2024",
    summary: "Orphaned model weights matching the thesis project. Suggested: group into D:\\Projects\\ML-Thesis.",
    tags: ["Weights", "Scattered"],
    compat: "safe",
    kind: "binary",
  },
  {
    name: "Deep Learning Project",
    path: "D:\\Projects\\Deep Learning Project\\",
    size: "1.4 GB",
    date: "4 min ago",
    summary: "Contains untracked Python virtualenv (.venv) — freeze to requirements.txt before migrating.",
    tags: [".venv", "Transformers"],
    compat: "review",
    kind: "code",
  },
];

const CLEANUP: FileHit[] = [
  {
    name: "node_modules (Downloads cache)",
    path: "C:\\Users\\Dev\\Downloads\\",
    size: "18.4 GB",
    date: "Inactive > 90 days",
    summary: "Re-installable dependency cache. Safe to archive; nothing is deleted automatically.",
    tags: ["Cache", "Reinstallable"],
    compat: "safe",
    kind: "folder",
  },
  {
    name: "dataset_v1_clean (1).parquet",
    path: "C:\\Users\\Admin\\Downloads\\",
    size: "14.2 GB",
    date: "3 weeks ago",
    summary: "Exact SHA-256 duplicate of a Git-tracked copy inside D:\\Projects\\ML-Thesis.",
    tags: ["Duplicate", "SHA-256 match"],
    compat: "safe",
    kind: "data",
  },
  {
    name: "win10_dev.vdi",
    path: "D:\\VirtualBox VMs\\",
    size: "42.0 GB",
    date: "Jun 2024",
    summary: "NTFS image container. Review before migration — may hold licensed software.",
    tags: ["VM image", "Review"],
    compat: "review",
    kind: "archive",
  },
];

function stamp() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

let counter = 0;
export function makeId() {
  counter += 1;
  return `m${Date.now()}-${counter}`;
}

export function userMessage(text: string): ChatMessage {
  return { id: makeId(), role: "user", text, time: stamp() };
}

export function answer(query: string, lang: Lang = "en"): ChatMessage {
  const q = query.toLowerCase();
  const base = { id: makeId(), role: "assistant" as const, time: stamp(), latency: `${(0.08 + Math.random() * 0.2).toFixed(2)}s` };
  const prefix = lang === "fr" ? "[FR] " : lang === "ar" ? "[AR] " : "";

  if (q.includes("hadoop") || q.includes("pdf") || q.includes("university")) {
    return {
      ...base,
      text: `${prefix}Found ${HADOOP.length} documents matching "Hadoop" across your coursework folders. All are standard PDFs, 100% compatible with Linux viewers (Evince, Okular).`,
      health: { tone: "success", text: "Migration health check: 0 proprietary Windows format dependencies identified." },
      files: HADOOP,
    };
  }
  if (q.includes("machine") || q.includes("ml") || q.includes("project")) {
    return {
      ...base,
      text: `${prefix}I found ${ML.length} machine-learning workspaces. One is scattered across 3 folders and one contains a Windows-only virtualenv.`,
      health: { tone: "warning", text: "1 virtualenv uses Win32 binaries — VORQEN will generate requirements.txt for Linux." },
      files: ML,
    };
  }
  if (q.includes("delete") || q.includes("format") || q.includes("duplicate") || q.includes("space") || q.includes("download")) {
    return {
      ...base,
      text: `${prefix}These ${CLEANUP.length} items are the safest candidates to archive before formatting — 74.6 GB in total. VORQEN never deletes files automatically; you approve every move.`,
      health: { tone: "success", text: "All primaries are backed up and verified on Samsung T7 Shield." },
      files: CLEANUP,
    };
  }
  return {
    ...base,
    text: `${prefix}I searched 14,820 indexed items for "${query}". Here are the closest matches from your local semantic index.`,
    files: [HADOOP[0]!, ML[0]!],
  };
}
