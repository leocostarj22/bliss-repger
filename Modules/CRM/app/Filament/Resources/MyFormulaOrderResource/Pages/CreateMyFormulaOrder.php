<?php

namespace Modules\CRM\Filament\Resources\MyFormulaOrderResource\Pages;

use Modules\CRM\Filament\Resources\MyFormulaOrderResource;
use Filament\Resources\Pages\CreateRecord;

class CreateMyFormulaOrder extends CreateRecord
{
    protected static string $resource = MyFormulaOrderResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
        
}
protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}