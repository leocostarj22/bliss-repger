<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Company;
use Illuminate\Database\Seeder;

class EmployeeTicketCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $employeeCategories = [
            [
                'name' => 'Solicitação de Equipamentos',
                'description' => 'Pedidos de computadores, monitores, teclados, mouse e outros equipamentos de trabalho',
                'color' => '#3B82F6', // Azul
            ],
            [
                'name' => 'Problemas de Acesso',
                'description' => 'Dificuldades para acessar sistemas, esquecimento de senhas e bloqueios de conta',
                'color' => '#EF4444', // Vermelho
            ],
            [
                'name' => 'Suporte de Software',
                'description' => 'Instalação, atualização e problemas com programas e aplicativos de trabalho',
                'color' => '#8B5CF6', // Roxo
            ],
            [
                'name' => 'Problemas de Conectividade',
                'description' => 'Problemas com internet, Wi-Fi, VPN e acesso remoto',
                'color' => '#F59E0B', // Amarelo
            ],
            [
                'name' => 'Solicitações de RH',
                'description' => 'Questões sobre folha de pagamento, benefícios, férias e documentos pessoais',
                'color' => '#EC4899', // Rosa
            ],
            [
                'name' => 'Manutenção de Equipamentos',
                'description' => 'Reparo de computadores, impressoras e outros equipamentos com defeito',
                'color' => '#F97316', // Laranja
            ],
            [
                'name' => 'Solicitação de Materiais',
                'description' => 'Pedidos de materiais de escritório, suprimentos e insumos para trabalho',
                'color' => '#10B981', // Verde
            ],
            [
                'name' => 'Treinamento e Capacitação',
                'description' => 'Solicitações de cursos, treinamentos e capacitação profissional',
                'color' => '#14B8A6', // Teal
            ],
            [
                'name' => 'Questões Administrativas',
                'description' => 'Documentos, certificados, declarações e questões burocráticas',
                'color' => '#6B7280', // Cinza
            ],
            [
                'name' => 'Sugestões e Melhorias',
                'description' => 'Ideias para melhorar processos, ambiente de trabalho e produtividade',
                'color' => '#059669', // Verde escuro
            ],
            [
                'name' => 'Problemas de Segurança',
                'description' => 'Questões relacionadas à segurança física, digital e do ambiente de trabalho',
                'color' => '#DC2626', // Vermelho escuro
            ],
            [
                'name' => 'Comunicação Interna',
                'description' => 'Problemas com e-mail, telefone, chat interno e ferramentas de comunicação',
                'color' => '#A855F7', // Violeta
            ],
        ];

        // Buscar todas as empresas ativas
        $companies = Company::select('id', 'name', 'slug')
            ->where('is_active', true)
            ->get();

        if ($companies->isEmpty()) {
            $this->command->error('Nenhuma empresa ativa encontrada. Execute primeiro o CompanySeeder.');
            return;
        }

        // Exibir informações das empresas encontradas
        $this->command->info("Criando categorias específicas para funcionários em {$companies->count()} empresas:");
        
        foreach ($companies as $company) {
            $this->command->info("- {$company->name} (ID: {$company->id})");
            
            foreach ($employeeCategories as $categoryData) {
                // Verificar se a categoria já existe para evitar duplicatas
                $existingCategory = Category::where('company_id', $company->id)
                    ->where('name', $categoryData['name'])
                    ->first();
                
                if (!$existingCategory) {
                    Category::create([
                        'company_id' => $company->id,
                        'name' => $categoryData['name'],
                        'description' => $categoryData['description'],
                        'color' => $categoryData['color'],
                        'is_active' => true,
                    ]);
                } else {
                    $this->command->warn("Categoria '{$categoryData['name']}' já existe para {$company->name}");
                }
            }
        }
        
        $totalCategories = $companies->count() * count($employeeCategories);
        $this->command->info("✅ Categorias específicas para funcionários criadas com sucesso!");
        $this->command->info("📊 Total de categorias processadas: {$totalCategories}");
    }
}