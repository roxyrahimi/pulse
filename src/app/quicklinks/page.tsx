"use client";

import { useState } from "react";
import { ExternalLink, Plus, Trash2, Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type QuickLink = {
  id: string;
  label: string;
  url: string;
  description?: string;
  category: "AI" | "School" | "Tools";
};

const DEFAULT_LINKS: QuickLink[] = [
  {
    id: "claude",
    label: "Claude",
    url: "https://claude.ai/new",
    description: "Anthropic's AI assistant — start a new chat",
    category: "AI",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    url: "https://chatgpt.com/",
    description: "OpenAI's conversational AI",
    category: "AI",
  },
  {
    id: "scribbr",
    label: "Scribbr AI Detector",
    url: "https://www.scribbr.com/ai-detector/",
    description: "Check writing for AI-generated content",
    category: "Tools",
  },
  {
    id: "canvas-socccd",
    label: "Canvas (SOCCCD)",
    url: "https://canvas.socccd.edu/",
    description: "South Orange County Community College District",
    category: "School",
  },
  {
    id: "canvas-coast",
    label: "Canvas (Coast District)",
    url: "https://coastdistrict.instructure.com/login?needs_cookies=1",
    description: "Coast Community College District login",
    category: "School",
  },
];

const STORAGE_KEY = "pulse-quicklinks";

function loadLinks(): QuickLink[] {
  if (typeof window === "undefined") return DEFAULT_LINKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LINKS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LINKS;
    return parsed;
  } catch {
    return DEFAULT_LINKS;
  }
}

function saveLinks(links: QuickLink[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function getFavicon(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return "";
  }
}

export default function QuickLinksPage() {
  const [links, setLinks] = useState<QuickLink[]>(() => loadLinks());
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<QuickLink["category"]>("Tools");

  const update = (next: QuickLink[]) => {
    setLinks(next);
    saveLinks(next);
  };

  const handleAdd = () => {
    if (!newLabel.trim() || !newUrl.trim()) {
      toast.error("Label and URL are required");
      return;
    }
    let url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      new URL(url);
    } catch {
      toast.error("That doesn't look like a valid URL");
      return;
    }
    const link: QuickLink = {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      url,
      category: newCategory,
    };
    update([...links, link]);
    setNewLabel("");
    setNewUrl("");
    setOpen(false);
    toast.success("Link added");
  };

  const handleDelete = (id: string) => {
    update(links.filter((l) => l.id !== id));
    toast.success("Link removed");
  };

  const resetDefaults = () => {
    update(DEFAULT_LINKS);
    toast.success("Defaults restored");
  };

  const grouped = links.reduce<Record<string, QuickLink[]>>((acc, l) => {
    (acc[l.category] ??= []).push(l);
    return acc;
  }, {});

  const order: QuickLink["category"][] = ["School", "AI", "Tools"];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Link2 className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Quick Links</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            One-click access to the sites you use most
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetDefaults}>
            Reset
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a quick link</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Label</Label>
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Gradebook"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>URL</Label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <div className="flex gap-2">
                    {(["School", "AI", "Tools"] as const).map((c) => (
                      <Button
                        key={c}
                        type="button"
                        variant={newCategory === c ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewCategory(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>Add link</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {order.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        return (
          <section key={cat} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {cat}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((link) => (
                <LinkCard key={link.id} link={link} onDelete={() => handleDelete(link.id)} />
              ))}
            </div>
          </section>
        );
      })}

      {links.length === 0 && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">No links yet.</p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add your first link
          </Button>
        </Card>
      )}
    </div>
  );
}

function LinkCard({ link, onDelete }: { link: QuickLink; onDelete: () => void }) {
  const favicon = getFavicon(link.url);
  let hostname = "";
  try {
    hostname = new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    hostname = link.url;
  }

  return (
    <Card className="group relative overflow-hidden p-4 transition-all hover:border-primary/40 hover:shadow-sm">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="" className="h-6 w-6" />
          ) : (
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-semibold leading-tight">{link.label}</h3>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="truncate text-xs text-muted-foreground">{hostname}</div>
          {link.description && (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {link.description}
            </div>
          )}
        </div>
      </a>
      <button
        onClick={onDelete}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
        title="Remove link"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </Card>
  );
}
