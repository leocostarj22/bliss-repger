<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Models\Campaign;
use Modules\CRM\Models\Segment;
use Modules\CRM\Models\Template;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\Section;
use Filament\Infolists\Components\TextEntry;
use Modules\CRM\Filament\Resources\CampaignResource\Pages;

class CampaignResource extends Resource
{
    protected static ?string $model = Campaign::class;
    protected static ?string $navigationIcon = 'heroicon-o-megaphone';
    protected static ?string $navigationLabel = 'Campanhas';
    protected static ?string $navigationGroup = 'CRM';
    protected static ?int $navigationSort = 5;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')->label('Nome')->required()->maxLength(255),
            Forms\Components\Select::make('channel')->label('Canal')->options([
                'email' => 'Email',
                'sms' => 'SMS',
                'whatsapp' => 'WhatsApp',
            ])->required()->default('email'),
            Forms\Components\Select::make('status')->label('Status')->options([
                'draft' => 'Rascunho',
                'scheduled' => 'Agendada',
                'sending' => 'Enviando',
                'sent' => 'Enviada',
            ])->default('draft'),
            Forms\Components\Select::make('segment_id')
                ->label('Segmento')
                ->options(Segment::query()->select(['id','name'])->pluck('name','id'))
                ->searchable()
                ->preload(),
            Forms\Components\Select::make('template_id')
                ->label('Template')
                ->options(Template::query()->select(['id','name'])->pluck('name','id'))
                ->searchable()
                ->preload(),
            Forms\Components\DateTimePicker::make('scheduled_at')->label('Agendar para'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (\Illuminate\Database\Eloquent\Builder $query) => $query->with(['segment','template'])->withCount('deliveries'))
            ->columns([
                Tables\Columns\TextColumn::make('name')->label('Nome')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('channel')->label('Canal')->sortable(),
                Tables\Columns\TextColumn::make('status')->label('Status')->sortable(),
                Tables\Columns\TextColumn::make('segment.name')->label('Segmento')->sortable(),
                Tables\Columns\TextColumn::make('template.name')->label('Template')->sortable(),
                Tables\Columns\TextColumn::make('deliveries_count')->label('Entregas')->sortable(),
                Tables\Columns\TextColumn::make('scheduled_at')->label('Agendada')->dateTime('d/m/Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Criada em')->dateTime('d/m/Y H:i')->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('channel')->label('Canal')->options([
                    'email' => 'Email',
                    'sms' => 'SMS',
                    'whatsapp' => 'WhatsApp',
                ]),
                Tables\Filters\SelectFilter::make('status')->label('Status')->options([
                    'draft' => 'Rascunho',
                    'scheduled' => 'Agendada',
                    'sending' => 'Enviando',
                    'sent' => 'Enviada',
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

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Section::make('Resumo')
                    ->schema([
                        TextEntry::make('name')->label('Nome'),
                        TextEntry::make('channel')->label('Canal'),
                        TextEntry::make('status')->label('Status'),
                        TextEntry::make('deliveries_total')
                            ->label('Total de Entregas')
                            ->state(fn ($record) => $record->deliveries()->count()),
                        TextEntry::make('deliveries_queued')
                            ->label('Em fila')
                            ->state(fn ($record) => $record->deliveries()->where('status', 'queued')->count()),
                        TextEntry::make('deliveries_sent')
                            ->label('Enviadas')
                            ->state(fn ($record) => $record->deliveries()->where('status', 'sent')->count()),
                        TextEntry::make('deliveries_opened')
                            ->label('Abertas')
                            ->state(fn ($record) => $record->deliveries()->whereNotNull('opened_at')->count()),
                        TextEntry::make('deliveries_clicked')
                            ->label('Clicadas')
                            ->state(fn ($record) => $record->deliveries()->whereNotNull('clicked_at')->count()),
                        TextEntry::make('deliveries_bounced')
                            ->label('Falhas')
                            ->state(fn ($record) => $record->deliveries()->whereNotNull('bounced_at')->count()),
                        TextEntry::make('deliveries_unsubscribed')
                            ->label('Descadastrados')
                            ->state(fn ($record) => $record->deliveries()->whereNotNull('unsubscribed_at')->count()),
                    ])->columns(3),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            \Modules\CRM\Filament\Resources\CampaignResource\RelationManagers\DeliveriesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCampaigns::route('/'),
            'create' => Pages\CreateCampaign::route('/create'),
            'view' => Pages\ViewCampaign::route('/{record}'),
            'edit' => Pages\EditCampaign::route('/{record}/edit'),
        ];
    }
}