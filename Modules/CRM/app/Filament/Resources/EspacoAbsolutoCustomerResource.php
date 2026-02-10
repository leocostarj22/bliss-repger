<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Filament\Resources\EspacoAbsolutoCustomerResource\Pages;
use Modules\CRM\Models\EspacoAbsolutoCustomer;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Modules\CRM\Models\Contact;
use Filament\Notifications\Notification;
use Illuminate\Database\Eloquent\Collection;

class EspacoAbsolutoCustomerResource extends Resource
{
    protected static ?string $model = EspacoAbsolutoCustomer::class;

    protected static ?string $navigationIcon = 'heroicon-o-user-group';
    protected static ?string $navigationGroup = 'Espaço Absoluto';
    protected static ?string $navigationLabel = 'Clientes';
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('nome')
                    ->label('Nome')
                    ->required()
                    ->maxLength(128),
                Forms\Components\TextInput::make('email')
                    ->email()
                    ->maxLength(255),
                Forms\Components\TextInput::make('telefone')
                    ->tel()
                    ->maxLength(128),
                Forms\Components\TextInput::make('empresa')
                    ->maxLength(128),
                Forms\Components\DateTimePicker::make('data_added')
                    ->label('Cadastro')
                    ->disabled(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('nome')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('email')
                    ->searchable()
                    ->icon('heroicon-m-envelope')
                    ->copyable()
                    ->url(fn ($record) => "mailto:{$record->email}"),
                Tables\Columns\TextColumn::make('telefone')
                    ->searchable()
                    ->icon('heroicon-m-phone')
                    ->url(fn ($record) => "tel:{$record->telefone}"),
                Tables\Columns\TextColumn::make('origin')
                    ->label('Origem')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'Pergunta Grátis' => 'success',
                        'CTA Orações' => 'primary',
                        'CTA E-book' => 'info',
                        'Tarot do Dia' => 'warning',
                        'Nós Ligamos' => 'danger',
                        'Newsletters', 'Notícias' => 'gray',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('data_added')
                    ->dateTime()
                    ->sortable()
                    ->label('Cadastro'),
            ])
            ->defaultSort('iduser', 'desc')
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
                                if (!$record->email) continue;
                                Contact::updateOrCreate(
                                    ['email' => $record->email],
                                    [
                                        'name' => $record->nome,
                                        'phone' => $record->telefone,
                                        'source' => 'espaco_absoluto',
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

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListEspacoAbsolutoCustomers::route('/'),
        ];
    }
}