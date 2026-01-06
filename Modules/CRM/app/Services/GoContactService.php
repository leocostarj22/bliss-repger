<?php

namespace Modules\CRM\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class GoContactService
{
    protected string $baseUrl;
    protected string $username;
    protected string $password;
    protected string $tokenCacheKey = 'gocontact_api_token';

    public function __construct()
    {
        $this->baseUrl = rtrim(config('crm.gocontact.base_url'), '/');
        $this->username = config('crm.gocontact.username');
        $this->password = config('crm.gocontact.password');
    }

    /**
     * Obter token de autenticação
     */
    public function getToken(): ?string
    {
        if (Cache::has($this->tokenCacheKey)) {
            return Cache::get($this->tokenCacheKey);
        }

        return $this->authenticate();
    }

    /**
     * Realizar autenticação na API
     */
    protected function authenticate(): ?string
    {
        // Endpoint confirmado: /poll/auth/token
        // Requer Basic Auth com username@domain e password
        $url = "{$this->baseUrl}/poll/auth/token";
        
        try {
            Log::info("Tentando autenticação GoContact em: $url");

            $response = Http::withoutVerifying()
                ->withBasicAuth($this->username, $this->password)
                ->post($url);

            if ($response->successful()) {
                $data = $response->json();
                $token = $data['token'] ?? null;
                
                if ($token) {
                    // Token expira em 24h (86400s), cache por 23h para segurança
                    Cache::put($this->tokenCacheKey, $token, now()->addHours(23));
                    Log::info("GoContact Auth Success.");
                    return $token;
                }
            }
            
            // Tratamento de erro detalhado
            $status = $response->status();
            $body = $response->body();
            $errorMsg = "Auth Failed ($status): $body | URL: $url";
            
            Log::error("GoContact Auth Error: $errorMsg");
            throw new \Exception($errorMsg);

        } catch (\Exception $e) {
            Log::error('GoContact Auth Exception: ' . $e->getMessage());
            throw $e;
        }
    }
    /**
     * Obter lista de databases
     */
    public function getDatabases(array $filters = [])
    {
        $endpoints = ['/api/databases', '/poll/api/databases', '/api/v1/databases'];
        
        foreach ($endpoints as $endpoint) {
             try {
                $response = $this->get($endpoint, $filters);
                if ($response->successful()) {
                    Log::info("GoContact Databases Endpoint Found: $endpoint");
                    return $response->json();
                }
             } catch (\Exception $e) {
                 Log::warning("GoContact Database check failed for $endpoint: " . $e->getMessage());
             }
        }
        
        return [];
    }

    /**
     * Obter detalhes de uma database
     */
    public function getDatabase(string $id)
    {
        return $this->get("/api/databases/{$id}")->json();
    }

    /**
     * Criar nova database
     */
    public function createDatabase(array $data)
    {
        return $this->post('/api/databases', $data)->json();
    }

    /**
     * Atualizar database
     */
    public function updateDatabase(string $id, array $data)
    {
        return $this->patch("/api/databases/{$id}", $data)->json();
    }

    /**
     * Criar database de campanha outbound
     */
    public function createOutboundDatabase(array $data)
    {
        return $this->post('/api/contacts/databases', $data)->json();
    }

    /**
     * Alterar estado da database
     */
    public function changeDatabaseState(string $id, array $data)
    {
        return $this->post("/api/contacts/databases/{$id}", $data)->json();
    }

    /**
     * Deletar database
     */
    public function deleteDatabase(string $id)
    {
        return $this->delete("/api/contacts/databases/{$id}")->json();
    }

    /**
     * Obter lista de contatos (Prioriza via Database, depois endpoints diretos)
     */
    public function getContacts(int $limit = 50, int $offset = 0)
    {
        $errors = [];

        // 1. Tentar via databases (Método mais confiável para listagem em massa)
        try {
            $databases = $this->getDatabases();
            $dbList = $databases['data'] ?? $databases;
            
            if (is_array($dbList) && count($dbList) > 0) {
                // Pega o primeiro ID
                $firstDb = $dbList[0];
                $dbId = is_array($firstDb) ? ($firstDb['id'] ?? null) : null;
                
                if ($dbId) {
                    $dbEndpoints = [
                        "/poll/api/databases/{$dbId}/contacts/",
                        "/api/databases/{$dbId}/contacts/"
                    ];

                    foreach ($dbEndpoints as $endpoint) {
                        try {
                             $response = $this->get($endpoint, ['limit' => $limit, 'offset' => $offset]);
                             if ($response->successful()) {
                                 Log::info("GoContact Contacts found via Database Endpoint: $endpoint (Limit: $limit, Offset: $offset)");
                                 return $response->json();
                             }
                        } catch (\Exception $e) {
                            $errors[] = "$endpoint: " . $e->getMessage();
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            $errors[] = "Database fetch failed: " . $e->getMessage();
        }

        // 2. Se falhar, tentar endpoints diretos
        $directEndpoints = [
            '/poll/api/crm/contacts',
            '/poll/api/contacts',
            '/api/crm/contacts',
            '/api/contacts',
        ];

        foreach ($directEndpoints as $endpoint) {
            try {
                $response = $this->get($endpoint, ['limit' => $limit, 'offset' => $offset]);
                if ($response->successful()) {
                    $data = $response->json();
                    // Validação simples para evitar falso positivo (ex: retorna 1 registro vazio)
                    $list = $data['data'] ?? ($data['result'] ?? $data);
                    if (is_array($list) && count($list) > 0) {
                        Log::info("GoContact Contacts found via Direct Endpoint: $endpoint");
                        return $data;
                    }
                }
            } catch (\Exception $e) {
                $errors[] = "$endpoint: " . $e->getMessage();
            }
        }

        throw new \Exception("Não foi possível obter contatos. Erros: " . implode(' | ', $errors));
    }

    /**
     * Fazer requisição GET autenticada
     */
    protected function get(string $endpoint, array $params = [])
    {
        $token = $this->getToken();
        
        if (!$token) {
            throw new \Exception('Não foi possível autenticar no GoContact.');
        }

        // Garante que o endpoint comece com /
        $endpoint = '/' . ltrim($endpoint, '/');

        return Http::withoutVerifying()
            ->withToken($token)
            ->get("{$this->baseUrl}{$endpoint}", $params);
    }

    /**
     * Fazer requisição POST autenticada
     */
    protected function post(string $endpoint, array $data = [])
    {
        $token = $this->getToken();
        
        if (!$token) {
            throw new \Exception('Não foi possível autenticar no GoContact.');
        }

        return Http::withoutVerifying()
            ->withToken($token)
            ->post("{$this->baseUrl}/{$endpoint}", $data);
    }

    /**
     * Fazer requisição PATCH autenticada
     */
    protected function patch(string $endpoint, array $data = [])
    {
        $token = $this->getToken();
        
        if (!$token) {
            throw new \Exception('Não foi possível autenticar no GoContact.');
        }

        return Http::withoutVerifying()
            ->withToken($token)
            ->patch("{$this->baseUrl}/{$endpoint}", $data);
    }

    /**
     * Fazer requisição DELETE autenticada
     */
    protected function delete(string $endpoint, array $data = [])
    {
        $token = $this->getToken();
        
        if (!$token) {
            throw new \Exception('Não foi possível autenticar no GoContact.');
        }

        return Http::withoutVerifying()
            ->withToken($token)
            ->delete("{$this->baseUrl}/{$endpoint}", $data);
    }

    /**
     * Criar ou atualizar contato
     */
    public function syncContact(array $contactData)
    {
        // Lógica para criar ou atualizar
        // Verifica se já existe (por email ou telefone) e decide entre POST ou PUT
        // Endpoint hipotético
        $response = $this->post('api/crm/contacts', $contactData);

        return $response->json();
    }
}