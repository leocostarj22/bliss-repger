<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Campaign;
use Modules\CRM\Models\Contact;
use Modules\CRM\Models\Segment;
use Modules\CRM\Models\Template;
use Carbon\Carbon;

class DemoCampaignSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Simular a "Dona Vera"
        // Criamos o contato com as etiquetas certas para ser "pescado" pelo segmento
        $contact = Contact::firstOrCreate(
            ['email' => 'vera.teste@email.com'],
            [
                'name' => 'Vera Teste',
                'source' => 'quiz',
                'utm_source' => 'quiz',
                'utm_campaign' => 'Ossos e articulações', // O fiel da balança: identifica o produto
                'utm_content' => 'Não finalizado', // Identifica o abandono
                'company_id' => 1,
            ]
        );

        // 2. Criar Segmento Específico (Alvo: Ossos + Abandono)
        // Este filtro diz: "Traga-me todos que vieram do Quiz, queriam Ossos e não terminaram"
        $segmentName = 'Abandono - Ossos e Articulações';
        $segment = Segment::firstOrCreate(
            ['name' => $segmentName],
            [
                'definition' => [
                    'source' => 'quiz',
                    'utm_content' => 'Não finalizado',
                    'utm_campaign' => 'Ossos e articulações'
                ]
            ]
        );

        // 3. Buscar o Template Correto (que criamos no passo anterior)
        $template = Template::where('name', 'like', '%Ossos e Articulações%')->first();

        if (!$template) {
            $this->command->error("ERRO: Template de Ossos não encontrado. Rode o MyFormulaCampaignSeeder primeiro!");
            return;
        }

        // 4. Criar a Campanha Pronta
        $campaign = Campaign::firstOrCreate(
            ['name' => 'Recuperação Quiz - Dona Vera (Ossos)'],
            [
                'channel' => 'email',
                'status' => 'draft', // Fica em Rascunho para você aprovar
                'segment_id' => $segment->id,
                'template_id' => $template->id,
                'scheduled_at' => Carbon::now()->addHours(1),
                'active' => true,
            ]
        );

        $this->command->info("✅ CENÁRIO CRIADO COM SUCESSO:");
        $this->command->info("   👤 Lead: {$contact->name} (Interesse: Ossos)");
        $this->command->info("   🎯 Segmento: {$segment->name}");
        $this->command->info("   📢 Campanha: {$campaign->name}");
    }
}