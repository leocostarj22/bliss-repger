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
            CompanySeeder::class,
            DepartmentSeeder::class,
            CategorySeeder::class,
            AdminUserSeeder::class,
            EmployeeSeeder::class,
            TaskSeeder::class,
            AdminPostSeeder::class,
            HelpArticleSeeder::class, // Adicionar esta linha
        ]);
    }
}