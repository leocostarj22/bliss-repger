<?php

namespace Modules\CRM\Filament\Resources\CampaignResource\RelationManagers;

use Filament\Forms;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Resources\RelationManagers\RelationManager;
use Modules\CRM\Jobs\SendDeliveryEmail;

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
                Tables\Columns\TextColumn::make('clicked_url')->label('Último link')->limit(50)->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('unsubscribed_at')->label('Descadastrado em')->dateTime('d/m/Y H:i')->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')->label('Criado em')->dateTime('d/m/Y H:i')->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'queued' => 'Em fila',
                        'sending' => 'Enviando',
                        'sent' => 'Enviado',
                        'bounced' => 'Falhou',
                        'unsubscribed' => 'Descadastrado',
                    ]),
                Tables\Filters\TernaryFilter::make('opened')
                    ->label('Aberto')
                    ->placeholder('Ignorar')
                    ->trueLabel('Sim')
                    ->falseLabel('Não')
                    ->queries(
                        true: fn ($query) => $query->whereNotNull('opened_at'),
                        false: fn ($query) => $query->whereNull('opened_at'),
                        blank: fn ($query) => $query,
                    ),
                Tables\Filters\TernaryFilter::make('clicked')
                    ->label('Clicado')
                    ->placeholder('Ignorar')
                    ->trueLabel('Sim')
                    ->falseLabel('Não')
                    ->queries(
                        true: fn ($query) => $query->whereNotNull('clicked_at'),
                        false: fn ($query) => $query->whereNull('clicked_at'),
                        blank: fn ($query) => $query,
                    ),
                Tables\Filters\Filter::make('activity')
                    ->label('Com atividade')
                    ->toggle()
                    ->query(fn ($query) => $query->whereNotNull('opened_at')->orWhereNotNull('clicked_at')),
            ])
            ->headerActions([
                Tables\Actions\Action::make('stats_total')
                    ->label(fn () => 'Total: ' . $this->getOwnerRecord()->deliveries()->count())
                    ->disabled()
                    ->color('gray'),
                Tables\Actions\Action::make('stats_queued')
                    ->label(fn () => 'Em fila: ' . $this->getOwnerRecord()->deliveries()->where('status', 'queued')->count())
                    ->disabled()
                    ->color('warning'),
                Tables\Actions\Action::make('stats_sending')
                    ->label(fn () => 'Enviando: ' . $this->getOwnerRecord()->deliveries()->where('status', 'sending')->count())
                    ->disabled()
                    ->color('info'),
                Tables\Actions\Action::make('stats_sent')
                    ->label(fn () => 'Enviadas: ' . $this->getOwnerRecord()->deliveries()->where('status', 'sent')->count())
                    ->disabled()
                    ->color('success'),
                Tables\Actions\Action::make('stats_opened')
                    ->label(fn () => 'Abertas: ' . $this->getOwnerRecord()->deliveries()->whereNotNull('opened_at')->count())
                    ->disabled()
                    ->color('success'),
                Tables\Actions\Action::make('stats_clicked')
                    ->label(fn () => 'Clicadas: ' . $this->getOwnerRecord()->deliveries()->whereNotNull('clicked_at')->count())
                    ->disabled()
                    ->color('success'),
            ])
            ->actions([
                Tables\Actions\Action::make('send_email')
                    ->label('Enviar email')
                    ->color('primary')
                    ->visible(fn () => true)
                    ->disabled(fn ($record) => $record->status !== 'queued')
                    ->tooltip(fn ($record) => $record->status === 'queued' ? 'Enviar entrega em fila' : 'Disponível apenas para entregas em fila')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update(['status' => 'sending']);
                        SendDeliveryEmail::dispatch($record->id);
                    }),
                Tables\Actions\Action::make('mark_sent')
                    ->label('Marcar como enviado')
                    ->color('success')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'sent',
                            'sent_at' => now(),
                        ]);
                    }),
                Tables\Actions\Action::make('requeue')
                    ->label('Re-enfileirar')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'queued',
                            'sent_at' => null,
                            'opened_at' => null,
                            'clicked_at' => null,
                            'bounced_at' => null,
                            'unsubscribed_at' => null,
                        ]);
                    }),
            ])
            ->bulkActions([]);
    }
}