<?php

namespace Modules\CRM\Filament\Resources\CampaignResource\RelationManagers;

use Filament\Forms;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Resources\RelationManagers\RelationManager;
use Modules\CRM\Services\GoContactService;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\Action;

class CampaignContactsRelationManager extends RelationManager
{
    protected static string $relationship = 'campaignContacts';
    protected static ?string $title = 'Contatos da Campanha (GoContact)';

    public function form(Forms\Form $form): Forms\Form
    {
        return $form->schema([
            TextInput::make('name')->label('Nome'),
            TextInput::make('email')->label('Email')->email(),
            TextInput::make('phone_1')->label('Telefone 1'),
            TextInput::make('postal_code')->label('Código Postal'),
            TextInput::make('address')->label('Endereço'),
            TextInput::make('city')->label('Cidade'),
            // Adicione outros campos editáveis aqui
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('name')
            ->columns([
                Tables\Columns\TextColumn::make('gocontact_id')->label('Contact ID')->searchable()->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('load_date')->label('Load Date')->dateTime('d/m/Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('name')->label('Contact Name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('phone_1')->label('Phone #1')->searchable(),
                Tables\Columns\TextColumn::make('email')->label('Email')->searchable(),
                Tables\Columns\TextColumn::make('city')->label('City')->sortable(),
                Tables\Columns\TextColumn::make('outcome')->label('Outcome')->sortable(),
                Tables\Columns\TextColumn::make('agent')->label('Agent')->sortable(),
                Tables\Columns\TextColumn::make('total_calls')->label('Calls')->sortable(),
                Tables\Columns\IconColumn::make('is_closed')->label('Closed')->boolean(),
            ])
            ->headerActions([
                Action::make('sync_contacts')
                    ->label('Importar Contatos do GoContact')
                    ->icon('heroicon-o-arrow-down-tray')
                    ->color('primary')
                    ->action(function ($livewire) {
                        // ... código existente ...
                        $campaign = $livewire->getOwnerRecord();
                        $dbId = $campaign->gocontact_id;

                        if (!$dbId) {
                            Notification::make()->title('Erro')->body('Esta campanha não possui ID do GoContact.')->danger()->send();
                            return;
                        }

                        try {
                            $service = new GoContactService();
                            $synced = 0;
                            $limit = 100;
                            $offset = 0;
                            $hasMore = true;
                            
                            set_time_limit(300);

                            while ($hasMore) {
                                $response = $service->getDatabaseContacts($dbId, $limit, $offset);
                                $items = $response['data'] ?? ($response['result'] ?? $response);

                                if (!is_array($items) || count($items) === 0) {
                                    $hasMore = false;
                                    break;
                                }

                                foreach ($items as $item) {
                                    $campaign->campaignContacts()->updateOrCreate(
                                        ['gocontact_id' => $item['id'] ?? null],
                                        [
                                            'load_date' => $item['load_date'] ?? null,
                                            'name' => $item['name'] ?? ($item['contact'] ?? null),
                                            'phone_1' => $item['phone_number'] ?? ($item['phone1'] ?? null),
                                            'phone_2' => $item['phone2'] ?? null,
                                            'phone_3' => $item['phone3'] ?? null,
                                            'phone_4' => $item['phone4'] ?? null,
                                            'phone_5' => $item['phone5'] ?? null,
                                            'phone_6' => $item['phone6'] ?? null,
                                            'phone_7' => $item['phone7'] ?? null,
                                            'phone_8' => $item['phone8'] ?? null,
                                            'email' => $item['email'] ?? null,
                                            'postal_code' => $item['postal_code'] ?? ($item['zip_code'] ?? null),
                                            'address' => $item['address'] ?? null,
                                            'city' => $item['city'] ?? null,
                                            'country' => $item['country'] ?? null,
                                            'question_1' => $item['custom_1'] ?? null, 
                                            'question_2' => $item['custom_2'] ?? null,
                                            'question_3' => $item['custom_3'] ?? null,
                                            'outcome' => $item['outcome'] ?? null,
                                            'total_calls' => $item['total_calls'] ?? 0,
                                            'total_recycle' => $item['total_recycle'] ?? 0,
                                            'agent' => $item['agent'] ?? null,
                                            'is_new' => $item['active'] ?? false, 
                                            'is_closed' => $item['closed'] ?? false,
                                            'is_in_recycle' => $item['in_recycle'] ?? false,
                                            'is_in_callback' => $item['in_callback'] ?? false,
                                            'lead_status' => $item['status'] ?? null,
                                            'deleted' => $item['deleted'] ?? false,
                                        ]
                                    );
                                    $synced++;
                                }

                                $offset += count($items);
                                if (count($items) < $limit) {
                                    $hasMore = false;
                                }
                                usleep(200000);
                            }

                            Notification::make()->title('Sucesso')->body("Importados $synced contatos.")->success()->send();

                        } catch (\Exception $e) {
                            Log::error("Sync Campaign Contacts Error: " . $e->getMessage());
                            Notification::make()->title('Erro')->body($e->getMessage())->danger()->send();
                        }
                    }),
                Action::make('clear_campaign_contacts')
                    ->label('Limpar contatos da campanha (CRM)')
                    ->icon('heroicon-o-trash')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Limpar contatos da campanha')
                    ->modalDescription('Isto vai remover todos os contatos desta campanha no CRM. Os dados no GoContact não serão alterados.')
                    ->action(function ($livewire) {
                        $campaign = $livewire->getOwnerRecord();
                        if (! $campaign) {
                            return;
                        }

                        $deleted = $campaign->campaignContacts()->delete();

                        Notification::make()
                            ->title('Contatos limpos')
                            ->body("{$deleted} contatos removidos desta campanha no CRM.")
                            ->success()
                            ->send();
                    }),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->label('Editar')
                    ->after(function ($record, $livewire) {
                        // Sincronizar de volta para o GoContact após salvar no CRM
                        try {
                            $campaign = $livewire->getOwnerRecord();
                            $dbId = $campaign->gocontact_id;
                            $contactId = $record->gocontact_id;
                            
                            if ($dbId && $contactId) {
                                $service = new GoContactService();
                                $service->updateDatabaseContact($dbId, $contactId, $record->toArray());
                                Notification::make()->title('Atualizado no GoContact')->success()->send();
                            }
                        } catch (\Exception $e) {
                            Log::error("Erro Update GoContact: " . $e->getMessage());
                            Notification::make()->title('Erro ao atualizar no GoContact')
                                ->body($e->getMessage())
                                ->warning()
                                ->send();
                        }
                    }),
            ]);
    }
}