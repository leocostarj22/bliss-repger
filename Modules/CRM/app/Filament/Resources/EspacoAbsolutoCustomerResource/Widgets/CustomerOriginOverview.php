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
        $stats = [];
        
        // 1. Get counts from User Groups (Tarot, Pergunta Grátis, etc.)
        $groups = EspacoAbsolutoUserGroup::where('dashboard', 1)
            ->where('apaga', 0)
            ->get();

        foreach ($groups as $group) {
            // Count users associated with this group
            $count = EspacoAbsolutoCustomer::whereHas('groups', function ($query) use ($group) {
                $query->where('user_groups.idgrupo', $group->idgrupo);
            })->count();

            $stat = Stat::make($group->nome, $count);
            
             // Add styling based on group name
             switch ($group->nome) {
                case 'Pergunta Grátis':
                    $stat->description('Pedidos de consulta')->descriptionIcon('heroicon-m-gift')->color('success')->chart([7, 3, 4, 5, 6, 3, 5, 8]);
                    break;
                case 'CTA Orações':
                    $stat->description('Pedidos de oração')->descriptionIcon('heroicon-m-sparkles')->color('primary')->chart([2, 10, 3, 12, 1, 10, 3, 10]);
                    break;
                case 'CTA E-book':
                    $stat->description('Downloads de material')->descriptionIcon('heroicon-m-book-open')->color('info')->chart([3, 5, 3, 5, 3, 5, 3, 5]);
                    break;
                case 'Tarot do Dia':
                    $stat->description('Consultas de cartas')->descriptionIcon('heroicon-m-sun')->color('warning')->chart([4, 4, 4, 4, 5, 5, 5, 6]);
                    break;
                case 'Nós ligamos!':
                    $stat->description('Pedidos de contacto')->descriptionIcon('heroicon-m-phone-arrow-up-right')->color('danger')->chart([1, 2, 1, 3, 1, 2, 1, 4]);
                    break;
                case 'Newsletter':
                case 'Contactos':
                    $stat->description('Subscritores')->descriptionIcon('heroicon-m-newspaper')->color('gray');
                    break;
                default:
                    $stat->description('Grupo')->color('gray');
            }
            $stats[] = $stat;
        }

        // 2. Add "Mensagens" count from user_messages table
        $messagesCount = EspacoAbsolutoUserMessage::count();
        $stats[] = Stat::make('Mensagens', $messagesCount)
            ->description('Total de mensagens')
            ->descriptionIcon('heroicon-m-chat-bubble-left-right')
            ->color('gray');

        return $stats;
    }
}