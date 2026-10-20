import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Circle, HardDrive, Minus, Search, Square, User, X, Bot, Fingerprint } from "lucide-react";
import * as React from "react";

import { LOGO_URL } from "@/lib/images";
import { cn } from "@/lib/utils";

import { AssistantDrawer } from "./assistant-drawer";
import { useAssistant } from "./assistant-context";
import { NAV_PRIMARY, NAV_SECONDARY, type NavItem } from "./nav";
import { Bar, Dot } from "./primitives";

function TitleBar() {
  const { toggle, open } = useAssistant();
  return (
    <header className="z-50 flex h-11 shrink-0 items-center justify-between border-b border-border bg-surface-1/95 px-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-danger/80" />
          <span className="size-3 rounded-full bg-warning/80" />
          <span className="size-3 rounded-full bg-success/80" />
        </div>
        <span className="h-4 w-px bg-border-strong" />
        <span className="flex items-center gap-1.5 text-[11.5px] tracking-wide text-muted-foreground">
          <Circle className="size-3 text-success" />
          VORQEN — File Management &amp; AI Migration
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-medium transition-colors",
            open
              ? "border-primary/40 bg-primary/15 text-primary-glow"
              : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
          )}
        >
          <Bot className="size-3.5" />
          AI Assistant
        </button>
        <span className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 text-[11.5px] text-success">
          <Dot tone="success" pulse />
          Monitoring Active (2 folders)
        </span>
        <div className="ml-1 flex items-center">
          {[Minus, Square, X].map((I, i) => (
            <span
              key={i}
              className={cn(
                "flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-3",
                i === 2 ? "hover:text-danger" : "hover:text-foreground",
              )}
            >
              <I className="size-3.5" />
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

function NavLink({ item, path }: { item: NavItem; path: string }) {
  const active =
    item.to === "/" ? path === "/" : path === item.to || path.startsWith(item.to + "/") || item.also?.some((a) => path.startsWith(a));
  const { toggle } = useAssistant();
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-all duration-200",
        active ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary transition-all duration-300",
          active ? "opacity-100 shadow-[0_0_10px_var(--primary)]" : "opacity-0",
        )}
      />
      <Icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary-glow" : "group-hover:text-foreground")} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-tight">{item.label}</span>
        {item.hint && <span className="block truncate text-[10.5px] leading-tight text-subtle">{item.hint}</span>}
      </span>
      {item.badge && (
        <span
          className={cn(
            "rounded px-1.5 text-[10.5px] font-semibold leading-[18px]",
            item.badge.tone === "warning" ? "bg-warning/15 text-warning" : "bg-surface-4 text-foreground",
          )}
        >
          {item.badge.value}
        </span>
      )}
      {item.to === "/assistant" && (
        <button
          type="button"
          aria-label="Toggle assistant drawer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          className="flex size-5 items-center justify-center rounded text-subtle hover:bg-surface-4 hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      )}
    </Link>
  );
}

function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface-1">
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={LOGO_URL} alt="VORQEN emblem" className="h-8 w-8 object-contain" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">VORQEN</span>
              <span className="rounded border border-border-strong bg-surface-3 px-1 text-[10px] font-medium text-muted-foreground">
                v1.4
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">Desktop Core</span>
          </div>
        </Link>
        <button type="button" aria-label="Search" className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-surface-3 hover:text-foreground">
          <Search className="size-3.5" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_PRIMARY.map((n) => (
          <NavLink key={n.to} item={n} path={path} />
        ))}
        <div className="my-2 h-px bg-border" />
        {NAV_SECONDARY.map((n) => (
          <NavLink key={n.to} item={n} path={path} />
        ))}
      </nav>

      <div className="space-y-2 border-t border-border p-2">
        <div className="well p-2.5">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="flex items-center gap-1.5 text-foreground">
              <HardDrive className="size-3.5 text-primary-glow" /> D: Drive
            </span>
            <span className="font-medium text-muted-foreground">68%</span>
          </div>
          <Bar value={68} className="mt-2" />
          <div className="mt-1.5 flex justify-between text-[10.5px] text-subtle">
            <span>340 GB free</span>
            <span>1 TB Total</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/80 text-primary-foreground">
            <User className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-foreground">Local Admin</p>
            <p className="text-[10.5px] text-subtle">Encrypted</p>
          </div>
          <span className="flex size-8 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground">
            <Fingerprint className="size-4" />
          </span>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative min-w-0 flex-1 overflow-y-auto">{children}</main>
        <AssistantDrawer />
      </div>
    </div>
  );
}
