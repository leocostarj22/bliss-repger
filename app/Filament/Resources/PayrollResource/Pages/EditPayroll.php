<?php

namespace App\Filament\Resources\PayrollResource\Pages;

use App\Filament\Resources\PayrollResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Database\Eloquent\Model;

class EditPayroll extends EditRecord
{
    protected static string $resource = PayrollResource::class;

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
    
    protected function handleRecordUpdate(Model $record, array $data): Model
    {
        // Recalcular valores automaticamente se necessário
        if (empty($data['gross_pay'])) {
            $data['gross_pay'] = ($data['base_salary'] ?? 0) + 
                                ($data['overtime_amount'] ?? 0) + 
                                ($data['meal_allowance'] ?? 0) + 
                                ($data['transport_allowance'] ?? 0) + 
                                ($data['other_allowances'] ?? 0);
        }
        
        if (empty($data['net_pay'])) {
            $data['net_pay'] = $data['gross_pay'] - 
                              ($data['social_security'] ?? 0) - 
                              ($data['income_tax'] ?? 0) - 
                              ($data['other_deductions'] ?? 0);
        }
        
        $record->update($data);
        
        return $record;
    }
}