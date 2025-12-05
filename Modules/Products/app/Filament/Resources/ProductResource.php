<?php

namespace Modules\Products\Filament\Resources;

use Modules\Products\Models\Product;
use Filament\Resources\Resource;
use Filament\Forms\Form;
use Filament\Tables\Table;
use Filament\Forms;
use Filament\Tables;
use Filament\Forms\Components\TagsInput;
use Illuminate\Database\Eloquent\Builder;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;
    protected static ?string $navigationIcon = 'heroicon-o-cube';
    protected static ?string $navigationLabel = 'Produtos';
    protected static ?string $navigationGroup = 'Catálogo';

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('code')
                ->label('Código')->required()->maxLength(255)
                ->unique(table: 'products', column: 'code', ignoreRecord: true, modifyRuleUsing: fn (\Illuminate\Validation\Rules\Unique $rule) => $rule->where('company_id', auth()->user()?->company_id)),
            Forms\Components\TextInput::make('name')->label('Nome')->required()->maxLength(255),
            Forms\Components\FileUpload::make('image')
                ->label('Imagem')
                ->image()
                ->directory('products')
                ->columnSpanFull(),
            Forms\Components\Textarea::make('description')->label('Descrição')->rows(4),
            Forms\Components\Select::make('brand_id')
                ->label('Marca')
                ->relationship('brand', 'name', modifyQueryUsing: fn (Builder $query) => $query->where('company_id', auth()->user()->company_id))
                ->searchable()->preload()->nullable(),
            Forms\Components\Select::make('category_id')
                ->label('Categoria')
                ->relationship('category', 'name', modifyQueryUsing: fn (Builder $query) => $query->where('company_id', auth()->user()->company_id))
                ->searchable()->preload()->nullable(),
            Forms\Components\TextInput::make('cost')->label('Custo')->numeric()->minValue(0)->default(0),
            Forms\Components\TextInput::make('price')->label('Preço')->numeric()->minValue(0)->required(),
            Forms\Components\Toggle::make('is_favorite')->label('Favorito')->default(false),
            TagsInput::make('tags')->label('Etiquetas')->suggestions([])->separator(',')->nullable(),
            Forms\Components\Select::make('status')->label('Estado')->options([
                'active' => 'Ativo',
                'inactive' => 'Inativo',
            ])->default('active'),
        ])->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            Tables\Columns\ImageColumn::make('image')->label('Imagem'),
            Tables\Columns\TextColumn::make('code')->label('Código')->searchable()->sortable(),
            Tables\Columns\TextColumn::make('name')->label('Nome')->searchable()->sortable(),
            Tables\Columns\TextColumn::make('brand.name')->label('Marca')->sortable()->toggleable(),
            Tables\Columns\TextColumn::make('category.name')->label('Categoria')->sortable()->toggleable(),
            Tables\Columns\TextColumn::make('price')->label('Preço')->money('EUR', true)->sortable(),
            Tables\Columns\IconColumn::make('is_favorite')->label('Favorito')->boolean(),
            Tables\Columns\BadgeColumn::make('status')->label('Estado')->colors([
                'success' => 'active',
                'gray' => 'inactive',
            ])->sortable(),
            Tables\Columns\TextColumn::make('created_at')->label('Criado em')->dateTime('d/m/Y H:i')->sortable()->toggleable(isToggledHiddenByDefault: true),
        ])->filters([])->actions([
            Tables\Actions\ViewAction::make()->label('Ver'),
            Tables\Actions\EditAction::make()->label('Editar'),
            Tables\Actions\DeleteAction::make()->label('Eliminar'),
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
            'index' => ProductResource\Pages\ListProducts::route('/'),
            'create' => ProductResource\Pages\CreateProduct::route('/create'),
            'edit' => ProductResource\Pages\EditProduct::route('/{record}/edit'),
        ];
    }
}