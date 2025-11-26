<?php

namespace Modules\CRM\Filament\Resources\CampaignResource\Pages;

use Modules\CRM\Filament\Resources\CampaignResource;
use Filament\Resources\Pages\ViewRecord;
use Filament\Actions;
use Filament\Notifications\Notification;
use Modules\CRM\Models\Delivery;
use Modules\CRM\Services\SegmentResolver;

class ViewCampaign extends ViewRecord
{
    protected static string $resource = CampaignResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('generate_deliveries')
                ->label('Gerar Entregas')
                ->color('primary')
                ->requiresConfirmation()
                ->action(function () {
                    $campaign = $this->record;
                    if (! $campaign || ! $campaign->segment_id) {
                        Notification::make()
                            ->title('Campanha sem segmento')
                            ->body('Defina um segmento para gerar entregas.')
                            ->warning()
                            ->send();
                        return;
                    }

                    $resolver = app(SegmentResolver::class);
                    $contacts = $resolver->resolveContacts($campaign->segment_id);

                    if ($contacts->isEmpty()) {
                        Notification::make()
                            ->title('Nenhum contato encontrado')
                            ->body('O segmento não retornou contatos.')
                            ->warning()
                            ->send();
                        return;
                    }

                    $created = 0;
                    foreach ($contacts as $contact) {
                        $delivery = Delivery::firstOrCreate([
                            'campaign_id' => $campaign->id,
                            'contact_id' => $contact->id,
                        ], [
                            'status' => 'queued',
                        ]);
                        if ($delivery->wasRecentlyCreated) {
                            $created++;
                        }
                    }

                    if ($created > 0) {
                        $campaign->update([
                            'status' => 'scheduled',
                            'scheduled_at' => $campaign->scheduled_at ?? now(),
                        ]);
                    }

                    Notification::make()
                        ->title('Entregas geradas')
                        ->body("{$created} novas entregas enfileiradas para a campanha.")
                        ->success()
                        ->send();
                }),
        ];
    }
}