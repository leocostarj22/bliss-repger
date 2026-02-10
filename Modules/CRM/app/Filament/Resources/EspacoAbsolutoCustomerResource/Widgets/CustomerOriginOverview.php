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
                $stat = Stat::make($label, $value);
                
                // Add styling based on label
                switch ($label) {
                    case 'Pergunta Grátis':
                        $stat->description('Pedidos de consulta')
                             ->descriptionIcon('heroicon-m-gift')
                             ->color('success')
                             ->chart([7, 3, 4, 5, 6, 3, 5, 8]);
                        break;
                    case 'CTA Orações':
                        $stat->description('Pedidos de oração')
                             ->descriptionIcon('heroicon-m-sparkles')
                             ->color('primary') // Blue
                             ->chart([2, 10, 3, 12, 1, 10, 3, 10]);
                        break;
                    case 'CTA E-book':
                        $stat->description('Downloads de material')
                             ->descriptionIcon('heroicon-m-book-open')
                             ->color('info') // Light blue
                             ->chart([3, 5, 3, 5, 3, 5, 3, 5]);
                        break;
                    case 'Tarot do Dia':
                        $stat->description('Consultas de cartas')
                             ->descriptionIcon('heroicon-m-sun')
                             ->color('warning') // Yellow
                             ->chart([4, 4, 4, 4, 5, 5, 5, 6]);
                        break;
                    case 'Nós Ligamos':
                        $stat->description('Pedidos de contacto')
                             ->descriptionIcon('heroicon-m-phone-arrow-up-right')
                             ->color('danger') // Red
                             ->chart([1, 2, 1, 3, 1, 2, 1, 4]);
                        break;
                    case 'Newsletters':
                    case 'Notícias':
                        $stat->description('Subscritores')
                             ->descriptionIcon('heroicon-m-newspaper')
                             ->color('gray');
                        break;
                    default: // Mensagens e outros
                        $stat->description('Interações gerais')
                             ->descriptionIcon('heroicon-m-chat-bubble-left-right')
                             ->color('gray');
                }
                
                $stats[] = $stat;
            }
        }

        return $stats;
    }
}