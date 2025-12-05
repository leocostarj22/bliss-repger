<?php

namespace Modules\Products\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class ProductStatsOverview extends StatsOverviewWidget
{
    protected static ?string $pollingInterval = null;

    protected function getStats(): array
    {
        $user = auth()->user();
        $companyId = $user?->company_id;

        $counts = [
            'products' => 0,
            'active' => 0,
            'favorite' => 0,
            'brands' => 0,
            'categories' => 0,
        ];

        if ($companyId) {
            try {
                $counts['products'] = \Modules\Products\Models\Product::where('company_id', $companyId)->count();
                $counts['active'] = \Modules\Products\Models\Product::where('company_id', $companyId)->where('status', 'active')->count();
                $counts['favorite'] = \Modules\Products\Models\Product::where('company_id', $companyId)->where('is_favorite', true)->count();
                $counts['brands'] = \Modules\Products\Models\ProductBrand::where('company_id', $companyId)->count();
                $counts['categories'] = \Modules\Products\Models\ProductCategory::where('company_id', $companyId)->count();
            } catch (\Throwable $e) {
            }
        }

        return [
            Stat::make('Produtos', (string) $counts['products']),
            Stat::make('Ativos', (string) $counts['active']),
            Stat::make('Favoritos', (string) $counts['favorite']),
            Stat::make('Marcas', (string) $counts['brands']),
            Stat::make('Categorias', (string) $counts['categories']),
        ];
    }

   

    public static function canView(): bool
    {
        $path = request()->path();
        return str_contains($path, 'admin/products');
    }
}