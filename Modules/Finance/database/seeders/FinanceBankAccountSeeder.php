<?php

namespace Modules\Finance\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Finance\Models\FinanceBankAccount;
use App\Models\Company;

class FinanceBankAccountSeeder extends Seeder
{
    public function run(): void
    {
        $companies = Company::where('is_active', true)->get(['id', 'name']);

        if ($companies->isEmpty()) {
            return;
        }

        $accounts = [
            [
                'name' => 'Conta Corrente Principal',
                'bank_name' => 'Banco Genérico',
            ],
            [
                'name' => 'Caixa',
                'bank_name' => 'Interno',
            ],
        ];

        foreach ($companies as $company) {
            foreach ($accounts as $data) {
                FinanceBankAccount::firstOrCreate(
                    [
                        'company_id' => $company->id,
                        'name' => $data['name'],
                    ],
                    [
                        'bank_name' => $data['bank_name'],
                        'account_number' => null,
                        'currency' => 'EUR',
                        'initial_balance' => 0,
                        'current_balance' => 0,
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}