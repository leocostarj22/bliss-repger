<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Company;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Suporte Técnico',
                'description' => 'Problemas técnicos, bugs, falhas de sistema e suporte geral de TI',
                'color' => '#3B82F6', // Azul
            ],
            [
                'name' => 'Solicitação de Acesso',
                'description' => 'Pedidos de acesso a sistemas, permissões e credenciais',
                'color' => '#10B981', // Verde
            ],
            [
                'name' => 'Hardware',
                'description' => 'Problemas com equipamentos, computadores, impressoras e dispositivos',
                'color' => '#F59E0B', // Amarelo
            ],
            [
                'name' => 'Software',
                'description' => 'Instalação, atualização e problemas com softwares e aplicativos',
                'color' => '#8B5CF6', // Roxo
            ],
            [
                'name' => 'Rede e Conectividade',
                'description' => 'Problemas de internet, rede, Wi-Fi e conectividade',
                'color' => '#EF4444', // Vermelho
            ],
            [
                'name' => 'Recursos Humanos',
                'description' => 'Questões relacionadas a RH, folha de pagamento e benefícios',
                'color' => '#EC4899', // Rosa
            ],
            [
                'name' => 'Financeiro',
                'description' => 'Questões financeiras, contabilidade e faturamento',
                'color' => '#14B8A6', // Teal
            ],
            [
                'name' => 'Compras e Fornecedores',
                'description' => 'Solicitações de compra, cotações e gestão de fornecedores',
                'color' => '#F97316', // Laranja
            ],
            [
                'name' => 'Marketing',
                'description' => 'Campanhas, materiais de marketing e comunicação',
                'color' => '#A855F7', // Violeta
            ],
            [
                'name' => 'Administrativo',
                'description' => 'Questões administrativas gerais e documentação',
                'color' => '#6B7280', // Cinza
            ],
            [
                'name' => 'Melhoria de Processo',
                'description' => 'Sugestões de melhorias, otimizações e novos processos',
                'color' => '#059669', // Verde escuro
            ],
            [
                'name' => 'Treinamento',
                'description' => 'Solicitações de treinamento e capacitação',
                'color' => '#DC2626', // Vermelho escuro
            ],
        ];

        // Buscar todas as empresas com preload dos campos necessários
        $companies = Company::select('id', 'name', 'slug')
            ->where('is_active', true)
            ->get();

        // Exibir informações das empresas encontradas
        $this->command->info("Criando categorias para {$companies->count()} empresas:");
        
        foreach ($companies as $company) {
            $this->command->info("- {$company->name} (ID: {$company->id})");
            
            foreach ($categories as $categoryData) {
                Category::create([
                    'company_id' => $company->id,
                    'name' => $categoryData['name'],
                    'description' => $categoryData['description'],
                    'color' => $categoryData['color'],
                    'is_active' => true,
                ]);
            }
        }
        
        $totalCategories = $companies->count() * count($categories);
        $this->command->info("✅ {$totalCategories} categorias criadas com sucesso!");
    }
}