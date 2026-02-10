<?php

namespace Modules\CRM\Filament\Resources\EspacoAbsolutoCustomerResource\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Modules\CRM\Models\EspacoAbsolutoUserGroup;
use Modules\CRM\Models\EspacoAbsolutoUserMessage;
use Modules\CRM\Models\EspacoAbsolutoCustomer;

class CustomerOriginOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $data = [];

        // 1. Mensagens (User Messages)
        $messagesCount = EspacoAbsolutoUserMessage::count();
        $data[] = [
            'label' => 'Mensagens',
            'count' => $messagesCount,
            'description' => 'Total de mensagens',
            'icon' => 'heroicon-m-chat-bubble-left-right',
            'color' => 'gray',
            'chart' => null,
        ];
        
        // 2. User Groups (Tarot, Pergunta Grátis, etc.)
        $groups = EspacoAbsolutoUserGroup::where('dashboard', 1)
            ->where('apaga', 0)
            ->get();

        foreach ($groups as $group) {
            $count = EspacoAbsolutoCustomer::whereHas('groups', function ($query) use ($group) {
                $query->where('user_groups.idgrupo', $group->idgrupo);
            })->count();

            $description = 'Grupo';
            $icon = 'heroicon-m-user-group';
            $color = 'gray';
            $chart = null;

            switch ($group->nome) {
                case 'Pergunta Grátis':
                    $description = 'Pedidos de consulta';
                    $icon = 'heroicon-m-gift';
                    $color = 'success';
                    $chart = [7, 3, 4, 5, 6, 3, 5, 8];
                    break;
                case 'CTA Orações':
                    $description = 'Pedidos de oração';
                    $icon = 'heroicon-m-sparkles';
                    $color = 'primary';
                    $chart = [2, 10, 3, 12, 1, 10, 3, 10];
                    break;
                case 'CTA E-book':
                    $description = 'Downloads de material';
                    $icon = 'heroicon-m-book-open';
                    $color = 'info';
                    $chart = [3, 5, 3, 5, 3, 5, 3, 5];
                    break;
                case 'Tarot do Dia':
                    $description = 'Consultas de cartas';
                    $icon = 'heroicon-m-sun';
                    $color = 'warning';
                    $chart = [4, 4, 4, 4, 5, 5, 5, 6];
                    break;
                case 'Nós ligamos!':
                    $description = 'Pedidos de contacto';
                    $icon = 'heroicon-m-phone-arrow-up-right';
                    $color = 'danger';
                    $chart = [1, 2, 1, 3, 1, 2, 1, 4];
                    break;
                case 'Newsletter':
                case 'Contactos':
                    $description = 'Subscritores';
                    $icon = 'heroicon-m-newspaper';
                    $color = 'gray';
                    break;
            }

            $data[] = [
                'label' => $group->nome,
                'count' => $count,
                'description' => $description,
                'icon' => $icon,
                'color' => $color,
                'chart' => $chart,
            ];
        }

        // 3. Sort by count descending
        usort($data, function ($a, $b) {
            return $b['count'] <=> $a['count'];
        });

        // 4. Build Stats objects
        $stats = [];
        foreach ($data as $item) {
            $stat = Stat::make($item['label'], $item['count'])
                ->description($item['description'])
                ->descriptionIcon($item['icon'])
                ->color($item['color']);
            
            if ($item['chart']) {
                $stat->chart($item['chart']);
            }
            
            $stats[] = $stat;
        }

        return $stats;
    }
}