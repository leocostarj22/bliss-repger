import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

const IMPROVE_OPTIONS = [
  { id: "A", label: "Energia e memória" },
  { id: "B", label: "Ossos e articulações" },
  { id: "C", label: "Vida sexual" },
  { id: "E", label: "Cabelo, pele e unhas" },
  { id: "F", label: "Sono" },
  { id: "G", label: "Peso" },
  { id: "H", label: "Digestivo" },
  { id: "I", label: "Coração, circulação e açúcar" },
  { id: "J", label: "Anti-aging" },
  { id: "K", label: "Menopausa" },
]

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
    email: customer?.email ?? "",
    telephone: customer?.telephone ?? "",
    birthdate: "",
    gender: "",
    improve_health: [],
    medication: "",
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
    illness_muscle_aches: false,
    illness_low_blood_pressure: false,
    illness_respiratory_infections: false,
    illness_allergies: false,
    illness_allergies_medicines_others: "",
    illness_insomnia_falling_asleep: false,
    illness_insomnia_wakeup: false,
    illness_insomnia_back_sleep: false,
    illness_digestive_constipation: false,
    illness_digestive_abdominal_pain: false,
    illness_digestive_heartburn: false,
    illness_digestive_reflux: false,
    illness_digestive_diarrhea: false,
    smokes: false,
    alcohol: "no",
    exercise: false,
    diet_processed: false,
    diet_biscuits: false,
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
    weight: "",
    height: "",
    waist_circumference: "",
    lose_weight: false,
  })

  const update = (key: string, value: any) => setData((p) => ({ ...p, [key]: value }))

  const toggleImprove = (id: string) => {
    setData((p) => {
      const list = p.improve_health as string[]
      if (list.includes(id)) return { ...p, improve_health: list.filter((x) => x !== id) }
      return { ...p, improve_health: [...list, id] }
    })
  }

  const next = () => {
    if (step === 1 && (!data.name || !data.email || !data.birthdate || !data.gender)) {
      toast({ title: "Validação", description: "Preencha todos os campos obrigatórios.", variant: "destructive" })
      return
    }
    if (step === 2 && data.improve_health.length === 0) {
      toast({ title: "Validação", description: "Selecione pelo menos um objetivo.", variant: "destructive" })
      return
    }
    if (step === 3 && data.medication === "") {
      toast({ title: "Validação", description: "Responda se toma medicamentos.", variant: "destructive" })
      return
    }
    if (step === 8) {
      if (!data.weight || !data.height || !data.waist_circumference) {
        toast({ title: "Validação", description: "Preencha os dados biométricos.", variant: "destructive" })
        return
      }
      submit()
      return
    }
    setStep((s) => s + 1)
  }

  const back = () => setStep((s) => Math.max(1, s - 1))

  const submit = () => {
    const payload: any = { ...data }
    payload.improve_health = payload.improve_health.join(",")
    
    // Converter booleans para '1' ou remover se false (como o form original faz)
    Object.keys(payload).forEach(k => {
      if (payload[k] === true) payload[k] = "1"
      if (payload[k] === false) delete payload[k]
    })

    onComplete(payload)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>Passo {step} de 8</div>
        <div className="flex-1 ml-4 mr-4 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 8) * 100}%` }} />
        </div>
      </div>

      <div className="min-h-[300px]">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Identificação</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Nome *</div>
                <Input value={data.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Email *</div>
                <Input value={data.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Telefone</div>
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
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">O que gostaria de melhorar?</h3>
            <p className="text-sm text-muted-foreground">Selecione os seus objetivos (pode escolher vários):</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {IMPROVE_OPTIONS.map((opt) => {
                if (opt.id === "K" && data.gender !== "female") return null;
                const isSelected = data.improve_health.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleImprove(opt.id)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      isSelected ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Medicação</h3>
            <p className="text-sm text-muted-foreground">Encontra-se a tomar algum medicamento regularmente?</p>
            <div className="flex gap-4">
              <Button type="button" variant={data.medication === "1" ? "default" : "outline"} onClick={() => update("medication", "1")}>Sim</Button>
              <Button type="button" variant={data.medication === "0" ? "default" : "outline"} onClick={() => update("medication", "0")}>Não</Button>
            </div>
            {data.medication === "1" && (
              <div className="mt-4 animate-fade-in">
                <div className="text-xs text-muted-foreground mb-1">Qual?</div>
                <Input value={data.medication_info} onChange={(e) => update("medication_info", e.target.value)} placeholder="Ex.: Anti-hipertensivo..." />
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Histórico Médico</h3>
            <p className="text-sm text-muted-foreground">Tem alguma das seguintes condições? (Selecione as aplicáveis)</p>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                <input type="checkbox" checked={data.illness_none} onChange={(e) => update("illness_none", e.target.checked)} />
                Nenhuma
              </label>
              {!data.illness_none && (
                <>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_diabetes_1} onChange={(e) => update("illness_diabetes_1", e.target.checked)} /> Diabetes Tipo 1</label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_diabetes_2} onChange={(e) => update("illness_diabetes_2", e.target.checked)} /> Diabetes Tipo 2</label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_pre_diabetes} onChange={(e) => update("illness_pre_diabetes", e.target.checked)} /> Pré-diabetes</label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_colesterol} onChange={(e) => update("illness_colesterol", e.target.checked)} /> Colesterol elevado</label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_hypertension} onChange={(e) => update("illness_hypertension", e.target.checked)} /> Hipertensão</label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_low_blood_pressure} onChange={(e) => update("illness_low_blood_pressure", e.target.checked)} /> Tensão baixa</label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_anemia} onChange={(e) => update("illness_anemia", e.target.checked)} /> Anemia</label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_tired_eyes} onChange={(e) => update("illness_tired_eyes", e.target.checked)} /> Vista cansada</label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_muscle_aches} onChange={(e) => update("illness_muscle_aches", e.target.checked)} /> Dores musculares/articulares</label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_respiratory_infections} onChange={(e) => update("illness_respiratory_infections", e.target.checked)} /> Infeções respiratórias frequentes</label>
                  <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_allergies} onChange={(e) => update("illness_allergies", e.target.checked)} /> Alergias</label>
                </>
              )}
            </div>
            
            {data.illness_colesterol && (
              <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                <div className="text-xs font-semibold mb-2">Valor do colesterol:</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="col" checked={data.illness_colesterol_value === "unknown"} onChange={() => update("illness_colesterol_value", "unknown")} /> Não sei</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="col" checked={data.illness_colesterol_value === "lower_200"} onChange={() => update("illness_colesterol_value", "lower_200")} /> &lt; 200 mg/dl</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="col" checked={data.illness_colesterol_value === "200_240"} onChange={() => update("illness_colesterol_value", "200_240")} /> 200-240 mg/dl</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="col" checked={data.illness_colesterol_value === "higher_240"} onChange={() => update("illness_colesterol_value", "higher_240")} /> &gt; 240 mg/dl</label>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Sono & Digestão</h3>
            
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Sofre frequentemente de algum destes problemas de sono?</p>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_insomnia_falling_asleep} onChange={(e) => update("illness_insomnia_falling_asleep", e.target.checked)} /> Dificuldade em adormecer</label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_insomnia_wakeup} onChange={(e) => update("illness_insomnia_wakeup", e.target.checked)} /> Acordar a meio da noite</label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_insomnia_back_sleep} onChange={(e) => update("illness_insomnia_back_sleep", e.target.checked)} /> Dificuldade em voltar a adormecer</label>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Sofre frequentemente de algum destes problemas digestivos?</p>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_digestive_constipation} onChange={(e) => update("illness_digestive_constipation", e.target.checked)} /> Prisão de ventre</label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_digestive_diarrhea} onChange={(e) => update("illness_digestive_diarrhea", e.target.checked)} /> Diarreia</label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_digestive_abdominal_pain} onChange={(e) => update("illness_digestive_abdominal_pain", e.target.checked)} /> Dor/Inchaço abdominal</label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_digestive_heartburn} onChange={(e) => update("illness_digestive_heartburn", e.target.checked)} /> Azia</label>
                <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.illness_digestive_reflux} onChange={(e) => update("illness_digestive_reflux", e.target.checked)} /> Refluxo</label>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Hábitos</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm mb-1">Fuma?</p>
                <div className="flex gap-2">
                  <Button size="sm" type="button" variant={data.smokes ? "default" : "outline"} onClick={() => update("smokes", true)}>Sim</Button>
                  <Button size="sm" type="button" variant={!data.smokes ? "default" : "outline"} onClick={() => update("smokes", false)}>Não</Button>
                </div>
              </div>
              
              <div>
                <p className="text-sm mb-1">Pratica exercício físico?</p>
                <div className="flex gap-2">
                  <Button size="sm" type="button" variant={data.exercise ? "default" : "outline"} onClick={() => update("exercise", true)}>Sim</Button>
                  <Button size="sm" type="button" variant={!data.exercise ? "default" : "outline"} onClick={() => update("exercise", false)}>Não</Button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <p className="text-sm mb-1">Consumo de álcool:</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Button size="sm" type="button" variant={data.alcohol === "no" ? "default" : "outline"} onClick={() => update("alcohol", "no")}>Não</Button>
                  <Button size="sm" type="button" variant={data.alcohol === "rarely" ? "default" : "outline"} onClick={() => update("alcohol", "rarely")}>Raramente</Button>
                  <Button size="sm" type="button" variant={data.alcohol === "occasionally" ? "default" : "outline"} onClick={() => update("alcohol", "occasionally")}>Ocasionalmente</Button>
                  <Button size="sm" type="button" variant={data.alcohol === "frequently" ? "default" : "outline"} onClick={() => update("alcohol", "frequently")}>Frequentemente</Button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <p className="text-sm mb-1">A sua dieta é maioritariamente baseada em:</p>
                <div className="flex flex-col gap-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={data.diet_processed} onChange={(e) => update("diet_processed", e.target.checked)} /> Alimentos processados / fast-food</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={data.diet_biscuits} onChange={(e) => update("diet_biscuits", e.target.checked)} /> Doces, bolachas, refrigerantes</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Sintomas Recentes</h3>
            <p className="text-sm text-muted-foreground">Tem sentido algum destes sintomas recentemente?</p>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_somnolence} onChange={(e) => update("symptoms_somnolence", e.target.checked)} /> Sonolência durante o dia</label>
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_concentration} onChange={(e) => update("symptoms_concentration", e.target.checked)} /> Falta de concentração</label>
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_energy_lack} onChange={(e) => update("symptoms_energy_lack", e.target.checked)} /> Falta de energia / Fadiga</label>
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_chronic_tiredness} onChange={(e) => update("symptoms_chronic_tiredness", e.target.checked)} /> Cansaço crónico</label>
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_depression} onChange={(e) => update("symptoms_depression", e.target.checked)} /> Tristeza / Depressão</label>
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_anxiety} onChange={(e) => update("symptoms_anxiety", e.target.checked)} /> Ansiedade / Stress</label>
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_bad_circulation} onChange={(e) => update("symptoms_bad_circulation", e.target.checked)} /> Má circulação (pernas pesadas)</label>
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_cramps} onChange={(e) => update("symptoms_cramps", e.target.checked)} /> Cãibras</label>
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_hair_fall} onChange={(e) => update("symptoms_hair_fall", e.target.checked)} /> Queda de cabelo / unhas fracas</label>
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_sexual_desire} onChange={(e) => update("symptoms_sexual_desire", e.target.checked)} /> Falta de desejo sexual</label>
              <label className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer"><input type="checkbox" checked={data.symptoms_muscle} onChange={(e) => update("symptoms_muscle", e.target.checked)} /> Dores musculares frequentes</label>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Biometria</h3>
            <p className="text-sm text-muted-foreground">Estes dados são necessários para avaliar o seu risco cardiovascular.</p>
            
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Peso (kg) *</div>
                <Input type="number" step="0.1" value={data.weight} onChange={(e) => update("weight", e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Altura (cm) *</div>
                <Input type="number" value={data.height} onChange={(e) => update("height", e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Cintura (cm) *</div>
                <Input type="number" step="0.1" value={data.waist_circumference} onChange={(e) => update("waist_circumference", e.target.value)} />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={data.lose_weight} onChange={(e) => update("lose_weight", e.target.checked)} />
                Gostaria de perder peso?
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={back} disabled={step === 1 || busy}>
          Anterior
        </Button>
        <Button type="button" onClick={next} disabled={busy}>
          {step === 8 ? (busy ? "A submeter..." : "Finalizar Quiz") : "Próximo"}
        </Button>
      </div>
    </div>
  )
}