<?php

namespace Modules\CRM\Filament\Widgets;

use Filament\Widgets\ChartWidget;
use Modules\CRM\Models\Lead;

class LeadsByStatusChart extends ChartWidget
{
    protected static ?string $heading = 'Leads por Status';

    protected function getData(): array
    {
        try {
            $statuses = Lead::getStatuses();
            $labels = array_values($statuses);
            $keys = array_keys($statuses);

            $data = [];
            foreach ($keys as $status) {
                $data[] = Lead::where('status', $status)->count();
            }

            return [
                'labels' => $labels,
                'datasets' => [
                    [
                        'label' => 'Leads',
                        'data' => $data,
                        'backgroundColor' => '#6366f1',
                    ],
                ],
            ];
        } catch (\Throwable $e) {
            return [
                'labels' => [],
                'datasets' => [
                    [
                        'label' => 'Leads',
                        'data' => [],
                        'backgroundColor' => '#6366f1',
                    ],
                ],
            ];
        }
    }

    protected function getType(): string
    {
        return 'bar';
    }

    public static function canView(): bool
    {
        $path = request()->path();
        return str_contains($path, 'crm/reports');
    }
}