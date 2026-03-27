import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, Check, ChevronsUpDown, Save, Users as UsersIcon } from "lucide-react"

import type { Task, TaskPriority, TaskStatus, User } from "@/types"
import { createTask, fetchTask, fetchUsers, updateTask } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"


export default function TaskForm() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()

  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [usersLoading, setUsersLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [shareOpen, setShareOpen] = useState(false)

  const initialDue = useMemo(() => (searchParams.get("due") ?? "").slice(0, 10), [searchParams])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [status, setStatus] = useState<TaskStatus>("pending")
  const [dueDate, setDueDate] = useState("")
  const [startDate, setStartDate] = useState("")
  const [isAllDay, setIsAllDay] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [sharedWithUserIds, setSharedWithUserIds] = useState<string[]>([])
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")

  const pageTitle = useMemo(() => (isEdit ? "Editar tarefa" : "Nova tarefa"), [isEdit])

  useEffect(() => {
    let alive = true

    setUsersLoading(true)
    fetchUsers({ is_active: true })
      .then((r) => {
        if (!alive) return
        const all = r.data ?? []
        setUsers(all)
      })
      .catch(() => {
        if (!alive) return
        setUsers([])
      })
      .finally(() => {
        if (!alive) return
        setUsersLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!isEdit || !id) {
      setDueDate(initialDue)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchTask(id)
      .then((r) => {
        const t = r.data
        setTitle(t.title ?? "")
        setDescription(t.description ?? "")
        setPriority((t.priority ?? "medium") as any)
        setStatus((t.status ?? "pending") as any)
        setDueDate(t.due_date ? String(t.due_date).slice(0, 10) : "")
        setStartDate(t.start_date ? String(t.start_date).slice(0, 10) : "")
        setIsAllDay(Boolean(t.is_all_day))
        setIsPrivate(Boolean(t.is_private))
        setSharedWithUserIds((t.shared_with_user_ids ?? []).filter(Boolean))
        setLocation(t.location ?? "")
        setNotes(t.notes ?? "")
      })
      .catch(() => {
        toast({ title: "Erro", description: "Tarefa não encontrada", variant: "destructive" })
        navigate("/personal/tasks", { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, initialDue, isEdit, navigate, toast])

  useEffect(() => {
    if (!isPrivate) return
    setSharedWithUserIds([])
  }, [isPrivate])

  const toggleSharedUser = useCallback((userId: string) => {
    setSharedWithUserIds((current) =>
      current.includes(userId) ? current.filter((x) => x !== userId) : [...current, userId],
    )
  }, [])

  const sharedLabel = useMemo(() => {
    if (isPrivate) return "Privada"
    if (sharedWithUserIds.length === 0) return "Selecionar utilizadores"

    const byId: Record<string, User> = {}
    users.forEach((u) => (byId[u.id] = u))

    const names = sharedWithUserIds
      .map((uid) => byId[uid]?.name)
      .filter(Boolean) as string[]

    if (names.length === 0) return `${sharedWithUserIds.length} selecionado(s)`
    if (names.length <= 2) return names.join(", ")
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`
  }, [isPrivate, sharedWithUserIds, users])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanTitle = title.trim()
    if (!cleanTitle) {
      toast({ title: "Erro", description: "O título é obrigatório", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const due = dueDate ? new Date(dueDate).toISOString() : null
      const start = startDate ? new Date(startDate).toISOString() : null
      const completedAt = status === "completed" ? new Date().toISOString() : null

      const shared = isPrivate ? [] : sharedWithUserIds

      if (isEdit && id) {
        await updateTask(id, {
          title: cleanTitle,
          description: description.trim() ? description : null,
          priority,
          status,
          due_date: due,
          start_date: start,
          completed_at: completedAt,
          is_all_day: isAllDay,
          is_private: isPrivate,
          shared_with_user_ids: shared,
          location: location.trim() ? location : null,
          notes: notes.trim() ? notes : null,
        })
        toast({ title: "Sucesso", description: "Tarefa atualizada" })
      } else {
        await createTask({
          title: cleanTitle,
          description: description.trim() ? description : null,
          priority,
          status,
          due_date: due,
          start_date: start,
          completed_at: completedAt,
          is_all_day: isAllDay,
          location: location.trim() ? location : null,
          notes: notes.trim() ? notes : null,
          attachments: [],
          recurrence_rule: null,
          is_private: isPrivate,
          shared_with_user_ids: shared,
        })
        toast({ title: "Sucesso", description: "Tarefa criada" })
      }

      navigate("/personal/tasks")
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : "Falha ao guardar"
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">Pessoal → Minhas Tarefas</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A carregar…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle">Pessoal → Minhas Tarefas</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/personal/tasks">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button type="submit" form="task-form" disabled={saving || !title.trim()}>
              <Save />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <form id="task-form" onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Título</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Preparar relatório semanal" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Descrição</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(opcional)" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Prioridade</div>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Estado</div>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em curso</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Início</div>
            <Input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Vencimento</div>
            <Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4 md:col-span-2">
            <div>
              <div className="text-sm font-medium">Dia inteiro</div>
              <div className="text-xs text-muted-foreground">Controla is_all_day</div>
            </div>
            <Switch checked={isAllDay} onCheckedChange={(v) => setIsAllDay(Boolean(v))} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4 md:col-span-2">
            <div>
              <div className="text-sm font-medium">Privada</div>
              <div className="text-xs text-muted-foreground">Se ativo, remove a partilha</div>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={(v) => {
                const next = Boolean(v)
                setIsPrivate(next)
                if (next) setSharedWithUserIds([])
              }}
            />
          </div>

          {!isPrivate ? (
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Partilhar com</div>

              <Popover open={shareOpen} onOpenChange={setShareOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={usersLoading}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <UsersIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{usersLoading ? "A carregar…" : sharedLabel}</span>
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar utilizador…" />
                    <CommandList>
                      <CommandEmpty>Sem resultados</CommandEmpty>
                      <CommandGroup heading="Utilizadores">
                        {users.map((u) => {
                          const checked = sharedWithUserIds.includes(u.id)
                          return (
                            <CommandItem
                              key={u.id}
                              value={`${u.name} ${u.email}`}
                              onSelect={() => toggleSharedUser(u.id)}
                              className="flex items-center gap-2"
                            >
                              <Check className={cn("h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium truncate">{u.name}</span>
                                <span className="block text-xs text-muted-foreground truncate">{u.email}</span>
                              </span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="mt-2 text-xs text-muted-foreground">
                {sharedWithUserIds.length} selecionado(s)
              </div>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Localização</div>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="(opcional)" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Notas</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="(opcional)" />
          </div>
        </form>
      </div>
    </div>
  )
}