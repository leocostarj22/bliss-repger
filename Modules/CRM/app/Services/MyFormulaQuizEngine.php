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
        $html = '<div data-se="stepsItem"><h2>Quiz MyFormula</h2>';

        $fields = [
            'name' => 'Nome',
            'email' => 'Email',
            'telephone' => 'Telefone',
            'birthdate' => 'Data de nascimento',
            'gender' => 'Género',
            'improve_health' => 'Objetivos',
            'weight' => 'Peso (kg)',
            'height' => 'Altura (cm)',
            'waist_circumference' => 'Cintura (cm)',
            'smokes' => 'Fuma',
            'smokes_quantity' => 'Quantos cigarros',
            'alcohol' => 'Álcool',
            'exercise' => 'Exercício',
            'exercise_quantity' => 'Exercício/semana',
            'clinical_analysis' => 'Análises clínicas',
            'lose_weight' => 'Pretende perder peso',
            'lose_weight_ideal' => 'Peso ideal',
        ];

        foreach ($fields as $key => $label) {
            if (! array_key_exists($key, $post)) {
                continue;
            }

            $value = $post[$key];

            if ($key === 'improve_health') {
                $html .= '<div><label>' . $this->esc($label) . '</label><input type="text" name="improve_health" value="' . $this->esc($value) . '"><ol></ol></div>';
                continue;
            }

            $html .= '<div><label>' . $this->esc($label) . '</label><input type="text" name="' . $this->esc($key) . '" value="' . $this->esc($value) . '"></div>';
        }

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