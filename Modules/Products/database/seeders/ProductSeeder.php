<?php

namespace Modules\Products\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Products\Models\Product;
use Modules\Products\Models\ProductBrand;
use Modules\Products\Models\ProductCategory;
use App\Models\Company;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $companies = Company::where('is_active', true)->get(['id']);

        foreach ($companies as $company) {
            $brand = ProductBrand::where('company_id', $company->id)->first();
            $category = ProductCategory::where('company_id', $company->id)->first();

            if (! $brand || ! $category) {
                continue;
            }

            $items = [
                ['code' => 'PRD-0001', 'name' => 'Produto 1', 'price' => 100, 'cost' => 60],
                ['code' => 'PRD-0002', 'name' => 'Produto 2', 'price' => 150, 'cost' => 90],
                ['code' => 'PRD-0003', 'name' => 'Produto 3', 'price' => 200, 'cost' => 110],
            ];

            foreach ($items as $item) {
                Product::firstOrCreate(
                    ['company_id' => $company->id, 'code' => $item['code']],
                    [
                        'name' => $item['name'],
                        'brand_id' => $brand->id,
                        'category_id' => $category->id,
                        'price' => $item['price'],
                        'cost' => $item['cost'],
                        'is_favorite' => false,
                        'status' => 'active',
                    ]
                );
            }
        }
    }
}