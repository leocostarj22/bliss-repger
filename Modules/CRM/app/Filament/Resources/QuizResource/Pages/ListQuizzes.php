<?php

namespace Modules\CRM\Filament\Resources\QuizResource\Pages;

use Modules\CRM\Filament\Resources\QuizResource;
use Modules\CRM\Filament\Resources\QuizResource\Widgets\QuizStatsOverview;
use Filament\Resources\Pages\ListRecords;

class ListQuizzes extends ListRecords
{
    protected static string $resource = QuizResource::class;

    protected function getHeaderWidgets(): array
    {
        return [
            QuizStatsOverview::class,
        ];
    }
}