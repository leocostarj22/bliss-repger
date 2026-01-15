<?php

namespace Modules\CRM\Filament\Resources\QuizResource\Pages;

use Modules\CRM\Filament\Resources\QuizResource;
use Modules\CRM\Filament\Resources\QuizResource\Widgets\QuizStatsOverview;
use Filament\Resources\Pages\ListRecords;
use Filament\Pages\Concerns\ExposesTableToWidgets;

class ListQuizzes extends ListRecords
{
    use ExposesTableToWidgets;

    protected static string $resource = QuizResource::class;

    protected function getHeaderWidgets(): array
    {
        return [
            QuizStatsOverview::class,
        ];
    }
}