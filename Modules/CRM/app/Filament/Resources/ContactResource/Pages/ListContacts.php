<?php

namespace Modules\CRM\Filament\Resources\ContactResource\Pages;

use Modules\CRM\Filament\Resources\ContactResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Actions;

use Modules\CRM\Services\GoContactService;
use Modules\CRM\Models\Contact;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class ListContacts extends ListRecords
{
    protected static string $resource = ContactResource::class;

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
                        $limit = 200; // Aumentado para 200 por página
                        $offset = 0;
                        $maxSync = 1000; // Limite de segurança para evitar timeout (executar várias vezes se necessário)
                        $hasMore = true;

                        // Tenta aumentar o tempo de execução
                        set_time_limit(300);

                        while ($hasMore && $synced < $maxSync) {
                            $response = $service->getContacts($limit, $offset);
                            
                            $contactsData = $response['data'] ?? ($response['result'] ?? $response);
                            
                            if (!is_array($contactsData) || count($contactsData) === 0) {
                                $hasMore = false;
                                break;
                            }

                            // Debug do primeiro item de CADA página para verificar paginação
                            if (count($contactsData) > 0) {
                                $firstId = $contactsData[0]['id'] ?? 'N/A';
                                Log::info("GoContact Sync Batch - Offset: $offset | First Item ID: $firstId");
                                
                                if ($offset === 0) {
                                    Log::info("GoContact First Item Keys: " . json_encode(array_keys((array)$contactsData[0])));
                                }
                            }

                            foreach ($contactsData as $item) {
                                // Mapeamento corrigido baseado nos logs da API
                                $email = $item['email'] ?? ($item['Email'] ?? null);
                                
                                // Telefone: Prioriza first_phone (API Database) ou phone (API CRM)
                                $phone = $item['first_phone'] ?? ($item['phone'] ?? ($item['phone_number'] ?? ($item['phoneNumber'] ?? ($item['mobile'] ?? null))));
                                
                                // Nome: O campo 'contact' contém o nome completo na API Database
                                $name = $item['contact'] ?? ($item['name'] ?? ($item['fullname'] ?? null));
                                
                                // Fallback seguro para composição de nome se campos específicos existirem
                                if (!$name) {
                                    $firstName = $item['firstName'] ?? '';
                                    $lastName = $item['lastName'] ?? '';
                                    if ($firstName || $lastName) {
                                        $name = trim("$firstName $lastName");
                                    }
                                }
                                
                                $name = $name ?: 'Sem Nome';

                                // Endereço e outros dados
                                $postalCode = $item['postal_code'] ?? ($item['zip_code'] ?? ($item['cp'] ?? null));
                                $address = $item['address'] ?? ($item['morada'] ?? null);
                                $city = $item['city'] ?? ($item['localidade'] ?? null);

                                // Ignora contatos sem identificador único (email ou telefone)
                                if (!$email && !$phone) {
                                    continue;
                                }

                                // Lógica de Correspondência Inteligente (Email OU Telefone)
                                // Isso evita que contatos sem email sobrescrevam o mesmo registro com email nulo
                                $contactModel = null;
                                
                                if (!empty($email)) {
                                    $contactModel = Contact::where('email', $email)->first();
                                }
                                
                                if (!$contactModel && !empty($phone)) {
                                    $contactModel = Contact::where('phone', $phone)->first();
                                }

                                $dataToSave = [
                                    'name' => $name,
                                    'phone' => $phone,
                                    'postal_code' => $postalCode,
                                    'address' => $address,
                                    'city' => $city,
                                    'source' => 'gocontact',
                                    'status' => 'customer',
                                ];

                                // Só atualiza email se vier da API (não sobrescreve email existente com null)
                                if (!empty($email)) {
                                    $dataToSave['email'] = $email;
                                }

                                if ($contactModel) {
                                    $contactModel->update($dataToSave);
                                } else {
                                    // Na criação, definimos o email (pode ser null se não existir)
                                    $dataToSave['email'] = $email;
                                    Contact::create($dataToSave);
                                }
                                
                                $synced++;
                            }

                            // Atualiza offset e verifica se há mais páginas
                            $offset += count($contactsData);
                            if (count($contactsData) < $limit) {
                                $hasMore = false;
                            }
                            
                            // Pequena pausa para não sobrecarregar a API
                            usleep(200000); // 200ms
                        }

                        $message = "Foram processados e sincronizados $synced contatos.";
                        if ($hasMore) {
                            $message .= " Ainda existem mais contatos. Execute novamente para continuar.";
                        }

                        Notification::make()
                            ->title('Sincronização concluída (Parcial)')
                            ->body($message)
                            ->success()
                            ->send();
                            
                    } catch (\Exception $e) {
                        Log::error("Erro Sync GoContact: " . $e->getMessage());
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