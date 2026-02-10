<?php

namespace Modules\CRM\Filament\Resources\MyFormulaProductResource\Pages;

use Modules\CRM\Filament\Resources\MyFormulaProductResource;
use Filament\Resources\Pages\EditRecord;

class EditMyFormulaProduct extends EditRecord
{
    protected static string $resource = MyFormulaProductResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}