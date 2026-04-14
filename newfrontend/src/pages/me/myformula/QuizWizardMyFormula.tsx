import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { ChevronDown, ChevronUp } from "lucide-react"

const BASE_IMPROVE_ORDER = ["G", "H", "B", "A", "J", "C", "E", "F", "I", "K"] as const
const IMPROVE_LABEL: Record<string, string> = {
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

type Radio01 = "" | "0" | "1"
type Alcohol = "" | "no" | "occasionally" | "every_days"

function ageFromBirthdate(birthdate: string): number | null {
  if (!birthdate) return null
  const d = new Date(birthdate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

export default function QuizWizard({
  customer,
  onComplete,
  busy,
}: {
  customer: any
  onComplete: (payload: any) => void
  busy: boolean
}) {
  const { toast } = useToast()

  const [step, setStep] = useState(1)

  const [data, setData] = useState<Record<string, any>>({
    name: `${customer?.firstname ?? ""} ${customer?.lastname ?? ""}`.trim(),
    email: String(customer?.email ?? ""),
    telephone: String(customer?.telephone ?? ""),

    birthdate: "",
    gender: "",

    rgpd: false,

    condition_pregnant: false,
    condition_autoimmune: false,
    condition_anticoagulants: false,
    condition_cancer: false,
    condition_none: false,

    improve_health_order: [...BASE_IMPROVE_ORDER],

    medication: "" as Radio01,
    medication_info: "",

    illness_none: false,
    illness_diabetes_1: false,
    illness_diabetes_2: false,
    illness_pre_diabetes: false,

    illness_colesterol: false,
    illness_colesterol_value: "",

    illness_anemia: false,
    illness_tired_eyes: false,

    illness_hypertension: false,
    illness_hypertension_value: "",

    illness_muscle_aches: false,
    illness_low_blood_pressure: false,

    illness_respiratory_infections: false,

    illness_insomnia: false,
    illness_insomnia_falling_asleep: false,
    illness_insomnia_wakeup: false,
    illness_insomnia_back_sleep: false,

    illness_digestive: false,
    illness_digestive_constipation: false,
    illness_digestive_abdominal_pain: false,
    illness_digestive_heartburn: false,
    illness_digestive_reflux: false,
    illness_digestive_diarrhea: false,

    illness_allergies: false,
    illness_allergies_medicines: false,
    illness_allergies_mites_pollens_dander: false,
    illness_allergies_gluten: false,
    illness_allergies_lactose: false,
    illness_allergies_egg: false,
    illness_allergies_shellfish: false,
    illness_allergies_others: false,
    illness_allergies_others_info: "",

    illness_allergies_medicines_antibiotics: false,
    illness_allergies_medicines_aspirin: false,
    illness_allergies_medicines_iodinated_contrasts: false,
    illness_allergies_medicines_others: false,
    illness_allergies_medicines_others_info: "",

    clinical_analysis: "" as Radio01,

    weight: "",
    height: "",
    waist_circumference: "",

    smokes: "" as Radio01,
    smokes_quantity: "",

    alcohol: "" as Alcohol,

    exercise: "" as Radio01,
    exercise_quantity: "",
    exercise_type_walk: false,
    exercise_type_swimming: false,
    exercise_type_run: false,
    exercise_type_dance: false,
    exercise_type_football: false,
    exercise_type_gym: false,
    exercise_type_tenis: false,
    exercise_type_other: false,

    symptoms_rhinitis: false,
    symptoms_somnolence: false,
    symptoms_concentration: false,
    symptoms_energy_lack: false,
    symptoms_depression: false,
    symptoms_anxiety: false,
    symptoms_bad_circulation: false,
    symptoms_chronic_tiredness: false,
    symptoms_cramps: false,
    symptoms_hair_fall: false,
    symptoms_sexual_desire: false,
    symptoms_muscle: false,
    symptoms_difficulties_urinate: false,
    symptoms_none: false,

    diet_vegetarian: false,
    diet_mediterranean: false,
    diet_processed: false,
    diet_biscuits: false,
    diet_quiz_modal_diet_vegan: false,
    diet_others: false,

    lose_weight: "" as Radio01,
    lose_weight_ideal: "",
  })

  const update = (key: string, value: any) => setData((p) => ({ ...p, [key]: value }))

  const age = useMemo(() => ageFromBirthdate(String(data.birthdate ?? "")), [data.birthdate])
  const showMenopause = data.gender === "female" && (age === null || age >= 40)

  const improveOrder = useMemo(() => {
    const order = Array.isArray(data.improve_health_order) ? (data.improve_health_order as string[]) : []
    const filtered = order.filter((x) => x !== "K" || showMenopause)
    const base = BASE_IMPROVE_ORDER.filter((x) => x !== "K" || showMenopause)
    const merged = [...filtered]
    base.forEach((x) => {
      if (!merged.includes(x)) merged.push(x)
    })
    return merged
  }, [data.improve_health_order, showMenopause])

  const moveImprove = (idx: number, dir: -1 | 1) => {
    const next = [...improveOrder]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    const tmp = next[idx]
    next[idx] = next[j]
    next[j] = tmp
    update("improve_health_order", next)
  }

  const canProceedCondition = useMemo(() => {
    const requiredAny =
      Boolean(data.condition_pregnant) ||
      Boolean(data.condition_cancer) ||
      Boolean(data.condition_anticoagulants) ||
      Boolean(data.condition_none)

    const wouldQuit = Boolean(data.condition_pregnant) || Boolean(data.condition_cancer) || Boolean(data.condition_anticoagulants)

    return { requiredAny, wouldQuit }
  }, [data.condition_anticoagulants, data.condition_cancer, data.condition_none, data.condition_pregnant])

  const validateStep = (): boolean => {
    if (step === 1) {
      const name = String(data.name ?? "").trim()
      const email = String(data.email ?? "").trim()
      const tel = String(data.telephone ?? "").trim()

      if (!name) {
        toast({ title: "Validação", description: "Nome é obrigatório.", variant: "destructive" })
        return false
      }
      if (!email && !tel) {
        toast({ title: "Validação", description: "Email ou telefone é obrigatório.", variant: "destructive" })
        return false
      }
      if (!String(data.birthdate ?? "").trim()) {
        toast({ title: "Validação", description: "Data de nascimento é obrigatória.", variant: "destructive" })
        return false
      }
      if (!String(data.gender ?? "").trim()) {
        toast({ title: "Validação", description: "Género é obrigatório.", variant: "destructive" })
        return false
      }
      if (!data.rgpd) {
        toast({ title: "Validação", description: "RGPD é obrigatório.", variant: "destructive" })
        return false
      }
      return true
    }

    if (step === 2) {
      if (!canProceedCondition.requiredAny) {
        toast({ title: "Validação", description: "Indique se sofre de alguma condição.", variant: "destructive" })
        return false
      }
      if (canProceedCondition.wouldQuit) {
        toast({
          title: "Atenção",
          description: "No MyFormula, esta condição termina o questionário. Desmarque para continuar.",
          variant: "destructive",
        })
        return false
      }
      return true
    }

    if (step === 4) {
      if (data.medication !== "0" && data.medication !== "1") {
        toast({ title: "Validação", description: "Responda se toma medicamentos.", variant: "destructive" })
        return false
      }
      return true
    }

    if (step === 5) {
      const hasAnyIllness =
        Boolean(data.illness_none) ||
        Boolean(data.illness_diabetes_1) ||
        Boolean(data.illness_diabetes_2) ||
        Boolean(data.illness_pre_diabetes) ||
        Boolean(data.illness_colesterol) ||
        Boolean(data.illness_anemia) ||
        Boolean(data.illness_tired_eyes) ||
        Boolean(data.illness_hypertension) ||
        Boolean(data.illness_muscle_aches) ||
        Boolean(data.illness_low_blood_pressure) ||
        Boolean(data.illness_insomnia) ||
        Boolean(data.illness_digestive) ||
        Boolean(data.illness_respiratory_infections) ||
        Boolean(data.illness_allergies)

      if (!hasAnyIllness) {
        toast({ title: "Validação", description: "Selecione pelo menos uma opção no histórico médico.", variant: "destructive" })
        return false
      }

      if (data.illness_colesterol && !String(data.illness_colesterol_value ?? "").trim()) {
        toast({ title: "Validação", description: "Informe o valor do colesterol.", variant: "destructive" })
        return false
      }

      if (data.illness_hypertension && !String(data.illness_hypertension_value ?? "").trim()) {
        toast({ title: "Validação", description: "Informe o valor da hipertensão.", variant: "destructive" })
        return false
      }
      if (data.illness_hypertension && data.illness_hypertension_value === "more_180_100") {
        toast({
          title: "Atenção",
          description: "No MyFormula, este valor termina o questionário. Selecione outra opção para continuar.",
          variant: "destructive",
        })
        return false
      }

      if (data.illness_insomnia) {
        const ok =
          Boolean(data.illness_insomnia_falling_asleep) ||
          Boolean(data.illness_insomnia_wakeup) ||
          Boolean(data.illness_insomnia_back_sleep)
        if (!ok) {
          toast({ title: "Validação", description: "Selecione pelo menos um problema de sono.", variant: "destructive" })
          return false
        }
      }

      if (data.illness_digestive) {
        const ok =
          Boolean(data.illness_digestive_heartburn) ||
          Boolean(data.illness_digestive_reflux) ||
          Boolean(data.illness_digestive_constipation) ||
          Boolean(data.illness_digestive_abdominal_pain) ||
          Boolean(data.illness_digestive_diarrhea)
        if (!ok) {
          toast({ title: "Validação", description: "Selecione pelo menos um problema digestivo.", variant: "destructive" })
          return false
        }
      }

      if (data.illness_allergies) {
        const anyAll =
          Boolean(data.illness_allergies_medicines) ||
          Boolean(data.illness_allergies_mites_pollens_dander) ||
          Boolean(data.illness_allergies_gluten) ||
          Boolean(data.illness_allergies_lactose) ||
          Boolean(data.illness_allergies_egg) ||
          Boolean(data.illness_allergies_shellfish) ||
          Boolean(data.illness_allergies_others)

        if (!anyAll) {
          toast({ title: "Validação", description: "Selecione pelo menos um tipo de alergia.", variant: "destructive" })
          return false
        }

        if (data.illness_allergies_medicines) {
          const anyMed =
            Boolean(data.illness_allergies_medicines_antibiotics) ||
            Boolean(data.illness_allergies_medicines_aspirin) ||
            Boolean(data.illness_allergies_medicines_iodinated_contrasts) ||
            Boolean(data.illness_allergies_medicines_others)
          if (!anyMed) {
            toast({ title: "Validação", description: "Selecione o tipo de alergia a medicamentos.", variant: "destructive" })
            return false
          }
          if (data.illness_allergies_medicines_others && !String(data.illness_allergies_medicines_others_info ?? "").trim()) {
            toast({ title: "Validação", description: "Informe quais medicamentos (Outros).", variant: "destructive" })
            return false
          }
        }

        if (data.illness_allergies_others && !String(data.illness_allergies_others_info ?? "").trim()) {
          toast({ title: "Validação", description: "Informe quais alergias (Outros).", variant: "destructive" })
          return false
        }
      }

      return true
    }

    if (step === 6) {
      if (data.clinical_analysis !== "0" && data.clinical_analysis !== "1") {
        toast({ title: "Validação", description: "Responda sobre análises clínicas.", variant: "destructive" })
        return false
      }
      if (!String(data.weight ?? "").trim() || !String(data.height ?? "").trim()) {
        toast({ title: "Validação", description: "Peso e altura são obrigatórios.", variant: "destructive" })
        return false
      }
      return true
    }

    if (step === 7) {
      if (data.smokes !== "0" && data.smokes !== "1") {
        toast({ title: "Validação", description: "Responda se fuma.", variant: "destructive" })
        return false
      }
      if (data.smokes === "1") {
        const v = String(data.smokes_quantity ?? "").trim()
        const ok = ["1_10", "10_20", "more_20", "electronic"].includes(v)
        if (!ok) {
          toast({ title: "Validação", description: "Selecione quantos cigarros (opções do MyFormula).", variant: "destructive" })
          return false
        }
      }

      if (data.alcohol !== "no" && data.alcohol !== "occasionally" && data.alcohol !== "every_days") {
        toast({ title: "Validação", description: "Responda sobre consumo de álcool.", variant: "destructive" })
        return false
      }

      if (data.exercise !== "0" && data.exercise !== "1") {
        toast({ title: "Validação", description: "Responda se pratica exercício.", variant: "destructive" })
        return false
      }
      if (data.exercise === "1") {
        const v = String(data.exercise_quantity ?? "").trim()
        const ok = ["1", "2_3", "more_3"].includes(v)
        if (!ok) {
          toast({ title: "Validação", description: "Selecione quantas vezes por semana (opções do MyFormula).", variant: "destructive" })
          return false
        }
      }

      return true
    }

    if (step === 8) {
      const any =
        Boolean(data.symptoms_rhinitis) ||
        Boolean(data.symptoms_somnolence) ||
        Boolean(data.symptoms_concentration) ||
        Boolean(data.symptoms_energy_lack) ||
        Boolean(data.symptoms_depression) ||
        Boolean(data.symptoms_anxiety) ||
        Boolean(data.symptoms_bad_circulation) ||
        Boolean(data.symptoms_chronic_tiredness) ||
        Boolean(data.symptoms_cramps) ||
        Boolean(data.symptoms_hair_fall) ||
        Boolean(data.symptoms_sexual_desire) ||
        Boolean(data.symptoms_muscle) ||
        Boolean(data.symptoms_difficulties_urinate) ||
        Boolean(data.symptoms_none)

      if (!any) {
        toast({ title: "Validação", description: "Selecione pelo menos uma opção de sintomas.", variant: "destructive" })
        return false
      }

      return true
    }

    if (step === 9) {
      const anyDiet =
        Boolean(data.diet_vegetarian) ||
        Boolean(data.diet_mediterranean) ||
        Boolean(data.diet_processed) ||
        Boolean(data.diet_biscuits) ||
        Boolean(data.diet_quiz_modal_diet_vegan) ||
        Boolean(data.diet_others)

      if (!anyDiet) {
        toast({ title: "Validação", description: "Selecione pelo menos uma opção de dieta.", variant: "destructive" })
        return false
      }

      if (data.lose_weight !== "0" && data.lose_weight !== "1") {
        toast({ title: "Validação", description: "Responda se deseja perder peso.", variant: "destructive" })
        return false
      }

      if (data.lose_weight === "1") {
        const v = String(data.lose_weight_ideal ?? "").trim()
        if (!/^[\-+]?\d+$/.test(v) || !v || Number(v) === 0) {
          toast({ title: "Validação", description: "Informe o peso ideal (número inteiro).", variant: "destructive" })
          return false
        }
      }

      return true
    }

    return true
  }

  const next = () => {
    if (!validateStep()) return
    if (step === 9) {
      submit()
      return
    }
    setStep((s) => s + 1)
  }

  const back = () => setStep((s) => Math.max(1, s - 1))

  const submit = () => {
    const payload: any = { ...data }

    payload.improve_health = improveOrder.join(",")

    Object.keys(payload).forEach((k) => {
      if (payload[k] === true) payload[k] = "1"
      if (payload[k] === false) delete payload[k]
    })

    delete payload.improve_health_order

    if (payload.smokes === "0") {
      delete payload.smokes_quantity
    }

    if (payload.exercise === "0") {
      delete payload.exercise_quantity
      delete payload.exercise_type_walk
      delete payload.exercise_type_swimming
      delete payload.exercise_type_run
      delete payload.exercise_type_dance
      delete payload.exercise_type_football
      delete payload.exercise_type_gym
      delete payload.exercise_type_tenis
      delete payload.exercise_type_other
    }

    if (payload.medication === "0") {
      delete payload.medication_info
    }

    if (payload.symptoms_none) {
      Object.keys(payload).forEach((k) => {
        if (k.startsWith("symptoms_") && k !== "symptoms_none") delete payload[k]
      })
    }

    onComplete(payload)
  }

  const progress = Math.round((step / 9) * 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>Passo {step} de 9</div>
        <div className="flex-1 ml-4 mr-4 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="w-12 text-right">{progress}%</div>
      </div>

      <div className="min-h-[360px]">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Identificação</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Nome *</div>
                <Input value={data.name} onChange={(e) => update("name", e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Email (ou telefone) *</div>
                <Input value={data.email} onChange={(e) => update("email", e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Telefone (ou email) *</div>
                <Input value={data.telephone} onChange={(e) => update("telephone", e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Data de nascimento *</div>
                <Input type="date" value={data.birthdate} onChange={(e) => update("birthdate", e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Género *</div>
                <div className="value h-10 px-3 border rounded-md bg-background flex items-center">
                  <select
                    value={data.gender}
                    onChange={(e) => update("gender", e.target.value)}
                    className="w-full bg-transparent border-0 outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={Boolean(data.rgpd)} onChange={(e) => update("rgpd", e.target.checked)} />
                  Concordo com o tratamento de dados (RGPD) *
                </label>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Condições</h3>
            <p className="text-sm text-muted-foreground">Indique se sofre de alguma das seguintes condições (pelo menos 1):</p>

            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              {data.gender === "female" ? (
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={Boolean(data.condition_pregnant)} onChange={(e) => update("condition_pregnant", e.target.checked)} />
                  Grávida
                </label>
              ) : null}

              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                <input type="checkbox" checked={Boolean(data.condition_autoimmune)} onChange={(e) => update("condition_autoimmune", e.target.checked)} />
                Doença autoimune
              </label>

              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                <input type="checkbox" checked={Boolean(data.condition_anticoagulants)} onChange={(e) => update("condition_anticoagulants", e.target.checked)} />
                Toma anticoagulantes
              </label>

              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                <input type="checkbox" checked={Boolean(data.condition_cancer)} onChange={(e) => update("condition_cancer", e.target.checked)} />
                Cancro
              </label>

              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer sm:col-span-2">
                <input type="checkbox" checked={Boolean(data.condition_none)} onChange={(e) => update("condition_none", e.target.checked)} />
                Nenhuma das anteriores
              </label>
            </div>

            {(data.condition_pregnant || data.condition_cancer || data.condition_anticoagulants) ? (
              <div className="text-sm text-destructive">
                No MyFormula, estas opções terminam o quiz. Desmarque para continuar.
              </div>
            ) : null}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Objetivos (por prioridade)</h3>
            <p className="text-sm text-muted-foreground">Ajuste a ordem (como no MyFormula).</p>

            <div className="space-y-2">
              {improveOrder.map((id, idx) => (
                <div key={id} className="flex items-center gap-2 p-2 border rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{IMPROVE_LABEL[id] ?? id}</div>
                    <div className="text-xs text-muted-foreground">Código: {id}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" size="icon" variant="outline" onClick={() => moveImprove(idx, -1)} disabled={idx === 0}>
                      <ChevronUp />
                    </Button>
                    <Button type="button" size="icon" variant="outline" onClick={() => moveImprove(idx, 1)} disabled={idx === improveOrder.length - 1}>
                      <ChevronDown />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Medicação</h3>
            <p className="text-sm text-muted-foreground">Encontra-se a tomar algum medicamento regularmente?</p>

            <div className="flex gap-2">
              <Button type="button" variant={data.medication === "1" ? "default" : "outline"} onClick={() => update("medication", "1")}>
                Sim
              </Button>
              <Button type="button" variant={data.medication === "0" ? "default" : "outline"} onClick={() => update("medication", "0")}>
                Não
              </Button>
            </div>

            {data.medication === "1" ? (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Qual?</div>
                <Input value={data.medication_info} onChange={(e) => update("medication_info", e.target.value)} />
              </div>
            ) : null}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-lg font-semibold">Histórico Médico</h3>

            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer sm:col-span-2">
                <input type="checkbox" checked={Boolean(data.illness_none)} onChange={(e) => update("illness_none", e.target.checked)} />
                Nenhuma condição
              </label>

              {!data.illness_none ? (
                <>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_diabetes_1)} onChange={(e) => update("illness_diabetes_1", e.target.checked)} />
                    Diabetes tipo 1
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_diabetes_2)} onChange={(e) => update("illness_diabetes_2", e.target.checked)} />
                    Diabetes tipo 2
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_pre_diabetes)} onChange={(e) => update("illness_pre_diabetes", e.target.checked)} />
                    Pré-diabetes
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_colesterol)} onChange={(e) => update("illness_colesterol", e.target.checked)} />
                    Colesterol elevado
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_hypertension)} onChange={(e) => update("illness_hypertension", e.target.checked)} />
                    Hipertensão
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_low_blood_pressure)} onChange={(e) => update("illness_low_blood_pressure", e.target.checked)} />
                    Tensão baixa
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_anemia)} onChange={(e) => update("illness_anemia", e.target.checked)} />
                    Anemia
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_tired_eyes)} onChange={(e) => update("illness_tired_eyes", e.target.checked)} />
                    Vista cansada
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_muscle_aches)} onChange={(e) => update("illness_muscle_aches", e.target.checked)} />
                    Dores musculares/articulares
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_respiratory_infections)} onChange={(e) => update("illness_respiratory_infections", e.target.checked)} />
                    Infeções respiratórias frequentes
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer sm:col-span-2">
                    <input type="checkbox" checked={Boolean(data.illness_insomnia)} onChange={(e) => update("illness_insomnia", e.target.checked)} />
                    Problemas de sono
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer sm:col-span-2">
                    <input type="checkbox" checked={Boolean(data.illness_digestive)} onChange={(e) => update("illness_digestive", e.target.checked)} />
                    Problemas digestivos
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer sm:col-span-2">
                    <input type="checkbox" checked={Boolean(data.illness_allergies)} onChange={(e) => update("illness_allergies", e.target.checked)} />
                    Alergias
                  </label>
                </>
              ) : null}
            </div>

            {data.illness_colesterol ? (
              <div className="p-3 rounded-lg border bg-muted/20">
                <div className="text-sm font-medium mb-2">Valor do colesterol *</div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {[
                    ["unknown", "Não sei"],
                    ["lower_200", "< 200 mg/dl"],
                    ["200_240", "200-240 mg/dl"],
                    ["higher_240", "> 240 mg/dl"],
                  ].map(([v, lbl]) => (
                    <Button key={v} type="button" size="sm" variant={data.illness_colesterol_value === v ? "default" : "outline"} onClick={() => update("illness_colesterol_value", v)}>
                      {lbl}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {data.illness_hypertension ? (
              <div className="p-3 rounded-lg border bg-muted/20">
                <div className="text-sm font-medium mb-2">Valor da hipertensão *</div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {[
                    ["more_180_100", "> 180/100"],
                    ["more_160_90", "> 160/90"],
                    ["more_140_80", "> 140/80"],
                    ["unknown", "Não sei"],
                  ].map(([v, lbl]) => (
                    <Button key={v} type="button" size="sm" variant={data.illness_hypertension_value === v ? "default" : "outline"} onClick={() => update("illness_hypertension_value", v)}>
                      {lbl}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {data.illness_insomnia ? (
              <div className="p-3 rounded-lg border">
                <div className="text-sm font-medium mb-2">Sono (escolha pelo menos 1) *</div>
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_insomnia_falling_asleep)} onChange={(e) => update("illness_insomnia_falling_asleep", e.target.checked)} />
                    Dificuldade em adormecer
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_insomnia_wakeup)} onChange={(e) => update("illness_insomnia_wakeup", e.target.checked)} />
                    Acordar a meio da noite
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_insomnia_back_sleep)} onChange={(e) => update("illness_insomnia_back_sleep", e.target.checked)} />
                    Dificuldade em voltar a dormir
                  </label>
                </div>
              </div>
            ) : null}

            {data.illness_digestive ? (
              <div className="p-3 rounded-lg border">
                <div className="text-sm font-medium mb-2">Digestão (escolha pelo menos 1) *</div>
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_digestive_heartburn)} onChange={(e) => update("illness_digestive_heartburn", e.target.checked)} />
                    Azia
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_digestive_reflux)} onChange={(e) => update("illness_digestive_reflux", e.target.checked)} />
                    Refluxo
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_digestive_constipation)} onChange={(e) => update("illness_digestive_constipation", e.target.checked)} />
                    Prisão de ventre
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_digestive_abdominal_pain)} onChange={(e) => update("illness_digestive_abdominal_pain", e.target.checked)} />
                    Dor/Inchaço abdominal
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_digestive_diarrhea)} onChange={(e) => update("illness_digestive_diarrhea", e.target.checked)} />
                    Diarreia
                  </label>
                </div>
              </div>
            ) : null}

            {data.illness_allergies ? (
              <div className="p-3 rounded-lg border space-y-3">
                <div className="text-sm font-medium">Alergias (escolha pelo menos 1) *</div>

                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_allergies_medicines)} onChange={(e) => update("illness_allergies_medicines", e.target.checked)} />
                    Medicamentos
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_allergies_mites_pollens_dander)} onChange={(e) => update("illness_allergies_mites_pollens_dander", e.target.checked)} />
                    Ácaros / pólen / pêlos
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_allergies_gluten)} onChange={(e) => update("illness_allergies_gluten", e.target.checked)} />
                    Glúten
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_allergies_lactose)} onChange={(e) => update("illness_allergies_lactose", e.target.checked)} />
                    Lactose
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_allergies_egg)} onChange={(e) => update("illness_allergies_egg", e.target.checked)} />
                    Ovo
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.illness_allergies_shellfish)} onChange={(e) => update("illness_allergies_shellfish", e.target.checked)} />
                    Marisco
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
                    <input type="checkbox" checked={Boolean(data.illness_allergies_others)} onChange={(e) => update("illness_allergies_others", e.target.checked)} />
                    Outros
                  </label>
                </div>

                {data.illness_allergies_medicines ? (
                  <div className="p-3 rounded-lg bg-muted/20 border">
                    <div className="text-sm font-medium mb-2">Alergias a medicamentos (escolha pelo menos 1) *</div>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={Boolean(data.illness_allergies_medicines_antibiotics)} onChange={(e) => update("illness_allergies_medicines_antibiotics", e.target.checked)} />
                        Antibióticos
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={Boolean(data.illness_allergies_medicines_aspirin)} onChange={(e) => update("illness_allergies_medicines_aspirin", e.target.checked)} />
                        Aspirina
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={Boolean(data.illness_allergies_medicines_iodinated_contrasts)} onChange={(e) => update("illness_allergies_medicines_iodinated_contrasts", e.target.checked)} />
                        Contrastes iodados
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={Boolean(data.illness_allergies_medicines_others)} onChange={(e) => update("illness_allergies_medicines_others", e.target.checked)} />
                        Outros
                      </label>
                    </div>

                    {data.illness_allergies_medicines_others ? (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-1">Quais? *</div>
                        <Input value={data.illness_allergies_medicines_others_info} onChange={(e) => update("illness_allergies_medicines_others_info", e.target.value)} />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {data.illness_allergies_others ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Quais? *</div>
                    <Textarea value={data.illness_allergies_others_info} onChange={(e) => update("illness_allergies_others_info", e.target.value)} rows={3} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Análises & Biometria</h3>

            <div className="space-y-2">
              <div className="text-sm">Tem análises clínicas recentes? *</div>
              <div className="flex gap-2">
                <Button type="button" variant={data.clinical_analysis === "1" ? "default" : "outline"} onClick={() => update("clinical_analysis", "1")}>
                  Sim
                </Button>
                <Button type="button" variant={data.clinical_analysis === "0" ? "default" : "outline"} onClick={() => update("clinical_analysis", "0")}>
                  Não
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Peso (kg) *</div>
                <Input type="number" value={data.weight} onChange={(e) => update("weight", e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Altura (cm) *</div>
                <Input type="number" value={data.height} onChange={(e) => update("height", e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Cintura (cm)</div>
                <Input type="number" value={data.waist_circumference} onChange={(e) => update("waist_circumference", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-lg font-semibold">Hábitos</h3>

            <div className="space-y-2">
              <div className="text-sm">Fuma? *</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={data.smokes === "1" ? "default" : "outline"}
                  onClick={() => {
                    update("smokes", "1")
                    update("smokes_quantity", "")
                  }}
                >
                  Sim
                </Button>
                <Button
                  type="button"
                  variant={data.smokes === "0" ? "default" : "outline"}
                  onClick={() => {
                    update("smokes", "0")
                    update("smokes_quantity", "")
                  }}
                >
                  Não
                </Button>
              </div>

              {data.smokes === "1" ? (
                <div className="mt-2 space-y-2">
                  <div className="text-sm font-medium">Quantos cigarros? *</div>
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    {["1_10", "10_20", "more_20", "electronic"].map((v) => {
                      const label =
                        v === "1_10"
                          ? "De 1 a 10 por dia"
                          : v === "10_20"
                            ? "De 10 a 20 por dia"
                            : v === "more_20"
                              ? "Mais de 20 por dia"
                              : "Fumo cigarros eletrónicos ou vaping"

                      return (
                        <label key={v} className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                          <input
                            type="radio"
                            name="smokes_quantity"
                            checked={data.smokes_quantity === v}
                            onChange={() => update("smokes_quantity", v)}
                          />
                          {label}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="text-sm">Consome bebidas alcoólicas? *</div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={data.alcohol === "every_days" ? "default" : "outline"} onClick={() => update("alcohol", "every_days")}>
                  Sim, todos os dias
                </Button>
                <Button type="button" size="sm" variant={data.alcohol === "occasionally" ? "default" : "outline"} onClick={() => update("alcohol", "occasionally")}>
                  Sim, ocasionalmente
                </Button>
                <Button type="button" size="sm" variant={data.alcohol === "no" ? "default" : "outline"} onClick={() => update("alcohol", "no")}>
                  Não
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm">Faz exercício físico regularmente? *</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={data.exercise === "1" ? "default" : "outline"}
                  onClick={() => {
                    update("exercise", "1")
                    update("exercise_quantity", "")
                  }}
                >
                  Sim
                </Button>
                <Button
                  type="button"
                  variant={data.exercise === "0" ? "default" : "outline"}
                  onClick={() => {
                    update("exercise", "0")
                    update("exercise_quantity", "")
                    update("exercise_type_walk", false)
                    update("exercise_type_swimming", false)
                    update("exercise_type_run", false)
                    update("exercise_type_dance", false)
                    update("exercise_type_football", false)
                    update("exercise_type_gym", false)
                    update("exercise_type_tenis", false)
                    update("exercise_type_other", false)
                  }}
                >
                  Não
                </Button>
              </div>

              {data.exercise === "1" ? (
                <div className="mt-2 space-y-3">
                  <div>
                    <div className="text-sm font-medium">Quantas vezes por semana? *</div>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm mt-2">
                      {["1", "2_3", "more_3"].map((v) => {
                        const label = v === "1" ? "1 vez" : v === "2_3" ? "2 a 3 vezes" : "Mais de 3 vezes"
                        return (
                          <label key={v} className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                            <input
                              type="radio"
                              name="exercise_quantity"
                              checked={data.exercise_quantity === v}
                              onChange={() => update("exercise_quantity", v)}
                            />
                            {label}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Escolha os exercícios que efetua</div>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm mt-2">
                      {["walk", "swimming", "run", "dance", "football", "gym", "tenis", "other"].map((k) => {
                        const key = `exercise_type_${k}`
                        const label =
                          k === "walk"
                            ? "Caminhada + 30 min seguidos"
                            : k === "swimming"
                              ? "Natação"
                              : k === "run"
                                ? "Corrida"
                                : k === "dance"
                                  ? "Dança"
                                  : k === "football"
                                    ? "Futebol ou similar"
                                    : k === "gym"
                                      ? "Ginásio"
                                      : k === "tenis"
                                        ? "Padle ou tenis"
                                        : "Outro"

                        return (
                          <label key={k} className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                            <input type="checkbox" checked={Boolean((data as any)[key])} onChange={(e) => update(key, e.target.checked)} />
                            {label}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Sintomas</h3>
            <p className="text-sm text-muted-foreground">Selecione pelo menos 1 (ou “Nenhum”).</p>

            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(data.symptoms_none)}
                  onChange={(e) => update("symptoms_none", e.target.checked)}
                />
                Nenhum
              </label>

              {!data.symptoms_none ? (
                <>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_rhinitis)} onChange={(e) => update("symptoms_rhinitis", e.target.checked)} />
                    Rinite
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_somnolence)} onChange={(e) => update("symptoms_somnolence", e.target.checked)} />
                    Sonolência
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_concentration)} onChange={(e) => update("symptoms_concentration", e.target.checked)} />
                    Falta de concentração
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_energy_lack)} onChange={(e) => update("symptoms_energy_lack", e.target.checked)} />
                    Falta de energia
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_depression)} onChange={(e) => update("symptoms_depression", e.target.checked)} />
                    Depressão/Tristeza
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_anxiety)} onChange={(e) => update("symptoms_anxiety", e.target.checked)} />
                    Ansiedade/Stress
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_bad_circulation)} onChange={(e) => update("symptoms_bad_circulation", e.target.checked)} />
                    Má circulação
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_chronic_tiredness)} onChange={(e) => update("symptoms_chronic_tiredness", e.target.checked)} />
                    Cansaço crónico
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_cramps)} onChange={(e) => update("symptoms_cramps", e.target.checked)} />
                    Cãibras
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_hair_fall)} onChange={(e) => update("symptoms_hair_fall", e.target.checked)} />
                    Queda de cabelo
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_sexual_desire)} onChange={(e) => update("symptoms_sexual_desire", e.target.checked)} />
                    Falta de desejo sexual
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={Boolean(data.symptoms_muscle)} onChange={(e) => update("symptoms_muscle", e.target.checked)} />
                    Dores musculares
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer sm:col-span-2">
                    <input type="checkbox" checked={Boolean(data.symptoms_difficulties_urinate)} onChange={(e) => update("symptoms_difficulties_urinate", e.target.checked)} />
                    Dificuldades em urinar
                  </label>
                </>
              ) : null}
            </div>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-lg font-semibold">Dieta & Peso</h3>

            <div>
              <div className="text-sm font-medium mb-2">Como tem sido a sua dieta nos últimos meses? *</div>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={Boolean(data.diet_vegetarian)} onChange={(e) => update("diet_vegetarian", e.target.checked)} />
                  Vegetariana
                </label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={Boolean(data.diet_mediterranean)} onChange={(e) => update("diet_mediterranean", e.target.checked)} />
                  Mediterrânea
                </label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={Boolean(data.diet_processed)} onChange={(e) => update("diet_processed", e.target.checked)} />
                  Processados / fast-food
                </label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={Boolean(data.diet_biscuits)} onChange={(e) => update("diet_biscuits", e.target.checked)} />
                  Doces / bolachas / refrigerantes
                </label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={Boolean(data.diet_quiz_modal_diet_vegan)} onChange={(e) => update("diet_quiz_modal_diet_vegan", e.target.checked)} />
                  Vegan
                </label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={Boolean(data.diet_others)} onChange={(e) => update("diet_others", e.target.checked)} />
                  Outros
                </label>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Gostaria de perder peso? *</div>
              <div className="flex gap-2">
                <Button type="button" variant={data.lose_weight === "1" ? "default" : "outline"} onClick={() => update("lose_weight", "1")}>
                  Sim
                </Button>
                <Button type="button" variant={data.lose_weight === "0" ? "default" : "outline"} onClick={() => update("lose_weight", "0")}>
                  Não
                </Button>
              </div>

              {data.lose_weight === "1" ? (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">Peso ideal (kg) *</div>
                  <Input value={data.lose_weight_ideal} onChange={(e) => update("lose_weight_ideal", e.target.value)} />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={back} disabled={step === 1 || busy}>
          Anterior
        </Button>
        <Button type="button" onClick={next} disabled={busy}>
          {step === 9 ? (busy ? "A submeter..." : "Finalizar Quiz") : "Próximo"}
        </Button>
      </div>
    </div>
  )
}