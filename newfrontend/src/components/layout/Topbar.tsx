import { useState, useEffect } from 'react';
import { Bell, Search, X, Sun, Moon, CheckCheck, Trash2, Cloud, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { fetchNotifications, fetchUser, markNotificationsAsRead, clearNotifications, fetchWeatherData } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import type { AppNotification } from '@/types';
import { cn, getInitials, resolvePhotoUrl } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logout } from "@/services/api";

import { Input } from "@/components/ui/input";

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

export function Topbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [user, setUser] = useState<{ id: string; name: string; email: string; photo_path?: string | null } | null>(null);
  const [weather, setWeather] = useState<WeatherView>({ temp: 0, condition: '', icon: 'cloud', loading: true, error: false });

  useEffect(() => {
    let t: any;
    const load = () => fetchNotifications().then(r => setNotifications(r.data)).catch(() => {});
    load();
    fetchUser().then(r => setUser(r.data)).catch(() => {});
    fetchWeather();
    t = setInterval(load, 60000);
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

  const handleClear = async () => {
    try {
      await clearNotifications();
      setNotifications([]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Left: search */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Pesquisar..."
            className="w-full pl-9 bg-secondary/50 border-transparent focus:bg-background focus:border-input transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
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
                fetchNotifications().then(r => setNotifications(r.data)).catch(() => {});
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
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
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
                  // ignore
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