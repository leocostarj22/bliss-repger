import { useState, useEffect, useMemo, useRef } from 'react';
import { Bell, Search, X, Sun, Moon, CheckCheck, Trash2, Cloud, CloudRain, CloudSnow, Wind, Menu } from 'lucide-react';
import { fetchNotifications, fetchUser, markNotificationsAsRead, markNotificationAsRead, clearNotifications, fetchWeatherData } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import type { AppNotification } from '@/types';
import { cn, getInitials, playSound, resolvePhotoUrl } from '@/lib/utils';
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

const TOPBAR_RECENT_SEARCH_KEY = 'gmcentral:topbar:recent_search';

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

  const loadNotifications = async (withSound = true) => {
    try {
      const r = await fetchNotifications();
      const items = r.data;
      setNotifications(items);
      const unread = items.filter((n) => !n.read).length;

      if (withSound && unreadRef.current !== null && unread > unreadRef.current) {
        const newestUnread = items.find((n) => !n.read);
        const hay = `${String(newestUnread?.title ?? '')} ${String(newestUnread?.message ?? '')}`.toLowerCase();
        const isMessage = hay.includes('mensagem') || hay.includes('message');
        playSound(isMessage ? '/sounds/message.mp3' : '/sounds/notification.mp3', { volume: 0.6 });
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

  const fetchWeather = async () => {
    try {
      const data = await fetchWeatherData();
      setWeather({ ...data, loading: false, error: false });
    } catch (e) {
      setWeather({ temp: 0, condition: 'Erro', icon: 'cloud', loading: false, error: true });
    }
  };

  const allSearchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const pick = (group: string, items: readonly any[]) =>
      items.map((it: any) => ({
        key: `${group}:${String(it.path)}`,
        label: String(it.label),
        path: String(it.path),
        group,
        icon: it.icon,
      }));

    return [
      ...pick('Dashboard', primaryNavItems),
      ...pick('Administração', adminNavItems),
      ...pick('Suporte', supportNavItems),
      ...pick('Finanças', financeNavItems),
      ...pick('Recursos Humanos', humanResourcesNavItems),
      ...pick('Comunicação', communicationNavItems),
      ...pick('Bliss Natura', blissNaturaNavItems),
      ...pick('Espaço Absoluto', espacoAbsolutoNavItems),
      ...pick('MyFormula', myFormulaNavItems),
      ...pick('Relatórios', reportsNavItems),
      ...pick('Pessoal', personalNavItems),
    ];
  }, []);

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
          if (hit) return hit;
          const label = String(r?.label ?? path);
          const group = String(r?.group ?? '');
          if (!path) return null;
          return { key: `recent:${path}`, path, label, group } as SearchSuggestion;
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
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Left: mobile menu + search */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <button
          type="button"
          className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Abrir menu"
          title="Menu"
          onClick={() => window.dispatchEvent(new Event('gmcentral:sidebar:open'))}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div ref={searchBoxRef} className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Pesquisar..."
            className="w-full pl-9 bg-secondary/50 border-transparent focus:bg-background focus:border-input transition-all"
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
            <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
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
                  <div className="px-3 py-6 text-sm text-muted-foreground text-center">Sem resultados</div>
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
                          'w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-left transition-colors',
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
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {weather.loading ? (
            <div className="w-4 h-4 animate-pulse bg-muted rounded" />
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
            <div className="absolute right-0 top-10 w-80 bg-popover border border-border rounded-lg shadow-xl animate-fade-in z-50">
              <div className="p-3 border-b border-border flex items-center justify-between">
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
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        </div>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkOneAsRead(n.id)}
                            className="shrink-0 p-1 text-muted-foreground hover:text-primary hover:bg-secondary rounded-md transition-colors"
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
                <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); navigate('/admin/profile'); }}>
              Editar perfil
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