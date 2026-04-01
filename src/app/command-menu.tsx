import { useEffect, useMemo, useState } from "react";

import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import type { NavigationItem } from "@/app/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/stores/ui-store";

type CommandMenuProps = {
  items: NavigationItem[];
};

export function CommandMenu({ items }: CommandMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const commandPaletteOpen = useUiStore((state) => state.commandPaletteOpen);
  const setCommandPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      return [item.title, item.description, item.pageId].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [items, query]);

  return (
    <>
      <Button className="gap-2 rounded-full" onClick={() => setCommandPaletteOpen(true)} size="sm" variant="outline">
        <Search className="h-4 w-4" />
        Cmd+K
      </Button>
      <Dialog onOpenChange={setCommandPaletteOpen} open={commandPaletteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Command Menu</DialogTitle>
            <DialogDescription>Phase 29 ships a navigation-first command palette stub for the full route map.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
              <Search className="h-4 w-4" />
              <input
                className="w-full bg-transparent text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search placeholder routes, reports, or health views"
                value={query}
              />
            </label>
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                    location.pathname === item.path
                      ? "border-[hsl(var(--accent))] bg-[hsla(190,91%,37%,0.12)]"
                      : "border-[hsl(var(--border))] bg-[hsla(0,0%,100%,0.02)] hover:bg-[hsl(var(--muted))]",
                  )}
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setCommandPaletteOpen(false);
                  }}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-[hsl(var(--foreground))]">{item.title}</div>
                      <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{item.description}</div>
                    </div>
                    <div className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                      {item.pageId}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
