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
                'name' => 'MultiContact',
                'slug' => 'multi-contact',
                'email' => 'geral@grupomulticontact.pt',
                'phone' => '+351 210 929 020',
                'address' => 'Rua David Sousa, 27B 1000-106 Lisboa',
                'is_active' => true,
            ],
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
            [
                'name' => 'Bliss Natura',
                'slug' => 'bliss-natura',
                'email' => 'lojaonline@blissnatura.pt',
                'phone' => '+351 210 935 935',
                'address' => 'Rua David Sousa, 27B 1000-106 Lisboa',
                'is_active' => true,
            ],
        ];

        foreach ($companies as $companyData) {
            Company::create($companyData);
        }

        $this->command->info('Empresas criadas com sucesso!');
    }
}