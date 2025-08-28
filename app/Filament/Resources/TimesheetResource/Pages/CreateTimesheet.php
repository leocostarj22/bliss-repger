<?php

namespace App\Filament\Resources\TimesheetResource\Pages;

use App\Filament\Resources\TimesheetResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

class CreateTimesheet extends CreateRecord
{
    protected static string $resource = TimesheetResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Calcular horas trabalhadas
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
        
        // Definir status inicial
        $data['status'] = $data['status'] ?? 'pending';
        
        return $data;
    }

    protected function handleRecordCreation(array $data): Model
    {
        return static::getModel()::create($data);
    }
}