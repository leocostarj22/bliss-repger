<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Template;

class TemplateSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => 'Email Promo BF', 'type' => 'email', 'subject' => 'Black Friday', 'content' => '<p>Olá {{ name }}, -50% hoje!</p>', 'status' => 'active'],
            ['name' => 'Email Launch', 'type' => 'email', 'subject' => 'Lançamento', 'content' => '<p>Conheça a novidade, {{ name }}!</p>', 'status' => 'active'],
            ['name' => 'SMS Promo', 'type' => 'sms', 'subject' => null, 'content' => 'Olá {{ name }}, promo ativa!', 'status' => 'active'],
            ['name' => 'WhatsApp Follow-up', 'type' => 'whatsapp', 'subject' => null, 'content' => 'Pode ajudar? Temos oferta!', 'status' => 'active'],
            ['name' => 'Email Referral', 'type' => 'email', 'subject' => 'Indicação', 'content' => '<p>Olá {{ name }}, obrigado pela indicação!</p>', 'status' => 'active'],
        ];

        foreach ($items as $data) {
            Template::create($data);
        }
    }
}