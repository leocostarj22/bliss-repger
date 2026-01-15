<?php
namespace Modules\Finance\Filament\Resources\FinanceTransactionResource\Pages;
use Modules\Finance\Filament\Resources\FinanceTransactionResource;
use Filament\Resources\Pages\CreateRecord;

class CreateFinanceTransaction extends CreateRecord
{
    protected static string $resource = FinanceTransactionResource::class;
}