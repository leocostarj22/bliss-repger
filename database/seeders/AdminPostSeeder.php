<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\User;
use App\Models\Department;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class AdminPostSeeder extends Seeder
{
    public function run(): void
    {
        // Buscar um usuário admin para ser o autor dos posts
        $admin = User::where('role', 'admin')->first();
        
        if (!$admin) {
            $this->command->warn('Nenhum usuário admin encontrado. Criando posts sem autor específico.');
            $admin = User::first(); // Usar o primeiro usuário disponível
        }

        // Buscar departamentos para visibilidade
        $departments = Department::all()->pluck('id')->toArray();

        $posts = [
            [
                'title' => '🎉 Bem-vindos aos Novos Colaboradores!',
                'content' => '<h2>Novos Talentos na Nossa Equipa</h2><p>Temos o prazer de anunciar a chegada de novos colaboradores que se juntaram à nossa empresa este mês. Damos as boas-vindas a:</p><ul><li><strong>Ana Silva Santos</strong> - Gestora de RH</li><li><strong>Carlos Manuel Oliveira</strong> - Desenvolvedor</li><li><strong>Maria José Ferreira</strong> - Contabilista</li></ul><p>Esperamos que se sintam bem-vindos e integrados na nossa cultura empresarial. Não hesitem em contactar o departamento de RH para qualquer esclarecimento.</p>',
                'type' => 'announcement',
                'status' => 'published',
                'priority' => 'high',
                'is_pinned' => true,
                'author_id' => $admin->id,
                'visible_to_departments' => $departments,
                'published_at' => Carbon::now(),
                'expires_at' => Carbon::now()->addDays(30),
            ],
            [
                'title' => '📋 Processo de Integração - Novos Funcionários',
                'content' => '<h2>Informações Importantes para Novos Colaboradores</h2><p>Para garantir uma integração eficaz, todos os novos funcionários devem:</p><ol><li><strong>Completar a documentação de RH</strong> - Prazo: 3 dias úteis</li><li><strong>Participar na sessão de orientação</strong> - Agendada para sexta-feira às 14h</li><li><strong>Configurar acesso aos sistemas</strong> - Contactar o departamento de TI</li><li><strong>Conhecer as políticas da empresa</strong> - Manual disponível no portal interno</li></ol><p>Para dúvidas, contactem: <a href="mailto:rh@empresa.com">rh@empresa.com</a></p>',
                'type' => 'announcement',
                'status' => 'published',
                'priority' => 'normal',
                'is_pinned' => false,
                'author_id' => $admin->id,
                'visible_to_departments' => $departments,
                'published_at' => Carbon::now()->subDays(1),
                'expires_at' => Carbon::now()->addDays(15),
            ],
            [
                'title' => '🤝 Programa de Mentoria para Novos Colaboradores',
                'content' => '<h2>Programa de Mentoria 2025</h2><p>Estamos a implementar um programa de mentoria para apoiar a integração dos nossos novos colaboradores:</p><h3>Como Funciona:</h3><ul><li><strong>Duração:</strong> 3 meses</li><li><strong>Reuniões:</strong> Semanais (30 minutos)</li><li><strong>Objetivos:</strong> Integração cultural, desenvolvimento profissional e networking interno</li></ul><h3>Mentores Designados:</h3><ul><li><strong>Ana Silva Santos</strong> - Mentor: João Pereira (RH Senior)</li><li><strong>Carlos Manuel Oliveira</strong> - Mentor: Pedro Costa (Tech Lead)</li><li><strong>Maria José Ferreira</strong> - Mentor: Sofia Rodrigues (Contabilidade Senior)</li></ul><p>Os mentores entrarão em contacto diretamente com os novos colaboradores esta semana.</p>',
                'type' => 'announcement',
                'status' => 'published',
                'priority' => 'normal',
                'is_pinned' => false,
                'author_id' => $admin->id,
                'visible_to_departments' => $departments,
                'published_at' => Carbon::now()->subHours(6),
                'expires_at' => Carbon::now()->addDays(45),
            ],
        ];

        foreach ($posts as $postData) {
            Post::create($postData);
        }

        $this->command->info('3 posts administrativos sobre novos funcionários criados com sucesso!');
    }
}