<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Company;
use App\Models\Department;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Buscar o cargo de administrador
        $adminRole = Role::where('name', 'admin')->first();
        
        if (!$adminRole) {
            $this->command->error('Cargo de administrador não encontrado. Execute primeiro o RoleSeeder.');
            return;
        }
        
        // Buscar uma empresa para associar
        $company = Company::first();
        
        if (!$company) {
            $this->command->error('Nenhuma empresa encontrada. Execute primeiro o CompanySeeder.');
            return;
        }
        
        // Buscar um departamento para associar
        $department = Department::first();
        
        if (!$department) {
            $this->command->error('Nenhum departamento encontrado. Execute primeiro o DepartmentSeeder.');
            return;
        }
        
        // Verificar se o usuário admin já existe
        $existingAdmin = User::where('email', 'admin@sistema.pt')->first();
        
        if ($existingAdmin) {
            $this->command->warn('Usuário administrador já existe!');
            $this->command->info('Email: ' . $existingAdmin->email);
            $this->command->info('Nome: ' . $existingAdmin->name);
            return;
        }
        
        // Criar o usuário administrador
        $admin = User::create([
            'name' => 'Administrador do Sistema',
            'email' => 'admin@sistema.pt',
            'password' => Hash::make('admin123'),
            'company_id' => $company->id,
            'department_id' => $department->id,
            'role_id' => $adminRole->id,
            'role' => 'admin',
            'phone' => '+351 911 000 000',
            'bio' => 'Administrador principal do sistema com acesso total.',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
        
        $this->command->info('Usuário administrador criado com sucesso!');
        $this->command->info('Nome: ' . $admin->name);
        $this->command->info('Email: ' . $admin->email);
        $this->command->info('Senha: admin123');
        $this->command->info('Cargo: ' . $adminRole->display_name);
        $this->command->info('Empresa: ' . $company->name);
        $this->command->info('Departamento: ' . $department->name);
        $this->command->info('Status: Ativo');
    }
}