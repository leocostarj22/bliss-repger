<?php

namespace App\Filament\Resources;

use App\Filament\Resources\InternalMessageResource\Pages;
use App\Models\InternalMessage;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Filament\Support\Enums\FontWeight;
use Filament\Tables\Columns\TextColumn;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\FileUpload;
use Filament\Tables\Actions\Action;
use Illuminate\Support\Facades\Auth;

class InternalMessageResource extends Resource
{
    protected static ?string $model = InternalMessage::class;

    protected static ?string $navigationIcon = 'heroicon-o-envelope';
    
    protected static ?string $navigationLabel = 'Mensagens Internas';
    
    protected static ?string $modelLabel = 'Mensagem';
    
    protected static ?string $pluralModelLabel = 'Mensagens';
    
    protected static ?string $navigationGroup = 'Comunicação';
    
    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Detalhes da Mensagem')
                    ->schema([
                        TextInput::make('subject')
                            ->label('Assunto')
                            ->required()
                            ->maxLength(255),
                        
                        Select::make('priority')
                            ->label('Prioridade')
                            ->options([
                                'low' => 'Baixa',
                                'normal' => 'Normal',
                                'high' => 'Alta',
                                'urgent' => 'Urgente',
                            ])
                            ->default('normal')
                            ->required(),
                        
                        RichEditor::make('body')
                            ->label('Mensagem')
                            ->required()
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
                
                Forms\Components\Section::make('Destinatários')
                    ->schema([
                        Select::make('recipients')
                            ->label('Para')
                            ->multiple()
                            ->searchable()
                            ->options(User::where('id', '!=', Auth::id())->pluck('name', 'id'))
                            ->required()
                            ->columnSpanFull(),
                        
                        Select::make('cc_recipients')
                            ->label('CC (Cópia)')
                            ->multiple()
                            ->searchable()
                            ->options(User::where('id', '!=', Auth::id())->pluck('name', 'id'))
                            ->columnSpanFull(),
                        
                        Select::make('bcc_recipients')
                            ->label('BCC (Cópia Oculta)')
                            ->multiple()
                            ->searchable()
                            ->options(User::where('id', '!=', Auth::id())->pluck('name', 'id'))
                            ->columnSpanFull(),
                    ]),
                
                Forms\Components\Section::make('Anexos')
                    ->schema([
                        FileUpload::make('attachments')
                            ->label('Anexos')
                            ->multiple()
                            ->directory('message-attachments')
                            ->maxSize(10240) // 10MB
                            ->acceptedFileTypes(['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultPaginationPageSize(25)
            ->columns([
                TextColumn::make('subject')
                    ->label('Assunto')
                    ->searchable()
                    ->sortable()
                    ->weight('font-medium')
                    ->limit(50),
                
                TextColumn::make('priority')
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
                
                TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'draft' => 'gray',
                        'sent' => 'success',
                        'archived' => 'warning',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'draft' => 'Rascunho',
                        'sent' => 'Enviada',
                        'archived' => 'Arquivada',
                    }),
                
                TextColumn::make('recipients.recipient.name')
                    ->label('Destinatários')
                    ->formatStateUsing(function ($record) {
                        $names = $record->recipients->pluck('recipient.name')->filter()->toArray();
                        if (count($names) === 0) {
                            return 'Nenhum destinatário';
                        }
                        if (count($names) === 1) {
                            return $names[0];
                        }
                        if (count($names) <= 3) {
                            return implode(', ', $names);
                        }
                        return implode(', ', array_slice($names, 0, 2)) . ' e mais ' . (count($names) - 2) . ' outros';
                    })
                    ->searchable()
                    ->sortable(false)
                    ->wrap(),
                
                TextColumn::make('sent_at')
                    ->label('Enviada em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->placeholder('Não enviada'),
                
                TextColumn::make('created_at')
                    ->label('Criada em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'draft' => 'Rascunho',
                        'sent' => 'Enviada',
                        'archived' => 'Arquivada',
                    ]),
                
                Tables\Filters\SelectFilter::make('priority')
                    ->label('Prioridade')
                    ->options([
                        'low' => 'Baixa',
                        'normal' => 'Normal',
                        'high' => 'Alta',
                        'urgent' => 'Urgente',
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Action::make('send')
                    ->label('Enviar')
                    ->icon('heroicon-o-paper-airplane')
                    ->color('success')
                    ->visible(fn (InternalMessage $record): bool => $record->status === 'draft')
                    ->action(function (InternalMessage $record) {
                        $record->update([
                            'status' => 'sent',
                            'sent_at' => now(),
                        ]);
                    })
                    ->requiresConfirmation(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->where('sender_id', Auth::id())
            ->with(['recipients.recipient']);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListInternalMessages::route('/'),
            'create' => Pages\CreateInternalMessage::route('/create'),
            'view' => Pages\ViewInternalMessage::route('/{record}'),
            'edit' => Pages\EditInternalMessage::route('/{record}/edit'),
        ];
    }
}