import {
  Bot,
  Copy,
  FolderOpen,
  History,
  LayoutGrid,
  ArrowLeftRight,
  BellRing,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to:
    | "/"
    | "/files"
    | "/organize"
    | "/projects"
    | "/storage"
    | "/migration"
    | "/backup"
    | "/assistant"
    | "/inbox"
    | "/activity"
    | "/settings";
  label: string;
  hint?: string;
  icon: LucideIcon;
  badge?: { value: string; tone: "neutral" | "warning" };
  /** Extra path prefixes that should keep this item highlighted */
  also?: string[];
}

export const NAV_PRIMARY: NavItem[] = [
  { to: "/", label: "Dashboard", hint: "Files under control", icon: LayoutGrid },
  { to: "/files", label: "My Files", icon: FolderOpen },
  { to: "/organize", label: "Organize & Batch", icon: Sparkles, badge: { value: "12", tone: "neutral" } },
  { to: "/projects", label: "Project Detective", hint: "Clusters & categories", icon: ScanSearch },
  { to: "/storage", label: "Storage Detective", hint: "Duplicates & space", icon: Copy },
  { to: "/migration", label: "Migration Advisor", hint: "Win to Linux", icon: ArrowLeftRight, also: ["/migration-plan"] },
  { to: "/backup", label: "Backup Safety", icon: ShieldCheck },
  { to: "/assistant", label: "Ask Your Files", hint: "AI chatbot", icon: Bot },
];

export const NAV_SECONDARY: NavItem[] = [
  { to: "/inbox", label: "New Items", icon: BellRing, badge: { value: "3", tone: "warning" } },
  { to: "/activity", label: "Activity", icon: History },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal },
];
