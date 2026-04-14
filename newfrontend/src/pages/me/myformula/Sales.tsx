import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { fetchMyAccess, fetchMyCompanies } from "@/services/api"
import {
  createMyFormulaCustomerReal,
  createMyFormulaQuizReal,
  fetchMyFormulaCountriesReal,
  fetchMyFormulaCustomers,
  fetchMyFormulaZonesReal,
  type MyFormulaCountryOption,
  type MyFormulaZoneOption,
} from "@/services/myFormulaApi"
import type { MyFormulaCustomer, MyFormulaQuiz } from "@/types"

export default function MyFormulaSales() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  const [firstname, setFirstname] = useState("")
  const [lastname, setLastname] = useState("")
  const [telephone, setTelephone] = useState("")
  const [email, setEmail] = useState("")
  const [nif, setNif] = useState("")

  const [companyName, setCompanyName] = useState("")
  const [address1, setAddress1] = useState("")
  const [city, setCity] = useState("")
  const [postcode, setPostcode] = useState("")
  const [country, setCountry] = useState("Portugal")
  const [district, setDistrict] = useState("")

  const [countries, setCountries] = useState<MyFormulaCountryOption[]>([])
  const [zones, setZones] = useState<MyFormulaZoneOption[]>([])
  const [countriesLoading, setCountriesLoading] = useState(false)
  const [zonesLoading, setZonesLoading] = useState(false)

  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")

  const [customer, setCustomer] = useState<MyFormulaCustomer | null>(null)
  const [quiz, setQuiz] = useState<MyFormulaQuiz | null>(null)

  const [myCustomers, setMyCustomers] = useState<MyFormulaCustomer[]>([])
  const [myCustomersLoading, setMyCustomersLoading] = useState(false)

  const [quizName, setQuizName] = useState("")
  const [quizEmail, setQuizEmail] = useState("")
  const [quizTelephone, setQuizTelephone] = useState("")
  const [quizBirthdate, setQuizBirthdate] = useState("")
  const [quizGender, setQuizGender] = useState("")
  const [quizImproveHealth, setQuizImproveHealth] = useState("")
  const [quizExtraJson, setQuizExtraJson] = useState("{}")

  const isReadyToCreate = useMemo(() => {
    if (busy) return false
    if (!telephone.trim() && !email.trim()) return false
    if (!firstname.trim()) return false
    if (!lastname.trim()) return false
    if (!address1.trim()) return false
    if (!city.trim()) return false
    if (!postcode.trim()) return false
    if (!country.trim()) return false
    if (!district.trim()) return false
    if (!password) return false
    if (password !== passwordConfirm) return false
    return true
  }, [address1, busy, city, country, district, email, firstname, lastname, password, passwordConfirm, postcode, telephone])

  useEffect(() => {
    let alive = true
    setAllowed(null)

    Promise.allSettled([fetchMyAccess(), fetchMyCompanies()])
      .then(([accessRes, companiesRes]) => {
        if (!alive) return
        const isAdmin = accessRes.status === "fulfilled" ? Boolean(accessRes.value.data.isAdmin) : false
        if (isAdmin) {
          setAllowed(true)
          return
        }

        const isEmployeeRole = accessRes.status === "fulfilled" ? Boolean(accessRes.value.data.isEmployeeRole) : false
        if (!isEmployeeRole) {
          setAllowed(false)
          return
        }

        const companies = companiesRes.status === "fulfilled" ? companiesRes.value.data : []
        const ok = Array.isArray(companies) && companies.some((c) => String((c as any)?.slug ?? "").toLowerCase() === "myformula")
        setAllowed(ok)
      })
      .catch(() => {
        if (!alive) return
        setAllowed(false)
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true

    if (!allowed) return

    setCountriesLoading(true)
    fetchMyFormulaCountriesReal()
      .then((r) => {
        if (!alive) return
        setCountries(Array.isArray(r.data) ? r.data : [])
      })
      .catch(() => {
        if (!alive) return
        setCountries([])
      })
      .finally(() => {
        if (!alive) return
        setCountriesLoading(false)
      })

    return () => {
      alive = false
    }
  }, [allowed])

  const reloadMyCustomers = async () => {
    setMyCustomersLoading(true)
    try {
      const r = await fetchMyFormulaCustomers({ created_by: "me", per_page: 20, page: 1 })
      setMyCustomers(Array.isArray(r.data) ? r.data : [])
    } catch (e: any) {
      setMyCustomers([])
      toast({ title: "Erro", description: String(e?.message ?? "Não foi possível carregar os clientes"), variant: "destructive" })
    } finally {
      setMyCustomersLoading(false)
    }
  }

  useEffect(() => {
    if (!allowed) return
    reloadMyCustomers()
  }, [allowed])

  useEffect(() => {
    let alive = true

    if (!allowed) return

    const isPt = country.trim().toLowerCase() === "portugal"
    if (!isPt) {
      setZones([])
      return
    }

    setZonesLoading(true)
    fetchMyFormulaZonesReal({ country })
      .then((r) => {
        if (!alive) return
        setZones(Array.isArray(r.data) ? r.data : [])
      })
      .catch(() => {
        if (!alive) return
        setZones([])
      })
      .finally(() => {
        if (!alive) return
        setZonesLoading(false)
      })

    return () => {
      alive = false
    }
  }, [allowed, country])

  const onCreateCustomer = async () => {
    if (!isReadyToCreate) return

    setBusy(true)
    try {
      const res = await createMyFormulaCustomerReal({
        telephone: telephone.trim() || null,
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email: email.trim() || null,
        nif: nif.trim() || null,
        address: {
          company: companyName.trim() || null,
          address_1: address1.trim(),
          city: city.trim(),
          postcode: postcode.trim(),
          country: country.trim(),
          district: district.trim(),
        },
        password,
        password_confirmation: passwordConfirm,
      })

      setCustomer(res.data)
      setQuiz(null)
      await reloadMyCustomers()

      setQuizName(`${res.data.firstname ?? ""} ${res.data.lastname ?? ""}`.trim() || `${firstname.trim()} ${lastname.trim()}`.trim())
      setQuizEmail(String(res.data.email ?? "").trim())
      setQuizTelephone(String(res.data.telephone ?? telephone).trim())

      toast({ title: "Cliente criado", description: `ID ${res.data.customer_id}` })
    } catch (e: any) {
      toast({
        title: "Erro",
        description: String(e?.message ?? "Não foi possível criar o cliente"),
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const onCreateQuiz = async () => {
    if (!customer || busy) return

    const name = quizName.trim()
    const emailVal = quizEmail.trim()
    if (!name) {
      toast({ title: "Erro", description: "Nome do quiz é obrigatório", variant: "destructive" })
      return
    }
    if (!emailVal) {
      toast({ title: "Erro", description: "Email do quiz é obrigatório", variant: "destructive" })
      return
    }

    let extra: any = {}
    try {
      extra = quizExtraJson.trim() ? JSON.parse(quizExtraJson) : {}
    } catch {
      toast({ title: "Erro", description: "JSON extra inválido", variant: "destructive" })
      return
    }

    const post = {
      name,
      email: emailVal,
      telephone: quizTelephone.trim() || telephone.trim(),
      birthdate: quizBirthdate || undefined,
      gender: quizGender || undefined,
      improve_health: quizImproveHealth.trim() || undefined,
      step: "plans",
      customer_id: customer.customer_id,
      ...extra,
    }

    setBusy(true)
    try {
      const res = await createMyFormulaQuizReal({ post })
      setQuiz(res.data)
      toast({ title: "Quiz gravado", description: `ID ${res.data.quiz_id}` })
    } catch (e: any) {
      toast({ title: "Erro", description: String(e?.message ?? "Não foi possível gravar o quiz"), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  if (allowed === null) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">A carregar…</h1>
          <p className="page-subtitle">Vendas MyFormula</p>
          <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
        </div>
        <div className="p-6 glass-card">
          <div className="text-sm text-muted-foreground">A validar acesso…</div>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Acesso restrito</h1>
          <p className="page-subtitle">Vendas MyFormula</p>
          <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
        </div>
        <div className="p-6 glass-card space-y-3">
          <div className="text-sm text-muted-foreground">A tua empresa não tem acesso a esta funcionalidade.</div>
          <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Vendas MyFormula</h1>
            <p className="page-subtitle">Call center</p>
            <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
          </div>

          <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">1) Registo do cliente</div>
          <Button type="button" variant="outline" onClick={reloadMyCustomers} disabled={myCustomersLoading || busy}>
            {myCustomersLoading ? "A carregar…" : "Recarregar"}
          </Button>
        </div>

        {myCustomers.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground bg-muted/30">
              <div className="col-span-4">Cliente</div>
              <div className="col-span-3">Telefone</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Criado</div>
            </div>
            <div className="divide-y">
              {myCustomers.map((c) => {
                const created = c.date_added ? new Date(c.date_added).toLocaleString("pt-PT") : "—"
                return (
                  <button
                    key={c.customer_id}
                    type="button"
                    className="w-full text-left grid grid-cols-12 gap-2 px-3 py-2 text-sm hover:bg-muted/30"
                    onClick={() => {
                      setCustomer(c)
                      setQuiz(null)
                      setQuizName(`${c.firstname ?? ""} ${c.lastname ?? ""}`.trim())
                      setQuizEmail(String(c.email ?? "").trim())
                      setQuizTelephone(String(c.telephone ?? "").trim())
                    }}
                  >
                    <div className="col-span-4 font-medium truncate">{`${c.firstname ?? ""} ${c.lastname ?? ""}`.trim() || `#${c.customer_id}`}</div>
                    <div className="col-span-3 truncate">{c.telephone ?? "—"}</div>
                    <div className="col-span-3 truncate">{c.email ?? "—"}</div>
                    <div className="col-span-2 truncate">{created}</div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Ainda não existem clientes criados por ti.</div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Telefone *</div>
            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+351…" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="(se vazio, será gerado automaticamente)" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Nome *</div>
            <Input value={firstname} onChange={(e) => setFirstname(e.target.value)} placeholder="Primeiro nome" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Apelido *</div>
            <Input value={lastname} onChange={(e) => setLastname(e.target.value)} placeholder="Último nome" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">NIF</div>
            <Input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="(não obrigatório)" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Empresa</div>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="(opcional)" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Endereço *</div>
            <Input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Rua, número…" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Localidade *</div>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Código postal *</div>
            <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="0000-000" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">País *</div>
            <div className="value">
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value)
                  setDistrict("")
                }}
                disabled={countriesLoading || countries.length === 0}
                style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }}
              >
                {countries.length === 0 ? <option value="Portugal">Portugal</option> : null}
                {countries.map((c) => (
                  <option key={c.country_id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Distrito *</div>
            {country.trim().toLowerCase() === "portugal" && zones.length > 0 ? (
              <div className="value">
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={zonesLoading}
                  style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }}
                >
                  <option value=""></option>
                  {zones.map((z) => (
                    <option key={z.zone_id} value={z.name}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Lisboa" />
            )}
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Senha *</div>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Confirmar senha *</div>
            <Input value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} type="password" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onCreateCustomer} disabled={!isReadyToCreate}>
            {busy ? "A criar…" : "Criar cliente"}
          </Button>
          {customer ? (
            <div className="text-sm text-muted-foreground">
              Criado: {customer.firstname} {customer.lastname} — {customer.telephone ?? "—"} ({customer.email})
            </div>
          ) : null}
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="text-sm font-semibold">2) Quiz do MyFormula</div>
        {!customer ? (
          <div className="text-sm text-muted-foreground">Crie o cliente primeiro para preencher o quiz.</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Nome *</div>
                <Input value={quizName} onChange={(e) => setQuizName(e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Email *</div>
                <Input value={quizEmail} onChange={(e) => setQuizEmail(e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Telefone</div>
                <Input value={quizTelephone} onChange={(e) => setQuizTelephone(e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Data de nascimento</div>
                <Input value={quizBirthdate} onChange={(e) => setQuizBirthdate(e.target.value)} placeholder="YYYY-MM-DD" />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Género</div>
                <div className="value">
                  <select
                    value={quizGender}
                    onChange={(e) => setQuizGender(e.target.value)}
                    style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }}
                  >
                    <option value=""></option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Planos (improve_health)</div>
                <Input value={quizImproveHealth} onChange={(e) => setQuizImproveHealth(e.target.value)} placeholder="Ex.: A17, B02" />
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">JSON extra (opcional)</div>
                <Textarea value={quizExtraJson} onChange={(e) => setQuizExtraJson(e.target.value)} rows={6} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onCreateQuiz} disabled={busy || !customer}>
                {busy ? "A gravar…" : "Gravar quiz"}
              </Button>
              {quiz ? <div className="text-sm text-muted-foreground">Gravado: {quiz.quiz_id}</div> : null}
            </div>
          </>
        )}
      </div>

      <div className="glass-card p-6 space-y-2">
        <div className="text-sm font-semibold">3) Venda (encomenda)</div>
        <div className="text-sm text-muted-foreground">Próximo passo: criar encomenda (oc_order + tabelas relacionadas) na BD MyFormula.</div>
      </div>
    </div>
  )
}