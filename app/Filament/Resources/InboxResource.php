<?php

namespace App\Filament\Resources;

use App\Models\MessageRecipient;
use App\Filament\Resources\InboxResource\Pages;
use Filament\Resources\Resource;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Actions\Action;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Filament\Support\Enums\FontWeight;

class InboxResource extends Resource
{
    protected static ?string $model = MessageRecipient::class;
    
    protected static ?string $navigationIcon = 'heroicon-o-inbox';
    
    protected static ?string $navigationLabel = 'Caixa de Entrada';
    
    protected static ?string $modelLabel = 'Mensagem Recebida';
    
    protected static ?string $pluralModelLabel = 'Mensagens Recebidas';
    
    protected static ?string $navigationGroup = 'Comunicação';
    
    protected static ?int $navigationSort = 1;

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('message.sender.name')
                    ->label('Remetente')
                    ->searchable()
                    ->sortable()
                    ->weight(fn (MessageRecipient $record): FontWeight => 
                        $record->read_at ? FontWeight::Normal : FontWeight::Bold
                    ),
                
                TextColumn::make('message.subject')
                    ->label('Assunto')
                    ->searchable()
                    ->sortable()
                    ->limit(50)
                    ->weight(fn (MessageRecipient $record): FontWeight => 
                        $record->read_at ? FontWeight::Normal : FontWeight::Bold
                    ),
                
                TextColumn::make('message.priority')
                    ->label('Prioridade')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'low' => 'gray',
                        'normal' => 'primary',
                        'high' => 'warning',
                        'urgent' => 'danger',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'low' => 'Baixa',
                        'normal' => 'Normal',
                        'high' => 'Alta',
                        'urgent' => 'Urgente',
                    }),
                
                TextColumn::make('is_starred')
                    ->label('Estrela')
                    ->formatStateUsing(fn (bool $state): string => $state ? '⭐' : '')
                    ->alignCenter(),
                
                TextColumn::make('read_at')
                    ->label('Lida em')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('Não lida')
                    ->sortable(),
                
                TextColumn::make('message.sent_at')
                    ->label('Recebida em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->actions([
                Action::make('read')
                    ->label('Ler')
                    ->icon('heroicon-o-eye')
                    ->action(function (MessageRecipient $record) {
                        $record->markAsRead();
                    }),
                
                Action::make('star')
                    ->label(fn (MessageRecipient $record): string => 
                        $record->is_starred ? 'Remover Estrela' : 'Adicionar Estrela'
                    )
                    ->icon(fn (MessageRecipient $record): string => 
                        $record->is_starred ? 'heroicon-s-star' : 'heroicon-o-star'
                    )
                    ->color('warning')
                    ->action(fn (MessageRecipient $record) => $record->toggleStar()),
            ])
            ->defaultSort('message.sent_at', 'desc');
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->where('recipient_id', Auth::id())
            ->where('is_deleted', false)
            ->whereHas('message', function ($query) {
                $query->where('status', 'sent');
            });
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListInbox::route('/'),
        ];
    }
}