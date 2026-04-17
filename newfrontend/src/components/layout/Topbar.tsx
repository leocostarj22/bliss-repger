import { useState, useEffect, useMemo, useRef } from 'react';
import { Bell, Search, X, Sun, Moon, CheckCheck, Trash2, Cloud, CloudRain, CloudSnow, Wind, Menu } from 'lucide-react';
import { fetchMyAccess, fetchNotifications, fetchUser, markNotificationsAsRead, markNotificationAsRead, clearNotifications, fetchWeatherData } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import type { AppNotification } from '@/types';
import { cn, getInitials, hasEffectivePermission, playSound, resolvePhotoUrl } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logout } from "@/services/api";

import { Input } from "@/components/ui/input";
import {
  adminNavItems,
  blissNaturaNavItems,
  communicationNavItems,
  espacoAbsolutoNavItems,
  financeNavItems,
  humanResourcesNavItems,
  myFormulaNavItems,
  personalNavItems,
  primaryNavItems,
  reportsNavItems,
  supportNavItems,
} from './AppSidebar';

interface WeatherView {
  temp: number;
  condition: string;
  icon: string;
  loading: boolean;
  error: boolean;
}

const WeatherIcon = ({ type }: { type: string }) => {
  const iconClass = "w-4 h-4 text-muted-foreground";
  switch (type) {
    case 'sun': return <Sun className={iconClass} />;
    case 'cloud': return <Cloud className={iconClass} />;
    case 'rain': return <CloudRain className={iconClass} />;
    case 'snow': return <CloudSnow className={iconClass} />;
    case 'storm': return <Wind className={iconClass} />;
    default: return <Cloud className={iconClass} />;
  }
};

type SearchSuggestion = {
  key: string;
  label: string;
  path: string;
  group: string;
  icon?: any;
};

const TOPBAR_RECENT_SEARCH_KEY = 'nexterp:topbar:recent_search';

const normalizeHay = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export function Topbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<SearchSuggestion[]>([]);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [user, setUser] = useState<{ id: string; name: string; email: string; photo_path?: string | null } | null>(null);
  const [weather, setWeather] = useState<WeatherView>({ temp: 0, condition: '', icon: 'cloud', loading: true, error: false });
  const unreadRef = useRef<number | null>(null);

  const [moduleStatuses, setModuleStatuses] = useState<Record<string, boolean>>({});

  const [accessLoading, setAccessLoading] = useState(true);
  const [accessIsAdmin, setAccessIsAdmin] = useState(false);
  const [accessPermissions, setAccessPermissions] = useState<string[]>([]);
  const [accessPermissionsDeny, setAccessPermissionsDeny] = useState<string[]>([]);

  const isModuleEnabled = (key: string) => moduleStatuses[key] !== false;
  const can = (perm: string | string[]) => accessIsAdmin || hasEffectivePermission(accessPermissions, accessPermissionsDeny, perm);

  const loadNotifications = async (withSound = true) => {
    try {
      const r = await fetchNotifications();
      const items = r.data;
      setNotifications(items);
      const unread = items.filter((n) => !n.read).length;

      if (withSound && unreadRef.current !== null && unread > unreadRef.current) {
        let audioEnabled = true;
        try {
          const raw = window.localStorage.getItem('nexterp:notify_audio');
          if (raw !== null) audioEnabled = raw === '1' || raw === 'true';
        } catch {
          audioEnabled = true;
        }

        if (audioEnabled) {
          const newestUnread = items.find((n) => !n.read);
          const hay = `${String(newestUnread?.title ?? '')} ${String(newestUnread?.message ?? '')}`.toLowerCase();

          const looksLikeSent = hay.includes('mensagem enviada') || hay.includes('sua mensagem foi enviada') || hay.includes('message sent');
          const looksLikeUpdated = hay.includes('mensagem atualizada') || hay.includes('message updated');
          const looksLikeIncoming =
            hay.includes('nova mensagem') ||
            hay.includes('new message') ||
            hay.includes('você recebeu') ||
            hay.includes('voce recebeu') ||
            hay.includes('you received');

          if (looksLikeIncoming && !looksLikeSent && !looksLikeUpdated) {
            playSound('/sounds/message.mp3', { volume: 0.6 });
          } else if (!looksLikeSent && !looksLikeUpdated) {
            const isMessage = hay.includes('mensagem') || hay.includes('message');
            playSound(isMessage ? '/sounds/message.mp3' : '/sounds/notification.mp3', { volume: 0.6 });
          }
        }
      }

      unreadRef.current = unread;
    } catch {}
  };

  useEffect(() => {
    let t: any;
    loadNotifications(false);
    fetchUser().then(r => setUser(r.data)).catch(() => {});
    fetchWeather();
    t = setInterval(() => loadNotifications(true), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const read = () => {
      try {
        const raw = window.localStorage.getItem('nexterp:module-statuses');
        if (!raw) {
          setModuleStatuses({});
          return;
        }
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setModuleStatuses(parsed && typeof parsed === 'object' ? parsed : {});
      } catch {
        setModuleStatuses({});
      }
    };

    const onUpdated = () => read();

    read();
    window.addEventListener('nexterp:modules:updated', onUpdated);
    return () => window.removeEventListener('nexterp:modules:updated', onUpdated);
  }, []);

  useEffect(() => {
    let alive = true;
    setAccessLoading(true);
    fetchMyAccess()
      .then((r) => {
        if (!alive) return;
        setAccessIsAdmin(Boolean(r.data.isAdmin));
        setAccessPermissions(Array.isArray(r.data.permissions) ? r.data.permissions : []);
        setAccessPermissionsDeny(Array.isArray((r.data as any).permissionsDeny) ? (r.data as any).permissionsDeny : []);
      })
      .catch(() => {
        if (!alive) return;
        setAccessIsAdmin(false);
        setAccessPermissions([]);
        setAccessPermissionsDeny([]);
      })
      .finally(() => {
        if (!alive) return;
        setAccessLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const fetchWeather = async () => {
    try {
      const data = await fetchWeatherData();
      setWeather({ ...data, loading: false, error: false });
    } catch (e) {
      setWeather({ temp: 0, condition: 'Erro', icon: 'cloud', loading: false, error: true });
    }
  };

  const allSearchSuggestions = useMemo<SearchSuggestion[]>(() => {
    if (accessLoading) return [];

    const pick = (
      group: string,
      items: readonly any[],
      requiredByPath: Record<string, string | string[]>,
      fallback: string | string[],
      moduleKey?: string,
    ) =>
      items
        .filter((it: any) => {
          const path = String(it.path);
          if (moduleKey && !isModuleEnabled(moduleKey)) return false;
          return can(requiredByPath[path] ?? fallback);
        })
        .map((it: any) => ({
          key: `${group}:${String(it.path)}`,
          label: String(it.label),
          path: String(it.path),
          group,
          icon: it.icon,
        }));

    const adminPermissionByPath: Record<string, string | string[]> = {
      '/admin/companies': ['admin.companies.read', 'admin.companies.write'],
      '/admin/departments': ['admin.departments.read', 'admin.departments.write'],
      '/admin/modules': 'admin.modules.manage',
      '/admin/users': ['admin.users.read', 'admin.users.write'],
      '/admin/roles': ['admin.roles.read', 'admin.roles.write'],
    };

    const supportPermissionByPath: Record<string, string | string[]> = {
      '/support/categories': ['support.categories.read', 'support.categories.write'],
      '/support/tickets': ['support.tickets.read', 'support.tickets.write'],
    };

    const financePermissionByPath: Record<string, string | string[]> = {
      '/finance/bank-accounts': ['finance.bank-accounts.read', 'finance.bank-accounts.write'],
      '/finance/categories': ['finance.categories.read', 'finance.categories.write'],
      '/finance/cost-centers': ['finance.cost-centers.read', 'finance.cost-centers.write'],
      '/finance/transactions': ['finance.transactions.read', 'finance.transactions.write'],
    };

    const humanResourcesPermissionByPath: Record<string, string | string[]> = {
      '/hr/employees': ['hr.employees.read', 'hr.employees.write'],
      '/hr/payrolls': ['hr.payrolls.read', 'hr.payrolls.write'],
      '/hr/vacations': ['hr.vacations.read', 'hr.vacations.write'],
      '/hr/timesheets': ['hr.timesheets.read', 'hr.timesheets.write'],
    };

    const communicationPermissionByPath: Record<string, string | string[]> = {
      '/communication/video-call': 'communication.video-call.access',
      '/communication/chat': 'communication.chat.access',
      '/communication/messages': ['communication.messages.read', 'communication.messages.write'],
      '/communication/posts': ['communication.posts.read', 'communication.posts.write'],
    };

    const reportsPermissionByPath: Record<string, string | string[]> = {
      '/reports/system-logs': 'reports.system-logs.read',
    };

    const blissNaturaPermissionByPath: Record<string, string | string[]> = {
      '/blissnatura/dashboard': 'blissnatura.dashboard.read',
      '/blissnatura/orders': 'blissnatura.orders.read',
      '/blissnatura/customers': 'blissnatura.customers.read',
      '/blissnatura/products': ['blissnatura.products.read', 'blissnatura.products.write'],
    };

    const espacoAbsolutoPermissionByPath: Record<string, string | string[]> = {
      '/espacoabsoluto/customers': 'espacoabsoluto.customers.read',
    };

    const myFormulaPermissionByPath: Record<string, string | string[]> = {
      '/myformula/dashboard': 'myformula.dashboard.read',
      '/myformula/orders': 'myformula.orders.read',
      '/myformula/customers': 'myformula.customers.read',
      '/myformula/products': ['myformula.products.read', 'myformula.products.write'],
      '/myformula/quizzes': ['myformula.quizzes.read', 'myformula.quizzes.write'],
    };

    const personalPermissionByPath: Record<string, string | string[]> = {
      '/personal/tasks': ['personal.tasks.read', 'personal.tasks.write'],
      '/personal/notes': ['personal.notes.read', 'personal.notes.write'],
    };

    const extraScreens: Array<{ label: string; path: string; group: string; moduleKey?: string; permission: string | string[] }> = [
      { label: 'Suporte (Visão Geral)', path: '/support', group: 'Telas', moduleKey: 'Support', permission: ['support.tickets.read', 'support.tickets.write'] },
      { label: 'Finanças (Visão Geral)', path: '/finance', group: 'Telas', moduleKey: 'Finance', permission: ['finance.transactions.read', 'finance.transactions.write'] },
      { label: 'Comunicação (Visão Geral)', path: '/communication', group: 'Telas', moduleKey: 'Communication', permission: ['communication.messages.read', 'communication.messages.write', 'communication.chat.access', 'communication.video-call.access', 'communication.posts.read', 'communication.posts.write'] },
      { label: 'Bliss Natura (Visão Geral)', path: '/blissnatura', group: 'Telas', moduleKey: 'BlissNatura', permission: ['blissnatura.dashboard.read', 'blissnatura.orders.read', 'blissnatura.customers.read', 'blissnatura.products.read', 'blissnatura.products.write'] },
      { label: 'Espaço Absoluto (Visão Geral)', path: '/espacoabsoluto', group: 'Telas', moduleKey: 'EspacoAbsoluto', permission: 'espacoabsoluto.customers.read' },
      { label: 'MyFormula (Visão Geral)', path: '/myformula', group: 'Telas', moduleKey: 'MyFormula', permission: ['myformula.dashboard.read', 'myformula.orders.read', 'myformula.customers.read', 'myformula.products.read', 'myformula.products.write', 'myformula.quizzes.read', 'myformula.quizzes.write'] },
      { label: 'Relatórios (Visão Geral)', path: '/reports', group: 'Telas', moduleKey: 'Reports', permission: 'reports.system-logs.read' },
      { label: 'Novo utilizador', path: '/admin/users/new', group: 'Telas', moduleKey: 'Administration', permission: 'admin.users.write' },
      { label: 'Novo cargo', path: '/admin/roles/new', group: 'Telas', moduleKey: 'Administration', permission: 'admin.roles.write' },
      { label: 'Novo funcionário', path: '/hr/employees/new', group: 'Telas', moduleKey: 'HumanResources', permission: 'hr.employees.write' },
      { label: 'Novo vencimento', path: '/hr/payrolls/new', group: 'Telas', moduleKey: 'HumanResources', permission: 'hr.payrolls.write' },
      { label: 'Nova férias', path: '/hr/vacations/new', group: 'Telas', moduleKey: 'HumanResources', permission: 'hr.vacations.write' },
      { label: 'Nova marcação de ponto', path: '/hr/timesheets/new', group: 'Telas', moduleKey: 'HumanResources', permission: 'hr.timesheets.write' },
      { label: 'Nova tarefa', path: '/personal/tasks/new', group: 'Telas', moduleKey: 'Personal', permission: 'personal.tasks.write' },
    ];

    const extraAllowed: SearchSuggestion[] = extraScreens
      .filter((it) => (!it.moduleKey || isModuleEnabled(it.moduleKey)) && can(it.permission))
      .map((it) => ({ key: `screen:${it.path}`, label: it.label, path: it.path, group: it.group }));

    return [
      ...pick('Dashboard', primaryNavItems, {}, '*'),
      ...pick('Administração', adminNavItems, adminPermissionByPath, 'admin.access', 'Administration'),
      ...pick('Suporte', supportNavItems, supportPermissionByPath, 'support.access', 'Support'),
      ...pick('Finanças', financeNavItems, financePermissionByPath, 'finance.access', 'Finance'),
      ...pick('Recursos Humanos', humanResourcesNavItems, humanResourcesPermissionByPath, 'hr.access', 'HumanResources'),
      ...pick('Comunicação', communicationNavItems, communicationPermissionByPath, 'communication.access', 'Communication'),
      ...pick('Bliss Natura', blissNaturaNavItems, blissNaturaPermissionByPath, 'blissnatura.access', 'BlissNatura'),
      ...pick('Espaço Absoluto', espacoAbsolutoNavItems, espacoAbsolutoPermissionByPath, 'espacoabsoluto.access', 'EspacoAbsoluto'),
      ...pick('MyFormula', myFormulaNavItems, myFormulaPermissionByPath, 'myformula.access', 'MyFormula'),
      ...pick('Relatórios', reportsNavItems, reportsPermissionByPath, 'reports.access', 'Reports'),
      ...pick('Pessoal', personalNavItems, personalPermissionByPath, 'personal.access', 'Personal'),
      ...extraAllowed,
    ];
  }, [accessLoading, accessIsAdmin, accessPermissions, accessPermissionsDeny, moduleStatuses]);

  const q = normalizeHay(searchQuery);

  const filteredSuggestions = useMemo(() => {
    if (!q) return [];
    return allSearchSuggestions
      .filter((s) => normalizeHay(`${s.label} ${s.group} ${s.path}`).includes(q))
      .slice(0, 12);
  }, [allSearchSuggestions, q]);

  const visibleSuggestions = q ? filteredSuggestions : recentSearches;

  useEffect(() => {
    if (!searchOpen) return;
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [searchOpen, searchSelectedIndex, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = String(e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDown = (ev: PointerEvent) => {
      const el = searchBoxRef.current;
      if (!el) return;
      const target = ev.target as Node | null;
      if (target && el.contains(target)) return;
      setSearchOpen(false);
    };

    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(TOPBAR_RECENT_SEARCH_KEY);
      if (!raw) {
        setRecentSearches([]);
        return;
      }
      const parsed = JSON.parse(raw) as Array<{ path?: string; label?: string; group?: string }>;
      const rows = Array.isArray(parsed) ? parsed : [];

      const hydrated = rows
        .map((r) => {
          const path = String(r?.path ?? '');
          const hit = allSearchSuggestions.find((s) => s.path === path);
          return hit ?? null;
        })
        .filter(Boolean) as SearchSuggestion[];

      setRecentSearches(hydrated.slice(0, 8));
    } catch {
      setRecentSearches([]);
    }
  }, [allSearchSuggestions]);

  const pushRecent = (it: SearchSuggestion) => {
    setRecentSearches((prev) => {
      const next = [it, ...prev.filter((p) => p.path !== it.path)].slice(0, 8);
      try {
        window.localStorage.setItem(
          TOPBAR_RECENT_SEARCH_KEY,
          JSON.stringify(next.map((x) => ({ path: x.path, label: x.label, group: x.group }))),
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(TOPBAR_RECENT_SEARCH_KEY);
    } catch {
      // ignore
    }
  };

  const goToSuggestion = (it: SearchSuggestion) => {
    pushRecent(it);
    setSearchQuery('');
    setSearchSelectedIndex(0);
    setSearchOpen(false);
    navigate(it.path);
  };

  const { theme, toggle } = useTheme();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async () => {
    try {
      await markNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkOneAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = async () => {
    try {
      await clearNotifications();
      setNotifications([]);
      unreadRef.current = 0;
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="flex sticky top-0 z-20 justify-between items-center px-6 h-14 border-b backdrop-blur-sm border-border bg-card/60">
      {/* Left: mobile menu + search */}
      <div className="flex gap-3 items-center w-full max-w-md">
        <button
          type="button"
          className="p-2 rounded-md transition-colors md:hidden text-muted-foreground hover:text-foreground hover:bg-secondary"
          aria-label="Abrir menu"
          title="Menu"
          onClick={() => window.dispatchEvent(new Event('nexterp:sidebar:open'))}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div ref={searchBoxRef} className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Pesquisar..."
            className="pl-9 w-full border-transparent transition-all bg-secondary/50 focus:bg-background focus:border-input"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchSelectedIndex(0);
              setSearchOpen(true);
            }}
            onKeyDown={(e) => {
              const max = visibleSuggestions.length - 1;

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSearchOpen(true);
                setSearchSelectedIndex((i) => (max < 0 ? 0 : Math.min(max, i + 1)));
                return;
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSearchOpen(true);
                setSearchSelectedIndex((i) => (max < 0 ? 0 : Math.max(0, i - 1)));
                return;
              }

              if (e.key === 'Enter') {
                if (!searchOpen) {
                  setSearchOpen(true);
                  return;
                }
                const hit = visibleSuggestions[searchSelectedIndex];
                if (hit) goToSuggestion(hit);
                return;
              }

              if (e.key === 'Escape') {
                e.preventDefault();
                if (searchQuery.trim()) {
                  setSearchQuery('');
                  setSearchSelectedIndex(0);
                } else {
                  setSearchOpen(false);
                }
              }
            }}
          />

          {searchOpen && (q || recentSearches.length > 0) ? (
            <div className="overflow-hidden absolute right-0 left-0 top-full z-50 mt-2 rounded-lg border shadow-xl border-border bg-popover">
              <div className="flex justify-between items-center px-3 py-2 border-b border-border/60">
                <div className="text-xs font-semibold text-muted-foreground">
                  {q ? 'Resultados' : 'Recentes'}
                </div>
                {!q && recentSearches.length > 0 ? (
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    onClick={clearRecent}
                  >
                    Limpar
                  </button>
                ) : null}
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-1">
                {visibleSuggestions.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-center text-muted-foreground">Sem resultados</div>
                ) : (
                  visibleSuggestions.map((it, idx) => {
                    const active = idx === searchSelectedIndex;
                    const Icon = it.icon as any;

                    return (
                      <button
                        key={it.key}
                        ref={active ? activeItemRef : undefined}
                        type="button"
                        onMouseEnter={() => setSearchSelectedIndex(idx)}
                        onClick={() => goToSuggestion(it)}
                        className={cn(
                          'flex gap-2 items-center px-2 py-2 w-full text-sm text-left rounded-md transition-colors',
                          active
                            ? 'bg-secondary text-foreground'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                        )}
                      >
                        {Icon ? <Icon className="w-4 h-4 shrink-0" /> : <Search className="w-4 h-4 shrink-0" />}
                        <span className="truncate">{it.label}</span>
                        <span className="ml-auto text-[11px] text-muted-foreground">{it.group}</span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
                ↑↓ navegar · Enter abrir · Esc fechar · Ctrl/Cmd+K
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Right: weather, notifications & avatar */}
      <div className="flex gap-3 items-center">
        <div className="flex gap-2 items-center text-sm transition-colors text-muted-foreground hover:text-foreground">
          {weather.loading ? (
            <div className="w-4 h-4 rounded animate-pulse bg-muted" />
          ) : weather.error ? (
            <span className="text-xs">--°</span>
          ) : (
            <>
              <WeatherIcon type={weather.icon} />
              <span className="font-medium">{weather.temp}°C</span>
              <span className="hidden sm:inline">Lisboa</span>
            </>
          )}
        </div>
        <button
          onClick={toggle}
          className="text-muted-foreground hover:text-foreground transition-colors hover:shadow-[0_0_16px_hsl(var(--ring)/0.25)] hover:-translate-y-0.5 transition-transform rounded-md p-1"
          title="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="relative">
          <button
            onClick={() => {
              const next = !notifOpen;
              setNotifOpen(next);
              if (next) {
                loadNotifications(false);
              }
            }}
            className="relative text-muted-foreground hover:text-foreground transition-colors hover:shadow-[0_0_16px_hsl(var(--ring)/0.25)] hover:-translate-y-0.5 transition-transform rounded-md p-1"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border shadow-xl bg-popover border-border animate-fade-in">
              <div className="flex justify-between items-center p-3 border-b border-border">
                <h4 className="text-sm font-semibold">Notificações</h4>
                <div className="flex gap-1">
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAsRead} 
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-md transition-colors"
                      title="Marcar todas como lidas"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button 
                      onClick={handleClear} 
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-md transition-colors"
                      title="Limpar todas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-y-auto max-h-64">
                {notifications.length === 0 ? (
                  <div className="p-8 text-sm text-center text-muted-foreground">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={cn(
                        'px-3 py-2.5 border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/50',
                        !n.read && 'bg-primary/5'
                      )}
                    >
                      <div className="flex gap-2 justify-between items-start">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        </div>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkOneAsRead(n.id)}
                            className="p-1 rounded-md transition-colors shrink-0 text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Marcar como lida"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar + Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button title="Perfil">
              <Avatar className="w-8 h-8 border border-border hover:shadow-[0_0_16px_hsl(var(--ring)/0.25)] transition-shadow">
                <AvatarImage src={resolvePhotoUrl(user?.photo_path ?? null) ?? undefined} alt={user?.name} />
                <AvatarFallback className="text-xs font-bold bg-primary/20 text-primary">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); navigate('/admin/profile'); }}>
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); navigate('/settings'); }}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={async (e) => {
                e.preventDefault();
                try {
                  await logout();
                } catch {
                } finally {
                  window.location.href = '/';
                }
              }}
            >
              Terminar sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}