<?php

namespace Modules\CRM\Filament\Pages;

use Filament\Pages\Dashboard;
use Modules\CRM\Filament\BlissWidgets\BlissStatsOverview;
use Modules\CRM\Filament\BlissWidgets\BlissLatestOrders;
use Modules\CRM\Filament\BlissWidgets\BlissLatestCustomers;

class BlissDashboard extends Dashboard
{
    protected static ?string $navigationIcon = 'heroicon-o-presentation-chart-line';
    protected static ?string $navigationGroup = 'Bliss Natura';
    protected static ?string $navigationLabel = 'Dashboard';
    protected static ?string $title = 'Bliss Natura - Visão Geral';
    protected static string $routePath = 'bliss-dashboard';
    protected static ?int $navigationSort = 0;

    public function getWidgets(): array
    {
        return [
            BlissStatsOverview::class,
            BlissLatestOrders::class,
            BlissLatestCustomers::class,
        ];
    }
    
    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}