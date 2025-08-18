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
            DepartmentSeeder::class,
            CategorySeeder::class,
            EmployeeSeeder::class,
            TaskSeeder::class,
            AdminPostSeeder::class, // Adicionar esta linha
        ]);
    }
}