<?php

namespace Modules\CRM\Providers;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class CRMServiceProvider extends ServiceProvider
{

    protected string $name = 'CRM';
    protected string $nameLower = 'crm';

    public function boot(): void
    {
        $this->registerCommands();
        $this->registerCommandSchedules();
        $this->registerTranslations();
        $this->registerConfig();
        $this->registerViews();
        $this->loadMigrationsFrom(base_path('Modules/' . $this->name . '/database/migrations'));
        $this->registerFilamentResources();
    }

    protected function registerFilamentResources(): void
    {
        // Filament resources are automatically discovered through PSR-4 autoloading
        // This method can be used for additional Filament-specific configurations
        if (class_exists(\Filament\Facades\Filament::class)) {
            // Any additional Filament configuration can go here
        }
    }

    public function register(): void
    {
        $this->app->register(EventServiceProvider::class);
        $this->app->register(RouteServiceProvider::class);
    }

    protected function registerCommands(): void
    {
        // ... existing code ...
    }

    protected function registerCommandSchedules(): void
    {
        // ... existing code ...
    }

    protected function registerTranslations(): void
    {
        $langPath = resource_path('lang/modules/'.$this->nameLower);

        if (is_dir($langPath)) {
            $this->loadTranslationsFrom($langPath, $this->nameLower);
            $this->loadJsonTranslationsFrom($langPath);
        } else {
            $this->loadTranslationsFrom(base_path('Modules/' . $this->name . '/lang'), $this->nameLower);
            $this->loadJsonTranslationsFrom(base_path('Modules/' . $this->name . '/lang'));
        }
    }

    protected function registerConfig(): void
    {
        $configPath = base_path('Modules/' . $this->name . '/config');
        if (is_dir($configPath)) {
            $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($configPath));
            foreach ($iterator as $file) {
                if ($file->isFile() && $file->getExtension() === 'php') {
                    $relative = str_replace($configPath . DIRECTORY_SEPARATOR, '', $file->getPathname());
                    $normalized = explode(DIRECTORY_SEPARATOR, str_replace('.php', '', $relative));
                    $key = ($relative === 'config.php') ? $this->nameLower : implode('.', $normalized);

                    $this->publishes([$file->getPathname() => config_path($relative)], 'config');
                    $this->merge_config_from($file->getPathname(), $key);
                }
            }
        }
    }

    protected function merge_config_from(string $path, string $key): void
    {
        $existing = config($key, []);
        $moduleConfig = require $path;
        config([$key => array_replace_recursive($existing, $moduleConfig)]);
    }

    public function registerViews(): void
    {
        $viewPath = resource_path('views/modules/' . $this->nameLower);
        $sourcePath = base_path('Modules/' . $this->name . '/resources/views');

        $this->publishes([$sourcePath => $viewPath], ['views', $this->nameLower . '-module-views']);

        $this->loadViewsFrom(array_merge($this->getPublishableViewPaths(), [$sourcePath]), $this->nameLower);

        Blade::componentNamespace(config('modules.namespace') . '\\' . $this->name . '\\View\\Components', $this->nameLower);
    }

    public function provides(): array
    {
        return [];
    }

    private function getPublishableViewPaths(): array
    {
        $paths = [];
        foreach (config('view.paths') as $path) {
            if (is_dir($path . '/modules/' . $this->nameLower)) {
                $paths[] = $path . '/modules/' . $this->nameLower;
            }
        }
        return $paths;
    }
}
