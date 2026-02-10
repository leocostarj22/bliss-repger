<?php

namespace App\Providers\Filament;

use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets;
use Filament\Navigation\NavigationGroup;
use Filament\Navigation\MenuItem;
use App\Filament\Pages\UserProfile;
use App\Filament\Pages\Dashboard;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use pxlrbt\FilamentSpotlight\SpotlightPlugin;
use Saade\FilamentFullCalendar\FilamentFullCalendarPlugin;
use Filament\View\PanelsRenderHook;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\File;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        $panel = $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->databaseNotifications()
            ->broadcasting()
            ->databaseNotificationsPolling('2s')
            ->colors([
                'primary' => Color::Purple,
            ])
            ->userMenuItems([
                MenuItem::make()
                    ->label('Meu Perfil')
                    ->url(fn (): string => UserProfile::getUrl())
                    ->icon('heroicon-o-user-circle'),
            ])
            ->renderHook(
                PanelsRenderHook::BODY_END,
                fn (): string => '<script src="https://www.nextgo.pt/widget.js" data-id="fb60f57a-a3ca-4748-b843-967e12465c76"></script>'
            )
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->pages([
                Dashboard::class,
            ])
            ->brandLogo(asset('images/logocolors.png'))
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([
                Widgets\AccountWidget::class,
                Widgets\FilamentInfoWidget::class,
                \App\Filament\Resources\TicketResource\Widgets\StatsOverview::class,
                \App\Filament\Widgets\MessagesOverview::class,
                \App\Filament\Widgets\AdminPostsWidget::class,
            ])
            ->navigationGroups([
                NavigationGroup::make('Administração')
                    ->collapsible()
                    ->collapsed(),
                NavigationGroup::make('Recursos Humanos')
                    ->collapsible()
                    ->collapsed(),
                NavigationGroup::make('Comunicação')
                    ->collapsible()
                    ->collapsed(),
                NavigationGroup::make('CRM')
                    ->collapsible()
                    ->collapsed(),
                NavigationGroup::make('Bliss Natura')
                    ->collapsible()
                    ->collapsed(),
                NavigationGroup::make('MyFormula')
                    ->collapsible()
                    ->collapsed(),
                NavigationGroup::make('Espaço Absoluto')
                    ->collapsible()
                    ->collapsed(),
                NavigationGroup::make('Catálogo')
                    ->collapsible()
                    ->collapsed(),
                NavigationGroup::make('Suporte')
                    ->collapsible()
                    ->collapsed(),
            ]);

        $moduleStatuses = $this->getModuleStatuses();

        if ($this->isModuleEnabled($moduleStatuses, 'CRM')) {
            $panel
                ->discoverResources(in: base_path('Modules/CRM/app/Filament/Resources'), for: 'Modules\\CRM\\Filament\\Resources')
                ->discoverPages(in: base_path('Modules/CRM/app/Filament/Pages'), for: 'Modules\\CRM\\Filament\\Pages')
                ->discoverWidgets(in: base_path('Modules/CRM/app/Filament/Widgets'), for: 'Modules\\CRM\\Filament\\Widgets')
                ->discoverClusters(in: base_path('Modules/CRM/app/Filament/Clusters'), for: 'Modules\\CRM\\Filament\\Clusters');
        }

        if ($this->isModuleEnabled($moduleStatuses, 'Products')) {
            $panel
                ->discoverResources(in: base_path('Modules/Products/app/Filament/Resources'), for: 'Modules\\Products\\Filament\\Resources')
                ->discoverPages(in: base_path('Modules/Products/app/Filament/Pages'), for: 'Modules\\Products\\Filament\\Pages')
                ->discoverWidgets(in: base_path('Modules/Products/app/Filament/Widgets'), for: 'Modules\\Products\\Filament\\Widgets');
        }

        if ($this->isModuleEnabled($moduleStatuses, 'Finance')) {
            $panel
                ->discoverResources(in: base_path('Modules/Finance/app/Filament/Resources'), for: 'Modules\\Finance\\Filament\\Resources')
                ->discoverPages(in: base_path('Modules/Finance/app/Filament/Pages'), for: 'Modules\\Finance\\Filament\\Pages')
                ->discoverWidgets(in: base_path('Modules/Finance/app/Filament/Widgets'), for: 'Modules\\Finance\\Filament\\Widgets');
        }

        if ($this->isModuleEnabled($moduleStatuses, 'HumanResources')) {
            $panel
                ->discoverResources(in: base_path('Modules/HumanResources/app/Filament/Resources'), for: 'Modules\\HumanResources\\Filament\\Resources');
        }

        if ($this->isModuleEnabled($moduleStatuses, 'BlissNatura')) {
            $panel
                ->discoverResources(in: base_path('Modules/BlissNatura/app/Filament/Resources'), for: 'Modules\\BlissNatura\\Filament\\Resources');
        }

        return $panel
            ->plugins([
                SpotlightPlugin::make(),
                FilamentFullCalendarPlugin::make()
                    ->selectable()
                    ->editable()
                    ->schedulerLicenseKey('GPL-My-Project-Is-Open-Source')
                    ->config([
                        'locale' => 'pt-pt',
                    ]),
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ])
            // Adicionar este método para registar eventos
            ->bootUsing(function () {
                Event::listen(Login::class, function (Login $event) {
                    if ($event->user instanceof \App\Models\User) {
                        $event->user->updateLastLogin();
                    }
                });
            });
    }

    private function getModuleStatuses(): array
    {
        $path = base_path('modules_statuses.json');

        if (! File::exists($path)) {
            return [];
        }

        $data = json_decode(File::get($path), true);

        return is_array($data) ? $data : [];
    }

    private function isModuleEnabled(array $statuses, string $moduleName): bool
    {
        return $statuses[$moduleName] ?? true;
    }

    /**
     * Verifica se o usuário pode acessar recursos de RH
     */
    private function canAccessHR(): bool
    {
        $user = auth()->user();
        
        if (!$user) {
            return false;
        }

        // Admin sempre tem acesso
        if ($user->isAdmin()) {
            return true;
        }

        // Gestor de RH tem acesso
        if ($user->isManager() && 
            $user->department && 
            strtolower($user->department->name) === 'recursos humanos') {
            return true;
        }

        return false;
    }
}

