<?php

namespace Modules\CRM\Filament\Resources\CampaignResource\Pages;

use Modules\CRM\Filament\Resources\CampaignResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Actions;
use Modules\CRM\Services\GoContactService;
use Modules\CRM\Models\Campaign;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class ListCampaigns extends ListRecords
{
    protected static string $resource = CampaignResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('sync_gocontact')
                ->label('Sincronizar GoContact')
                ->icon('heroicon-o-arrow-path')
                ->color('warning')
                ->action(function () {
                    try {
                        $service = new GoContactService();
                        $databases = $service->getDatabases();
                        $items = $databases['data'] ?? ($databases['result'] ?? $databases);
                        
                        $synced = 0;
                        if (is_array($items)) {
                            foreach ($items as $item) {
                                $id = $item['id'] ?? null;
                                $name = $item['name'] ?? null;
                                
                                if ($id && $name) {
                                    Campaign::updateOrCreate(
                                        ['gocontact_id' => $id],
                                        [
                                            'name' => $name,
                                            'channel' => 'gocontact',
                                            'status' => ($item['active'] ?? true) ? 'scheduled' : 'draft', // Mapeamento aproximado de status
                                            'created_at' => now(), // GoContact não retorna created_at facilmente aqui, usamos now() na criação
                                        ]
                                    );
                                    $synced++;
                                }
                            }
                        }

                        Notification::make()
                            ->title('Sincronização concluída')
                            ->body("Foram sincronizadas $synced campanhas (databases) do GoContact.")
                            ->success()
                            ->send();

                    } catch (\Exception $e) {
                        Log::error("Erro Sync GoContact Campaigns: " . $e->getMessage());
                        Notification::make()
                            ->title('Erro na sincronização')
                            ->body($e->getMessage())
                            ->danger()
                            ->send();
                    }
                }),
            Actions\CreateAction::make(),
        ];
    }
}