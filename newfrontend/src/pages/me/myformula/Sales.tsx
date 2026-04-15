import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { fetchMyAccess, fetchMyCompanies } from "@/services/api"
import {
  createMyFormulaCustomerReal,
  createMyFormulaOrder,
  createMyFormulaQuizReal,
  fetchMyFormulaCountriesReal,
  fetchMyFormulaCustomers,
  fetchMyFormulaLatestQuizByCustomer,
  fetchMyFormulaOrderStatuses,
  fetchMyFormulaProducts,
  fetchMyFormulaRecommendedPlansByQuiz,
  fetchMyFormulaZonesReal,
  type MyFormulaCountryOption,
  type MyFormulaZoneOption,
} from "@/services/myFormulaApi"
import type { MyFormulaCustomer, MyFormulaOrder, MyFormulaOrderStatus, MyFormulaProduct, MyFormulaQuiz } from "@/types"
import QuizWizard from "./QuizWizardMyFormula"

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
  const [quizLoading, setQuizLoading] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  const [myCustomers, setMyCustomers] = useState<MyFormulaCustomer[]>([])
  const [myCustomersLoading, setMyCustomersLoading] = useState(false)

  const [order, setOrder] = useState<MyFormulaOrder | null>(null)
  const [orderBusy, setOrderBusy] = useState(false)

  const [products, setProducts] = useState<MyFormulaProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [recommendedPlans, setRecommendedPlans] = useState<MyFormulaProduct[]>([])
  const [recommendedPlansLoading, setRecommendedPlansLoading] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [addQty, setAddQty] = useState(1)

  const [cart, setCart] = useState<Array<{ product_id: string; quantity: number }>>([])

  const [orderStatuses, setOrderStatuses] = useState<MyFormulaOrderStatus[]>([])
  const [orderStatusesLoading, setOrderStatusesLoading] = useState(false)
  const [orderStatusId, setOrderStatusId] = useState("")

  const [paymentMethod, setPaymentMethod] = useState("Manual")
  const [paymentCode, setPaymentCode] = useState("manual")
  const [paymentCodePreset, setPaymentCodePreset] = useState<string>("__custom__")

  // Estados antigos do quiz básico foram removidos, usamos o Wizard agora

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

  useEffect(() => {
    let alive = true
    if (!allowed) return

    setProductsLoading(true)
    fetchMyFormulaProducts({ status: "active", per_page: 250, page: 1 })
      .then((r) => {
        if (!alive) return
        const rows = Array.isArray(r.data) ? r.data : []
        setProducts(rows)
        if (!selectedProductId && rows.length > 0) {
          setSelectedProductId(String(rows[0].product_id))
        }
      })
      .catch(() => {
        if (!alive) return
        setProducts([])
      })
      .finally(() => {
        if (!alive) return
        setProductsLoading(false)
      })

    setOrderStatusesLoading(true)
    fetchMyFormulaOrderStatuses()
      .then((r) => {
        if (!alive) return
        const rows = Array.isArray(r.data) ? r.data : []
        setOrderStatuses(rows)
        if (!orderStatusId && rows.length > 0) {
          setOrderStatusId(String(rows[0].order_status_id))
        }
      })
      .catch(() => {
        if (!alive) return
        setOrderStatuses([])
      })
      .finally(() => {
        if (!alive) return
        setOrderStatusesLoading(false)
      })

    return () => {
      alive = false
    }
  }, [allowed])

  useEffect(() => {
    setOrder(null)
    setCart([])
    setAddQty(1)
  }, [customer?.customer_id])

  useEffect(() => {
    let alive = true

    const quizId = quiz?.quiz_id ? String(quiz.quiz_id) : ""
    if (!allowed || !quizId) {
      setRecommendedPlans([])
      setRecommendedPlansLoading(false)
      return
    }

    setRecommendedPlansLoading(true)
    fetchMyFormulaRecommendedPlansByQuiz({ quiz_id: quizId })
      .then((r) => {
        if (!alive) return
        setRecommendedPlans(Array.isArray(r.data) ? r.data : [])
      })
      .catch(() => {
        if (!alive) return
        setRecommendedPlans([])
      })
      .finally(() => {
        if (!alive) return
        setRecommendedPlansLoading(false)
      })

    return () => {
      alive = false
    }
  }, [allowed, quiz?.quiz_id])

  const productLabel = (p?: MyFormulaProduct | null) => {
    if (!p) return ""
    const name = String(p.description?.name ?? "").trim()
    if (name) return name
    return String(p.model ?? p.product_id)
  }

  const productsFiltered = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return products
    return products.filter((p) => {
      const label = `${productLabel(p)} ${p.model ?? ""} ${p.product_id ?? ""}`.toLowerCase()
      return label.includes(term)
    })
  }, [productSearch, products])

  const productById = useMemo(() => {
    const map = new Map<string, MyFormulaProduct>()
    for (const p of products) map.set(String(p.product_id), p)
    return map
  }, [products])

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, line) => {
      const p = productById.get(String(line.product_id))
      const price = p?.price ? Number(p.price) : 0
      return sum + price * Number(line.quantity || 0)
    }, 0)
  }, [cart, productById])

  const addToCart = () => {
    const pid = String(selectedProductId || "").trim()
    if (!pid) return
    const qty = Math.max(1, Number(addQty || 1))

    setCart((prev) => {
      const idx = prev.findIndex((x) => String(x.product_id) === pid)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty }
        return next
      }
      return [...prev, { product_id: pid, quantity: qty }]
    })
  }

  const removeFromCart = (pid: string) => setCart((prev) => prev.filter((x) => String(x.product_id) !== String(pid)))

  const updateCartQty = (pid: string, qty: number) => {
    setCart((prev) =>
      prev.map((x) => (String(x.product_id) === String(pid) ? { ...x, quantity: Math.max(1, qty) } : x))
    )
  }

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
      setShowWizard(false)
      await reloadMyCustomers()

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

  useEffect(() => {
    let alive = true

    const customerId = customer?.customer_id ? String(customer.customer_id) : ""
    if (!allowed || !customerId) return

    setQuizLoading(true)
    fetchMyFormulaLatestQuizByCustomer({ customer_id: customerId })
      .then((r) => {
        if (!alive) return
        setQuiz(r.data ?? null)
      })
      .catch(() => {
        if (!alive) return
        setQuiz(null)
      })
      .finally(() => {
        if (!alive) return
        setQuizLoading(false)
      })

    return () => {
      alive = false
    }
  }, [allowed, customer?.customer_id])

  const onCreateQuiz = async (payload: any) => {
    if (!customer || busy) return

    const post = {
      ...payload,
      customer_id: customer.customer_id,
    }

    setBusy(true)
    try {
      const res = await createMyFormulaQuizReal({ post })
      setQuiz(res.data)
      setShowWizard(false)
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
                      setShowWizard(false)
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
            {quizLoading ? (
              <div className="text-sm text-muted-foreground">A carregar quiz deste cliente…</div>
            ) : null}

            {!quiz && !showWizard && !quizLoading && (
              <Button onClick={() => setShowWizard(true)}>
                Iniciar Quiz para {customer.firstname}
              </Button>
            )}

            {showWizard && !quiz && (
              <div className="border rounded-lg p-6 bg-card/50">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Questionário Clínico</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowWizard(false)}>Cancelar</Button>
                </div>
                <QuizWizard customer={customer} onComplete={onCreateQuiz} busy={busy} />
              </div>
            )}

            {quiz && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    ✅ Gravado com sucesso: {quiz.quiz_id}
                    {quiz.report_id ? ` — Relatório: ${quiz.report_id}` : ""}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setQuiz(null); setShowWizard(true) }}>
                    Refazer Quiz
                  </Button>
                </div>

                {quiz.result ? (
                  <Accordion type="single" collapsible className="border rounded-lg bg-muted/20">
                    <AccordionItem value="analysis" className="border-b-0">
                      <AccordionTrigger className="px-4">Resultado da análise</AccordionTrigger>
                      <AccordionContent className="px-4">
                        <Tabs defaultValue="report">
                          <TabsList>
                            <TabsTrigger value="report">Relatório</TabsTrigger>
                            <TabsTrigger value="json">JSON</TabsTrigger>
                          </TabsList>

                          <TabsContent value="report">
                            {(() => {
                              const post: any = quiz.post ?? {}
                              const result: any = quiz.result ?? {}

                              const improveMap: Record<string, string> = {
                                G: "Perder peso",
                                H: "Problemas Digestivos",
                                B: "Ossos e articulações",
                                A: "Energia e memória",
                                J: "Longevidade",
                                C: "Saúde Sexual",
                                E: "Cabelo pele e unhas",
                                F: "Sono",
                                I: "Coração, circulação e açúcar no sangue",
                                K: "Menopausa",
                              }

                              const genderRaw = String(post.gender ?? "").toLowerCase()
                              const gender = genderRaw === "female" ? "Mulher" : genderRaw === "male" ? "Homem" : "—"

                              const improveStr = String(post.improve_health ?? "")
                              const improveCodes = improveStr
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean)

                              const objectives = improveCodes.map((c) => improveMap[c] ?? c)

                              const recommended = Array.isArray(recommendedPlans) ? recommendedPlans : []
                              const shownPlans = recommended.length > 0 ? recommended : []

                              const planBlocks = shownPlans.map((p) => {
                                const pid = String(p.product_id)
                                const supp = Array.isArray(result?.[pid]?.supplements) ? result[pid].supplements : []
                                return {
                                  pid,
                                  name: String(p.description?.name ?? p.model ?? `#${pid}`),
                                  supplements: supp,
                                }
                              })

                              return (
                                <div className="space-y-4">
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Nome</div>
                                      <div className="value">{String(post.name ?? "").trim() || "—"}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Data de nascimento</div>
                                      <div className="value">{String(post.birthdate ?? "").trim() || "—"}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Género</div>
                                      <div className="value">{gender}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Email</div>
                                      <div className="value">{String(post.email ?? "").trim() || "—"}</div>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-sm font-semibold">Escolha seus objetivos por ordem de prioridade</div>
                                    <div className="text-xs text-muted-foreground">(Exemplo: Se entrou pelo plano Menopausa, insira Menopausa como primeira opção)</div>
                                    {objectives.length > 0 ? (
                                      <ol className="list-decimal ml-5 mt-2 text-sm space-y-0.5">
                                        {objectives.map((o, idx) => (
                                          <li key={`${o}-${idx}`}>{o}</li>
                                        ))}
                                      </ol>
                                    ) : (
                                      <div className="text-sm text-muted-foreground mt-2">—</div>
                                    )}
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Necessita aprovação</div>
                                      <div className="value">{result?.need_approval ? "Sim" : "Não"}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Bullets (health)</div>
                                      <div className="value">{Array.isArray(result?.health) ? result.health.join(", ") : "—"}</div>
                                    </div>
                                  </div>

                                  {planBlocks.length > 0 ? (
                                    <div className="border rounded-lg p-3 bg-background">
                                      <div className="text-sm font-semibold mb-2">Planos recomendados (suplementos calculados)</div>
                                      <div className="space-y-2">
                                        {planBlocks.map((b) => (
                                          <div key={b.pid} className="flex flex-col gap-1">
                                            <div className="text-sm font-medium">{b.name}</div>
                                            <div className="text-xs text-muted-foreground">{b.supplements.length ? b.supplements.join(", ") : "—"}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">
                                      Os planos recomendados aparecem no Passo 3; aqui o sistema mostra o resumo do quiz.
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </TabsContent>

                          <TabsContent value="json">
                            <pre className="text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(quiz.result, null, 2)}</pre>
                          </TabsContent>
                        </Tabs>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">3) Venda (encomenda)</div>
            <div className="text-sm text-muted-foreground">Criar encomenda (oc_order + tabelas relacionadas) na BD MyFormula.</div>
          </div>
          {order ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/myformula/orders/${order.order_id}`)}>
                Abrir encomenda
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/myformula/orders/${order.order_id}/purchase-report`)}>
                Abrir relatório
              </Button>
            </div>
          ) : null}
        </div>

        {!customer ? (
          <div className="text-sm text-muted-foreground">Crie/seleciona um cliente primeiro.</div>
        ) : (
          <>
            {!quiz ? (
              <div className="text-sm text-amber-600">
                Ainda não existe quiz associado a este cliente. Pode criar a encomenda na mesma, mas o recomendado é concluir o quiz antes.
              </div>
            ) : null}

            {quiz ? (
              <div className="border rounded-lg p-4 bg-muted/10 space-y-3">
                <div className="text-sm font-semibold">Planos recomendados (baseado no Quiz)</div>
                {recommendedPlansLoading ? (
                  <div className="text-sm text-muted-foreground">A carregar planos recomendados…</div>
                ) : recommendedPlans.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Sem recomendação disponível para este quiz. Pode escolher manualmente abaixo.</div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    {recommendedPlans.map((p) => (
                      <div key={p.product_id} className="border rounded-lg p-3 bg-background">
                        <div className="text-sm font-semibold truncate">{productLabel(p)}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.model ? p.model : `#${p.product_id}`}</div>
                        <div className="mt-2 text-sm">{p.price != null ? `€${Number(p.price).toFixed(2)}` : "—"}</div>
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProductId(String(p.product_id))
                              setCart([{ product_id: String(p.product_id), quantity: 1 }])
                            }}
                          >
                            Selecionar este plano
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Pesquisar produto</div>
                <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Pesquisar por nome/modelo/ID…" />
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Produto</div>
                <div className="value">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    disabled={productsLoading || products.length === 0}
                    style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }}
                  >
                    {productsFiltered.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {productLabel(p)} — #{p.product_id}{p.price != null ? ` — €${Number(p.price).toFixed(2)}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Quantidade</div>
                <Input type="number" min={1} value={String(addQty)} onChange={(e) => setAddQty(Math.max(1, Number(e.target.value || 1)))} />
              </div>

              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={addToCart} disabled={productsLoading || !selectedProductId}>
                  Adicionar
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                <div className="col-span-6">Produto</div>
                <div className="col-span-2">Qtd</div>
                <div className="col-span-3">Total</div>
                <div className="col-span-1"></div>
              </div>
              <div className="divide-y">
                {cart.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">Nenhum produto adicionado.</div>
                ) : (
                  cart.map((line) => {
                    const p = productById.get(String(line.product_id))
                    const price = p?.price ? Number(p.price) : 0
                    const total = price * Number(line.quantity || 0)
                    return (
                      <div key={line.product_id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                        <div className="col-span-6 text-sm">
                          <div className="font-medium truncate">{productLabel(p)}</div>
                          <div className="text-xs text-muted-foreground truncate">#{line.product_id}{p?.model ? ` — ${p.model}` : ""}</div>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min={1}
                            value={String(line.quantity)}
                            onChange={(e) => updateCartQty(String(line.product_id), Number(e.target.value || 1))}
                          />
                        </div>
                        <div className="col-span-3 text-sm">€{total.toFixed(2)}</div>
                        <div className="col-span-1 flex justify-end">
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeFromCart(String(line.product_id))}>
                            Remover
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Total estimado</div>
              <div className="text-lg font-semibold">€{cartTotal.toFixed(2)}</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Estado da encomenda</div>
                <div className="value">
                  <select
                    value={orderStatusId}
                    onChange={(e) => setOrderStatusId(e.target.value)}
                    disabled={orderStatusesLoading || orderStatuses.length === 0}
                    style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }}
                  >
                    {orderStatuses.map((s) => (
                      <option key={s.order_status_id} value={s.order_status_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Método de pagamento</div>
                <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Código de pagamento</div>
                <div className="value">
                  <select
                    value={paymentCodePreset}
                    onChange={(e) => {
                      const v = e.target.value
                      setPaymentCodePreset(v)
                      if (v !== "__custom__") {
                        setPaymentCode(v)
                      }
                    }}
                    style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }}
                  >
                    <option value="">Sem código</option>
                    <option value="climyf50">climyf50</option>
                    <option value="climyf80">climyf80</option>
                    <option value="climyf125">climyf125</option>
                    <option value="__custom__">Inserir manualmente</option>
                  </select>
                </div>

                {paymentCodePreset === "__custom__" ? (
                  <div className="mt-2">
                    <Input value={paymentCode} onChange={(e) => setPaymentCode(e.target.value)} placeholder="Código" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={async () => {
                  if (orderBusy || busy) return
                  if (cart.length === 0) {
                    toast({ title: "Validação", description: "Adicione pelo menos um produto.", variant: "destructive" })
                    return
                  }

                  setOrderBusy(true)
                  try {
                    const res = await createMyFormulaOrder({
                      customer_id: String(customer.customer_id),
                      order_status_id: orderStatusId || undefined,
                      quiz_id: quiz?.quiz_id ? String(quiz.quiz_id) : undefined,
                      products: cart.map((x) => ({ product_id: String(x.product_id), quantity: Number(x.quantity) })),
                      payment_method: paymentMethod || null,
                      payment_code: paymentCode || null,
                    })

                    setOrder(res.data)
                    toast({ title: "Encomenda criada", description: `Order #${res.data.order_id}` })
                  } catch (e: any) {
                    toast({ title: "Erro", description: String(e?.message ?? "Não foi possível criar a encomenda"), variant: "destructive" })
                  } finally {
                    setOrderBusy(false)
                  }
                }}
                disabled={orderBusy || busy || !customer}
              >
                {orderBusy ? "A criar…" : "Criar encomenda"}
              </Button>

              {order ? (
                <div className="text-sm text-muted-foreground">
                  ✅ Criada: #{order.order_id} — €{Number(order.total ?? 0).toFixed(2)}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}