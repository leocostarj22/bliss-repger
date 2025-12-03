<?php

namespace Modules\CRM\Filament\Pages;

use Filament\Pages\Page;

class CRMReports extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-chart-bar';
    protected static ?string $navigationLabel = 'Relatórios CRM';
    protected static ?string $title = 'Relatórios CRM';
    protected static ?string $navigationGroup = 'CRM';
    protected static ?int $navigationSort = 10;
    protected static ?string $slug = 'crm/reports';
    protected static string $view = 'crm::filament.pages.crm-reports';

    protected function getHeaderWidgets(): array
    {
        $widgets = [
            \Modules\CRM\Filament\Widgets\CRMStatsOverview::class,
            \Modules\CRM\Filament\Widgets\LeadsByStatusChart::class,
        ];

        return array_values(array_filter($widgets, fn (string $w) => class_exists($w)));
    }
}