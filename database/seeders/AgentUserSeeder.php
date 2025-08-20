<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Company;
use App\Models\Department;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AgentUserSeeder extends Seeder
{
    public function run(): void
    {
        // Buscar o cargo de agente
        $agentRole = Role::where('name', 'agent')->first();
        
        if (!$agentRole) {
            $this->command->error('Cargo de agente não encontrado. Execute primeiro o RoleSeeder.');
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
        
        // Verificar se o usuário já existe
        $existingUser = User::where('email', 'agente.teste@empresa.pt')->first();
        
        if ($existingUser) {
            $this->command->warn('Usuário agente já existe!');
            $this->command->info('Email: ' . $existingUser->email);
            $this->command->info('Nome: ' . $existingUser->name);
            return;
        }
        
        // Criar o usuário agente
        $user = User::create([
            'name' => 'João Silva - Agente',
            'email' => 'agente.teste@empresa.pt',
            'password' => Hash::make('password'),
            'company_id' => $company->id,
            'department_id' => $department->id,
            'role_id' => $agentRole->id,
            'role' => 'agent',
            'phone' => '+351 911 555 777',
            'bio' => 'Agente de suporte técnico especializado em resolução de tickets.',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
        
        $this->command->info('Usuário agente criado com sucesso!');
        $this->command->info('Nome: ' . $user->name);
        $this->command->info('Email: ' . $user->email);
        $this->command->info('Senha: password');
        $this->command->info('Cargo: ' . $agentRole->display_name);
        $this->command->info('Empresa: ' . $company->name);
        $this->command->info('Departamento: ' . $department->name);
        $this->command->info('Status: Ativo');
    }
}