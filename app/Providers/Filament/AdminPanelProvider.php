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
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use pxlrbt\FilamentSpotlight\SpotlightPlugin;
use Saade\FilamentFullCalendar\FilamentFullCalendarPlugin;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
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
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->pages([
                Pages\Dashboard::class,
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
                NavigationGroup::make('Recursos Humanos'),
                NavigationGroup::make('Comunicação'),
                NavigationGroup::make('CRM'),
            ])
            // Descobrir recursos do módulo CRM
            ->discoverResources(in: base_path('Modules/CRM/app/Filament/Resources'), for: 'Modules\\CRM\\Filament\\Resources')
            ->discoverPages(in: base_path('Modules/CRM/app/Filament/Pages'), for: 'Modules\\CRM\\Filament\\Pages')
            ->discoverWidgets(in: base_path('Modules/CRM/app/Filament/Widgets'), for: 'Modules\\CRM\\Filament\\Widgets')
            ->widgets([
                Widgets\AccountWidget::class,
                Widgets\FilamentInfoWidget::class,
                \App\Filament\Resources\TicketResource\Widgets\StatsOverview::class,
                \App\Filament\Widgets\MessagesOverview::class,
                \App\Filament\Widgets\AdminPostsWidget::class,
            ])
            ->navigationGroups([
                NavigationGroup::make('Recursos Humanos'),
                NavigationGroup::make('Comunicação'),
                NavigationGroup::make('CRM'),
            ])
            
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

