<?php

namespace App\Filament\Employee\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class EmployeeInfoWidget extends BaseWidget
{
    protected static ?int $sort = 1;
    
    protected function getStats(): array
    {
        $employeeUser = Auth::user();
        $employee = $employeeUser->employee;
        
        if (!$employee) {
            return [];
        }
        
        $stats = [
            Stat::make('Departamento', $employee->department->name ?? 'N/A')
                ->description('Seu departamento atual')
                ->descriptionIcon('heroicon-m-building-office-2')
                ->color('primary'),
                
            Stat::make('Cargo', $employee->position)
                ->description('Sua função na empresa')
                ->descriptionIcon('heroicon-m-briefcase')
                ->color('success'),
                
            Stat::make('Tempo na Empresa', $this->getTimeInCompany($employee))
                ->description('Desde a sua admissão')
                ->descriptionIcon('heroicon-m-calendar-days')
                ->color('info'),
        ];
        
        // Adicionar card de aniversário se estiver próximo (30 dias)
        if ($employee->birth_date) {
            $birthday = Carbon::parse($employee->birth_date);
            $nextBirthday = $birthday->copy()->year(Carbon::now()->year);
            
            if ($nextBirthday->isPast()) {
                $nextBirthday->addYear();
            }
            
            $daysUntilBirthday = Carbon::now()->diffInDays($nextBirthday);
            
            if ($daysUntilBirthday <= 30) {
                $stats[] = Stat::make('Aniversário', $daysUntilBirthday . ' dias')
                    ->description($nextBirthday->format('d/m/Y'))
                    ->descriptionIcon('heroicon-m-cake')
                    ->color('warning');
            }
        }
        
        return $stats;
    }
    
    private function getTimeInCompany($employee): string
    {
        if (!$employee->hire_date) {
            return 'N/A';
        }
        
        $hireDate = Carbon::parse($employee->hire_date);
        $now = Carbon::now();
        
        $totalMonths = $hireDate->diffInMonths($now);
        $years = intval($totalMonths / 12);
        $months = $totalMonths % 12;
        
        if ($years > 0) {
            $result = $years . ' ano' . ($years > 1 ? 's' : '');
            if ($months > 0) {
                $result .= ' e ' . $months . ' ' . ($months > 1 ? 'meses' : 'mês');
            }
            return $result;
        } else {
            return $months . ' ' . ($months > 1 ? 'meses' : 'mês');
        }
    }
}