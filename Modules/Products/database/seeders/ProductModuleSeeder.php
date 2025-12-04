<?php

namespace Modules\Products\Database\Seeders;

use Illuminate\Database\Seeder;

class ProductModuleSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ProductBrandSeeder::class,
            ProductCategorySeeder::class,
            ProductSeeder::class,
        ]);
    }
}