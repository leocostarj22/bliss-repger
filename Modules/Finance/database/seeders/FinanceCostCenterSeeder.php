<?php

namespace Modules\Finance\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Finance\Models\FinanceCostCenter;
use App\Models\Company;

class FinanceCostCenterSeeder extends Seeder
{
    public function run(): void
    {
        $companies = Company::where('is_active', true)->get(['id', 'name']);

        if ($companies->isEmpty()) {
            return;
        }

        $centers = [
            'Geral',
            'Operações',
            'Marketing',
            'Recursos Humanos',
            'Financeiro',
            'Tecnologia',
        ];

        foreach ($companies as $company) {
            foreach ($centers as $name) {
                FinanceCostCenter::firstOrCreate(
                    [
                        'company_id' => $company->id,
                        'name' => $name,
                    ],
                    [
                        'code' => null,
                    ]
                );
            }
        }
    }
}