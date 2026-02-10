<?php

namespace Modules\CRM\Filament\Resources\EspacoAbsolutoCustomerResource\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Modules\CRM\Models\EspacoAbsolutoUserMessage;

class CustomerOriginOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $stats = [];
        
        // Group messages by subject to determine "origin" counts
        $counts = EspacoAbsolutoUserMessage::selectRaw('subject, count(*) as total')
            ->groupBy('subject')
            ->orderByDesc('total')
            ->get();
            
        // Map subjects to categories
        $categories = [
            'Mensagens' => 0,
            'Pergunta Grátis' => 0,
            'CTA Orações' => 0,
            'CTA E-book' => 0,
            'Tarot do Dia' => 0,
            'Nós Ligamos' => 0,
            'Contactos' => 0,
            'Newsletters' => 0,
            'Notícias' => 0,
        ];

        foreach ($counts as $count) {
            $subject = $count->subject;
            $total = $count->total;

            if (stripos($subject, 'Pergunta Grátis') !== false) {
                $categories['Pergunta Grátis'] += $total;
            } elseif (stripos($subject, 'Oração') !== false || stripos($subject, 'Orações') !== false) {
                $categories['CTA Orações'] += $total;
            } elseif (stripos($subject, 'E-book') !== false) {
                $categories['CTA E-book'] += $total;
            } elseif (stripos($subject, 'Tarot') !== false) {
                $categories['Tarot do Dia'] += $total;
            } elseif (stripos($subject, 'Pedido de Ligação') !== false) {
                $categories['Nós Ligamos'] += $total;
            } elseif (stripos($subject, 'Newsletter') !== false) {
                $categories['Newsletters'] += $total;
            } elseif (stripos($subject, 'Notícias') !== false) {
                $categories['Notícias'] += $total;
            } else {
                $categories['Mensagens'] += $total;
            }
        }

        foreach ($categories as $label => $value) {
            if ($value > 0) {
                $stats[] = Stat::make($label, $value);
            }
        }

        return $stats;
    }
}