<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\EmployeeUser;
use Illuminate\Database\Seeder;

class EmployeeUserSeeder extends Seeder
{
    public function run(): void
    {
        // Verificar se o funcionário com ID 04 existe
        $employee = Employee::find(4);
        
        if (!$employee) {
            $this->command->error('Funcionário com ID 04 não encontrado!');
            return;
        }
        
        // Verificar se já existe um EmployeeUser para este funcionário
        if ($employee->employeeUser) {
            $this->command->warn('Funcionário ID 04 já possui acesso ao sistema!');
            $this->command->info('Email atual: ' . $employee->employeeUser->email);
            return;
        }
        
        // Criar o registro na tabela employee_users
        $employeeUser = EmployeeUser::create([
            'name' => $employee->name,
            'email' => 'jubelinger@grupomulticontact.pt',
            'password' => bcrypt('password'),
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);
        
        $this->command->info('Acesso ao sistema criado com sucesso para o funcionário ID 04!');
        $this->command->info('Nome: ' . $employee->name);
        $this->command->info('Email: jubelinger@grupomulticontact.pt');
        $this->command->info('Senha: password');
        $this->command->info('Status: Ativo');
    }
}