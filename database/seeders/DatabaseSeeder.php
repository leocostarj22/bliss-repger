<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            CompanySeeder::class, // Adicionar se não existir
            DepartmentSeeder::class,
            CategorySeeder::class,
            AdminUserSeeder::class, // Adicionar esta linha
            EmployeeSeeder::class,
            TaskSeeder::class,
            AdminPostSeeder::class,
        ]);
    }
}