import * as React from "react";

interface AssistantCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  /** Open the drawer and immediately ask a question */
  ask: (q: string) => void;
  pending: string | null;
  clearPending: () => void;
}

const Ctx = React.createContext<AssistantCtx | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const value = React.useMemo<AssistantCtx>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((o) => !o),
      ask: (q) => {
        setPending(q);
        setOpen(true);
      },
      pending,
      clearPending: () => setPending(null),
    }),
    [open, pending],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAssistant() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useAssistant must be used inside AssistantProvider");
  return c;
}
