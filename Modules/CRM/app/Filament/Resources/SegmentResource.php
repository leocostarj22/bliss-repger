<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Models\Segment;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Modules\CRM\Filament\Resources\SegmentResource\Pages;

class SegmentResource extends Resource
{
    protected static ?string $model = Segment::class;
    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';
    protected static ?string $navigationLabel = 'Seguimentos';
    protected static ?string $navigationGroup = 'CRM';
    protected static ?int $navigationSort = 3;

    public static function getModelLabel(): string
    {
        return 'Seguimento';
    }

    public static function getPluralModelLabel(): string
    {
        return 'Seguimentos';   
    }

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')->label('Nome')->required()->maxLength(255),
            Forms\Components\Textarea::make('definition')->label('Definição')->rows(6),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->label('Nome')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Criado em')->dateTime('d/m/Y H:i')->sortable(),
            ])
            ->filters([
                Tables\Filters\TrashedFilter::make(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSegments::route('/'),
            'create' => Pages\CreateSegment::route('/create'),
            'view' => Pages\ViewSegment::route('/{record}'),
            'edit' => Pages\EditSegment::route('/{record}/edit'),
        ];
    }
}