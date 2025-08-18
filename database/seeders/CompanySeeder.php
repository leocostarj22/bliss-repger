<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        $companies = [
            [
                'name' => 'Myformula',
                'slug' => 'myformula',
                'email' => 'contato@myformula.pt',
                'phone' => '+351 210 123 456',
                'address' => 'Rua Principal, 100, Lisboa, Portugal',
                'is_active' => true,
            ],
            [
                'name' => 'Maria Helena',
                'slug' => 'maria-helena',
                'email' => 'contato@mariahelena.pt',
                'phone' => '+351 220 654 321',
                'address' => 'Av. dos Aliados, 200, Porto, Portugal',
                'is_active' => true,
            ],
        ];

        foreach ($companies as $companyData) {
            Company::create($companyData);
        }

        $this->command->info('Empresas criadas com sucesso!');
    }
}