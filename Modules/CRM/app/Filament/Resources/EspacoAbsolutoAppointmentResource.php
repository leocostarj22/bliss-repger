<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Filament\Resources\EspacoAbsolutoAppointmentResource\Pages;
use Modules\CRM\Models\EspacoAbsolutoAppointment;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class EspacoAbsolutoAppointmentResource extends Resource
{
    protected static ?string $model = EspacoAbsolutoAppointment::class;

    protected static ?string $navigationIcon = 'heroicon-o-calendar';
    protected static ?string $navigationGroup = 'Espaço Absoluto';
    protected static ?string $navigationLabel = 'Agendamentos';
    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->label('Nome do Cliente')
                    ->maxLength(150),
                Forms\Components\TextInput::make('email')
                    ->email()
                    ->maxLength(250),
                Forms\Components\TextInput::make('phone')
                    ->tel()
                    ->maxLength(20),
                Forms\Components\DateTimePicker::make('date_from')
                    ->label('Início'),
                Forms\Components\DateTimePicker::make('date_to')
                    ->label('Fim'),
                Forms\Components\TextInput::make('value')
                    ->label('Valor')
                    ->numeric()
                    ->prefix('€'),
                Forms\Components\Textarea::make('observations')
                    ->label('Observações')
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Cliente')
                    ->searchable(),
                Tables\Columns\TextColumn::make('date_from')
                    ->dateTime()
                    ->sortable()
                    ->label('Data'),
                Tables\Columns\TextColumn::make('channel')
                    ->badge()
                    ->label('Canal'),
                Tables\Columns\TextColumn::make('value')
                    ->money('EUR')
                    ->label('Valor'),
                Tables\Columns\TextColumn::make('status')
                    ->sortable(),
            ])
            ->defaultSort('date_from', 'desc')
            ->actions([
                Tables\Actions\EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListEspacoAbsolutoAppointments::route('/'),
        ];
    }
}