<?php

namespace App\Filament\Employee\Pages;

use App\Models\Payroll;
use Filament\Pages\Page;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Actions\ViewAction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Contracts\View\View;

class MyPayrolls extends Page implements HasTable
{
    use InteractsWithTable;

    protected static ?string $navigationIcon = 'heroicon-o-banknotes';
    protected static string $view = 'filament.employee.pages.my-payrolls';
    protected static ?string $navigationLabel = 'Meus Holerites';
    protected static ?string $title = 'Meus Holerites';
    protected static ?int $navigationSort = 1;
    protected static ?string $navigationGroup = 'Pessoal';

    public function table(Table $table): Table
    {
        return $table
            ->query($this->getTableQuery())
            ->defaultPaginationPageSize(25)
            ->columns([
                TextColumn::make('reference_period')
                    ->label('Mês/Ano')
                    ->formatStateUsing(fn (Payroll $record) => 
                        str_pad($record->reference_month, 2, '0', STR_PAD_LEFT) . '/' . $record->reference_year
                    )
                    ->sortable(['reference_year', 'reference_month']),
                TextColumn::make('gross_total')
                    ->label('Salário Bruto')
                    ->money('EUR')
                    ->sortable(),
                TextColumn::make('net_total')
                    ->label('Salário Líquido')
                    ->money('EUR')
                    ->sortable(),
                TextColumn::make('created_at')
                    ->label('Gerado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->actions([
                ViewAction::make()
                    ->label('Ver Detalhes')
                    ->modalHeading(fn (Payroll $record) => "Holerite - " . str_pad($record->reference_month, 2, '0', STR_PAD_LEFT) . "/" . $record->reference_year)
                    ->modalContent(fn (Payroll $record): View => view('filament.employee.modals.payroll-details', ['payroll' => $record]))
            ])
            ->defaultSort('reference_year', 'desc')
            ->defaultSort('reference_month', 'desc');
    }

    protected function getTableQuery(): Builder
    {
        $employee = auth()->user()->employee;
        
        if (!$employee) {
            return Payroll::query()->whereRaw('1 = 0'); // Retorna query vazia
        }

        return Payroll::query()->where('employee_id', $employee->id);
    }
}