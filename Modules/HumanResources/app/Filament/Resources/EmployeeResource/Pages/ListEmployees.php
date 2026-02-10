<?php

namespace Modules\HumanResources\Filament\Resources\EmployeeResource\Pages;

use Modules\HumanResources\Filament\Resources\EmployeeResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListEmployees extends ListRecords
{
    protected static string $resource = EmployeeResource::class;

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
    
    protected function getHeaderWidgets(): array
    {
        return [
            EmployeeResource\Widgets\EmployeeStatsOverview::class,
            EmployeeResource\Widgets\EmployeeStatusWidget::class,
        ];
    }
    
    protected function getFooterWidgets(): array
    {
        return [
            EmployeeResource\Widgets\BirthdayWidget::class,
            EmployeeResource\Widgets\NewHiresWidget::class,
            EmployeeResource\Widgets\EmployeesByDepartmentChart::class,
            EmployeeResource\Widgets\EmploymentTypeChart::class,
        ];
    }

    protected function getRedirectUrl(): string
    {
        return static::getResource()::getUrl('index');
    }
}
