import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, Mail, Ticket } from "lucide-react";

import type { AdminPost, SupportTicket } from "@/types";
import { fetchMyDashboardPosts, fetchMySupportTickets } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getInitials, resolvePhotoUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("pt-PT");
};

const plainTextFromHtml = (html: string) => {
  const raw = (html ?? "").toString();
  if (!raw.trim()) return "";
  try {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    return (doc.body.textContent ?? "").replace(/\u00A0/g, " ").trim();
  } catch {
    return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
};

const sanitizeHtml = (html: string) => {
  const raw = (html ?? "").toString();
  if (!raw) return "";

  const normalizeTextColor = (value: string) => {
    const v = String(value ?? "").trim().toLowerCase();
    if (!v) return null;
    if (v === "black" || v === "#000" || v === "#000000") return "hsl(var(--foreground))";

    const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const h = hex[1].toLowerCase();
      const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
      if (full === "000000") return "hsl(var(--foreground))";
      return null;
    }

    const rgb = v.match(/^rgba?\((.+)\)$/i);
    if (rgb) {
      const parts = rgb[1].split(",").map((s) => s.trim());
      const r = Number.parseFloat(parts[0] ?? "");
      const g = Number.parseFloat(parts[1] ?? "");
      const b = Number.parseFloat(parts[2] ?? "");
      if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
      if (r <= 32 && g <= 32 && b <= 32) return "hsl(var(--foreground))";
      return null;
    }

    return null;
  };

  const normalizeInlineStyles = (style: string) => {
    const parts = String(style ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    let changed = false;
    const next = parts.map((decl) => {
      const idx = decl.indexOf(":");
      if (idx <= 0) return decl;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1).trim();
      if (prop !== "color") return decl;
      const repl = normalizeTextColor(val);
      if (!repl) return decl;
      changed = true;
      return `color: ${repl}`;
    });

    return changed ? next.join("; ") : style;
  };

  try {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    doc.querySelectorAll("script, style, iframe, object, embed").forEach((n) => n.remove());
    doc.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value;
        if (name.startsWith("on")) el.removeAttribute(attr.name);
        if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) el.removeAttribute(attr.name);
        if (name === "srcdoc") el.removeAttribute(attr.name);
      });

      const style = el.getAttribute("style");
      if (style) {
        const nextStyle = normalizeInlineStyles(style);
        if (nextStyle.trim()) el.setAttribute("style", nextStyle);
        else el.removeAttribute("style");
      }
    });
    return doc.body.innerHTML;
  } catch {
    return raw;
  }
};

export default function EmployeeDashboard() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [expandedPostIds, setExpandedPostIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.allSettled([fetchMySupportTickets(), fetchMyDashboardPosts()])
      .then((results) => {
        if (!alive) return;

        const t = results[0];
        if (t.status === "fulfilled") setTickets(t.value.data);
        else toast({ title: "Erro", description: "Não foi possível carregar os teus tickets", variant: "destructive" });

        const p = results[1];
        if (p.status === "fulfilled") setPosts(p.value.data);
        else toast({ title: "Erro", description: "Não foi possível carregar os posts administrativos", variant: "destructive" });
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [toast]);

  const ticketStats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "open").length;
    const inProgress = tickets.filter((t) => t.status === "in_progress").length;
    const pending = tickets.filter((t) => t.status === "pending").length;
    return { total, open, inProgress, pending };
  }, [tickets]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Resumo dos teus tickets e comunicados</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button asChild>
            <Link to="/me/support/tickets/new">
              <Ticket className="w-4 h-4" />
              Novo ticket
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))
        ) : (
          <>
            <div className="stat-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Meus Tickets</div>
                  <div className="mt-1 text-2xl font-semibold">{ticketStats.total}</div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Ticket className="h-4 w-4 text-cyan-300" />
                </div>
              </div>
              <div className="mt-3">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/me/support/tickets">Ver tickets</Link>
                </Button>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Abertos</div>
                  <div className="mt-1 text-2xl font-semibold">{ticketStats.open}</div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <FolderOpen className="h-4 w-4 text-amber-300" />
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Acompanhe a evolução do suporte</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Em progresso</div>
                  <div className="mt-1 text-2xl font-semibold">{ticketStats.inProgress}</div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Ticket className="h-4 w-4 text-violet-300" />
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Tickets em atendimento</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Minhas Mensagens</div>
                  <div className="mt-1 text-2xl font-semibold">0</div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-fuchsia-300" />
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Chat interno indisponível para employees</div>
            </div>
          </>
        )}
      </div>

      <div className="glass-card p-6 bg-gradient-to-b from-fuchsia-500/5 via-background to-background border-t-fuchsia-500/20 hover:shadow-[0_0_30px_hsl(var(--ring)/0.25)] hover:border-fuchsia-400/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold">Posts Administrativos</h3>
            <p className="text-xs text-muted-foreground">Últimos comunicados</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-background/40 p-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3 w-72" />
                <Skeleton className="mt-2 h-3 w-56" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem posts.</div>
        ) : (
          <ScrollArea className="h-[600px] pr-3">
            <div className="relative space-y-4">
              <div className="absolute left-5 top-2 bottom-2 w-px bg-border/60" />
              {posts.slice(0, 10).map((p) => {
                const expanded = !!expandedPostIds[p.id];
                const fullHtml = (p.content ?? "").toString();
                const safeHtml = sanitizeHtml(fullHtml);
                const text = plainTextFromHtml(fullHtml);
                const tooLong = text.length > 420;

                return (
                  <div key={p.id} className="relative rounded-lg border border-border/60 bg-background/40 p-4 pl-10">
                    <span className="absolute left-4 top-6 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.45)]" />

                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar className="w-9 h-9 border border-border">
                        <AvatarImage
                          src={resolvePhotoUrl(p.author?.photo_path ?? null) ?? undefined}
                          alt={p.author?.name ?? undefined}
                        />
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {getInitials(p.author?.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-sm font-medium truncate">{p.author?.name ?? "Sistema"}</div>
                          {p.is_pinned ? <Badge variant="secondary">Fixado</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(p.title ?? "").trim() ? <span className="font-medium">{(p.title ?? "").trim()}</span> : null}
                          {(p.title ?? "").trim() && p.published_at ? <span> • </span> : null}
                          {p.published_at ? fmtDateTime(p.published_at) : null}
                        </div>
                      </div>
                    </div>

                    {safeHtml ? (
                      <div
                        className={cn("mt-3 text-sm tiptap ProseMirror min-h-0 p-0", !expanded && tooLong && "max-h-40 overflow-hidden")}
                        dangerouslySetInnerHTML={{ __html: safeHtml }}
                      />
                    ) : null}

                    {tooLong ? (
                      <button
                        className="mt-2 text-xs text-primary hover:underline"
                        onClick={() => setExpandedPostIds((m) => ({ ...m, [p.id]: !expanded }))}
                      >
                        {expanded ? "Ver menos" : "Ver mais"}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}