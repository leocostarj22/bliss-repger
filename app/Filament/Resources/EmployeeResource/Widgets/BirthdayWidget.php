<?php

namespace App\Filament\Resources\EmployeeResource\Widgets;

use App\Models\Employee;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Carbon\Carbon;

class BirthdayWidget extends BaseWidget
{
    protected static ?string $heading = 'Aniversariantes do Mês';
    
    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Employee::query()
                    ->whereMonth('birth_date', Carbon::now()->month)
                    ->where('status', 'active')
                    ->orderByRaw('DAY(birth_date) ASC')
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
                    
                Tables\Columns\TextColumn::make('birth_date')
                    ->label('Data de Nascimento')
                    ->date('d/m')
                    ->sortable(),
                    
                Tables\Columns\TextColumn::make('age')
                    ->label('Idade')
                    ->getStateUsing(function (Employee $record) {
                        return $record->birth_date ? Carbon::parse($record->birth_date)->age : null;
                    })
                    ->suffix(' anos'),
            ])
            ->paginated(false)
            ->defaultSort('birth_date', 'asc');
    }
}