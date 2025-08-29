<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Observers\TicketObserver;
use App\Models\Ticket;
use App\Observers\InternalMessageObserver;
use App\Models\InternalMessage;
use App\Observers\VacationObserver;
use App\Models\Vacation;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot()
    {
        Ticket::observe(TicketObserver::class);
        InternalMessage::observe(InternalMessage::class);
        Vacation::observe(VacationObserver::class);
    }
}

