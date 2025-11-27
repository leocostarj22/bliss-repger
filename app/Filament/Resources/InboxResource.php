<?php

namespace App\Filament\Resources;

use App\Models\MessageRecipient;
use App\Filament\Resources\InboxResource\Pages;
use Filament\Resources\Resource;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Actions\Action;
use Illuminate\Database\Eloquent\Builder;
use App\Models\InternalMessage;
use Filament\Support\Enums\FontWeight;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\Section;
use Filament\Tables\Actions\ViewAction;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Hidden;
use Illuminate\Support\Facades\Auth;
use Filament\Forms\Form;

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
            ->modifyQueryUsing(fn (\Illuminate\Database\Eloquent\Builder $query) => $query->with(['message','message.sender']))
            ->columns([
                TextColumn::make('message.sender.name')
                    ->label('Remetente')
                    ->searchable()
                    ->sortable()
                    ->weight(fn (MessageRecipient $record): string => 
                        $record->read_at ? 'font-normal' : 'font-bold'
                    ),
                
                TextColumn::make('message.subject')
                    ->label('Assunto')
                    ->searchable()
                    ->sortable()
                    ->limit(50)
                    ->weight(fn (MessageRecipient $record): string => 
                        $record->read_at ? 'font-normal' : 'font-bold'
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
                    ->label('Ler Mensagem')
                    ->icon('heroicon-o-eye')
                    ->modalHeading(fn (MessageRecipient $record): string => $record->message->subject)
                    ->modalWidth('4xl')
                    ->infolist([
                        Section::make('Detalhes da Mensagem')
                            ->schema([
                                TextEntry::make('message.sender.name')
                                    ->label('De')
                                    ->formatStateUsing(fn ($state, $record) => $record->message?->sender?->name ?? 'Remetente desconhecido'),
                                TextEntry::make('message.priority')
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
                                TextEntry::make('message.sent_at')
                                    ->label('Enviada em')
                                    ->dateTime('d/m/Y H:i'),
                            ])
                            ->columns(3),
                        Section::make('Conteúdo')
                            ->schema([
                                TextEntry::make('message.body')
                                    ->label('')
                                    ->html()
                                    ->columnSpanFull(),
                            ])
                    ])
                    ->after(function (MessageRecipient $record) {
                        $record->markAsRead();
                    }),
                
                Action::make('reply')
                    ->label('Responder')
                    ->icon('heroicon-o-arrow-uturn-left')
                    ->color('primary')
                    ->form([
                        Hidden::make('original_message_id')
                            ->default(fn (MessageRecipient $record) => $record->message_id),
                        
                        TextInput::make('subject')
                            ->label('Assunto')
                            ->default(fn (MessageRecipient $record) => 'Re: ' . $record->message->subject)
                            ->required()
                            ->maxLength(255),
                        
                        RichEditor::make('body')
                            ->label('Mensagem')
                            ->required()
                            ->columnSpanFull(),
                    ])
                    ->action(function (MessageRecipient $record, array $data) {
                        // Criar nova mensagem como resposta
                        $reply = InternalMessage::create([
                            'subject' => $data['subject'],
                            'body' => $data['body'],
                            'priority' => 'normal',
                            'status' => 'sent',
                            'sender_id' => Auth::id(),
                            'sent_at' => now(),
                        ]);
                        
                        // Adicionar o remetente original como destinatário
                        MessageRecipient::create([
                            'message_id' => $reply->id,
                            'recipient_id' => $record->message->sender_id,
                            'type' => 'to',
                        ]);
                        
                        // Marcar mensagem original como lida
                        $record->markAsRead();
                        
                        // Notificação de sucesso
                        \Filament\Notifications\Notification::make()
                            ->title('Resposta enviada com sucesso!')
                            ->success()
                            ->send();
                    })
                    ->modalHeading('Responder Mensagem')
                    ->modalWidth('4xl'),
                
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