import { Link } from "@tanstack/react-router";
import { Bot, Expand, Lock, Send, X } from "lucide-react";
import * as React from "react";

import { answer, PRESET_PROMPTS, userMessage, type ChatMessage } from "@/lib/assistant";
import { cn } from "@/lib/utils";

import { useAssistant } from "./assistant-context";
import { FileHitCard } from "./file-hit-card";
import { Chip, Dot } from "./primitives";

export function AssistantDrawer() {
  const { open, setOpen, pending, clearPending } = useAssistant();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const scroller = React.useRef<HTMLDivElement>(null);

  const send = React.useCallback((q: string) => {
    const text = q.trim();
    if (!text) return;
    setMessages((m) => [...m, userMessage(text)]);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, answer(text)]);
      setThinking(false);
    }, 650);
  }, []);

  React.useEffect(() => {
    if (pending) {
      send(pending);
      clearPending();
    }
  }, [pending, send, clearPending]);

  React.useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border-l border-border bg-surface-1/95 backdrop-blur-md transition-[width,opacity] duration-300 ease-out",
        open ? "w-[380px] opacity-100" : "w-0 border-l-0 opacity-0",
      )}
    >
      <div className="flex w-[380px] items-center justify-between border-b border-border px-4 py-3 glow-orbit">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary-glow">
            <Bot className="size-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-foreground">VORQEN Assistant</p>
            <p className="flex items-center gap-1 text-[10.5px] text-success">
              <Dot tone="success" /> Local File LLM · Offline &amp; Private
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/assistant"
            aria-label="Open full chat"
            className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-surface-3 hover:text-foreground"
          >
            <Expand className="size-3.5" />
          </Link>
          <button
            type="button"
            aria-label="Close assistant"
            onClick={() => setOpen(false)}
            className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-surface-3 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div ref={scroller} className="w-[380px] flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="well p-3 text-xs text-muted-foreground">
              <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                <Lock className="size-3.5 text-success" /> Zero-telemetry mode
              </p>
              Ask anything about your 14,820 indexed files. Contents never leave this device.
            </div>
            <p className="eyebrow">Try asking</p>
            <div className="flex flex-col gap-1.5">
              {PRESET_PROMPTS.slice(0, 4).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-md border border-border bg-surface-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-surface-3"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-8 rounded-lg border border-border-strong bg-surface-3 px-3 py-2 text-[13px] text-foreground animate-fade-up">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="space-y-2 animate-fade-up">
              <p className="text-[13px] leading-relaxed text-foreground">{m.text}</p>
              {m.health && (
                <Chip tone={m.health.tone} size="sm" className="h-auto whitespace-normal py-1">
                  {m.health.text}
                </Chip>
              )}
              {m.files?.map((f) => <FileHitCard key={f.name} file={f} compact />)}
            </div>
          ),
        )}
        {thinking && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-16 rounded-full bg-gradient-to-r from-primary/10 via-primary/70 to-primary/10 animate-shimmer" />
            Searching local index…
          </div>
        )}
      </div>

      <form
        className="w-[380px] border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-0 px-3 focus-within:border-primary/50">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your files…"
            className="h-9 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-subtle focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send"
            className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary-glow"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
}
