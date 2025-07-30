<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            [
                'name' => 'Recursos Humanos',
                'slug' => 'rh',
                'description' => 'Setor responsável pela gestão de pessoas, recrutamento e benefícios',
                'color' => '#10b981',
                'email' => 'rh@empresa.com',
            ],
            [
                'name' => 'Tecnologia da Informação',
                'slug' => 'ti',
                'description' => 'Setor responsável pela infraestrutura tecnológica e suporte técnico',
                'color' => '#3b82f6',
                'email' => 'ti@empresa.com',
            ],
            [
                'name' => 'Marketing',
                'slug' => 'marketing',
                'description' => 'Setor responsável por estratégias de marketing e comunicação',
                'color' => '#f59e0b',
                'email' => 'marketing@empresa.com',
            ],
            [
                'name' => 'Compras',
                'slug' => 'compras',
                'description' => 'Setor responsável por aquisições e gestão de fornecedores',
                'color' => '#8b5cf6',
                'email' => 'compras@empresa.com',
            ],
            [
                'name' => 'Helpdesk',
                'slug' => 'helpdesk',
                'description' => 'Setor de suporte técnico e atendimento ao usuário',
                'color' => '#ef4444',
                'email' => 'helpdesk@empresa.com',
            ],
            [
                'name' => 'Administração',
                'slug' => 'administracao',
                'description' => 'Setor responsável pela gestão administrativa e financeira',
                'color' => '#6b7280',
                'email' => 'admin@empresa.com',
            ],
        ];

        // Criar departamentos para todas as empresas
        Company::all()->each(function ($company) use ($departments) {
            foreach ($departments as $departmentData) {
                Department::create(array_merge($departmentData, [
                    'company_id' => $company->id,
                ]));
            }
        });
    }
}