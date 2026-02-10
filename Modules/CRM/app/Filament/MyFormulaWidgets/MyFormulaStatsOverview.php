<?php

namespace Modules\CRM\Filament\MyFormulaWidgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Modules\CRM\Models\MyFormulaOrder;
use Modules\CRM\Models\MyFormulaCustomer;
use Modules\CRM\Models\MyFormulaProduct;

class MyFormulaStatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Vendas Totais', MyFormulaOrder::count())
                ->description('Total de pedidos realizados')
                ->descriptionIcon('heroicon-m-shopping-cart')
                ->color('success'),
            
            Stat::make('Novos Clientes', MyFormulaCustomer::where('date_added', '>=', now()->subDays(30))->count())
                ->description('Últimos 30 dias')
                ->descriptionIcon('heroicon-m-user-group')
                ->color('primary'),

            Stat::make('Produtos Ativos', MyFormulaProduct::where('status', 1)->count())
                ->description('Em catálogo')
                ->descriptionIcon('heroicon-m-cube')
                ->color('warning'),
        ];
    }
}