<?php
namespace Modules\Finance\Filament\Resources\FinanceTransactionResource\Pages;
use Modules\Finance\Filament\Resources\FinanceTransactionResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListFinanceTransactions extends ListRecords
{
    protected static string $resource = FinanceTransactionResource::class;
    protected function getHeaderActions(): array { return [Actions\CreateAction::make()]; }
}