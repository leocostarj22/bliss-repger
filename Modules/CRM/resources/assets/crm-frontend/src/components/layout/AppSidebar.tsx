import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Send,
  Users,
  BarChart3,
  Workflow,
  Settings,
  ChevronLeft,
  ChevronRight,
  Mail,
  ArrowLeft,
  FileEdit,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', color: 'cyan' },
  { label: 'Campanhas', icon: Send, path: '/campaigns', color: 'fuchsia' },
  { label: 'Contactos', icon: Users, path: '/contacts', color: 'emerald' },
  { label: 'Segmentos', icon: Mail, path: '/segments', color: 'violet' },
  { label: 'Templates', icon: FileEdit, path: '/templates', color: 'amber' },
  { label: 'Automações', icon: Workflow, path: '/automations', color: 'sky' },
  { label: 'Analítica', icon: BarChart3, path: '/analytics', color: 'cyan' },
  { label: 'Configurações', icon: Settings, path: '/settings', color: 'slate' },
] as const;

type NavColor = (typeof navItems)[number]['color'];

const colorStyles: Record<NavColor, { icon: string; glow: string; hover: string }> = {
  cyan: {
    icon: 'text-cyan-400',
    glow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]',
    hover: 'group-hover:text-cyan-300',
  },
  fuchsia: {
    icon: 'text-fuchsia-400',
    glow: 'drop-shadow-[0_0_10px_rgba(232,121,249,0.45)]',
    hover: 'group-hover:text-fuchsia-300',
  },
  emerald: {
    icon: 'text-emerald-400',
    glow: 'drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]',
    hover: 'group-hover:text-emerald-300',
  },
  violet: {
    icon: 'text-violet-400',
    glow: 'drop-shadow-[0_0_10px_rgba(167,139,250,0.45)]',
    hover: 'group-hover:text-violet-300',
  },
  amber: {
    icon: 'text-amber-400',
    glow: 'drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]',
    hover: 'group-hover:text-amber-300',
  },
  sky: {
    icon: 'text-sky-400',
    glow: 'drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]',
    hover: 'group-hover:text-sky-300',
  },
  slate: {
    icon: 'text-slate-600 dark:text-white',
    glow: 'drop-shadow-[0_0_10px_rgba(148,163,184,0.35)]',
    hover: 'group-hover:text-slate-700 dark:group-hover:text-white',
  },
};

export function AppSidebar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const [brandName, setBrandName] = useState<string>('NextCRM');
  const [brandIconUrl, setBrandIconUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fromStorage = () => {
      try {
        const raw = window.localStorage.getItem('nexterp:branding');
        if (!raw) return;
        const parsed = JSON.parse(raw) as any;
        const nextName = String(parsed?.crm?.name ?? '').trim();
        const nextIcon = String(parsed?.crm?.favicon_url ?? '').trim();
        if (nextName) setBrandName(nextName);
        if (nextIcon) setBrandIconUrl(nextIcon);
      } catch {
        return;
      }
    };

    fromStorage();
    window.addEventListener('nexterp:branding:updated', fromStorage as EventListener);
    return () => window.removeEventListener('nexterp:branding:updated', fromStorage as EventListener);
  }, []);

  const content = useMemo(() => {
    const renderLink = (item: (typeof navItems)[number], opts?: { collapsed?: boolean; onNavigate?: () => void }) => {
      const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
      const c = colorStyles[item.color];

      const linkEl = (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => opts?.onNavigate?.()}
          className={cn('nav-item group relative overflow-hidden', opts?.collapsed && 'justify-center', active && 'active')}
        >
          {active && <div className="absolute inset-0 bg-gradient-to-r to-transparent opacity-50 from-cyan-400/10" />}
          <item.icon
            className={cn(
              'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
              c.icon,
              active ? c.glow : c.hover,
            )}
          />
          {!opts?.collapsed && (
            <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
              {item.label}
            </span>
          )}
        </Link>
      );

      if (!opts?.collapsed) return linkEl;

      return (
        <Tooltip key={item.path}>
          <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
          <TooltipContent side="right" align="center">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    };

    const Logo = ({ collapsed }: { collapsed: boolean }) => (
      <div className="flex overflow-hidden relative gap-3 items-center px-4 h-14 border-b border-sidebar-border shrink-0 group">
        <div className="absolute inset-0 bg-gradient-to-r to-transparent opacity-0 transition-opacity duration-500 pointer-events-none from-cyan-500/10 via-purple-500/10 group-hover:opacity-100" />
        <div className="w-9 h-9 rounded-xl p-[2px] bg-gradient-to-br from-cyan-400 to-fuchsia-500 shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.3)] group-hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-shadow duration-300">
          <div className="w-full h-full rounded-[10px] bg-sidebar flex items-center justify-center backdrop-blur-sm">
            {brandIconUrl.trim() ? (
              <img src={brandIconUrl} alt={brandName} className="object-contain w-4 h-4" />
            ) : (
              <Mail className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            )}
          </div>
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            {brandName}
          </span>
        )}
      </div>
    );

    const Nav = ({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) => (
      <nav className="overflow-y-auto flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => renderLink(item, { collapsed, onNavigate }))}
      </nav>
    );

    const Footer = ({ collapsed }: { collapsed: boolean }) => (
      <div className="flex h-12 border-t border-sidebar-border shrink-0">
        <a
          href="/admin"
          className={cn(
            'flex-1 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all',
            collapsed && 'px-0',
          )}
          title="Voltar ao Painel Admin"
        >
          <ArrowLeft className="w-4 h-4" />
          {!collapsed && <span className="ml-2 text-sm font-medium">Voltar</span>}
        </a>

        <div className="w-[1px] bg-sidebar-border" />

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex justify-center items-center transition-colors text-muted-foreground hover:text-foreground hover:bg-sidebar-accent',
            collapsed ? 'flex-1' : 'w-12',
          )}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    );

    return { Logo, Nav, Footer };
  }, [collapsed, location.pathname]);

  return (
    <>
      <aside
        className={cn(
          'hidden sticky top-0 z-30 flex-col h-screen border-r transition-all duration-300 md:flex bg-sidebar border-sidebar-border',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <content.Logo collapsed={collapsed} />
        <content.Nav collapsed={collapsed} />
        <content.Footer collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[18rem] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden">
          <div className="flex flex-col w-full h-full">
            <content.Logo collapsed={false} />
            <content.Nav collapsed={false} onNavigate={() => onMobileOpenChange(false)} />
            <div className="border-t border-sidebar-border">
              <a
                href="/admin"
                className="flex justify-center items-center h-12 transition-colors text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                title="Voltar ao Painel Admin"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="ml-2 text-sm font-medium">Voltar</span>
              </a>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
