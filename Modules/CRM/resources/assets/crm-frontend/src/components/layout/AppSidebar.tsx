import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Campanhas', icon: Send, path: '/campaigns' },
  { label: 'Contactos', icon: Users, path: '/contacts' },
  { label: 'Segmentos', icon: Mail, path: '/segments' },
  { label: 'Templates', icon: FileEdit, path: '/templates' },
  { label: 'Automações', icon: Workflow, path: '/automations' },
  { label: 'Analítica', icon: BarChart3, path: '/analytics' },
  { label: 'Configurações', icon: Settings, path: '/settings' },
];

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
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn('nav-item group relative overflow-hidden', active && 'active')}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />
              )}
              <item.icon className={cn(
                "w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110",
                active ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" : "group-hover:text-cyan-400"
              )} />
              {!collapsed && <span className={cn(
                "transition-colors duration-200",
                active ? "font-semibold" : "group-hover:text-foreground"
              )}>{item.label}</span>}
            </Link>
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
