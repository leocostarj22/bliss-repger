<?php

namespace Modules\CRM\Filament\Resources\BlissOrderResource\Pages;

use Modules\CRM\Filament\Resources\BlissOrderResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListBlissOrders extends ListRecords
{
    protected static string $resource = BlissOrderResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // Pedidos geralmente vêm da loja, mas se necessário descomente abaixo:
            // Actions\CreateAction::make(),
        ];
    }

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}