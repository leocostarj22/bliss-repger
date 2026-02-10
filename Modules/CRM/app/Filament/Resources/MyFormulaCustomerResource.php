<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Filament\Resources\MyFormulaCustomerResource\Pages;
use Modules\CRM\Models\MyFormulaCustomer;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

use Modules\CRM\Filament\Resources\MyFormulaCustomerResource\RelationManagers;

use Modules\CRM\Models\Contact;
use Filament\Notifications\Notification;
use Illuminate\Database\Eloquent\Collection;

class MyFormulaCustomerResource extends Resource
{
    protected static ?string $model = MyFormulaCustomer::class;

    protected static ?string $navigationIcon = 'heroicon-o-user-group';
    protected static ?string $navigationGroup = 'MyFormula';
    protected static ?string $navigationLabel = 'Clientes';
    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('firstname')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('lastname')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('email')
                    ->email()
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('telephone')
                    ->tel()
                    ->maxLength(255),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Nome')
                    ->searchable(['firstname', 'lastname']),
                Tables\Columns\TextColumn::make('email')
                    ->searchable()
                    ->icon('heroicon-m-envelope')
                    ->copyable()
                    ->url(fn ($record) => "mailto:{$record->email}"),
                Tables\Columns\TextColumn::make('telephone')
                    ->label('Telefone')
                    ->icon('heroicon-m-phone')
                    ->url(fn ($record) => "tel:{$record->telephone}"),
                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (bool $state): string => $state ? 'success' : 'danger')
                    ->formatStateUsing(fn (bool $state): string => $state ? 'Ativo' : 'Inativo'),
                Tables\Columns\TextColumn::make('date_added')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('customer_id', 'desc')
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                    Tables\Actions\BulkAction::make('import_to_crm')
                        ->label('Importar para CRM')
                        ->icon('heroicon-o-arrow-path')
                        ->requiresConfirmation()
                        ->action(function (Collection $records) {
                            $count = 0;
                            foreach ($records as $record) {
                                Contact::updateOrCreate(
                                    ['email' => $record->email],
                                    [
                                        'name' => $record->firstname . ' ' . $record->lastname,
                                        'phone' => $record->telephone,
                                        'source' => 'my_formula',
                                        'status' => 'lead',
                                    ]
                                );
                                $count++;
                            }
                            
                            Notification::make()
                                ->title("{$count} clientes importados para o CRM com sucesso!")
                                ->success()
                                ->send();
                        }),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\OrdersRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListMyFormulaCustomers::route('/'),
            'create' => Pages\CreateMyFormulaCustomer::route('/create'),
            'edit' => Pages\EditMyFormulaCustomer::route('/{record}/edit'),
        ];
    }
}