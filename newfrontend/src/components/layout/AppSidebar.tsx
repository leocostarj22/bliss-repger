import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Building2,
  Layers,
  Puzzle,
  Users,
  BadgeCheck,
  ChevronDown,
  Landmark,
  Tags,
  Target,
  Receipt,
  Ticket,
  ScrollText,
  ListTodo,
  NotebookPen,
  CalendarDays,
  Clock,
  Video,
  Mail,
  MessageSquare,
  Megaphone,
  Package,
  ShoppingCart,
  Beaker,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchAdminModules } from '@/services/api';

const primaryNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', color: 'cyan' },
] as const;

const adminNavItems = [
  { label: 'Empresas', icon: Building2, path: '/admin/companies', color: 'amber' },
  { label: 'Departamentos', icon: Layers, path: '/admin/departments', color: 'violet' },
  { label: 'Módulos', icon: Puzzle, path: '/admin/modules', color: 'fuchsia' },
  { label: 'Utilizadores', icon: Users, path: '/admin/users', color: 'emerald' },
  { label: 'Cargos', icon: BadgeCheck, path: '/admin/roles', color: 'sky' },
] as const;

const supportNavItems = [
  { label: 'Categorias', icon: Tags, path: '/support/categories', color: 'violet' },
  { label: 'Tickets', icon: Ticket, path: '/support/tickets', color: 'cyan' },
] as const;

const financeNavItems = [
  { label: 'Contas Bancárias', icon: Landmark, path: '/finance/bank-accounts', color: 'amber' },
  { label: 'Categorias', icon: Tags, path: '/finance/categories', color: 'violet' },
  { label: 'Centros de Custo', icon: Target, path: '/finance/cost-centers', color: 'emerald' },
  { label: 'Lançamentos', icon: Receipt, path: '/finance/transactions', color: 'sky' },
] as const;

const humanResourcesNavItems = [
  { label: 'Funcionários', icon: Users, path: '/hr/employees', color: 'emerald' },
  { label: 'Holerites', icon: Receipt, path: '/hr/payrolls', color: 'amber' },
  { label: 'Férias', icon: CalendarDays, path: '/hr/vacations', color: 'violet' },
  { label: 'Marcação de Ponto', icon: Clock, path: '/hr/timesheets', color: 'sky' },
] as const;

const communicationNavItems = [
  { label: 'Video Call', icon: Video, path: '/communication/video-call', color: 'fuchsia' },
  { label: 'Chat', icon: MessageSquare, path: '/communication/chat', color: 'cyan' },
  { label: 'Mensagens Internas', icon: Mail, path: '/communication/messages', color: 'emerald' },
  { label: 'Posts Administrativos', icon: Megaphone, path: '/communication/posts', color: 'amber' },
] as const;

const blissNaturaNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/blissnatura/dashboard', color: 'cyan' },
  { label: 'Pedidos', icon: ShoppingCart, path: '/blissnatura/orders', color: 'amber' },
  { label: 'Clientes', icon: Users, path: '/blissnatura/customers', color: 'emerald' },
  { label: 'Produtos', icon: Package, path: '/blissnatura/products', color: 'fuchsia' },
] as const;

const espacoAbsolutoNavItems = [
  { label: 'Clientes', icon: Users, path: '/espacoabsoluto/customers', color: 'emerald' },
] as const;

const myFormulaNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/myformula/dashboard', color: 'cyan' },
  { label: 'Pedidos', icon: ShoppingCart, path: '/myformula/orders', color: 'amber' },
  { label: 'Clientes', icon: Users, path: '/myformula/customers', color: 'emerald' },
  { label: 'Produtos', icon: Package, path: '/myformula/products', color: 'fuchsia' },
  { label: 'Quizzes', icon: Beaker, path: '/myformula/quizzes', color: 'violet' },
] as const;

const reportsNavItems = [
  { label: 'Logs do Sistema', icon: ScrollText, path: '/reports/system-logs', color: 'fuchsia' },
] as const;

const personalNavItems = [
  { label: 'Minhas Tarefas', icon: ListTodo, path: '/personal/tasks', color: 'emerald' },
  { label: 'Minhas Anotações', icon: NotebookPen, path: '/personal/notes', color: 'amber' },
] as const;

type NavItem =
  | (typeof primaryNavItems)[number]
  | (typeof adminNavItems)[number]
  | (typeof supportNavItems)[number]
  | (typeof financeNavItems)[number]
  | (typeof humanResourcesNavItems)[number]
  | (typeof communicationNavItems)[number]
  | (typeof blissNaturaNavItems)[number]
  | (typeof espacoAbsolutoNavItems)[number]
  | (typeof myFormulaNavItems)[number]
  | (typeof reportsNavItems)[number]
  | (typeof personalNavItems)[number];
type NavColor = NavItem['color'];

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
  
};

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);
  const [supportOpen, setSupportOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);
  const [humanResourcesOpen, setHumanResourcesOpen] = useState(true);
  const [communicationOpen, setCommunicationOpen] = useState(true);
  const [crmOpen, setCrmOpen] = useState(true);
  const [blissNaturaOpen, setBlissNaturaOpen] = useState(true);
  const [espacoAbsolutoOpen, setEspacoAbsolutoOpen] = useState(true);
  const [myFormulaOpen, setMyFormulaOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(true);
  const [moduleStatuses, setModuleStatuses] = useState<Record<string, boolean>>({});
  const location = useLocation();

  const isModuleEnabled = (key: string) => moduleStatuses[key] !== false;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('bliss:sidebar:menu_groups');
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        personalOpen?: boolean;
        adminOpen?: boolean;
        supportOpen?: boolean;
        financeOpen?: boolean;
        humanResourcesOpen?: boolean;
        communicationOpen?: boolean;
        crmOpen?: boolean;
        blissNaturaOpen?: boolean;
        espacoAbsolutoOpen?: boolean;
        myFormulaOpen?: boolean;
        reportsOpen?: boolean;
      };
      if (typeof parsed.personalOpen === 'boolean') setPersonalOpen(parsed.personalOpen);
      if (typeof parsed.adminOpen === 'boolean') setAdminOpen(parsed.adminOpen);
      if (typeof parsed.supportOpen === 'boolean') setSupportOpen(parsed.supportOpen);
      if (typeof parsed.financeOpen === 'boolean') setFinanceOpen(parsed.financeOpen);
      if (typeof parsed.humanResourcesOpen === 'boolean') setHumanResourcesOpen(parsed.humanResourcesOpen);
      if (typeof parsed.communicationOpen === 'boolean') setCommunicationOpen(parsed.communicationOpen);
      if (typeof parsed.crmOpen === 'boolean') setCrmOpen(parsed.crmOpen);
      if (typeof parsed.blissNaturaOpen === 'boolean') setBlissNaturaOpen(parsed.blissNaturaOpen);
      if (typeof parsed.espacoAbsolutoOpen === 'boolean') setEspacoAbsolutoOpen(parsed.espacoAbsolutoOpen);
      if (typeof parsed.myFormulaOpen === 'boolean') setMyFormulaOpen(parsed.myFormulaOpen);
      if (typeof parsed.reportsOpen === 'boolean') setReportsOpen(parsed.reportsOpen);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      'bliss:sidebar:menu_groups',
      JSON.stringify({ personalOpen, adminOpen, supportOpen, financeOpen, humanResourcesOpen, communicationOpen, crmOpen, blissNaturaOpen, espacoAbsolutoOpen, myFormulaOpen, reportsOpen })
    );
  }, [personalOpen, adminOpen, supportOpen, financeOpen, humanResourcesOpen, communicationOpen, crmOpen, blissNaturaOpen, espacoAbsolutoOpen, myFormulaOpen, reportsOpen]);

  useEffect(() => {
    if (location.pathname.startsWith('/personal')) setPersonalOpen(true);
    if (location.pathname.startsWith('/admin')) setAdminOpen(true);
    if (location.pathname.startsWith('/support')) setSupportOpen(true);
    if (location.pathname.startsWith('/finance')) setFinanceOpen(true);
    if (location.pathname.startsWith('/hr')) setHumanResourcesOpen(true);
    if (location.pathname.startsWith('/communication')) setCommunicationOpen(true);
    if (location.pathname.startsWith('/crm') || location.pathname.startsWith('/admin/crm')) setCrmOpen(true);
    if (location.pathname.startsWith('/blissnatura')) setBlissNaturaOpen(true);
    if (location.pathname.startsWith('/espacoabsoluto')) setEspacoAbsolutoOpen(true);
    if (location.pathname.startsWith('/myformula')) setMyFormulaOpen(true);
    if (location.pathname.startsWith('/reports')) setReportsOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fromStorage = () => {
      try {
        const raw = window.localStorage.getItem('bliss:module-statuses');
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setModuleStatuses(parsed);
      } catch {
        return;
      }
    };

    const load = async () => {
      try {
        const res = await fetchAdminModules();
        const map = res.data.reduce<Record<string, boolean>>((acc, item) => {
          acc[item.key] = Boolean(item.enabled);
          return acc;
        }, {});
        setModuleStatuses(map);
        window.localStorage.setItem('bliss:module-statuses', JSON.stringify(map));
      } catch {
        fromStorage();
      }
    };

    const onUpdated = () => fromStorage();

    load();
    window.addEventListener('bliss:modules:updated', onUpdated);

    return () => {
      window.removeEventListener('bliss:modules:updated', onUpdated);
    };
  }, []);

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
          <div className="w-full h-full rounded-[10px] bg-sidebar flex items-center justify-center backdrop-blur-sm overflow-hidden">
            <img
              src={`${import.meta.env.BASE_URL}gmfavicon.png`}
              alt="GMCentral"
              className="w-6 h-6 object-contain"
              loading="eager"
            />
          </div>
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            GMCentral
          </span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="py-4 px-2 space-y-3">
        <div className="space-y-1">
          {primaryNavItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const c = colorStyles[item.color];

            const link = (
              <Link
                key={item.path}
                to={item.path}
                className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
              >
                {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                <item.icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                    c.icon,
                    active ? c.glow : c.hover,
                  )}
                />
                {!collapsed && (
                  <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
        </div>


        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('Administration') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setAdminOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>Administração</span>
              {adminOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || adminOpen) && (
            <div className="space-y-1">
              {adminNavItems.map((item) => {
              const active = location.pathname === item.path || location.pathname.startsWith(item.path);
              const c = colorStyles[item.color];

              const link = (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
                >
                  {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                  <item.icon
                    className={cn(
                      'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                      c.icon,
                      active ? c.glow : c.hover,
                    )}
                  />
                  {!collapsed && (
                    <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
            </div>
          )}
        </div>

        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('Support') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setSupportOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>Suporte</span>
              {supportOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || supportOpen) && (
            <div className="space-y-1">
              {supportNavItems.map((item) => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path);
                const c = colorStyles[item.color];

                const link = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
                  >
                    {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                    <item.icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                        c.icon,
                        active ? c.glow : c.hover,
                      )}
                    />
                    {!collapsed && (
                      <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
            </div>
          )}
        </div>

        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('Finance') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setFinanceOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>Financeiro</span>
              {financeOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || financeOpen) && (
            <div className="space-y-1">
              {financeNavItems.map((item) => {
              const active = location.pathname === item.path || location.pathname.startsWith(item.path);
              const c = colorStyles[item.color];

              const link = (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
                >
                  {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                  <item.icon
                    className={cn(
                      'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                      c.icon,
                      active ? c.glow : c.hover,
                    )}
                  />
                  {!collapsed && (
                    <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
            </div>
          )}
        </div>

        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('HumanResources') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setHumanResourcesOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>Recursos Humanos</span>
              {humanResourcesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || humanResourcesOpen) && (
            <div className="space-y-1">
              {humanResourcesNavItems.map((item) => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path);
                const c = colorStyles[item.color];

                const link = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
                  >
                    {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                    <item.icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                        c.icon,
                        active ? c.glow : c.hover,
                      )}
                    />
                    {!collapsed && (
                      <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
            </div>
          )}
        </div>

        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('Communication') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCommunicationOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>Comunicação</span>
              {communicationOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || communicationOpen) && (
            <div className="space-y-1">
              {communicationNavItems.map((item) => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path);
                const c = colorStyles[item.color];

                const link = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
                  >
                    {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                    <item.icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                        c.icon,
                        active ? c.glow : c.hover,
                      )}
                    />
                    {!collapsed && (
                      <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
            </div>
          )}
        </div>

        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('CRM') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCrmOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>CRM</span>
              {crmOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || crmOpen) && (
            <div className="space-y-1">
              {(() => {
                const item = { label: 'CRM App', icon: Target, url: '/admin/crm/app', color: 'fuchsia' as const };
                const c = colorStyles[item.color];

                const link = (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center')}
                  >
                    <item.icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                        c.icon,
                        c.hover,
                      )}
                    />
                    {!collapsed && (
                      <span className={cn('transition-colors duration-200', 'group-hover:text-foreground')}>
                        {item.label}
                      </span>
                    )}
                  </a>
                );

                if (!collapsed) return link;

                return (
                  <Tooltip key={item.url}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right" align="center">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })()}
            </div>
          )}
        </div>

        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('Personal') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setPersonalOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>Pessoal</span>
              {personalOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || personalOpen) && (
            <div className="space-y-1">
              {personalNavItems.map((item) => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path);
                const c = colorStyles[item.color];

                const link = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
                  >
                    {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                    <item.icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                        c.icon,
                        active ? c.glow : c.hover,
                      )}
                    />
                    {!collapsed && (
                      <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
            </div>
          )}
        </div>

        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('Reports') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setReportsOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>Relatórios e Logs</span>
              {reportsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || reportsOpen) && (
            <div className="space-y-1">
              {reportsNavItems.map((item) => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path);
                const c = colorStyles[item.color];

                const link = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
                  >
                    {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                    <item.icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                        c.icon,
                        active ? c.glow : c.hover,
                      )}
                    />
                    {!collapsed && (
                      <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
            </div>
          )}
        </div>

        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('BlissNatura') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setBlissNaturaOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>Bliss Natura</span>
              {blissNaturaOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || blissNaturaOpen) && (
            <div className="space-y-1">
              {blissNaturaNavItems.map((item) => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path);
                const c = colorStyles[item.color];

                const link = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
                  >
                    {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                    <item.icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                        c.icon,
                        active ? c.glow : c.hover,
                      )}
                    />
                    {!collapsed && (
                      <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
            </div>
          )}
        </div>

        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('EspacoAbsoluto') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setEspacoAbsolutoOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>Espaço Absoluto</span>
              {espacoAbsolutoOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || espacoAbsolutoOpen) && (
            <div className="space-y-1">
              {espacoAbsolutoNavItems.map((item) => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path);
                const c = colorStyles[item.color];

                const link = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
                  >
                    {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                    <item.icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                        c.icon,
                        active ? c.glow : c.hover,
                      )}
                    />
                    {!collapsed && (
                      <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
            </div>
          )}
        </div>

        <div className={cn('px-2', collapsed && 'px-0', !isModuleEnabled('MyFormula') && 'hidden')}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setMyFormulaOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 hover:text-foreground transition-colors"
            >
              <span>MyFormula</span>
              {myFormulaOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {(collapsed || myFormulaOpen) && (
            <div className="space-y-1">
              {myFormulaNavItems.map((item) => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path);
                const c = colorStyles[item.color];

                const link = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn('nav-item group relative overflow-hidden', collapsed && 'justify-center', active && 'active')}
                  >
                    {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent opacity-50" />}
                    <item.icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-110',
                        c.icon,
                        active ? c.glow : c.hover,
                      )}
                    />
                    {!collapsed && (
                      <span className={cn('transition-colors duration-200', active ? 'font-semibold' : 'group-hover:text-foreground')}>
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
            </div>
          )}
        </div>
        </nav>
      </ScrollArea>

      <div className="flex h-12 border-t border-sidebar-border shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex-1 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
          )}
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
