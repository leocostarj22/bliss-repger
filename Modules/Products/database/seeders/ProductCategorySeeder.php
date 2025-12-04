<?php

namespace Modules\Products\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Products\Models\ProductCategory;
use App\Models\Company;

class ProductCategorySeeder extends Seeder
{
    public function run(): void
    {
        $companies = Company::where('is_active', true)->get(['id']);
        foreach ($companies as $company) {
            foreach (['Geral', 'Serviços', 'Materiais'] as $name) {
                ProductCategory::firstOrCreate(
                    ['company_id' => $company->id, 'name' => $name],
                    ['description' => null, 'is_active' => true]
                );
            }
        }
    }
}