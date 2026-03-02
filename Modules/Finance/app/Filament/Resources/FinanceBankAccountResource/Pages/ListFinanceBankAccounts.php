<?php
namespace Modules\Finance\Filament\Resources\FinanceBankAccountResource\Pages;
use Modules\Finance\Filament\Resources\FinanceBankAccountResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListFinanceBankAccounts extends ListRecords
{
    protected static string $resource = FinanceBankAccountResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
    protected function getHeaderActions(): array { return [Actions\CreateAction::make()]; }
}