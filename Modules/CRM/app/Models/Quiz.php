<?php

namespace Modules\CRM\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Quiz extends Model
{
    // Usa a conexão secundária myformula (definir em config/database.php)
    protected $connection = 'myformula';

    // Nome da tabela no banco do MyFormula (sem prefixo, que já está na connection)
    protected $table = 'quiz';

    protected $primaryKey = 'quiz_id';
    public $timestamps = false;

    protected $casts = [
        'post'       => 'array',
        'date_added' => 'datetime',
    ];

    // Mapeamento dos códigos de plano de saúde
    public const IMPROVE_HEALTH_LABELS = [
        'A' => 'Energia e memória',
        'B' => 'Ossos e articulações',
        'C' => 'Vida sexual',
        'K' => 'Menopausa',
        'E' => 'Cabelo, pele e unhas',
        'F' => 'Sono',
        'G' => 'Peso',
        'H' => 'Digestivo',
        'I' => 'Coração, circulação e açúcar',
        'J' => 'Anti-aging',
    ];

    // Acessor: Calcula a idade
    protected function age(): Attribute
    {
        return Attribute::make(
            get: function () {
                $birthdate = $this->post['birthdate'] ?? null;
                if (!$birthdate) {
                    return null;
                }

                try {
                    return Carbon::parse($birthdate)->age;
                } catch (\Throwable) {
                    return null;
                }
            }
        );
    }

    // Acessor: Define a faixa etária para estatísticas
    protected function ageRange(): Attribute
    {
        return Attribute::make(
            get: function () {
                $age = $this->age;

                if ($age === null) {
                    return 'Desconhecido';
                }
                if ($age < 30) {
                    return '18-29';
                }
                if ($age < 40) {
                    return '30-39';
                }
                if ($age < 50) {
                    return '40-49';
                }

                return '50+';
            }
        );
    }

    // Acessor: Formata o género
    protected function genderLabel(): Attribute
    {
        return Attribute::make(
            get: function () {
                $gender = $this->post['gender'] ?? null;

                return match ($gender) {
                    'male'   => 'Masculino',
                    'female' => 'Feminino',
                    'other'  => 'Outro',
                    null     => 'Desconhecido',
                    default  => $gender,
                };
            }
        );
    }

    // Acessor: Obtém o nome do primeiro plano escolhido
    protected function firstPlanLabel(): Attribute
    {
        return Attribute::make(
            get: function () {
                $health = $this->post['improve_health'] ?? '';
                if ($health === '') {
                    return 'Sem plano';
                }

                $codes = array_filter(array_map('trim', explode(',', (string) $health)));
                $first = $codes[0] ?? null;

                return $first
                    ? (static::IMPROVE_HEALTH_LABELS[$first] ?? $first)
                    : 'Sem plano';
            }
        );
    }

    // Acessor: Status legível (Concluído vs Passo X)
    protected function statusLabel(): Attribute
    {
        return Attribute::make(
            get: function () {
                $step = $this->post['step'] ?? 'plans';

                return $step === 'plans'
                    ? 'Concluído'
                    : "Não finalizado (passo: $step)";
            }
        );
    }

    // Scope para filtro de datas
    public function scopeBetweenDates($query, ?string $from, ?string $to)
    {
        return $query
            ->when($from, fn ($q) => $q->whereDate('date_added', '>=', $from))
            ->when($to,   fn ($q) => $q->whereDate('date_added', '<=', $to));
    }
}