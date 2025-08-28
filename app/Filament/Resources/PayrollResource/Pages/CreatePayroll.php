<?php

namespace App\Filament\Resources\PayrollResource\Pages;

use App\Filament\Resources\PayrollResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

class CreatePayroll extends CreateRecord
{
    protected static string $resource = PayrollResource::class;
    
    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
    
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['created_by'] = auth()->id();
        
        return $data;
    }
    
    protected function handleRecordCreation(array $data): Model
    {
        // Calcular valores automaticamente se não fornecidos
        if (empty($data['gross_total'])) {
            $data['gross_total'] = ($data['base_salary'] ?? 0) + 
                                  ($data['overtime_amount'] ?? 0) + 
                                  ($data['holiday_allowance'] ?? 0) + 
                                  ($data['christmas_allowance'] ?? 0) + 
                                  ($data['meal_allowance'] ?? 0) + 
                                  ($data['transport_allowance'] ?? 0) + 
                                  ($data['other_allowances'] ?? 0);
        }
        
        if (empty($data['total_deductions'])) {
            $data['total_deductions'] = ($data['social_security_employee'] ?? 0) + 
                                       ($data['irs_withholding'] ?? 0) + 
                                       ($data['union_fee'] ?? 0) + 
                                       ($data['other_deductions'] ?? 0);
        }
        
        if (empty($data['net_total'])) {
            $data['net_total'] = $data['gross_total'] - $data['total_deductions'];
        }
        
        return static::getModel()::create($data);
    }
}