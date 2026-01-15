<?php
namespace Modules\Finance\Filament\Resources\FinanceCostCenterResource\Pages;
use Modules\Finance\Filament\Resources\FinanceCostCenterResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListFinanceCostCenters extends ListRecords
{
    protected static string $resource = FinanceCostCenterResource::class;
    protected function getHeaderActions(): array { return [Actions\CreateAction::make()]; }
}