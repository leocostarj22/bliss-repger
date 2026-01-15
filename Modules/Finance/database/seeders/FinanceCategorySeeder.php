<?php

namespace Modules\Finance\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Finance\Models\FinanceCategory;
use App\Models\Company;

class FinanceCategorySeeder extends Seeder
{
    public function run(): void
    {
        $companies = Company::where('is_active', true)->get(['id', 'name']);

        if ($companies->isEmpty()) {
            return;
        }

        $categories = [
            ['name' => 'Receitas - Vendas', 'type' => 'income', 'color' => '#16a34a'],
            ['name' => 'Receitas - Serviços', 'type' => 'income', 'color' => '#16a34a'],
            ['name' => 'Despesas - Operacionais', 'type' => 'expense', 'color' => '#dc2626'],
            ['name' => 'Despesas - Pessoal', 'type' => 'expense', 'color' => '#dc2626'],
            ['name' => 'Despesas - Marketing', 'type' => 'expense', 'color' => '#dc2626'],
            ['name' => 'Despesas - Administrativas', 'type' => 'expense', 'color' => '#dc2626'],
            ['name' => 'Despesas - Financeiras', 'type' => 'expense', 'color' => '#dc2626'],
        ];

        foreach ($companies as $company) {
            foreach ($categories as $data) {
                FinanceCategory::firstOrCreate(
                    [
                        'company_id' => $company->id,
                        'name' => $data['name'],
                        'type' => $data['type'],
                    ],
                    [
                        'color' => $data['color'],
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}