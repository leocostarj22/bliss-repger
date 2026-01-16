<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\File;

class ManageModules extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-puzzle-piece';
    protected static ?string $navigationLabel = 'Módulos';
    protected static ?string $title = 'Gestão de Módulos';
    protected static ?string $navigationGroup = 'Administração';
    protected static string $view = 'filament.pages.manage-modules';
    protected static ?int $navigationSort = 1;

    public $modules = [];

    public function mount(): void
    {
        $this->modules = $this->loadModuleStatuses();
    }

    // Salvar automaticamente quando qualquer checkbox for alterada
    public function updatedModules(): void
    {
        $this->save();
    }

    public function save(): void
    {
        $current = $this->loadModuleStatuses();
        $statuses = [];

        foreach ($current as $name => $enabled) {
            $statuses[$name] = (bool) ($this->modules[$name] ?? false);
        }

        $path = base_path('modules_statuses.json');

        if (! empty($statuses)) {
            File::put(
                $path,
                json_encode($statuses, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
            );
        }

        Notification::make() 
            ->title('Módulos atualizados com sucesso')
            ->success()
            ->send();
            
        // Forçar reload para atualizar menu
        $this->redirect(static::getUrl());
    }

    protected function loadModuleStatuses(): array
    {
        $path = base_path('modules_statuses.json');

        $modulesPath = base_path('Modules');
        $directories = [];

        if (is_dir($modulesPath)) {
            foreach (scandir($modulesPath) as $dir) {
                if ($dir === '.' || $dir === '..') {
                    continue;
                }

                $full = $modulesPath . DIRECTORY_SEPARATOR . $dir;

                if (is_dir($full)) {
                    $directories[] = $dir;
                }
            }
        }

        if (empty($directories)) {
            return [];
        }

        $statuses = [];

        if (File::exists($path)) {
            $data = json_decode(File::get($path), true);

            if (is_array($data)) {
                $statuses = $data;
            }
        }

        $modules = [];

        foreach ($directories as $dir) {
            $modules[$dir] = (bool) ($statuses[$dir] ?? true);
        }

        ksort($modules);

        return $modules;
    }

    public function getModuleDescription(string $name): string
    {
        return match ($name) {
            'CRM' => 'Gestão de leads, contactos e campanhas.',
            'Products' => 'Catálogo de produtos.',
            'Finance' => 'Gestão financeira e faturação.',
            'HumanResources' => 'Recursos Humanos (férias, folha de pagamento, ponto).',
            default => 'Módulo ' . $name,
        };
    }
}