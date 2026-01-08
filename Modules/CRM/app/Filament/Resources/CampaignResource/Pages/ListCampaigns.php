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
                        $synced = 0;
                        $limit = 500;
                        $offset = 0;
                        $hasMore = true;
                        
                        // Aumenta tempo de execução para garantir sync completo
                        set_time_limit(300);

                        while ($hasMore) {
                            $databases = $service->getDatabases(['limit' => $limit, 'offset' => $offset]);
                            $items = $databases['data'] ?? ($databases['result'] ?? $databases);
                            
                            if (!is_array($items) || count($items) === 0) {
                                $hasMore = false;
                                break;
                            }
                            
                            foreach ($items as $item) {
                                $id = $item['id'] ?? null;
                                $name = $item['name'] ?? null;
                                
                                if ($id && $name) {
                                    Campaign::updateOrCreate(
                                        ['gocontact_id' => $id],
                                        [
                                            'name' => $name,
                                            'channel' => 'gocontact',
                                            'status' => ($item['active'] ?? true) ? 'scheduled' : 'draft',
                                        ]
                                    );
                                    $synced++;
                                }
                            }

                            $offset += count($items);
                            
                            if (count($items) < $limit) {
                                $hasMore = false;
                            }
                            
                            usleep(200000); // 200ms
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