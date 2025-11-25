<?php

namespace Modules\CRM\Filament\Resources\CampaignResource\RelationManagers;

use Filament\Forms;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Resources\RelationManagers\RelationManager;

class DeliveriesRelationManager extends RelationManager
{
    protected static string $relationship = 'deliveries';
    protected static ?string $title = 'Entregas';

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('contact.name')->label('Contacto')->searchable(),
                Tables\Columns\TextColumn::make('status')->label('Status')->badge(),
                Tables\Columns\TextColumn::make('sent_at')->label('Enviado em')->dateTime('d/m/Y H:i'),
                Tables\Columns\TextColumn::make('opened_at')->label('Aberto em')->dateTime('d/m/Y H:i'),
                Tables\Columns\TextColumn::make('clicked_at')->label('Clique em')->dateTime('d/m/Y H:i'),
                Tables\Columns\TextColumn::make('created_at')->label('Criado em')->dateTime('d/m/Y H:i')->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Status')->options([
                    'queued' => 'Em fila',
                    'sent' => 'Enviado',
                    'opened' => 'Aberto',
                    'clicked' => 'Clicado',
                    'bounced' => 'Falhou',
                    'unsubscribed' => 'Descadastrado',
                ]),
            ])
            ->actions([])
            ->bulkActions([]);
    }
}