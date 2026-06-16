import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  PenSquare,
  CalendarDays,
  Users,
  Inbox,
  Settings,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import logoAsset from "@/assets/logo-zoetbezorgen.avif.asset.json";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/composer", label: "Post Composer", icon: PenSquare },
  { to: "/calendar", label: "Kalender", icon: CalendarDays },
  { to: "/competitors", label: "Concurrentie", icon: Users },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/settings", label: "Instellingen", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <img
            src={logoAsset.url}
            alt="ZoetBezorgen"
            className="h-10 w-10 rounded-md object-contain"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold">ZoetBezorgen</div>
            <div className="text-xs text-muted-foreground">Social Cockpit</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon
                  className={cn("h-4 w-4", active && "text-primary")}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Demo data actief
          </div>
          <p className="mt-1 text-muted-foreground">
            TikTok & LinkedIn live koppelen in instellingen.
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-8 md:px-10">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
