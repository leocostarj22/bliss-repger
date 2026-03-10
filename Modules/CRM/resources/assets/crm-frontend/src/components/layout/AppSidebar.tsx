import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 z-30',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="w-9 h-9 rounded-xl p-[2px] bg-gradient-to-br from-cyan-400 to-fuchsia-500 shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.3)] group-hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-shadow duration-300">
          <div className="w-full h-full rounded-[10px] bg-sidebar flex items-center justify-center backdrop-blur-sm">
            <Mail className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          </div>
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            GMC Mail
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const c = colorStyles[item.color];

          const link = (
            <Link
              key={item.path}
              to={item.path}
              className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
            >
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />
              )}
              <item.icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                  c.icon,
                  active ? c.glow : c.hover,
                )}
              />
              {!collapsed && (
                <span
                  className={cn(
                    'transition-colors duration-200',
                    active ? 'font-semibold' : 'group-hover:text-foreground',
                  )}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );

          if (!collapsed) return link;

          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" align="center">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Footer: Admin Link & Collapse Toggle */}
      <div className="flex h-12 border-t border-sidebar-border shrink-0">
        <a
          href="/admin"
          className={cn(
            "flex-1 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all",
            collapsed && "px-0"
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
            "flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
            collapsed ? "flex-1" : "w-12"
          )}
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
