<?php

namespace Modules\CRM\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Modules\CRM\Models\Lead;
use Modules\CRM\Models\Campaign;
use Modules\CRM\Models\Delivery;

class CRMStatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        try {
            $leadsTotal = Lead::count();
            $leadsQualified = Lead::where('status', 'qualified')->count();
            $leadsWon = Lead::where('status', 'won')->count();
            $leadsLost = Lead::where('status', 'lost')->count();

            $campaignsTotal = Campaign::count();

            $sent = Delivery::where('status', 'sent')->count();
            $opened = Delivery::whereNotNull('opened_at')->count();
            $clicked = Delivery::whereNotNull('clicked_at')->count();

            $openRate = $sent > 0 ? round(($opened / $sent) * 100, 1) : 0.0;
            $clickRate = $opened > 0 ? round(($clicked / $opened) * 100, 1) : 0.0;

            return [
                Stat::make('Leads', $leadsTotal)->color('primary'),
                Stat::make('Qualificados', $leadsQualified)->color('warning'),
                Stat::make('Ganhos', $leadsWon)->color('success'),
                Stat::make('Perdidos', $leadsLost)->color('danger'),
                Stat::make('Campanhas', $campaignsTotal)->color('primary'),
                Stat::make('Abertura', $openRate . '%')->color('success'),
                Stat::make('Clique', $clickRate . '%')->color('success'),
            ];
        } catch (\Throwable $e) {
            return [
                Stat::make('Leads', 0)->color('primary'),
                Stat::make('Qualificados', 0)->color('warning'),
                Stat::make('Ganhos', 0)->color('success'),
                Stat::make('Perdidos', 0)->color('danger'),
                Stat::make('Campanhas', 0)->color('primary'),
                Stat::make('Abertura', '0%')->color('success'),
                Stat::make('Clique', '0%')->color('success'),
            ];
        }
    }

    protected static ?string $pollingInterval = null;
    protected static bool $isLazy = false;

    public static function canView(): bool
    {
        $path = request()->path();
        return str_contains($path, 'crm/reports');
    }
}