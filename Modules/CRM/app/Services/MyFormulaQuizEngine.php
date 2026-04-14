<?php

namespace Modules\CRM\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class MyFormulaQuizEngine
{
    public function normalizePost(array $post): array
    {
        $post['clinical_analysis_file_manual'] = isset($post['clinical_analysis_file_manual']) && is_array($post['clinical_analysis_file_manual'])
            ? $post['clinical_analysis_file_manual']
            : [];

        $post['clinical_analysis_files'] = isset($post['clinical_analysis_files']) && is_array($post['clinical_analysis_files'])
            ? $post['clinical_analysis_files']
            : [];

        $post['clinical_analysis_files'] = array_values(array_merge($post['clinical_analysis_file_manual'], $post['clinical_analysis_files']));
        $post['clinical_analysis_file_manual'] = [];

        $post['step'] = 'plans';

        return $post;
    }

    public function buildInsertData(array $post, array $result, $now): array
    {
        $encodedPost = json_encode($post, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $encodedResult = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (! is_string($encodedPost) || ! is_string($encodedResult)) {
            throw new \RuntimeException('JSON encode failed');
        }

        $cols = [];
        try {
            $cols = Schema::connection('myformula')->getColumnListing('quiz');
        } catch (\Throwable) {
            $cols = [];
        }

        $data = [
            'post' => $encodedPost,
            'result' => $encodedResult,
            'type' => 'quiz',
            'html' => $this->renderBackofficeHtml($post),
            'is_valid' => 1,
            'token' => $this->generateUniqueToken(),
            'report_id' => $this->generateUniqueReportId(),
            'date_added' => $now,
            'date_modified' => $now,
        ];

        if ($cols) {
            $allowed = array_flip($cols);
            $data = array_intersect_key($data, $allowed);
        }

        return $data;
    }

    public function calculateSupplements(array $post): array
    {
        $supplementsData = $this->calculateBaseSupplements($post);

        $calculated = [
            'health' => array_keys($supplementsData['health'] ?? []),
            'need_approval' => ! empty($post['illness_allergies_medicines_others']) || ! empty($post['illness_allergies_others']),
        ];

        $plans = DB::connection('myformula')
            ->table('product')
            ->select(['product_id', 'capsules', 'is_plan'])
            ->where('is_plan', 1)
            ->get();

        foreach ($plans as $plan) {
            $capsules = (int) ($plan->capsules ?? 0);
            if ($capsules <= 0) continue;

            $baseSupplements = $supplementsData['quiz'] ?? [];

            $healthSupplements = array_slice($supplementsData['health'] ?? [], 0, $capsules);
            $healthSupplements = array_flip($healthSupplements);

            if ($capsules <= 6) {
                $fixed = array_slice(['O', 'X', 'G'], 0, min($capsules, 3));
            } elseif ($capsules <= 8) {
                $fixed = isset($baseSupplements['M'])
                    ? array_slice(['O', 'X', 'I', 'N', 'M'], 0, min($capsules, 5))
                    : array_slice(['O', 'X', 'I'], 0, min($capsules, 3));
            } else {
                $capsules = min($capsules, 12);
                $fixed = isset($baseSupplements['M'])
                    ? ['O', 'X', 'I', 'N', 'M', 'U', 'B']
                    : ['O', 'X', 'I', 'J', 'R', 'U', 'B'];
            }

            $productId = (int) ($plan->product_id ?? 0);
            if ($productId <= 0) continue;

            $pid = (string) $productId;

            if (! isset($calculated[$pid]) || ! is_array($calculated[$pid])) {
                $calculated[$pid] = [];
            }

            $calculated[$pid]['supplements'] = array_values($fixed);
            $planSupplements = &$calculated[$pid]['supplements'];
            if (! is_array($planSupplements)) {
                $planSupplements = [];
            }

            if (in_array('A', $healthSupplements, true) || in_array('B', $healthSupplements, true)) {
                unset($baseSupplements['I']);
                $planSupplements = array_values(array_diff($planSupplements, ['I']));
            }

            $baseSupplements = array_diff($baseSupplements, $fixed);

            if (count($planSupplements) < $capsules && isset($baseSupplements['W'])) {
                $planSupplements[] = 'W';
                unset($baseSupplements['W']);
            }

            if (count($planSupplements) < $capsules && isset($baseSupplements['V'])) {
                $planSupplements[] = 'V';
                unset($baseSupplements['V']);
            }

            if (! empty($baseSupplements) && count($planSupplements) < $capsules) {
                $rand = array_rand($baseSupplements, 1);
                $planSupplements[] = (string) $rand;
                unset($baseSupplements[$rand]);
            }

            if (count($planSupplements) < $capsules) {
                $health = array_filter(
                    $healthSupplements,
                    static fn ($supplement) => ! in_array($supplement, $planSupplements, true),
                    ARRAY_FILTER_USE_KEY
                );

                $needed = $capsules - count($planSupplements);
                $available = min(count($health), $needed);

                if ($available > 0) {
                    $rand = array_rand($health, $available);
                    $planSupplements = array_merge($planSupplements, (array) $rand);
                }
            }
        }

        return $calculated;
    }

    private function quizBulletsInfo(string $type = 'quiz'): array
    {
        return [
            'A' => ['supplement' => 'R'],
            'B' => ['supplement' => 'Z'],
            'C' => ['supplement' => 'J'],
            'D' => ['supplement' => 'E'],
            'E' => ['supplement' => 'F'],
            'F' => ['supplement' => 'V'],
            'G' => ['supplement' => $type === 'followup' ? 'M' : 'N'],
            'H' => ['supplement' => 'B'],
            'I' => ['supplement' => 'Y'],
            'J' => ['supplement' => 'F'],
            'K' => ['supplement' => 'E'],
        ];
    }

    private function calculateCardiovascularRisk(array $post): bool
    {
        $waistRaw = $post['waist_circumference'] ?? null;
        if (! $waistRaw) return false;

        $weight = (float) ($post['weight'] ?? 0);
        $height = (float) ($post['height'] ?? 0);
        $waist = (float) $waistRaw;

        if ($weight <= 0 || $height <= 0 || $waist <= 0) return false;

        $risk = ($waist / 100) / (0.109 * sqrt($weight / ($height / 100)));
        $gender = (string) ($post['gender'] ?? '');

        return ($gender === 'female' && $risk >= 1.18) || ($gender === 'male' && $risk >= 1.25);
    }

    private function calculateBaseSupplements(array $post): array
    {
        $supplements = ['health' => [], 'quiz' => []];

        $health = explode(',', (string) ($post['improve_health'] ?? ''));
        $bullets = $this->quizBulletsInfo('quiz');

        foreach ($health as $letter) {
            $letter = trim((string) $letter);
            if ($letter === '' || ! isset($bullets[$letter])) continue;
            $supplements['health'][$letter] = $bullets[$letter]['supplement'];
        }

        $birth = (string) ($post['birthdate'] ?? '');
        if ($birth !== '') {
            try {
                if (Carbon::parse($birth)->lt(now()->subYears(50))) {
                    $supplements['quiz']['P'] = 'P';
                }
            } catch (\Throwable) {
            }
        }

        if (! empty($post['illness_diabetes_1']) || ! empty($post['illness_diabetes_2']) || ! empty($post['illness_pre_diabetes'])) $supplements['quiz']['Y'] = 'Y';
        if (! empty($post['illness_colesterol'])) $supplements['quiz']['Q'] = 'Q';
        if (! empty($post['illness_anemia'])) $supplements['quiz']['H'] = 'H';
        if (! empty($post['illness_tired_eyes'])) $supplements['quiz']['S'] = 'S';
        if (! empty($post['illness_hypertension'])) $supplements['quiz']['C'] = 'C';
        if (! empty($post['illness_muscle_aches'])) $supplements['quiz']['Z'] = 'Z';
        if (! empty($post['illness_low_blood_pressure'])) $supplements['quiz']['C'] = 'C';

        if (! empty($post['illness_respiratory_infections']) || ! empty($post['illness_allergies'])) $supplements['quiz']['E'] = 'E';

        if (! empty($post['illness_insomnia_falling_asleep']) || ! empty($post['illness_insomnia_wakeup']) || ! empty($post['illness_insomnia_back_sleep'])) $supplements['quiz']['V'] = 'V';

        if (! empty($post['illness_digestive_constipation']) || ! empty($post['illness_digestive_abdominal_pain'])) $supplements['quiz']['W'] = 'W';

        if (! empty($post['illness_digestive_heartburn']) || ! empty($post['illness_digestive_reflux']) || ! empty($post['illness_digestive_diarrhea'])) $supplements['quiz']['B'] = 'B';

        if (! empty($post['illness_digestive_diarrhea'])) unset($supplements['quiz']['W']);

        if ($this->calculateCardiovascularRisk($post)) $supplements['quiz']['C'] = 'C';

        if (! empty($post['smokes'])) $supplements['quiz']['T'] = 'T';
        if (($post['alcohol'] ?? 'no') !== 'no') $supplements['quiz']['A'] = 'A';
        if (! empty($post['exercise'])) $supplements['quiz']['K'] = 'K';

        if (! empty($post['symptoms_somnolence'])) $supplements['quiz']['V'] = 'V';
        if (! empty($post['symptoms_concentration'])) $supplements['quiz']['R'] = 'R';
        if (! empty($post['symptoms_energy_lack']) || ! empty($post['symptoms_depression'])) $supplements['quiz']['G'] = 'G';
        if (! empty($post['symptoms_anxiety'])) $supplements['quiz']['D'] = 'D';
        if (! empty($post['symptoms_bad_circulation'])) $supplements['quiz']['J'] = 'J';
        if (! empty($post['symptoms_chronic_tiredness'])) $supplements['quiz']['I'] = 'I';
        if (! empty($post['symptoms_cramps'])) $supplements['quiz']['R'] = 'R';
        if (! empty($post['symptoms_hair_fall'])) $supplements['quiz']['F'] = 'F';
        if (! empty($post['symptoms_sexual_desire'])) $supplements['quiz']['G'] = 'G';
        if (! empty($post['symptoms_muscle'])) $supplements['quiz']['Z'] = 'Z';

        if (! empty($post['diet_processed']) || ! empty($post['diet_biscuits'])) $supplements['quiz']['Y'] = 'Y';
        if (! empty($post['lose_weight'])) $supplements['quiz']['M'] = 'M';

        return $supplements;
    }

    private function esc($value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    }

    private function renderBackofficeHtml(array $post): string
    {
        $e = fn ($v) => $this->esc($v);

        $radio = function (string $name, string $value, string $label) use ($e): string {
            return '<label><input type="radio" name="' . $e($name) . '" value="' . $e($value) . '"> ' . $e($label) . '</label>';
        };

        $checkbox = function (string $name, string $label) use ($e): string {
            return '<label><input type="checkbox" name="' . $e($name) . '" value="1"> ' . $e($label) . '</label>';
        };

        $text = function (string $name, string $label, string $type = 'text', string $placeholder = '') use ($e): string {
            return '<div><span class="fw-b">' . $e($label) . '</span><input type="' . $e($type) . '" class="form-control" name="' . $e($name) . '" placeholder="' . $e($placeholder) . '"></div>';
        };

        $gender = (string) ($post['gender'] ?? '');
        $improve = (string) ($post['improve_health'] ?? '');
        $improveCodes = array_values(array_filter(array_map('trim', explode(',', $improve)), static fn ($x) => $x !== ''));

        $objectiveItems = [
            'G' => 'Perder peso',
            'H' => 'Problemas Digestivos',
            'B' => 'Ossos e articulações',
            'A' => 'Energia e memória',
            'J' => 'Longevidade',
            'C' => 'Saúde Sexual',
            'E' => 'Cabelo pele e unhas',
            'F' => 'Sono',
            'I' => 'Coração, circulação e açúcar no sangue',
            'K' => 'Menopausa',
        ];

        $includeK = in_array('K', $improveCodes, true) || $gender === 'female';
        if (! $includeK) {
            unset($objectiveItems['K']);
        }

        $objectiveList = '';
        foreach ($objectiveItems as $code => $label) {
            $objectiveList .= '<li data-id="' . $e($code) . '">' . $e($label) . '</li>';
        }

        $html = '';

        $html .= '<div data-se="stepsItem">';

        $html .= '<h2>Escolha seus objetivos por ordem de prioridade</h2>';
        $html .= '<p>(Exemplo: Se entrou pelo plano <b>Menopausa</b>, insira Menopausa como primeira opção)</p>';
        $html .= '<input type="hidden" id="improve-health-value" name="improve_health" value="' . $e($improve ?: implode(',', array_keys($objectiveItems))) . '">';
        $html .= '<ol>' . $objectiveList . '</ol>';

        $html .= '<h2>Encontra-se a tomar medicamentos ou suplementos regularmente?</h2>';
        $html .= $radio('medication', '0', 'Não');
        $html .= $radio('medication', '1', 'Sim');
        $html .= $text('medication_info', 'Especifique (opcional)', 'text', 'Magnésio, Omega3, CQ10, VitD, VitC, Colagénio');

        $html .= '<h2>Tem alguma das seguintes doenças?</h2>';
        $html .= $checkbox('illness_none', 'Não tenho nenhuma destas condições');
        $html .= $checkbox('illness_diabetes_1', 'Diabetes tipo 1');
        $html .= $checkbox('illness_diabetes_2', 'Diabetes tipo 2');
        $html .= $checkbox('illness_pre_diabetes', 'Pré Diabetes');

        $html .= $checkbox('illness_colesterol', 'Colesterol alto');
        $html .= '<div><p>Indique o seu último valor de colesterol em mg/dl</p>';
        $html .= $radio('illness_colesterol_value', 'unknown', 'Não sei');
        $html .= $radio('illness_colesterol_value', 'less_190', 'Menos de 190 mg/dl');
        $html .= $radio('illness_colesterol_value', '190_240', 'Entre 190 - 240 mg/dl');
        $html .= $radio('illness_colesterol_value', 'more_240', 'Mais de 240 mg/dl');
        $html .= '</div>';

        $html .= $checkbox('illness_anemia', 'Anemia');
        $html .= $checkbox('illness_tired_eyes', 'Olhos irritados/cansados');

        $html .= $checkbox('illness_hypertension', 'Hipertensão arterial');
        $html .= '<div><p>Indique o Valor que melhor se adequa</p>';
        $html .= $radio('illness_hypertension_value', 'more_180_100', 'Máxima maior que 180 mmHg e/ou mínima acima de 100 mmHg');
        $html .= $radio('illness_hypertension_value', 'more_160_90', 'Máxima maior que 160 mmHg e/ou mínima acima de 90 mmHg');
        $html .= $radio('illness_hypertension_value', 'more_140_80', 'Máxima maior que 140 mmHg e/ou mínima acima de 80 mmHg');
        $html .= $radio('illness_hypertension_value', 'unknown', 'Não sei / Não tenho a certeza');
        $html .= '</div>';

        $html .= $checkbox('illness_muscle_aches', 'Dores osteoarticulares ou musculares');
        $html .= $checkbox('illness_low_blood_pressure', 'Tensão baixa');

        $html .= $checkbox('illness_insomnia', 'Insónia');
        $html .= '<div><p>Indique as condições que melhor caracterizam as suas insónias</p>';
        $html .= $checkbox('illness_insomnia_falling_asleep', 'Tenho dificuldade em adormecer');
        $html .= $checkbox('illness_insomnia_wakeup', 'Acordo várias vezes durante a noite');
        $html .= $checkbox('illness_insomnia_back_sleep', 'Quando acordo durante a noite tenho dificuldade em voltar a adormecer');
        $html .= '</div>';

        $html .= $checkbox('illness_digestive', 'Problemas digestivos ou intestinais');
        $html .= '<div><p>Quais as condições que caracterizam melhor os problemas digestivos</p>';
        $html .= $checkbox('illness_digestive_heartburn', 'Azia regularmente');
        $html .= $checkbox('illness_digestive_reflux', 'Refluxo regularmente');
        $html .= $checkbox('illness_digestive_constipation', 'Prisão de Ventre frequente');
        $html .= $checkbox('illness_digestive_abdominal_pain', 'Dores abdominais');
        $html .= $checkbox('illness_digestive_diarrhea', 'Diarreia mais de três episódios por semana');
        $html .= '</div>';

        $html .= $checkbox('illness_respiratory_infections', 'Infeções respiratórias recorrentes');

        $html .= $checkbox('illness_allergies', 'Alergias');
        $html .= '<div><p>Indique o tipo de Alergias</p>';
        $html .= $checkbox('illness_allergies_medicines', 'Medicamentos');
        $html .= '<div>';
        $html .= $checkbox('illness_allergies_medicines_antibiotics', 'Antibióticos');
        $html .= $checkbox('illness_allergies_medicines_aspirin', 'Aspirina e outros anti-inflamatórios (AINES)');
        $html .= $checkbox('illness_allergies_medicines_iodinated_contrasts', 'Contrastes Iodados');
        $html .= $checkbox('illness_allergies_medicines_others', 'Outros');
        $html .= $text('illness_allergies_medicines_others_info', 'Nomes de medicamentos', 'text');
        $html .= '<p>(Devido à sua alergia o seu plano irá ser avaliado a nível médico e farmacêutico. Em breve receberá o seu plano de saúde e bem estar)</p>';
        $html .= '</div>';

        $html .= $checkbox('illness_allergies_mites_pollens_dander', 'Ácaros, pólens e pêlos de animal');
        $html .= $checkbox('illness_allergies_gluten', 'Intolerância ao gluten');
        $html .= $checkbox('illness_allergies_lactose', 'Intolerância à lactose');
        $html .= $checkbox('illness_allergies_egg', 'Alergia aos produtos contendo ovo');
        $html .= $checkbox('illness_allergies_shellfish', 'Alergias ao marisco');
        $html .= $checkbox('illness_allergies_others', 'Outras Quais?');
        $html .= $text('illness_allergies_others_info', 'Especifique', 'text');
        $html .= '<p>(Devido às suas alergias o seu plano irá ser avaliado a nível farmacêutico. Em breve receberá o seu plano de saúde e bem estar)</p>';
        $html .= '</div>';

        $html .= '<h2>Efetuou análises clínicas no último ano?</h2>';
        $html .= $radio('clinical_analysis', '0', 'Não');
        $html .= $radio('clinical_analysis', '1', 'Sim');
        $html .= '<div data-fileupload="multiple"><input type="hidden" name="clinical_analysis_file_manual" value=""></div>';

        $html .= '<h2>Inserção de peso (kg)</h2>';
        $html .= '<input type="number" class="form-control" name="weight" placeholder="Peso" value="">';
        $html .= '<h2>Inserção de altura (cm)</h2>';
        $html .= '<input type="number" class="form-control" name="height" placeholder="Altura" value="">';
        $html .= '<h2>Medida circunferência da cintura (cm)</h2>';
        $html .= '<input type="number" class="form-control" name="waist_circumference" placeholder="Medida em cm" value="">';

        $html .= '<h2>Fuma?</h2>';
        $html .= $radio('smokes', '0', 'Não');
        $html .= $radio('smokes', '1', 'Sim');
        $html .= '<div><p>Quantos cigarros?</p>';
        $html .= $radio('smokes_quantity', '1_10', 'De 1 a 10 por dia');
        $html .= $radio('smokes_quantity', '10_20', 'De 10 a 20 por dia');
        $html .= $radio('smokes_quantity', 'more_20', 'Mais de 20 por dia');
        $html .= $radio('smokes_quantity', 'electronic', 'Fumo cigarros eletrónicos ou vaping');
        $html .= '</div>';

        $html .= '<h2>Consome bebidas Alcoólicas?</h2>';
        $html .= $radio('alcohol', 'every_days', 'Sim, todos os dias');
        $html .= $radio('alcohol', 'occasionally', 'Sim, ocasionalmente');
        $html .= $radio('alcohol', 'no', 'Não');

        $html .= '<h2>Faz exercício físico regularmente?</h2>';
        $html .= $radio('exercise', '0', 'Não');
        $html .= $radio('exercise', '1', 'Sim');
        $html .= '<div><p>Quantas vezes por semana?</p>';
        $html .= $radio('exercise_quantity', '1', '1 vez');
        $html .= $radio('exercise_quantity', '2_3', '2 a 3 vezes');
        $html .= $radio('exercise_quantity', 'more_3', 'Mais de 3 vezes');
        $html .= '<p>Escolha os exercícios que efetua</p>';
        $html .= $checkbox('exercise_type_walk', 'Caminhada + 30 min seguidos');
        $html .= $checkbox('exercise_type_swimming', 'Natação');
        $html .= $checkbox('exercise_type_run', 'Corrida');
        $html .= $checkbox('exercise_type_dance', 'Dança');
        $html .= $checkbox('exercise_type_football', 'Futebol ou similar');
        $html .= $checkbox('exercise_type_gym', 'Ginásio');
        $html .= $checkbox('exercise_type_tenis', 'Padle ou tenis');
        $html .= $checkbox('exercise_type_other', 'Outro');
        $html .= '</div>';

        $html .= '<h2>Nos últimos tempos sentiu algum destes sintomas:</h2>';
        $html .= $checkbox('symptoms_rhinitis', 'Rinite ou sinusite');
        $html .= $checkbox('symptoms_somnolence', 'Sonolência');
        $html .= $checkbox('symptoms_concentration', 'Dificuldades em concentrar-se');
        $html .= $checkbox('symptoms_energy_lack', 'Falta de energia');
        $html .= $checkbox('symptoms_depression', 'Depressão');
        $html .= $checkbox('symptoms_anxiety', 'Ansiedade');
        $html .= $checkbox('symptoms_bad_circulation', 'Má circulação');
        $html .= $checkbox('symptoms_chronic_tiredness', 'Cansaço Crónico');
        $html .= $checkbox('symptoms_cramps', 'Câibras');
        $html .= $checkbox('symptoms_hair_fall', 'Queda de cabelo excessiva');
        $html .= $checkbox('symptoms_sexual_desire', 'Falta de desejo sexual');
        $html .= $checkbox('symptoms_muscle', 'Sente dores musculares ou nos ossos');
        $html .= $checkbox('symptoms_difficulties_urinate', 'Tem dificuldades ao urinar');
        $html .= $checkbox('symptoms_none', 'Não tenho nenhuma destas condições');

        $html .= '<h2>Indique se sofre de alguma das seguintes condições.</h2>';
        $html .= $checkbox('condition_autoimmune', 'Tenho uma doença autoimune');
        $html .= $checkbox('condition_anticoagulants', 'Tomo Anticoagulantes orais do tipo Varfine ou Ticlopidina');
        $html .= $checkbox('condition_cancer', 'Tenho uma doença oncológica');
        if ($gender === 'female' || in_array('condition_pregnant', array_keys($post), true)) {
            $html .= $checkbox('condition_pregnant', 'Estou grávida');
        }
        $html .= $checkbox('condition_none', 'Não tenho nenhuma destas condições');

        $html .= '<h2>Como tem sido a sua dieta nos últimos meses?</h2>';
        $html .= $checkbox('diet_vegetarian', 'Vegetariana');
        $html .= $checkbox('diet_mediterranean', 'Dieta mediterrânica essencialmente');
        $html .= $checkbox('diet_processed', 'Como muitas comidas processadas ou já pré-feitas');
        $html .= $checkbox('diet_biscuits', 'Como regularmente bolachas, bolos e salgados');
        $html .= $checkbox('diet_quiz_modal_diet_vegan', 'Vegan');
        $html .= $checkbox('diet_others', 'Outras dietas');

        $html .= '<h2>Pretende perder peso?</h2>';
        $html .= $radio('lose_weight', '0', 'Não');
        $html .= $radio('lose_weight', '1', 'Sim');
        $html .= $text('lose_weight_ideal', 'Qual o seu peso ideal?', 'number');

        $html .= '</div>';

        return $html;
    }

    private function generateUniqueToken(): string
    {
        for ($i = 0; $i < 20; $i++) {
            $token = (string) Str::uuid();
            if (! DB::connection('myformula')->table('quiz')->where('token', $token)->exists()) return $token;
        }

        return (string) Str::uuid();
    }

    private function generateUniqueReportId(): string
    {
        for ($i = 0; $i < 50; $i++) {
            $code = date('ymd') . substr(bin2hex(random_bytes(5)), 0, 5);
            if (! DB::connection('myformula')->table('quiz')->where('report_id', $code)->exists()) return $code;
        }

        return date('ymd') . substr(bin2hex(random_bytes(5)), 0, 5);
    }
}