<?php

namespace Modules\CRM\Filament\Resources\EspacoAbsolutoCustomerResource\Pages;

use Modules\CRM\Filament\Resources\EspacoAbsolutoCustomerResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListEspacoAbsolutoCustomers extends ListRecords
{
    protected static string $resource = EspacoAbsolutoCustomerResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // Actions\CreateAction::make(), // Desativado até criarmos a página de criação
        ];
    }
}