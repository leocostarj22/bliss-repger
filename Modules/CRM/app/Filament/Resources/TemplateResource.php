<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Models\Template;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Modules\CRM\Filament\Resources\TemplateResource\Pages;

class TemplateResource extends Resource
{
    protected static ?string $model = Template::class;
    protected static ?string $navigationIcon = 'heroicon-o-document-text';
    protected static ?string $navigationLabel = 'Templates';
    protected static ?string $navigationGroup = 'CRM';
    protected static ?int $navigationSort = 4;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')->label('Nome')->required()->maxLength(255),
            Forms\Components\Select::make('type')->label('Tipo')->options([
                'email' => 'Email',
                'sms' => 'SMS',
                'whatsapp' => 'WhatsApp',
            ])->required()->default('email'),
            Forms\Components\TextInput::make('subject')->label('Assunto')->maxLength(255),
            Forms\Components\Textarea::make('content')->label('Conteúdo')->rows(8)->columnSpanFull(),
            Forms\Components\Select::make('status')->label('Status')->options([
                'active' => 'Ativo',
                'inactive' => 'Inativo',
            ])->default('active'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->label('Nome')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('type')->label('Tipo')->sortable(),
                Tables\Columns\TextColumn::make('status')->label('Status')->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Criado em')->dateTime('d/m/Y H:i')->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('type')->label('Tipo')->options([
                    'email' => 'Email',
                    'sms' => 'SMS',
                    'whatsapp' => 'WhatsApp',
                ]),
                Tables\Filters\SelectFilter::make('status')->label('Status')->options([
                    'active' => 'Ativo',
                    'inactive' => 'Inativo',
                ]),
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
            'index' => Pages\ListTemplates::route('/'),
            'create' => Pages\CreateTemplate::route('/create'),
            'view' => Pages\ViewTemplate::route('/{record}'),
            'edit' => Pages\EditTemplate::route('/{record}/edit'),
        ];
    }
}