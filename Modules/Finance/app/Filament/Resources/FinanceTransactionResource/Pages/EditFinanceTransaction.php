<?php
namespace Modules\Finance\Filament\Resources\FinanceTransactionResource\Pages;
use Modules\Finance\Filament\Resources\FinanceTransactionResource;
use Filament\Resources\Pages\EditRecord;

class EditFinanceTransaction extends EditRecord
{
    protected static string $resource = FinanceTransactionResource::class;
}