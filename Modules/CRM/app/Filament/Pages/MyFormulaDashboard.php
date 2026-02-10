<?php

namespace Modules\CRM\Filament\Pages;

use Filament\Pages\Dashboard;
use Modules\CRM\Filament\MyFormulaWidgets\MyFormulaStatsOverview;
use Modules\CRM\Filament\MyFormulaWidgets\MyFormulaLatestOrders;

class MyFormulaDashboard extends Dashboard
{
    protected static ?string $navigationIcon = 'heroicon-o-presentation-chart-line';
    protected static ?string $navigationGroup = 'MyFormula';
    protected static ?string $navigationLabel = 'Dashboard';
    protected static ?string $title = 'MyFormula - Visão Geral';
    protected static string $routePath = 'myformula-dashboard';
    protected static ?int $navigationSort = 1;

    public function getWidgets(): array
    {
        return [
            MyFormulaStatsOverview::class,
            MyFormulaLatestOrders::class,
        ];
    }
    
    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}