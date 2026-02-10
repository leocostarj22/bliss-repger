<?php

namespace Modules\CRM\Filament\Resources\SegmentResource\Pages;

use Modules\CRM\Filament\Resources\SegmentResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Actions;

class ListSegments extends ListRecords
{
    protected static string $resource = SegmentResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}