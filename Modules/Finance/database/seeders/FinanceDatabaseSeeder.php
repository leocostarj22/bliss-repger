<?php

namespace Modules\Finance\Database\Seeders;

use Illuminate\Database\Seeder;

class FinanceDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            FinanceCategorySeeder::class,
            FinanceCostCenterSeeder::class,
            FinanceBankAccountSeeder::class,
        ]);
    }
}
