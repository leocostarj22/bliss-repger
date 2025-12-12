<?php

namespace Modules\Products\Filament\Resources\ProductResource\Pages;

use Modules\Products\Filament\Resources\ProductResource;
use Modules\Products\Filament\Widgets\ProductStatsOverview;
use Filament\Resources\Pages\ListRecords;
use Filament\Actions;

class ListProducts extends ListRecords
{
    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('export_csv')
                ->label('Exportar CSV')
                ->color('primary')
                ->icon('heroicon-o-arrow-down-tray')
                ->action(function () {
                    $query = $this->getFilteredTableQuery();
                    $filename = 'produtos-' . now()->format('Ymd-His') . '.csv';

                    return response()->streamDownload(function () use ($query) {
                        $out = fopen('php://output', 'w');

                        // Escreve BOM para Excel reconhecer UTF-8
                        echo "\xEF\xBB\xBF";

                        // Cabeçalhos
                        fputcsv($out, [
                            'ID',
                            'Código',
                            'Nome',
                            'Descrição',
                            'Marca',
                            'Categoria',
                            'Custo',
                            'Preço',
                            'Favorito',
                            'Status',
                            'Criado em',
                        ], ';');

                        // Dados
                        $query->with(['brand', 'category'])->chunk(1000, function ($products) use ($out) {
                            foreach ($products as $product) {
                                fputcsv($out, [
                                    $product->id,
                                    $product->code,
                                    $product->name,
                                    $product->description,
                                    $product->brand?->name ?? '',
                                    $product->category?->name ?? '',
                                    number_format($product->cost, 2, ',', '.'),
                                    number_format($product->price, 2, ',', '.'),
                                    $product->is_favorite ? 'Sim' : 'Não',
                                    $product->status === 'active' ? 'Ativo' : 'Inativo',
                                    $product->created_at->format('d/m/Y H:i'),
                                ], ';');
                            }
                        });

                        fclose($out);
                    }, $filename, [
                        'Content-Type' => 'text/csv; charset=UTF-8',
                    ]);
                }),
            Actions\CreateAction::make()
        ];
    }

    protected function getHeaderWidgets(): array
    {
        return [ProductStatsOverview::class];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}