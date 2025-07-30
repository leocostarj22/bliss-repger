<?php

namespace App\Filament\Resources\EmployeeResource\Widgets;

use App\Models\Employee;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Carbon\Carbon;

class NewHiresWidget extends BaseWidget
{
    protected static ?string $heading = 'Novos Contratados (Últimos 30 dias)';
    
    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Employee::query()
                    ->where('hire_date', '>=', Carbon::now()->subDays(30))
                    ->where('status', 'active')
                    ->orderBy('hire_date', 'desc')
            )
            ->columns([
                Tables\Columns\ImageColumn::make('photo_path')
                    ->label('Foto')
                    ->circular()
                    ->defaultImageUrl(fn () => 'https://ui-avatars.com/api/?name=User&background=random'),
                    
                Tables\Columns\TextColumn::make('name')
                    ->label('Nome')
                    ->searchable()
                    ->sortable(),
                    
                Tables\Columns\TextColumn::make('position')
                    ->label('Cargo'),
                    
                Tables\Columns\TextColumn::make('department.name')
                    ->label('Departamento'),
                    
                Tables\Columns\TextColumn::make('hire_date')
                    ->label('Data de Admissão')
                    ->date('d/m/Y')
                    ->sortable(),
                    
                Tables\Columns\TextColumn::make('days_since_hire')
                    ->label('Dias na Empresa')
                    ->getStateUsing(function (Employee $record) {
                        return Carbon::parse($record->hire_date)->diffInDays(Carbon::now());
                    })
                    ->suffix(' dias'),
                    
                Tables\Columns\TextColumn::make('employment_type')
                    ->label('Tipo de Contrato')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'CLT' => 'success',
                        'PJ' => 'info',
                        'Intern' => 'warning',
                        'Temporary' => 'danger',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'CLT' => 'Sem Termo',
                        'PJ' => 'Prestação Serviços',
                        'Intern' => 'Estagiário',
                        'Temporary' => 'A Termo',
                        default => $state,
                    }),
            ])
            ->paginated(false)
            ->defaultSort('hire_date', 'desc');
    }
}