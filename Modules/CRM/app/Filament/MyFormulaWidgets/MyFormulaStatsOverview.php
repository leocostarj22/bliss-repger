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
            
            Stat::make('Receita Total', '€ ' . number_format(MyFormulaOrder::sum('total'), 2, ',', '.'))
                ->description('Soma total dos pedidos')
                ->color('success'),

            Stat::make('Clientes', MyFormulaCustomer::count())
                ->description('Total de clientes registrados')
                ->color('primary'),

            Stat::make('Produtos', MyFormulaProduct::count())
                ->description('Produtos cadastrados')
                ->color('warning'),
        ];
    }
}