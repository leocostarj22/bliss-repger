<?php

namespace Modules\CRM\Filament\Resources\SegmentResource\Pages;

use Modules\CRM\Filament\Resources\SegmentResource;
use Filament\Resources\Pages\ViewRecord;

class ViewSegment extends ViewRecord
{
    protected static string $resource = SegmentResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}