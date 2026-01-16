<?php

namespace Modules\HumanResources\Filament\Resources\TimesheetResource\Pages;

use Modules\HumanResources\Filament\Resources\TimesheetResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditTimesheet extends EditRecord
{
    protected static string $resource = TimesheetResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make()
                ->label('Visualizar'),
            Actions\DeleteAction::make()
                ->label('Excluir'),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        // Recalcular horas trabalhadas se os horários foram alterados
        if (isset($data['clock_in']) && isset($data['clock_out'])) {
            $clockIn = \Carbon\Carbon::parse($data['clock_in']);
            $clockOut = \Carbon\Carbon::parse($data['clock_out']);
            
            $totalMinutes = $clockOut->diffInMinutes($clockIn);
            
            // Subtrair tempo de almoço se fornecido
            if (isset($data['lunch_break_minutes']) && $data['lunch_break_minutes'] > 0) {
                $totalMinutes -= $data['lunch_break_minutes'];
            }
            
            $data['hours_worked'] = round($totalMinutes / 60, 2);
            
            // Calcular horas extras (assumindo 8 horas como padrão)
            $standardHours = 8;
            $data['overtime_hours'] = max(0, $data['hours_worked'] - $standardHours);
        }
        
        return $data;
    }
}