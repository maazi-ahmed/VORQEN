import { useEffect, useState } from "react";
import { Folder, Pencil, Sparkles, X, Check, Tags } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Btn, Check2, IconTile } from "./primitives";
export type ContextItem = {
  id: string;
  name: string;
  path: string;
  kind: "folder" | "file" | "batch";
  suggestion?: string;
};
export function ContextDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ContextItem;
}) {
  const [name, setName] = useState(item.name),
    [editing, setEditing] = useState(false),
    [description, setDescription] = useState(""),
    [category, setCategory] = useState("Software Project"),
    [importance, setImportance] = useState("High"),
    [handling, setHandling] = useState("Keep"),
    [tags, setTags] = useState(["thesis", "pytorch", "ml"]),
    [tag, setTag] = useState(""),
    [note, setNote] = useState("Keep local venv clean before Linux migration."),
    [related, setRelated] = useState(true),
    [never, setNever] = useState(false);
  useEffect(() => {
    setName(item.name);
    setDescription(
      item.suggestion ||
        "Final thesis experiments evaluating PyTorch transformer models on local GPU.",
    );
    setEditing(false);
  }, [item.id, item.name, item.suggestion]);
  const field =
    "w-full rounded-md border border-border bg-surface-0 p-2 text-foreground outline-none focus:border-primary";
  const options = (values: string[], value: string, set: (s: string) => void) => (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <Btn
          key={v}
          size="sm"
          className="flex-1"
          variant={value === v ? (v === "Keep" ? "success" : "primary") : "ghost"}
          onClick={() => set(v)}
        >
          {v}
        </Btn>
      ))}
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] max-h-[90vh] overflow-y-auto border-border bg-surface-1 p-5 text-foreground">
        <DialogTitle className="text-base">Tell VORQEN about this</DialogTitle>
        <DialogDescription className="sr-only">
          Add local context and handling preferences for {item.name}.
        </DialogDescription>
        <div className="flex items-center gap-3 rounded-lg bg-surface-2/40 p-2">
          <IconTile icon={Folder} tone="primary" size="lg" />
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                aria-label="Item name"
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : (
              <h3 className="font-semibold text-base">{name}</h3>
            )}
            <p className="text-xs text-muted-foreground break-all">{item.path}</p>
          </div>
          <Btn
            size="icon"
            variant="ghost"
            icon={Pencil}
            aria-label="Edit item name"
            onClick={() => setEditing(!editing)}
          />
        </div>
        <label className="space-y-2">
          <span className="flex justify-between font-medium">
            What is this file or folder for?{" "}
            <span className="flex items-center gap-1 text-xs text-primary-glow">
              <Sparkles className="size-3" />
              AI Suggested
            </span>
          </span>
          <textarea
            className={field}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div>
          <p className="mb-2 font-medium">Category</p>
          <div className="grid grid-cols-3 gap-1">
            {["University", "Research", "Software Project", "Personal", "Media", "Other"].map(
              (c) => (
                <Btn
                  key={c}
                  size="sm"
                  variant={category === c ? "primary" : "ghost"}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </Btn>
              ),
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="mb-2">Importance</p>
            {options(["High", "Normal", "Low"], importance, setImportance)}
          </div>
          <div>
            <p className="mb-2">Handling</p>
            {options(["Keep", "Archive", "Review"], handling, setHandling)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-2">
            <Tags className="size-4 text-primary-glow" />
            Tags & Notes <span className="ml-auto text-xs text-subtle">Optional Metadata</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t}
                className="flex items-center gap-1 rounded bg-surface-3 px-2 py-1 text-xs text-primary-glow"
                onClick={() => setTags(tags.filter((x) => x !== t))}
              >
                #{t}
                <X className="size-3" />
              </button>
            ))}
            <input
              aria-label="Add tag"
              placeholder="+ Add tag"
              className="w-24 rounded bg-surface-2 px-2 outline-none"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tag.trim()) {
                  setTags([...new Set([...tags, tag.trim()])]);
                  setTag("");
                }
              }}
            />
          </div>
          <input
            aria-label="Notes"
            className={field}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="flex gap-2 rounded-lg bg-surface-2 p-3">
          <Check2 checked={related} onChange={setRelated} />
          <div>
            <p>Use this context to help organize related files</p>
            <p className="mt-1 text-xs text-muted-foreground">
              VORQEN uses this strictly on-device to cluster future downloads, model scripts, and
              research datasets.
            </p>
          </div>
        </div>
        <footer className="flex flex-wrap items-center gap-2 pt-2">
          <button
            className="mr-auto text-xs text-muted-foreground underline"
            onClick={() => setNever(!never)}
          >
            {never ? "✓ " : ""}Don't Ask Again for This Item
          </button>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>
            Skip for Now
          </Btn>
          <Btn
            variant="primary"
            icon={Check}
            onClick={() => {
              toast.success(`Details saved for ${name}`, {
                description: `${category} · ${importance} importance · ${handling}. Context stays on-device.`,
              });
              onOpenChange(false);
            }}
          >
            Save Details
          </Btn>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
