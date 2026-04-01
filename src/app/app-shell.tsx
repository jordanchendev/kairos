import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { CommandMenu } from "@/app/command-menu";
import { navigationGroups, navigationItems } from "@/app/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { marketOptions, timeRangeOptions, useUiStore } from "@/stores/ui-store";

export function AppShell() {
  const location = useLocation();
  const selectedMarket = useUiStore((state) => state.selectedMarket);
  const selectedTimeRange = useUiStore((state) => state.selectedTimeRange);
  const setSelectedMarket = useUiStore((state) => state.setSelectedMarket);
  const setSelectedTimeRange = useUiStore((state) => state.setSelectedTimeRange);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  const activeItem = navigationItems.find((item) => item.path === location.pathname) ?? navigationItems[0];

  return (
    <div className="grid min-h-screen lg:grid-cols-[auto_1fr]">
      <aside
        className={cn(
          "grid-overlay border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] px-4 py-6 transition-all duration-300",
          sidebarCollapsed ? "w-[92px]" : "w-[304px]",
        )}
      >
        <div className="flex h-full flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className={cn("space-y-1", sidebarCollapsed && "hidden")}>
              <p className="text-xs uppercase tracking-[0.32em] text-[hsl(var(--muted-foreground))]">Kairos v6</p>
              <h1 className="text-2xl font-semibold text-[hsl(var(--sidebar-foreground))]">Trading Shell</h1>
            </div>
            <Button onClick={toggleSidebar} size="icon" variant="ghost">
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </div>

          <nav className="flex-1 space-y-6">
            {navigationGroups.map((group) => (
              <section key={group.title}>
                <div
                  className={cn(
                    "mb-3 px-3 text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]",
                    sidebarCollapsed && "text-center",
                  )}
                >
                  {sidebarCollapsed ? group.title.slice(0, 1) : group.title}
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-sm transition-colors",
                            isActive
                              ? "border-[hsl(var(--border))] bg-[hsla(190,91%,37%,0.12)] text-[hsl(var(--sidebar-foreground))]"
                              : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]",
                            sidebarCollapsed && "justify-center px-0",
                          )
                        }
                        key={item.path}
                        to={item.path}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!sidebarCollapsed && (
                          <div className="min-w-0">
                            <div className="font-medium">{item.title}</div>
                            <div className="truncate text-xs text-[hsl(var(--muted-foreground))]">{item.description}</div>
                          </div>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[hsl(var(--border))] bg-[hsla(225,47%,4%,0.78)] px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <Button className="lg:hidden" onClick={toggleSidebar} size="icon" variant="ghost">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open sidebar</span>
              </Button>
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">{activeItem.pageId}</div>
                <div className="text-2xl font-semibold text-[hsl(var(--foreground))]">{activeItem.title}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="panel-surface flex min-w-[12rem] items-center gap-2 rounded-full px-4 py-2">
                <span className="text-xs uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">Market</span>
                <select
                  className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none"
                  onChange={(event) => setSelectedMarket(event.target.value as (typeof marketOptions)[number])}
                  value={selectedMarket}
                >
                  {marketOptions.map((option) => (
                    <option className="bg-[hsl(var(--card))]" key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="panel-surface flex min-w-[9rem] items-center gap-2 rounded-full px-4 py-2">
                <span className="text-xs uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">Range</span>
                <select
                  className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none"
                  onChange={(event) => setSelectedTimeRange(event.target.value as (typeof timeRangeOptions)[number])}
                  value={selectedTimeRange}
                >
                  {timeRangeOptions.map((option) => (
                    <option className="bg-[hsl(var(--card))]" key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <CommandMenu items={navigationItems} />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
