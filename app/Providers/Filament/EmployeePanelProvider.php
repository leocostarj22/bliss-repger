<?php

namespace App\Providers\Filament;

use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use pxlrbt\FilamentSpotlight\SpotlightPlugin;
use Saade\FilamentFullCalendar\FilamentFullCalendarPlugin;
use Illuminate\Support\Facades\File;

class EmployeePanelProvider extends PanelProvider
{
    private function getBrandLogoUrl(): string
    {
        $brandingPath = base_path('branding.json');

        $branding = [
            'app_favicon' => 'images/gmfavicon.png',
        ];

        if (File::exists($brandingPath)) {
            $decoded = json_decode((string) File::get($brandingPath), true);
            if (is_array($decoded)) $branding = array_merge($branding, $decoded);
        }

        $raw = trim((string) ($branding['app_favicon'] ?? ''));
        if ($raw === '') return asset('images/logocolors.png');
        if (str_starts_with($raw, 'http://') || str_starts_with($raw, 'https://') || str_starts_with($raw, 'data:')) return $raw;

        $p = ltrim($raw, '/');
        if (str_starts_with($p, 'branding/')) return asset('storage/' . $p);
        if (str_starts_with($p, 'storage/')) return asset($p);
        return asset($p);
    }

    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('employee')
            ->path('/employee')
            ->login(\App\Filament\Employee\Pages\Login::class)
            ->authGuard('employee')
            ->topNavigation()
            ->databaseNotifications()
            ->databaseNotificationsPolling('2s')
            ->broadcasting()
            ->brandLogo($this->getBrandLogoUrl())
            ->colors([
                'primary' => Color::Purple,
            ])
            ->discoverResources(in: app_path('Filament/Employee/Resources'), for: 'App\\Filament\\Employee\\Resources')
            ->discoverPages(in: app_path('Filament/Employee/Pages'), for: 'App\\Filament\\Employee\\Pages')
            ->pages([
                Pages\Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Employee/Widgets'), for: 'App\\Filament\\Employee\\Widgets')
            ->widgets([
                //Widgets\AccountWidget::class,
                \App\Filament\Employee\Widgets\TaskStatsWidget::class,
                \App\Filament\Employee\Widgets\EmployeeInfoWidget::class,
                // \App\Filament\Widgets\ChatBotWidget::class, // REMOVIDO
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
            ]);
    }
}