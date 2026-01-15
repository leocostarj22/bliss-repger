<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Segment;
use Modules\CRM\Models\Template;

class MyFormulaCampaignSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Criar o Segmento Mestre
        // Este segmento agrupa todos que vieram do Quiz para campanhas gerais
        Segment::firstOrCreate(
            ['name' => 'Interesse Qualificado – Quiz MyFormula'],
            ['definition' => ['source' => 'quiz']]
        );

        // Segmento específico para quem abandonou (exemplo base)
        Segment::firstOrCreate(
            ['name' => 'Interesse Qualificado – Quiz MyFormula – Abandonado'],
            ['definition' => ['source' => 'quiz', 'utm_content' => 'Não finalizado']]
        );

        // 2. Definição dos Produtos e Objeções (Baseado na sua estratégia)
        $products = [
            'Energia e memória' => [ // Label do sistema (A)
                'display_name' => 'Energia e Memória – Tailor Made',
                'reasons' => [
                    'Não senti urgência',
                    'Não percebi diferença vs café / vitaminas',
                    'Falta de explicação dos benefícios',
                    'Preço'
                ],
                'insight' => 'Aqui entra educação + comparativo.'
            ],
            'Ossos e articulações' => [ // Label do sistema (B)
                'display_name' => 'Ossos e Articulações – Tailor Made',
                'reasons' => [
                    'Já uso colágeno / cálcio',
                    'Dúvida se realmente ajuda',
                    'Falta de explicação científica',
                    'Preço'
                ],
                'insight' => 'Comparação direta com soluções comuns funciona.'
            ],
            'Vida sexual' => [ // Label do sistema (C)
                'display_name' => 'Saúde Sexual – Tailor Made',
                'reasons' => [
                    'Tema sensível / privacidade',
                    'Falta de confiança',
                    'Medo de efeitos',
                    'Preço'
                ],
                'insight' => 'Linguagem discreta, segura e respeitosa.'
            ],
            'Menopausa' => [ // Label do sistema (K)
                'display_name' => 'Menopausa – Tailor Made',
                'reasons' => [
                    'Não sei se é adequado para meu caso',
                    'Tenho acompanhamento médico e fiquei insegura',
                    'Falta de explicação sobre hormonas',
                    'Preço'
                ],
                'insight' => 'Produto altamente emocional → contacto humano converte muito bem.'
            ],
            'Cabelo, pele e unhas' => [ // Label do sistema (E)
                'display_name' => 'Cabelo, Pele e Unhas – Tailor Made',
                'reasons' => [
                    'Já tentei outros produtos sem resultado',
                    'Não sei em quanto tempo veria resultados',
                    'Achei o produto caro',
                    'Não era exatamente o que eu procurava'
                ],
                'insight' => 'Expectativa de tempo = principal objeção.'
            ],
            'Sono' => [ // Label do sistema (F)
                'display_name' => 'Sono – Tailor Made',
                'reasons' => [
                    'Tenho insónia crónica',
                    'Uso medicação',
                    'Não quero dependência',
                    'Falta de clareza nos efeitos'
                ],
                'insight' => 'Segurança + não dependência.'
            ],
            'Peso' => [ // Label do sistema (G)
                'display_name' => 'Perda de Peso – Tailor Made',
                'reasons' => [
                    'Achei o preço elevado',
                    'Já tentei soluções semelhantes sem sucesso',
                    'Tenho receio de não funcionar comigo',
                    'Falta de acompanhamento humano',
                    'Tenho restrições de saúde'
                ],
                'insight' => 'Medo de frustração + histórico de insucesso.'
            ],
            'Digestivo' => [ // Label do sistema (H)
                'display_name' => 'Digestivo – Tailor Made',
                'reasons' => [
                    'Não entendi a diferença para probióticos comuns',
                    'Sintomas variam muito',
                    'Achei simples demais',
                    'Preço'
                ],
                'insight' => 'Educativo + diferenciação técnica.'
            ],
            'Coração, circulação e açúcar' => [ // Label do sistema (I)
                'display_name' => 'Circulação e Açúcar – Tailor Made',
                'reasons' => [
                    'Questões de saúde mais sensíveis',
                    'Preciso falar com um profissional',
                    'Tenho medicação',
                    'Falta de clareza nos ingredientes'
                ],
                'insight' => 'Contato humano quase obrigatório.'
            ],
            'Anti-aging' => [ // Label do sistema (J)
                'display_name' => 'Anti-Aging – Tailor Made',
                'reasons' => [
                    'Não percebi resultados concretos',
                    'Achei o conceito muito genérico',
                    'Falta de provas científicas visíveis',
                    'Já uso outros suplementos',
                    'Preço'
                ],
                'insight' => 'Autoridade científica e prova social convertem muito.'
            ],
        ];

        // 3. Gerar Templates
        foreach ($products as $sysName => $data) {
            $templateName = "MyFormula – Cuidamos do Seu Caso | {$data['display_name']}";
            
            Template::firstOrCreate(
                ['name' => $templateName],
                [
                    'type' => 'email',
                    'subject' => "Sobre o seu plano de {$sysName} – Podemos ajudar?",
                    'content' => $this->generateHtml($data['display_name'], $data['reasons']),
                    'status' => 'active',
                ]
            );
        }
    }

    private function generateHtml($productName, $reasons)
    {
        $reasonsHtml = '';
        foreach ($reasons as $index => $reason) {
            // Gera um link de rastreamento "Trigger"
            // Na prática, isso levaria a uma página de agradecimento que registra o clique
            $url = "https://myformula.pt/feedback?product=" . urlencode($productName) . "&reason=" . urlencode($reason);
            
            $reasonsHtml .= "
            <p style='margin: 8px 0;'>
                <a href='{$url}' style='display: block; padding: 12px 16px; background-color: #f3f4f6; color: #374151; text-decoration: none; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 14px;'>
                    {$reason}
                </a>
            </p>";
        }

        return <<<HTML
<!doctype html>
<html lang="pt">
<head>
    <meta charset="utf-8">
    <title>MyFormula Feedback</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; color: #1f2937; line-height: 1.5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .btn-primary { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 500; }
        .footer { margin-top: 32px; font-size: 12px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <p>Olá {{ name }},</p>
        
        <h1 style="font-size: 20px; color: #111827; margin-bottom: 16px;">
            Queremos garantir que o seu plano de <strong>{$productName}</strong> é perfeito para si.
        </h1>
        
        <p>
            Notámos que não avançou com o seu plano personalizado. Na MyFormula, sabemos que cada caso é único e a sua saúde é a nossa prioridade.
        </p>
        
        <p style="font-weight: 500; margin-top: 24px;">
            Para nos ajudar a melhorar (e talvez encontrar uma solução melhor para si), qual foi o principal motivo?
        </p>
        
        <div style="margin: 20px 0;">
            {$reasonsHtml}
        </div>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <h2 style="font-size: 16px; margin-bottom: 12px;">Prefere falar com um especialista?</h2>
        <p>
            Às vezes, uma conversa de 5 minutos resolve dúvidas que levam meses a pesquisar.
        </p>
        
        <p style="text-align: center; margin-top: 20px;">
            <a href="https://myformula.pt/contact-request?source=email_campaign" class="btn-primary">
                Sim, gostaria de uma análise gratuita do meu caso
            </a>
        </p>
        
        <div class="footer">
            <p>MyFormula – Cuidamos do Seu Caso</p>
            <p><a href="{{ unsubscribe_url }}" style="color: #6b7280;">Cancelar subscrição</a></p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}