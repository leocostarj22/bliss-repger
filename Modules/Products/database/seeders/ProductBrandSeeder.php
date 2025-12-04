<?php

namespace Modules\Products\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Products\Models\ProductBrand;
use App\Models\Company;

class ProductBrandSeeder extends Seeder
{
    public function run(): void
    {
        $companies = Company::where('is_active', true)->get(['id']);
        foreach ($companies as $company) {
            foreach (['Marca A', 'Marca B', 'Marca C'] as $name) {
                ProductBrand::firstOrCreate(
                    ['company_id' => $company->id, 'name' => $name],
                    ['description' => null, 'is_active' => true]
                );
            }
        }
    }
}