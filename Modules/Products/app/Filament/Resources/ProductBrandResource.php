<?php

namespace Modules\Products\Filament\Resources;

use Modules\Products\Models\ProductBrand;
use Filament\Resources\Resource;
use Filament\Forms\Form;
use Filament\Tables\Table;
use Filament\Forms;
use Filament\Tables;
use Illuminate\Database\Eloquent\Builder;

class ProductBrandResource extends Resource
{
    protected static ?string $model = ProductBrand::class;
    protected static ?string $navigationIcon = 'heroicon-o-bookmark';
    protected static ?string $navigationLabel = 'Marcas';
    protected static ?string $navigationGroup = 'Catálogo';

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')->label('Nome')->required()->maxLength(255),
            Forms\Components\TextInput::make('description')->label('Descrição')->maxLength(255),
            Forms\Components\Toggle::make('is_active')->label('Ativa')->default(true),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            Tables\Columns\TextColumn::make('name')->label('Nome')->searchable()->sortable(),
            Tables\Columns\IconColumn::make('is_active')->label('Ativa')->boolean(),
            Tables\Columns\TextColumn::make('created_at')->label('Criado em')->dateTime('d/m/Y H:i')->sortable()->toggleable(isToggledHiddenByDefault: true),
        ])->filters([])->actions([
            Tables\Actions\EditAction::make()->label('Editar'),
        ])->bulkActions([
            Tables\Actions\DeleteBulkAction::make()->label('Eliminar'),
        ]);
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        $user = auth()->user();
        if ($user && $user->company_id) {
            $query->where('company_id', $user->company_id);
        } else {
            $query->whereRaw('1=0');
        }
        return $query;
    }

    public static function getPages(): array
    {
        return [
            'index' => ProductBrandResource\Pages\ListProductBrands::route('/'),
            'create' => ProductBrandResource\Pages\CreateProductBrand::route('/create'),
            'edit' => ProductBrandResource\Pages\EditProductBrand::route('/{record}/edit'),
        ];
    }
}