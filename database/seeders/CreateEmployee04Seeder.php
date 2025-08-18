<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\EmployeeUser;
use App\Models\Department;
use Illuminate\Database\Seeder;

class CreateEmployee04Seeder extends Seeder
{
    public function run(): void
    {
        // Buscar um departamento para associar
        $department = Department::first();
        
        if (!$department) {
            $this->command->error('Nenhum departamento encontrado. Execute primeiro o DepartmentSeeder.');
            return;
        }
        
        // Criar o funcionário (o código será gerado automaticamente)
        $employee = Employee::create([
            // employee_code será gerado automaticamente
            'name' => 'Funcionário Teste Automático',
            'email' => 'funcionario.teste@empresa.pt',
            'nif' => '111222333',
            'document_type' => 'cartao_cidadao',
            'document_number' => 'CC111222333',
            'nis' => '11122233344',
            'birth_date' => '1990-01-01',
            'gender' => 'M',
            'marital_status' => 'single',
            'phone' => '+351 911 222 333',
            'emergency_contact' => 'Contato de Emergência',
            'emergency_phone' => '+351 912 333 444',
            'address' => 'Rua Exemplo, 123',
            'address_number' => '123',
            'neighborhood' => 'Centro',
            'city' => 'Lisboa',
            'state' => 'LX',
            'zip_code' => '1000-001',
            'position' => 'Funcionário',
            'department_id' => $department->id,
            'company_id' => 1,
            'hire_date' => '2024-01-01',
            'salary' => 1500.00,
            'employment_type' => 'CLT',
            'status' => 'active',
            'bank_name' => 'Santander',
            'bank_agency' => '0001',
            'bank_account' => '11122233344',
            'account_type' => 'checking',
            'notes' => 'Funcionário criado com código automático.',
        ]);
        
        $this->command->info("Funcionário criado com sucesso!");
        $this->command->info("ID: {$employee->id}");
        $this->command->info("Código gerado automaticamente: {$employee->employee_code}");
        
        // Criar o registro na tabela employee_users
        $employeeUser = EmployeeUser::create([
            'name' => $employee->name,
            'email' => 'jubelinger@grupomulticontact.pt',
            'password' => bcrypt('password'),
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);
        
        $this->command->info('Registro na tabela employee_users criado com sucesso!');
        $this->command->info("Email: jubelinger@grupomulticontact.pt");
        $this->command->info("Senha: password");
        $this->command->info("Employee ID: {$employee->id}");
        $this->command->info("Código do Funcionário: {$employee->employee_code}");
    }
}