import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  PenSquare,
  CalendarDays,
  Clock,
  Users,
  Inbox,
  Settings,
  Sparkles,
  TrendingUp,
  Megaphone,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  BarChart3,
  Target,
  PlusCircle,
  GitCompare,
  Briefcase,

} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import logoAsset from "@/assets/logo-zoetbezorgen.avif.asset.json";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await supabase.auth.signOut();
      }}
      disabled={busy}
      className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-sidebar-accent"
    >
      <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
      Uitloggen
    </button>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored ? stored === "dark" : false;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <button
      onClick={toggle}
      className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-sidebar-accent"
    >
      {dark ? <Sun className="h-3.5 w-3.5 text-warning" /> : <Moon className="h-3.5 w-3.5 text-primary" />}
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

type NavItem = { to: string; label: string; icon: typeof Megaphone };
type NavSection = NavItem & { children?: NavItem[] };

const nav: NavSection[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/composer", label: "Post Composer", icon: PenSquare },
  { to: "/schedule", label: "Beste posttijd", icon: Clock },
  { to: "/calendar", label: "Kalender", icon: CalendarDays },
  { to: "/trends", label: "Trends", icon: TrendingUp },
  { to: "/competitors", label: "Concurrentie", icon: Users },
  {
    to: "/ads",
    label: "Ads",
    icon: Megaphone,
    children: [
      { to: "/ads/google", label: "Google Ads", icon: BarChart3 },
      { to: "/ads/google/new", label: "Nieuwe campagne", icon: PlusCircle },
      { to: "/ads/google/conversions", label: "Conversies", icon: Target },
      { to: "/ads/compare", label: "Vergelijk concurrent", icon: GitCompare },
    ],
  },
  {
    to: "/leads",
    label: "Leads",
    icon: Briefcase,
    children: [
      { to: "/leads", label: "Alle leads", icon: Briefcase },
      { to: "/leads/branches", label: "Branches", icon: BarChart3 },
      { to: "/leads/funnels", label: "Funnels", icon: GitCompare },
    ],
  },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/settings", label: "Instellingen", icon: Settings },

];

function NavEntry({ item, pathname }: { item: NavSection; pathname: string }) {
  const hasChildren = !!item.children;
  const isRootActive = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (hasChildren && isRootActive) setExpanded(true);
  }, [isRootActive, hasChildren]);

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            isRootActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
          )}
        >
          <item.icon
            className={cn("h-4 w-4", isRootActive && "text-primary")}
            strokeWidth={isRootActive ? 2.4 : 1.8}
          />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
          />
        </button>
        {expanded && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
            {item.children!.map((child) => {
              const childActive =
                child.to === "/ads/google"
                  ? pathname === "/ads/google" || /^\/ads\/google\/[^/]+$/.test(pathname)
                  : pathname.startsWith(child.to);
              return (
                <Link
                  key={child.to}
                  to={child.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    childActive
                      ? "bg-sidebar-accent/80 font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <child.icon
                    className={cn("h-3.5 w-3.5", childActive && "text-primary")}
                    strokeWidth={childActive ? 2.2 : 1.6}
                  />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isRootActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon
        className={cn("h-4 w-4", isRootActive && "text-primary")}
        strokeWidth={isRootActive ? 2.4 : 1.8}
      />
      {item.label}
    </Link>
  );
}

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
          {nav.map((item) => (
            <NavEntry key={item.to} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="m-3 space-y-2">
          <ThemeToggle />
          <SignOutButton />
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Demo data actief
            </div>
            <p className="mt-1 text-muted-foreground">
              TikTok & LinkedIn live koppelen in instellingen.
            </p>
          </div>
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
