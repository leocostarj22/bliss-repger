<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'name' => 'admin',
                'display_name' => 'Administrador',
                'description' => 'Acesso total ao sistema',
                'permissions' => [
                    'tickets.view', 'tickets.create', 'tickets.edit', 'tickets.delete', 'tickets.assign',
                    'users.view', 'users.create', 'users.edit', 'users.delete',
                    'companies.view', 'companies.create', 'companies.edit', 'companies.delete',
                    'reports.view', 'settings.manage', 'admin.access'
                ],
            ],
            [
                'name' => 'manager',
                'display_name' => 'Gestor',
                'description' => 'Gestão de equipas e relatórios',
                'permissions' => [
                    'tickets.view', 'tickets.create', 'tickets.edit', 'tickets.assign',
                    'users.view', 'users.create', 'users.edit',
                    'companies.view', 'reports.view'
                ],
            ],
            [
                'name' => 'supervisor',
                'display_name' => 'Supervisor',
                'description' => 'Supervisão de agentes e tickets',
                'permissions' => [
                    'tickets.view', 'tickets.create', 'tickets.edit', 'tickets.assign',
                    'users.view', 'reports.view'
                ],
            ],
            [
                'name' => 'agent',
                'display_name' => 'Agente',
                'description' => 'Atendimento e resolução de tickets',
                'permissions' => [
                    'tickets.view', 'tickets.create', 'tickets.edit'
                ],
            ],
            [
                'name' => 'customer',
                'display_name' => 'Cliente',
                'description' => 'Criação e acompanhamento de tickets próprios',
                'permissions' => [
                    'tickets.view', 'tickets.create'
                ],
            ],
        ];

        foreach ($roles as $roleData) {
            Role::updateOrCreate(
                ['name' => $roleData['name']],
                $roleData
            );
        }
    }
}