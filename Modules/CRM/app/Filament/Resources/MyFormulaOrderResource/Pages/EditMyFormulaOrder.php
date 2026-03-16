<?php

namespace Modules\CRM\Filament\Resources\MyFormulaOrderResource\Pages;

use Modules\CRM\Filament\Resources\MyFormulaOrderResource;
use Filament\Resources\Pages\EditRecord;
use Filament\Actions;

class EditMyFormulaOrder extends EditRecord
{
    protected static string $resource = MyFormulaOrderResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
        
}
protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('print_purchase_report')
                ->label('Imprimir Relatório')
                ->icon('heroicon-o-printer')
                ->url(fn () => route('crm.myformula.purchase-report', ['order' => $this->record->order_id]))
                ->openUrlInNewTab(),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}