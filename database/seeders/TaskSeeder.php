<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        // Buscar o primeiro usuário para associar as tarefas
        $user = User::first();
        
        if (!$user) {
            $this->command->warn('Nenhum usuário encontrado. Crie um usuário primeiro.');
            return;
        }

        $tasks = [
            [
                'title' => 'Reunião de Equipe',
                'description' => 'Reunião semanal da equipe para alinhamento de projetos',
                'priority' => 'medium',
                'status' => 'pending',
                'due_date' => Carbon::now()->addDays(2)->setTime(14, 0),
                'location' => 'Sala de Reuniões A',
                'taskable_type' => get_class($user),
                'taskable_id' => $user->id,
            ],
            [
                'title' => 'Apresentação do Projeto',
                'description' => 'Apresentar resultados do projeto para a diretoria',
                'priority' => 'high',
                'status' => 'pending',
                'due_date' => Carbon::now()->addDays(5)->setTime(10, 30),
                'location' => 'Auditório Principal',
                'taskable_type' => get_class($user),
                'taskable_id' => $user->id,
            ],
            [
                'title' => 'Revisão de Documentos',
                'description' => 'Revisar documentação técnica do sistema',
                'priority' => 'low',
                'status' => 'in_progress',
                'due_date' => Carbon::now()->addDays(7)->setTime(16, 0),
                'taskable_type' => get_class($user),
                'taskable_id' => $user->id,
            ],
            [
                'title' => 'Treinamento de Segurança',
                'description' => 'Participar do treinamento obrigatório de segurança',
                'priority' => 'medium',
                'status' => 'pending',
                'due_date' => Carbon::now()->addDays(10)->setTime(9, 0),
                'location' => 'Centro de Treinamento',
                'taskable_type' => get_class($user),
                'taskable_id' => $user->id,
            ],
            [
                'title' => 'Entrega do Relatório Mensal',
                'description' => 'Finalizar e entregar relatório mensal de atividades',
                'priority' => 'high',
                'status' => 'pending',
                'due_date' => Carbon::now()->endOfMonth()->setTime(17, 0),
                'taskable_type' => get_class($user),
                'taskable_id' => $user->id,
            ],
        ];

        foreach ($tasks as $taskData) {
            Task::create($taskData);
        }

        $this->command->info('5 tarefas de exemplo criadas com sucesso!');
    }
}
