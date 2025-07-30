<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\Department;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        // Buscar departamentos existentes
        $departments = Department::all();
        
        if ($departments->isEmpty()) {
            $this->command->warn('Nenhum departamento encontrado. Execute primeiro o DepartmentSeeder.');
            return;
        }

        $employees = [
            [
                'employee_code' => 'EMP001',
                'name' => 'Ana Silva Santos',
                'email' => 'ana.santos@empresa.pt',
                'nif' => '123456789',
                'document_type' => 'cartao_cidadao',
                'document_number' => 'CC123456789',
                'nis' => '12345678901',
                'birth_date' => '1985-03-15',
                'gender' => 'F',
                'marital_status' => 'married',
                'phone' => '+351 912 345 678',
                'emergency_contact' => 'João Santos',
                'emergency_phone' => '+351 913 456 789',
                'address' => 'Rua das Flores, 123',
                'address_number' => '123',
                'neighborhood' => 'Centro',
                'city' => 'Lisboa',
                'state' => 'LX',
                'zip_code' => '1000-001',
                'position' => 'Gestora de RH',
                'department_id' => $departments->random()->id,
                'company_id' => 1,
                'hire_date' => '2020-01-15',
                'salary' => 2500.00,
                'employment_type' => 'CLT',
                'status' => 'active',
                'bank_name' => 'Santander',
                'bank_agency' => '0018',
                'bank_account' => '12345678901',
                'account_type' => 'checking',
                'notes' => 'Funcionária exemplar.',
            ],
            [
                'employee_code' => 'EMP002',
                'name' => 'Carlos Manuel Oliveira',
                'email' => 'carlos.oliveira@empresa.pt',
                'nif' => '987654321',
                'document_type' => 'cartao_cidadao',
                'document_number' => 'CC987654321',
                'nis' => '98765432109',
                'birth_date' => '1990-07-22',
                'gender' => 'M',
                'marital_status' => 'single',
                'phone' => '+351 925 678 901',
                'emergency_contact' => 'Maria Oliveira',
                'emergency_phone' => '+351 926 789 012',
                'address' => 'Av. da República, 456',
                'address_number' => '456',
                'neighborhood' => 'Cedofeita',
                'city' => 'Porto',
                'state' => 'PT',
                'zip_code' => '4000-001',
                'position' => 'Desenvolvedor',
                'department_id' => $departments->random()->id,
                'company_id' => 1,
                'hire_date' => '2021-06-01',
                'salary' => 3000.00,
                'employment_type' => 'CLT',
                'status' => 'active',
                'bank_name' => 'CGD',
                'bank_agency' => '0035',
                'bank_account' => '98765432109',
                'account_type' => 'checking',
                'notes' => 'Especialista em web.',
            ],
            [
                'employee_code' => 'EMP003',
                'name' => 'Maria José Ferreira',
                'email' => 'maria.ferreira@empresa.pt',
                'nif' => '456789123',
                'document_type' => 'titulo_residencia',
                'document_number' => 'TR456789123',
                'nis' => '45678912345',
                'birth_date' => '1988-11-08',
                'gender' => 'F',
                'marital_status' => 'divorced',
                'phone' => '+351 934 567 890',
                'emergency_contact' => 'Pedro Ferreira',
                'emergency_phone' => '+351 935 678 901',
                'address' => 'Praça do Comércio, 789',
                'address_number' => '789',
                'neighborhood' => 'Baixa',
                'city' => 'Coimbra',
                'state' => 'CB',
                'zip_code' => '3000-001',
                'position' => 'Contabilista',
                'department_id' => $departments->random()->id,
                'company_id' => 1,
                'hire_date' => '2019-09-10',
                'salary' => 2200.00,
                'employment_type' => 'CLT',
                'status' => 'active',
                'bank_name' => 'Millennium',
                'bank_agency' => '0033',
                'bank_account' => '45678912345',
                'account_type' => 'savings',
                'notes' => 'Responsável contabilidade.',
            ],
        ];

        foreach ($employees as $employeeData) {
            Employee::create($employeeData);
        }

        $this->command->info('3 funcionários criados com sucesso!');
    }
}