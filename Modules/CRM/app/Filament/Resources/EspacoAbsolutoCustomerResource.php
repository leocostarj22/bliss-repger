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
use Illuminate\Database\Eloquent\Builder;
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
                Forms\Components\Section::make('Primeira Interação')
                    ->schema([
                        Forms\Components\TextInput::make('first_message_subject')
                            ->label('Assunto')
                            ->disabled()
                            ->formatStateUsing(fn ($record) => $record->messages()->orderBy('data_added', 'asc')->first()?->subject),
                        Forms\Components\Textarea::make('first_message_content')
                            ->label('Mensagem')
                            ->disabled()
                            ->columnSpanFull()
                            ->formatStateUsing(fn ($record) => $record->messages()->orderBy('data_added', 'asc')->first()?->message),
                    ])
                    ->collapsed(),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            EspacoAbsolutoCustomerResource\RelationManagers\MessagesRelationManager::class,
        ];
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
                        'Nós ligamos!' => 'danger',
                        'Newsletter', 'Contactos' => 'gray',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('data_added')
                    ->dateTime()
                    ->sortable()
                    ->label('Cadastro'),
            ])
            ->defaultSort('iduser', 'desc')
            ->filters([
                Tables\Filters\Filter::make('data_added')
                    ->form([
                        Forms\Components\DatePicker::make('registered_from')
                            ->label('Registrado de'),
                        Forms\Components\DatePicker::make('registered_until')
                            ->label('Registrado até'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['registered_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('data_added', '>=', $date),
                            )
                            ->when(
                                $data['registered_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('data_added', '<=', $date),
                            );
                    }),
                Tables\Filters\SelectFilter::make('origin')
                    ->label('Origem')
                    ->options([
                        'Pergunta Grátis' => 'Pergunta Grátis',
                        'CTA Orações' => 'CTA Orações',
                        'CTA E-book' => 'CTA E-book',
                        'Tarot do Dia' => 'Tarot do Dia',
                        'Nós Ligamos' => 'Nós Ligamos',
                        'Contactos' => 'Contactos',
                        'Newsletter' => 'Newsletter',
                    ])
                    ->query(function (Builder $query, array $data) {
                        $value = $data['value'];
                        if (!$value) return $query;
                        
                        $map = [
                            'Nós Ligamos' => 'Nós ligamos!',
                        ];
                        
                        $dbValue = $map[$value] ?? $value;

                        return $query->whereHas('groups', function ($q) use ($dbValue) {
                            $q->where('nome', $dbValue);
                        });
                    }),
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