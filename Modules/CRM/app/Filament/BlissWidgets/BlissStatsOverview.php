<?php

namespace Modules\CRM\Filament\BlissWidgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Modules\CRM\Models\BlissOrder;
use Modules\CRM\Models\BlissCustomer;
use Modules\CRM\Models\BlissProduct;

class BlissStatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Vendas Totais', BlissOrder::count())
                ->description('Total de pedidos realizados')
                ->descriptionIcon('heroicon-m-shopping-cart')
                ->color('success'),
            
            Stat::make('Receita Total', '€ ' . number_format(BlissOrder::sum('total'), 2, ',', '.'))
                ->description('Soma total dos pedidos')
                ->color('success'),

            Stat::make('Clientes', BlissCustomer::count())
                ->description('Total de clientes registrados')
                ->color('primary'),

            Stat::make('Produtos', BlissProduct::count())
                ->description('Produtos cadastrados')
                ->color('warning'),
        ];
    }
}