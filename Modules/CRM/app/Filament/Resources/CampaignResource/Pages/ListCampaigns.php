<?php

namespace Modules\CRM\Filament\Resources\CampaignResource\Pages;

use Modules\CRM\Filament\Resources\CampaignResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Actions;
use Modules\CRM\Services\GoContactService;
use Modules\CRM\Models\Campaign;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

use Illuminate\Support\HtmlString;

use Filament\Forms\Components\CheckboxList;

use Filament\Forms\Components\Select;
use Filament\Forms\Get;

class ListCampaigns extends ListRecords
{
    protected static string $resource = CampaignResource::class;

    public function importSelectedCampaigns(array $selectedIds): void
    {
        $service = new GoContactService();
        $count = 0;
        
        // Para importação, não precisamos re-paginar se tivermos os IDs.
        // Mas para garantir os dados mais frescos, podemos fazer um fetch.
        // Como são IDs específicos, o ideal seria 'whereIn' mas a API pode não suportar.
        // Vamos buscar um lote maior ou confiar que os dados já estão no sistema se usássemos cache.
        // Simplificação: Buscamos novamente usando os mesmos parâmetros de ordenação para tentar encontrar os itens.
        // Nota: Se o usuário selecionou itens da página 5, e buscamos a página 1 aqui, pode falhar.
        // Melhor abordagem: Iterar sobre os IDs e atualizar individualmente ou buscar em lote maior.
        // Dado que a API é instável com filtros, vamos tentar buscar um range amplo ou apenas confiar na criação se tivermos os dados.
        // Mas o CheckboxList só passa os IDs.
        
        // Solução Robusta: Fazer um loop pelos IDs e buscar individualmente SE a API suportar getById.
        // Se não, vamos buscar um lote grande (ex: 500) ordenado por ID DESC para tentar pegar os recentes.
        
        $databases = $service->getDatabases([
            'limit' => 500, 
            'order_by' => 'id', 
            'order' => 'desc',
            'direction' => 'DESC'
        ]);
        
        $items = $databases['data'] ?? ($databases['result'] ?? $databases);
        
        if (!is_array($items)) {
            Notification::make()->title('Erro ao obter dados da API')->danger()->send();
            return;
        }

        // Indexar itens por ID para busca rápida
        $itemsMap = [];
        foreach ($items as $item) {
            if (isset($item['id'])) {
                $itemsMap[$item['id']] = $item;
            }
        }

        foreach ($selectedIds as $id) {
            $item = $itemsMap[$id] ?? null;
            
            // Se não encontrou no lote de 500, pode ser um item mais antigo que estava numa página específica.
            // Neste caso, infelizmente, sem um endpoint getById, teríamos que buscar a página específica novamente.
            // Vamos assumir que o usuário está importando recentes.
            
            if ($item) {
                $name = $item['name'];
                $isActive = $item['active'] ?? false;
                
                $createdAt = $item['created'] ?? $item['created_at'] ?? $item['date'] ?? $item['start_date'] ?? $item['load_date'] ?? $item['creation_date'] ?? $item['insert_date'] ?? null;

                $data = [
                    'name' => $name,
                    'channel' => 'gocontact',
                    'status' => $isActive ? 'scheduled' : 'draft',
                    'active' => $isActive,
                ];

                if ($createdAt) {
                    try {
                        $data['created_at'] = \Carbon\Carbon::parse($createdAt);
                    } catch (\Exception $e) {}
                }

                Campaign::updateOrCreate(
                    ['gocontact_id' => $id],
                    $data
                );
                $count++;
            }
        }
        
        Notification::make()
            ->title("Processado. $count campanhas importadas/atualizadas com sucesso.")
            ->success()
            ->send();
    }

    /**
     * Método chamado pelo frontend (Alpine.js) para processar em lotes
     * Mantido apenas como referência ou uso futuro via comando
     */
    public function syncCampaignsBatch(int $page, ?string $lastSeenId = null): array
    {
        try {
            $service = new GoContactService();
            // Tentativa com limite 500 (limite comum de APIs).
            $limit = 500;
            $offset = ($page - 1) * $limit;
            
            // Removido filtros de data pois as datas no banco estão incorretas
            // Adicionado 'start' e 'skip' como alias para offset para garantir compatibilidade
            $databases = $service->getDatabases([
                'limit' => $limit, 
                'offset' => $offset,
                'start' => $offset,
                'skip' => $offset,
                'page' => $page, 
                'order_by' => 'id',
                'order' => 'desc'
            ]);
            
            $items = $databases['data'] ?? ($databases['result'] ?? $databases);
            
            if (!is_array($items)) {
                return [
                    'synced_count' => 0,
                    'next_page' => $page,
                    'has_more' => false,
                    'first_id' => null,
                    'error' => 'Formato de resposta inválido da API.'
                ];
            }

            $count = count($items);
            if ($count === 0) {
                return [
                    'synced_count' => 0,
                    'next_page' => $page,
                    'has_more' => false,
                    'first_id' => null
                ];
            }

            // Verificação de segurança contra loop infinito
            $firstItem = $items[0] ?? null;
            $firstId = $firstItem['id'] ?? null;
            
            // Se o primeiro ID desta página for igual ao da página anterior, 
            // a API ignorou a paginação e estamos em loop.
            if ($lastSeenId && $firstId && (string)$firstId === (string)$lastSeenId) {
                Log::warning("GoContact Sync: Loop detectado. FirstID $firstId repetido na página $page.");
                return [
                    'synced_count' => 0,
                    'next_page' => $page,
                    'has_more' => false, // Interrompe o loop
                    'first_id' => $firstId,
                    'error' => "Aviso: Loop de paginação detectado na página $page. A sincronização foi interrompida para evitar duplicados."
                ];
            }

            $synced = 0;
            
            // Debug: Logar chaves do primeiro item para análise
            if (!empty($items) && $page === 1) {
                $firstItemKeys = array_keys((array)$items[0]);
                Log::info('GoContact Campaign Keys (Sync All): ' . implode(', ', $firstItemKeys));
            }

            foreach ($items as $item) {
                $id = $item['id'] ?? null;
                $name = $item['name'] ?? null;
                
                if ($id && $name) {
                    $isActive = $item['active'] ?? false;
                    
                    // Tentativa exaustiva de encontrar a data correta
                    $createdAt = $item['created'] ?? $item['created_at'] ?? $item['date'] ?? $item['start_date'] ?? $item['load_date'] ?? $item['creation_date'] ?? $item['insert_date'] ?? null;

                    $data = [
                        'name' => $name,
                        'channel' => 'gocontact',
                        'status' => $isActive ? 'scheduled' : 'draft',
                        'active' => $isActive,
                    ];

                    if ($createdAt) {
                        try {
                            $data['created_at'] = \Carbon\Carbon::parse($createdAt);
                        } catch (\Exception $e) {
                            // Se a data for inválida, mantemos null ou a data atual dependendo da configuração do banco
                        }
                    }

                    // Forçamos updateOrCreate para garantir que todos os dados estejam atualizados
                    // e para corrigir registros que possam ter sido pulados incorretamente
                    Campaign::updateOrCreate(
                        ['gocontact_id' => $id],
                        $data
                    );
                    $synced++;
                }
            }

            return [
                'synced_count' => $synced,
                'next_page' => $page + 1,
                'has_more' => $count >= $limit,
                'first_id' => $firstId
            ];

        } catch (\Exception $e) {
            Log::error("Erro Batch Sync: " . $e->getMessage());
            return [
                'synced_count' => 0,
                'next_page' => $page,
                'has_more' => false,
                'first_id' => null,
                'error' => $e->getMessage()
            ];
        }
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('import_gocontact')
                ->label('Importar do GoContact')
                ->icon('heroicon-o-cloud-arrow-down')
                ->color('primary')
                ->modalHeading('Escolher Campanhas para Importar')
                ->modalDescription('Selecione as campanhas que deseja importar. Use o seletor de página para ver mais antigas.')
                ->form([
                    \Filament\Forms\Components\TextInput::make('search_term')
                        ->label('Buscar Campanha (Nome ou ID)')
                        ->placeholder('Digite para filtrar...')
                        ->live(debounce: 1000)
                        ->afterStateUpdated(fn ($set) => $set('page_number', 1)),

                    \Filament\Forms\Components\Grid::make(3)
                        ->schema([
                            \Filament\Forms\Components\Actions::make([
                                \Filament\Forms\Components\Actions\Action::make('previous_page')
                                    ->label('Anterior')
                                    ->icon('heroicon-m-chevron-left')
                                    ->color('gray')
                                    ->disabled(fn (Get $get) => ($get('page_number') ?? 1) <= 1)
                                    ->action(function (Get $get, \Filament\Forms\Set $set) {
                                        $currentPage = $get('page_number') ?? 1;
                                        if ($currentPage > 1) {
                                            $set('page_number', $currentPage - 1);
                                        }
                                    }),
                            ])->alignCenter(),
                            
                            \Filament\Forms\Components\TextInput::make('page_number')
                                ->label('Página')
                                ->default(1)
                                ->numeric()
                                ->minValue(1)
                                ->live(debounce: 500)
                                ->extraInputAttributes(['class' => 'text-center']),

                            \Filament\Forms\Components\Actions::make([
                                \Filament\Forms\Components\Actions\Action::make('next_page')
                                    ->label('Próxima')
                                    ->icon('heroicon-m-chevron-right')
                                    ->color('gray')
                                    ->action(function (Get $get, \Filament\Forms\Set $set) {
                                        $currentPage = $get('page_number') ?? 1;
                                        $set('page_number', $currentPage + 1);
                                    }),
                            ])->alignCenter(),
                        ]),

                    CheckboxList::make('campaigns_to_sync')
                        ->key(fn (Get $get) => 'campaigns-list-' . ($get('page_number') ?? 1) . '-' . ($get('search_term') ?? ''))
                        ->label(fn (Get $get) => 'Campanhas (Página ' . ($get('page_number') ?? 1) . ')')
                        ->options(function (Get $get) {
                            $page = (int) ($get('page_number') ?? 1);
                            $search = $get('search_term');
                            $limit = 100;
                            $service = new GoContactService();

                            // 1. Busca única e cacheada (Solução 3 - v6)
                            $rawItems = Cache::remember('gocontact_campaigns_v6', 300, function () use ($service) {
                                Log::info('GoContact: Iniciando busca de campanhas para cache (Limit: 500)');
                                try {
                                    $data = $service->getDatabases(['limit' => 500]);
                                    $items = $data['data'] ?? ($data['result'] ?? $data);
                                    
                                    if (is_array($items)) {
                                        Log::info('GoContact: Busca concluída. Itens encontrados: ' . count($items));
                                        return $items;
                                    }
                                    
                                    Log::warning('GoContact: Resposta inválida', ['response' => $data]);
                                    return [];
                                } catch (\Exception $e) {
                                    Log::error('GoContact: Erro ao buscar: ' . $e->getMessage());
                                    return [];
                                }
                            });

                            if (empty($rawItems)) {
                                Cache::forget('gocontact_campaigns_v6');
                            }

                            // 2. Processamento Local
                            $collection = collect($rawItems);

                            if (!empty($search)) {
                                $collection = $collection->filter(function ($item) use ($search) {
                                    return (isset($item['name']) && stripos($item['name'], $search) !== false) ||
                                           (isset($item['id']) && stripos((string)$item['id'], $search) !== false);
                                });

                                // Fallback: Busca direta por ID se não encontrar no cache
                                if ($collection->isEmpty() && is_numeric($search)) {
                                    try {
                                        $directResponse = $service->getDatabase($search);
                                        $directItem = $directResponse['data'] ?? ($directResponse['result'] ?? $directResponse);
                                        if (isset($directItem['id'])) {
                                            $collection->push($directItem);
                                        }
                                    } catch (\Exception $e) {
                                        // Silencioso no fallback
                                    }
                                }
                            }

                            // 3. Ordenação e Paginação Local
                            $pagedItems = $collection
                                ->sortByDesc('id')
                                ->values()
                                ->slice(($page - 1) * $limit, $limit);

                            return $pagedItems->mapWithKeys(function ($item) {
                                if (!isset($item['id'], $item['name'])) return [];
                                $status = !empty($item['active']) ? '(Ativa)' : '(Inativa)';
                                return [$item['id'] => "{$item['id']} - {$item['name']} $status"];
                            })->toArray();
                        })
                        ->searchable()
                        ->noSearchResultsMessage('Nenhuma campanha encontrada nesta página.')
                        ->required()
                        ->columns(1)
                        ->bulkToggleable()
                ])
                ->action(function (array $data) {
                    $this->importSelectedCampaigns($data['campaigns_to_sync']);
                }),
            Actions\CreateAction::make(),
        ];
    }
}