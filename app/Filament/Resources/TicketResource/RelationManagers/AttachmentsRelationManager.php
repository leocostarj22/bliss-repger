<?php

namespace App\Filament\Resources\TicketResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Storage;
use App\Models\TicketAttachment;
use Illuminate\Http\UploadedFile;

class AttachmentsRelationManager extends RelationManager
{
    protected static string $relationship = 'attachments';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\FileUpload::make('file_path')
                    ->label('Anexo')
                    ->disk('public')
                    ->directory('ticket-attachments')
                    ->acceptedFileTypes(TicketAttachment::getAllowedMimeTypes())
                    ->maxSize(TicketAttachment::getMaxFileSize() / 1024)
                    ->downloadable()
                    ->openable()
                    ->previewable()
                    ->required()
                    ->columnSpanFull()
                    ->afterStateUpdated(function ($state, $set) {
                        if ($state instanceof \Illuminate\Http\UploadedFile) {
                            $set('original_name', $state->getClientOriginalName());
                            $set('file_name', $state->hashName());
                            $set('mime_type', $state->getMimeType());
                            $set('file_size', $state->getSize());
                        }
                    }),
                    
                Forms\Components\Hidden::make('original_name'),
                Forms\Components\Hidden::make('file_name'),
                Forms\Components\Hidden::make('mime_type'),
                Forms\Components\Hidden::make('file_size'),
                Forms\Components\Hidden::make('user_id')
                    ->default(auth()->id()),
                Forms\Components\Hidden::make('disk')
                    ->default('public'),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('original_name')
            ->columns([
                Tables\Columns\TextColumn::make('original_name')
                    ->label('Nome do Arquivo')
                    ->searchable()
                    ->sortable(),
                    
                Tables\Columns\TextColumn::make('mime_type')
                    ->label('Tipo')
                    ->badge()
                    ->color(fn (string $state): string => match (true) {
                        str_starts_with($state, 'image/') => 'success',
                        $state === 'application/pdf' => 'danger',
                        str_starts_with($state, 'application/') => 'warning',
                        default => 'gray',
                    }),
                    
                Tables\Columns\TextColumn::make('formatted_size')
                    ->label('Tamanho')
                    ->sortable('file_size'),
                    
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Enviado por')
                    ->sortable(),
                    
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Data de Upload')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('mime_type')
                    ->label('Tipo de Arquivo')
                    ->options([
                        'image/jpeg' => 'JPEG',
                        'image/png' => 'PNG',
                        'image/gif' => 'GIF',
                        'application/pdf' => 'PDF',
                        'application/msword' => 'Word',
                        'text/plain' => 'Texto',
                    ]),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('Adicionar Anexo')
                    ->mutateFormDataUsing(function (array $data): array {
                        $data['user_id'] = auth()->id();
                        $data['disk'] = 'public';
                        return $data;
                    }),
            ])
            ->actions([
                Tables\Actions\Action::make('download')
                    ->label('Download')
                    ->icon('heroicon-o-arrow-down-tray')
                    ->url(fn ($record) => $record->getDownloadUrl())
                    ->openUrlInNewTab(),
                    
                Tables\Actions\Action::make('view')
                    ->label('Visualizar')
                    ->icon('heroicon-o-eye')
                    ->url(fn ($record) => $record->getUrl())
                    ->openUrlInNewTab()
                    ->visible(fn ($record) => $record->isImage() || $record->isPdf()),
                    
                Tables\Actions\DeleteAction::make()
                    ->label('Excluir'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
