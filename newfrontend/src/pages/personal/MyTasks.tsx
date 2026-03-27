import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, CheckCircle, Clock, Pencil, Plus, Search, Trash2, Zap, ListTodo } from "lucide-react"
import { pt } from "date-fns/locale"

import type { Task, TaskPriority, TaskStatus, User } from "@/types"
import { createTask, deleteTask, fetchTasks, fetchUsers, updateTask } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"


const statusBadge = (status: TaskStatus) => {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-white"
  if (status === "in_progress") return "bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-white"
  if (status === "cancelled") return "bg-muted text-muted-foreground border-border dark:text-white"
  return "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-white"
}

const statusLabel = (status: TaskStatus) => {
  if (status === "pending") return "Pendente"
  if (status === "in_progress") return "Em curso"
  if (status === "completed") return "Concluída"
  return "Cancelada"
}

const priorityBadge = (priority: TaskPriority) => {
  if (priority === "urgent") return "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-white"
  if (priority === "high") return "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-white"
  if (priority === "medium") return "bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-white"
  return "bg-muted text-muted-foreground border-border dark:text-white"
}

const priorityLabel = (priority: TaskPriority) => {
  if (priority === "low") return "Baixa"
  if (priority === "medium") return "Média"
  if (priority === "high") return "Alta"
  return "Urgente"
}

const toLocalDateKey = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const isoToDateKey = (iso?: string | null) => {
  if (!iso) return null
  return String(iso).slice(0, 10)
}

export default function MyTasks() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [rows, setRows] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all")
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all")


  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)

  const [view, setView] = useState<"list" | "calendar">("list")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDayKey, setSelectedDayKey] = useState<string>(toLocalDateKey(new Date()))
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const resp = await fetchTasks({
        search,
        status: statusFilter === "all" ? undefined : statusFilter,
        priority: priorityFilter === "all" ? undefined : priorityFilter,
      })
      setRows(resp.data)
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar tarefas", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load()
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, priorityFilter])

  const openCreate = () => {
    navigate("/personal/tasks/new")
  }

  const openEdit = (row: Task) => {
    navigate(`/personal/tasks/${row.id}/edit`)
  }

  const changeStatus = async (row: Task, nextStatus: TaskStatus) => {
    if (row.status === nextStatus) return

    const prev = row
    const nextCompletedAt = nextStatus === "completed" ? new Date().toISOString() : null

    setRows((current) =>
      current.map((t) =>
        t.id === row.id ? { ...t, status: nextStatus, completed_at: nextCompletedAt } : t,
      ),
    )

    try {
      await updateTask(row.id, { status: nextStatus, completed_at: nextCompletedAt })
      toast({ title: "Sucesso", description: "Estado atualizado" })
      load()
    } catch {
      setRows((current) => current.map((t) => (t.id === prev.id ? prev : t)))
      toast({ title: "Erro", description: "Falha ao atualizar estado", variant: "destructive" })
    }
  }

  const requestDelete = (row: Task) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const row = pendingDelete
    setDeleteOpen(false)
    setPendingDelete(null)
    if (!row) return

    try {
      await deleteTask(row.id)
      toast({ title: "Sucesso", description: "Tarefa eliminada" })
      load()
    } catch {
      toast({ title: "Erro", description: "Falha ao eliminar", variant: "destructive" })
    }
  }

  const tasksByDayKey: Record<string, Task[]> = {}
  const taskDayKeys = new Set<string>()

  const addToDay = (dayKey: string, t: Task) => {
    taskDayKeys.add(dayKey)
    const bucket = tasksByDayKey[dayKey] ?? []
    if (!bucket.some((x) => x.id === t.id)) bucket.push(t)
    tasksByDayKey[dayKey] = bucket
  }

  rows.forEach((t) => {
    const a = isoToDateKey(t.due_date)
    const b = isoToDateKey(t.start_date)
    if (a) addToDay(a, t)
    if (b) addToDay(b, t)
  })

  Object.keys(tasksByDayKey).forEach((k) => {
    tasksByDayKey[k] = tasksByDayKey[k].sort((a, b) => {
      const da = a.due_date ?? a.start_date ?? ""
      const db = b.due_date ?? b.start_date ?? ""
      if (da === db) return a.title.localeCompare(b.title)
      return da < db ? -1 : 1
    })
  })

  const tasksForSelectedDay = tasksByDayKey[selectedDayKey] ?? []
  const selectedTask = tasksForSelectedDay.find((t) => t.id === selectedTaskId) ?? null

  useEffect(() => {
    if (view !== "calendar") return
    setSelectedTaskId((current) => {
      if (current && tasksForSelectedDay.some((t) => t.id === current)) return current
      return tasksForSelectedDay[0]?.id ?? null
    })
  }, [selectedDayKey, tasksForSelectedDay, view])

  const todayKey = toLocalDateKey(new Date())

  const totalCount = rows.length
  const pendingCount = rows.filter((t) => t.status === "pending").length
  const inProgressCount = rows.filter((t) => t.status === "in_progress").length
  const completedCount = rows.filter((t) => t.status === "completed").length

  const dueTodayCount = rows.filter((t) => {
    const dueKey = isoToDateKey(t.due_date)
    if (!dueKey) return false
    if (t.status === "completed" || t.status === "cancelled") return false
    return dueKey === todayKey
  }).length

  const overdueCount = rows.filter((t) => {
    const dueKey = isoToDateKey(t.due_date)
    if (!dueKey) return false
    if (t.status === "completed" || t.status === "cancelled") return false
    return dueKey < todayKey
  }).length

  const urgentCount = rows.filter((t) => {
    if (t.priority !== "urgent") return false
    if (t.status === "completed" || t.status === "cancelled") return false
    return true
  }).length

  const kpiCards = [
    { key: "total", label: "Total", value: totalCount, icon: ListTodo, tone: "text-cyan-400" },
    { key: "pending", label: "Pendentes", value: pendingCount, icon: Clock, tone: "text-amber-400" },
    { key: "in_progress", label: "Em curso", value: inProgressCount, icon: Clock, tone: "text-sky-400" },
    { key: "due_today", label: "Para hoje", value: dueTodayCount, icon: Clock, tone: "text-fuchsia-400" },
    { key: "overdue", label: "Atrasadas", value: overdueCount, icon: AlertTriangle, tone: "text-rose-400" },
    { key: "urgent", label: "Urgentes", value: urgentCount, icon: Zap, tone: "text-rose-400" },
    { key: "completed", label: "Concluídas", value: completedCount, icon: CheckCircle, tone: "text-emerald-400" },
  ] as const

  return (
    <div className="space-y-6 animate-slide-up pb-24 md:pb-6">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Minhas Tarefas</h1>
            <p className="page-subtitle">Pessoal → Minhas Tarefas</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button onClick={openCreate} className="hidden md:inline-flex">
            <Plus />
            Nova tarefa
          </Button>
          <Button onClick={openCreate} variant="outline" size="icon" className="md:hidden" aria-label="Nova tarefa" title="Nova tarefa">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="stat-card p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))
          : kpiCards.map((c) => (
              <div key={c.key} className="stat-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <c.icon className={cn("w-4 h-4", c.tone)} />
                  <span className="text-xs font-medium uppercase tracking-wide">{c.label}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums">{c.value}</div>
              </div>
            ))}
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por título, descrição, notas…"
              className="max-w-lg"
            />
          </div>

          <div className="w-full lg:w-[220px]">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em curso</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[220px]">
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="calendar">Calendário</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <div className="md:hidden space-y-2">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-white/5 p-3">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="mt-2 h-3 w-full" />
                  </div>
                ))
              ) : rows.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">Nenhuma tarefa encontrada</div>
              ) : (
                rows.map((t) => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(t)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openEdit(t)
                    }}
                    className="rounded-xl border border-border bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.title}</div>
                        {t.description || t.notes ? (
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description || t.notes}</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(t)
                          }}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            requestDelete(t)
                          }}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-3 pr-4">Tarefa</th>
                    <th className="py-3 text-right">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="py-4 pr-4">
                          <Skeleton className="h-4 w-72" />
                        </td>
                        <td className="py-4 text-right">
                          <Skeleton className="h-9 w-28 ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-10 text-center text-muted-foreground">
                        Nenhuma tarefa encontrada
                      </td>
                    </tr>
                  ) : (
                    rows.map((t) => (
                      <tr key={t.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                        <td className="py-4 pr-4">
                          <div className="font-medium">{t.title}</div>
                        </td>
                        <td className="py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                              <Pencil />
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => requestDelete(t)}>
                              <Trash2 />
                              Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-border bg-white/5 p-3 overflow-x-auto">
                <Calendar
                  mode="single"
                  locale={pt}
                  weekStartsOn={1}
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (!d) return
                    setSelectedDate(d)
                    const key = toLocalDateKey(d)
                    setSelectedDayKey(key)
                    setSelectedTaskId(tasksByDayKey[key]?.[0]?.id ?? null)
                  }}
                  className="w-full p-0"
                  classNames={{
                    months: "w-full",
                    month: "w-full space-y-4",
                    table: "w-full border-collapse",
                    head_row: "grid grid-cols-7 w-full",
                    head_cell: "w-full px-2 text-left text-[0.8rem] font-medium text-muted-foreground",
                    row: "grid grid-cols-7 w-full mt-2",
                    cell:
                      "h-24 w-full align-top p-0 text-left text-sm relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/40 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day:
                      "h-24 w-full rounded-md border border-transparent p-2 text-left text-foreground hover:bg-muted/60 dark:hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-selected:bg-primary/15 aria-selected:text-foreground aria-selected:border-primary/30",
                  }}
                  modifiers={{
                    hasTasks: (d) => taskDayKeys.has(toLocalDateKey(d)),
                  }}
                  components={{
                    DayContent: (props: any) => {
                      const dayKey = toLocalDateKey(props.date)
                      const items = tasksByDayKey[dayKey] ?? []
                      const top = items.slice(0, 2)
                      const more = items.length - top.length

                      return (
                        <div
                          className="flex flex-col gap-1"
                          onDoubleClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()

                            setSelectedDate(props.date)
                            setSelectedDayKey(dayKey)

                            const dayTasks = tasksByDayKey[dayKey] ?? []
                            const candidate = dayTasks.find((t) => t.id === selectedTaskId) ?? dayTasks[0] ?? null
                            if (candidate) {
                              setSelectedTaskId(candidate.id)
                              navigate(`/personal/tasks/${candidate.id}/edit`)
                              return
                            }

                            setSelectedTaskId(null)
                            navigate(`/personal/tasks/new?due=${dayKey}`)
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-foreground">{props.date.getDate()}</div>
                            {items.length ? (
                              <span className="inline-flex items-center rounded-full border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 dark:text-white">
                                {items.length}
                              </span>
                            ) : null}
                          </div>

                          {top.map((t) => (
                            <div
                              key={t.id}
                              className={cn(
                                "w-full rounded-md border px-1.5 py-0.5 text-[10px] leading-3 line-clamp-1",
                                statusBadge(t.status),
                                selectedTaskId === t.id ? "ring-2 ring-cyan-400/40" : "",
                              )}
                            >
                              {t.title}
                            </div>
                          ))}

                          {more > 0 ? <div className="text-[10px] text-muted-foreground dark:text-white">+{more} mais</div> : null}
                        </div>
                      )
                    },
                  }}
                />
              </div>

              <div className="rounded-xl border border-border bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold">Tarefas do dia</div>
                    <div className="text-xs text-muted-foreground">{selectedDayKey}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => {
                      navigate(`/personal/tasks/new?due=${selectedDayKey}`)
                    }}
                  >
                    <Plus />
                    Nova
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="sm:hidden"
                    onClick={() => {
                      navigate(`/personal/tasks/new?due=${selectedDayKey}`)
                    }}
                    aria-label="Nova tarefa"
                    title="Nova tarefa"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {tasksForSelectedDay.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sem tarefas para este dia</div>
                  ) : (
                    tasksForSelectedDay.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTaskId(t.id)}
                        className={cn(
                          "w-full text-left rounded-lg border border-border px-3 py-2 hover:bg-white/5 transition-colors",
                          selectedTaskId === t.id ? "ring-2 ring-cyan-400/40" : "",
                        )}
                      >
                        <div className="font-medium line-clamp-1">{t.title}</div>
                      </button>
                    ))
                  )}
                </div>

                {selectedTask ? (
                  <div className="mt-4 rounded-xl border border-border bg-black/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{selectedTask.title}</div>
                        <div className="text-xs text-muted-foreground">Detalhes</div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(selectedTask)}>
                          <Pencil />
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => requestDelete(selectedTask)}>
                          <Trash2 />
                          Eliminar
                        </Button>
                      </div>
                      <div className="flex sm:hidden items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(selectedTask)}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => requestDelete(selectedTask)}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {selectedTask.description ? (
                      <div className="mt-3 text-sm whitespace-pre-wrap">{selectedTask.description}</div>
                    ) : null}

                    <div className="mt-3 hidden md:grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Estado</div>
                        <div className="mt-1">
                          <span
                            className={cn(
                              "inline-flex min-w-[110px] items-center justify-center rounded-full px-2 py-1 text-xs font-medium border",
                              statusBadge(selectedTask.status),
                            )}
                          >
                            {statusLabel(selectedTask.status)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Prioridade</div>
                        <div className="mt-1">
                          <span
                            className={cn(
                              "inline-flex min-w-[110px] items-center justify-center rounded-full px-2 py-1 text-xs font-medium border",
                              priorityBadge(selectedTask.priority),
                            )}
                          >
                            {priorityLabel(selectedTask.priority)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Início</div>
                        <div className="mt-1 text-sm font-medium">
                          {selectedTask.start_date ? new Date(selectedTask.start_date).toLocaleDateString("pt-PT") : "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Vencimento</div>
                        <div className="mt-1 text-sm font-medium">
                          {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString("pt-PT") : "—"}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="text-xs text-muted-foreground">Notas</div>
                        <div className="mt-1 text-sm whitespace-pre-wrap">{selectedTask.notes ?? "—"}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      {selectedTask.status === "completed" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await updateTask(selectedTask.id, { status: "pending", completed_at: null })
                              toast({ title: "Sucesso", description: "Tarefa reaberta" })
                              load()
                            } catch {
                              toast({ title: "Erro", description: "Falha ao reabrir", variant: "destructive" })
                            }
                          }}
                        >
                          Reabrir
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await updateTask(selectedTask.id, { status: "completed", completed_at: new Date().toISOString() })
                              toast({ title: "Sucesso", description: "Tarefa concluída" })
                              load()
                            } catch {
                              toast({ title: "Erro", description: "Falha ao concluir", variant: "destructive" })
                            }
                          }}
                        >
                          Concluir
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>


      {deleteOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setDeleteOpen(false)
            setPendingDelete(null)
          }}
        >
          <div className="glass-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="text-lg font-semibold">Eliminar tarefa?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar “${pendingDelete.title}”?` : "Deseja eliminar esta tarefa?"}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteOpen(false)
                  setPendingDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}