<?php

namespace App\Filament\Employee\Resources\TicketResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Components\RichEditor;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Auth;

class CommentsRelationManager extends RelationManager
{
    protected static string $relationship = 'comments';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                RichEditor::make('comment')
                    ->label('Comentário')
                    ->required()
                    ->toolbarButtons([
                        'attachFiles',
                        'blockquote',
                        'bold',
                        'bulletList',
                        'codeBlock',
                        'h2',
                        'h3',
                        'italic',
                        'link',
                        'orderedList',
                        'redo',
                        'strike',
                        'underline',
                        'undo',
                    ]),                   
                Forms\Components\Hidden::make('user_id')
                    ->default(auth('employee')->id()),
                Forms\Components\Hidden::make('user_type')
                    ->default(\App\Models\EmployeeUser::class),
            ])
            ->columns(1);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('comment')
            ->columns([
                Tables\Columns\TextColumn::make('comment')
                    ->label('Comentário')
                    ->html()
                    ->limit(50)
                    ->wrap(),
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Usuário')
                    ->formatStateUsing(fn ($state, $record) => $record->user?->name ?? 'Usuário desconhecido')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Data')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->filters([
                //
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('Adicionar Comentário')
                    ->mutateFormDataUsing(function (array $data): array {
                        $data['user_id'] = auth('employee')->id();
                        $data['user_type'] = \App\Models\EmployeeUser::class;
                        return $data;
                    }),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->visible(fn ($record) => $record->user_id === auth('employee')->id()),
                Tables\Actions\DeleteAction::make()
                    ->visible(fn ($record) => $record->user_id === auth('employee')->id()),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }
}