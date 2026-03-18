import { useCallback, useEffect, useMemo, useState } from "react"
import { Save, X } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { fetchUser, updateUser, fetchAdminUser } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials, resolvePhotoUrl } from "@/lib/utils"

export default function Profile() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)

  const [userId, setUserId] = useState<string>("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [roleName, setRoleName] = useState("")
  const [photoPath, setPhotoPath] = useState<string>("")

  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    setLoading(true)
    fetchUser()
      .then((r) => {
        setUserId(r.data.id)
        setName(r.data.name)
        setEmail(r.data.email)
        setPhotoPath(r.data.photo_path ?? "")
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível carregar o perfil", variant: "destructive" })
        navigate("/admin")
      })
      .finally(() => setLoading(false))
  }, [navigate, toast])

  useEffect(() => {
    if (!userId) return
    fetchAdminUser(userId)
      .then((r) => {
        setPhone(r.data.phone ?? "")
        setRoleName(r.data.role ?? "")
      })
      .catch(() => {})
  }, [userId])

  const currentPhotoUrl = useMemo(() => resolvePhotoUrl(photoPath) ?? undefined, [photoPath])

  const processPhotoFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Erro", description: "Selecione uma imagem", variant: "destructive" })
        setPhotoInputKey((k) => k + 1)
        return
      }
      const maxBytes = 2 * 1024 * 1024
      if (file.size > maxBytes) {
        toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB", variant: "destructive" })
        setPhotoInputKey((k) => k + 1)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result === "string") {
          setPhotoPath(result)
          setPhotoInputKey((k) => k + 1)
          return
        }
        toast({ title: "Erro", description: "Não foi possível ler a imagem", variant: "destructive" })
        setPhotoInputKey((k) => k + 1)
      }
      reader.onerror = () => {
        toast({ title: "Erro", description: "Falha ao ler a imagem", variant: "destructive" })
        setPhotoInputKey((k) => k + 1)
      }
      reader.readAsDataURL(file)
    },
    [toast]
  )

  const onPhotoFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setPendingPhoto(null)
      processPhotoFile(file)
    },
    [processPhotoFile]
  )

  const onSavePhoto = async () => {
    if (!userId) return
    setSavingPhoto(true)
    try {
      const r = await updateUser(userId, { photo_path: photoPath || null })
      setPhotoPath(String(r.data.photo_path ?? ""))
      toast({ title: "Sucesso", description: "Avatar atualizado" })
    } catch {
      toast({ title: "Erro", description: "Falha ao atualizar avatar", variant: "destructive" })
    } finally {
      setSavingPhoto(false)
    }
  }

  const onRemovePhoto = async () => {
    if (!userId) return
    setSavingPhoto(true)
    try {
      await updateUser(userId, { photo_path: "" })
      setPhotoPath("")
      toast({ title: "Sucesso", description: "Avatar removido" })
    } catch {
      toast({ title: "Erro", description: "Falha ao remover avatar", variant: "destructive" })
    } finally {
      setSavingPhoto(false)
    }
  }

  const onSaveInfo = async () => {
    if (!userId) return
    const nm = name.trim()
    const em = email.trim()
    if (!nm || !em) {
      toast({ title: "Erro", description: "Nome e email são obrigatórios", variant: "destructive" })
      return
    }
    setSavingInfo(true)
    try {
      const r = await updateUser(userId, { name: nm, email: em, phone: phone.trim() || null })
      setName(String(r.data.name ?? nm))
      setEmail(String(r.data.email ?? em))
      setPhone(String(r.data.phone ?? (phone || "")))
      toast({ title: "Sucesso", description: "Dados atualizados" })
    } catch {
      toast({ title: "Erro", description: "Falha ao atualizar dados", variant: "destructive" })
    } finally {
      setSavingInfo(false)
    }
  }

  const onSavePassword = async () => {
    if (!userId) return
    const pwd = newPassword.trim()
    const conf = confirmPassword.trim()
    if (!pwd) {
      toast({ title: "Erro", description: "A palavra‑passe é obrigatória", variant: "destructive" })
      return
    }
    if (pwd !== conf) {
      toast({ title: "Erro", description: "As palavras‑passe não coincidem", variant: "destructive" })
      return
    }
    setSavingPassword(true)
    try {
      await updateUser(userId, { password: pwd })
      setNewPassword("")
      setConfirmPassword("")
      toast({ title: "Sucesso", description: "Palavra‑passe alterada" })
    } catch {
      toast({ title: "Erro", description: "Falha ao alterar palavra‑passe", variant: "destructive" })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Perfil</h1>
          <p className="page-subtitle">Conta</p>
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
            <h1 className="page-title">Perfil</h1>
            <p className="page-subtitle">Conta</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
            {roleName && (
              <div className="mt-3">
                <span className="inline-flex items-center rounded-full border border-border bg-background/40 px-2 py-1 text-xs">
                  Role: {roleName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <div className="text-lg font-semibold">Avatar</div>

          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border border-border">
              <AvatarImage src={currentPhotoUrl} alt={name} />
              <AvatarFallback className="bg-primary/20 text-sm font-bold text-primary">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                key={photoInputKey}
                type="file"
                accept="image/*"
                onChange={onPhotoFileChange}
                className="cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <Button type="button" onClick={onSavePhoto} disabled={savingPhoto}>
                  <Save className="w-4 h-4" />
                  Guardar avatar
                </Button>
                {!!photoPath && !photoPath.startsWith("data:") && (
                  <Button type="button" variant="outline" onClick={onRemovePhoto} disabled={savingPhoto}>
                    <X className="w-4 h-4" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {email}
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="text-lg font-semibold">Alterar palavra‑passe</div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Nova palavra‑passe</div>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Confirmar palavra‑passe</div>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="pt-2">
            <Button type="button" onClick={onSavePassword} disabled={savingPassword}>
              <Save className="w-4 h-4" />
              Guardar palavra‑passe
            </Button>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4 lg:col-span-2">
          <div className="text-lg font-semibold">Dados da conta</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Nome</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Email</div>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@dominio.com" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Telefone</div>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(+351) ..." />
            </div>
          </div>
          <div className="pt-2">
            <Button type="button" onClick={onSaveInfo} disabled={savingInfo}>
              <Save className="w-4 h-4" />
              Guardar dados
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}