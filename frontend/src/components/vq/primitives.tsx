import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Buttons */

export const btnVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-glow shadow-[0_6px_20px_-8px_var(--primary)]",
        success: "bg-success text-success-foreground hover:brightness-110",
        warning: "bg-warning/90 text-warning-foreground hover:bg-warning",
        soft: "bg-surface-3 text-foreground hover:bg-surface-4 border border-border",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-surface-3",
        outline:
          "border border-border-strong text-foreground hover:bg-surface-3 hover:border-primary/40",
        "soft-primary":
          "bg-primary/15 text-primary-glow border border-primary/30 hover:bg-primary/25",
        "soft-success":
          "bg-success/12 text-success border border-success/25 hover:bg-success/20",
        "soft-warning":
          "bg-warning/12 text-warning border border-warning/25 hover:bg-warning/20",
        "soft-danger": "bg-danger/12 text-danger border border-danger/25 hover:bg-danger/20",
      },
      size: {
        xs: "h-6 px-2 text-[11px]",
        sm: "h-7 px-2.5 text-xs",
        md: "h-8 px-3 text-[13px]",
        lg: "h-10 px-4 text-sm",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: { variant: "soft", size: "md" },
  },
);

export interface BtnProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof btnVariants> {
  icon?: LucideIcon | undefined;
  iconRight?: LucideIcon | undefined;
}

export const Btn = React.forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, variant, size, icon: Icon, iconRight: IconRight, children, ...props }, ref) => (
    <button ref={ref} className={cn(btnVariants({ variant, size }), className)} {...props}>
      {Icon && <Icon />}
      {children}
      {IconRight && <IconRight />}
    </button>
  ),
);
Btn.displayName = "Btn";

/* ------------------------------------------------------------------ Chips */

export type Tone = "primary" | "success" | "warning" | "danger" | "neutral";

const chipVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] border font-medium [&_svg]:size-3",
  {
    variants: {
      tone: {
        primary: "bg-primary/12 text-primary-glow border-primary/25",
        success: "bg-success/10 text-success border-success/25",
        warning: "bg-warning/10 text-warning border-warning/25",
        danger: "bg-danger/10 text-danger border-danger/25",
        neutral: "bg-surface-3 text-muted-foreground border-border",
      },
      size: {
        xs: "h-5 px-1.5 text-[10.5px]",
        sm: "h-[22px] px-2 text-[11px]",
        md: "h-6 px-2.5 text-xs",
      },
      caps: { true: "uppercase tracking-[0.06em]", false: "" },
    },
    defaultVariants: { tone: "neutral", size: "sm", caps: false },
  },
);

const dotTone: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-subtle",
};

export function Chip({
  tone = "neutral",
  size,
  caps,
  dot,
  pulse,
  icon: Icon,
  className,
  children,
}: {
  tone?: Tone | undefined;
  size?: "xs" | "sm" | "md" | undefined;
  caps?: boolean | undefined;
  dot?: boolean | undefined;
  pulse?: boolean | undefined;
  icon?: LucideIcon | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <span className={cn(chipVariants({ tone, size, caps }), className)}>
      {dot && <Dot tone={tone} pulse={pulse} />}
      {Icon && <Icon />}
      {children}
    </span>
  );
}

export function Dot({
  tone = "success",
  pulse,
  className,
}: {
  tone?: Tone | undefined;
  pulse?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <span className={cn("relative inline-flex size-1.5 shrink-0 rounded-full", dotTone[tone], className)}>
      {pulse && (
        <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", dotTone[tone])} />
      )}
    </span>
  );
}

export const toneText: Record<Tone, string> = {
  primary: "text-primary-glow",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-muted-foreground",
};

export const toneTile: Record<Tone, string> = {
  primary: "bg-primary/12 text-primary-glow border-primary/25",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/25",
  neutral: "bg-surface-3 text-muted-foreground border-border",
};

export const toneBar: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-subtle",
};

/* ------------------------------------------------------------------ Panels */

export function Panel({
  className,
  glow,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { glow?: "primary" | "success" | undefined }) {
  return (
    <div
      className={cn(
        "panel relative",
        glow === "primary" && "glow-orbit",
        glow === "success" && "glow-orbit-success",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function IconTile({
  icon: Icon,
  tone = "neutral",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  className?: string | undefined;
}) {
  const s = size === "sm" ? "size-7 [&_svg]:size-3.5" : size === "lg" ? "size-11 [&_svg]:size-5" : "size-9 [&_svg]:size-4";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border",
        toneTile[tone],
        s,
        className,
      )}
    >
      <Icon />
    </span>
  );
}

export function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  right,
  iconTone = "primary",
  className,
}: {
  icon?: LucideIcon | undefined;
  title: React.ReactNode;
  subtitle?: React.ReactNode | undefined;
  right?: React.ReactNode | undefined;
  iconTone?: Tone | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && <Icon className={cn("mt-0.5 size-4 shrink-0", toneText[iconTone])} />}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ Page header */

export function PageHeader({
  eyebrow,
  title,
  badge,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode | undefined;
  title: React.ReactNode;
  badge?: React.ReactNode | undefined;
  description?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px]">{eyebrow}</div>}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-foreground">
            {title}
          </h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-[13.5px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EngineTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[4px] bg-primary/20 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-primary-glow">
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- Stat card */

export function StatCard({
  label,
  value,
  unit,
  sub,
  icon: Icon,
  tone = "neutral",
  right,
  progress,
  children,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode | undefined;
  sub?: React.ReactNode | undefined;
  icon?: LucideIcon | undefined;
  tone?: Tone | undefined;
  right?: React.ReactNode | undefined;
  progress?: number | undefined;
  children?: React.ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <Panel
      className={cn(
        "group p-4 transition-colors hover:border-border-strong",
        tone === "primary" && "glow-orbit",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {right ?? (Icon && <Icon className={cn("size-4", toneText[tone])} />)}
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-[26px] font-semibold leading-none tracking-[-0.03em]",
            tone === "neutral" ? "text-foreground" : toneText[tone],
          )}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {sub && <div className="mt-2 text-xs text-muted-foreground">{sub}</div>}
      {progress !== undefined && <Bar value={progress} tone={tone === "neutral" ? "primary" : tone} className="mt-3" />}
      {children}
    </Panel>
  );
}

/* ------------------------------------------------------------ Progress bar */

export function Bar({
  value,
  tone = "primary",
  gradient,
  className,
  height = "h-1.5",
}: {
  value: number;
  tone?: Tone | undefined;
  gradient?: boolean | undefined;
  className?: string | undefined;
  height?: string | undefined;
}) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-surface-3", height, className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          gradient ? "bg-gradient-progress" : toneBar[tone],
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------- Checkbox (light) */

export function Check2({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? "Select"}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-strong bg-surface-0 hover:border-primary/60",
        className,
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}

/* -------------------------------------------------------- Segmented tabs */

export function SegTabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: React.ReactNode; count?: number | string; tone?: Tone }[];
  className?: string | undefined;
}) {
  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface-1 p-1", className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className={cn(
              "inline-flex h-7 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-all",
              active
                ? "bg-surface-3 text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)]"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span
                className={cn(
                  "rounded px-1.5 text-[10.5px] font-semibold leading-4",
                  it.tone ? toneTile[it.tone] : active ? "bg-primary/20 text-primary-glow" : "bg-surface-3 text-muted-foreground",
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Misc */

export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        "mono rounded-[4px] border border-border bg-surface-0 px-1.5 py-px text-[11.5px] text-foreground",
        className,
      )}
    >
      {children}
    </code>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-px text-[10px] font-medium">
      {children}
    </kbd>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1500px] space-y-5 px-6 py-5 animate-fade-up", className)}>{children}</div>;
}
