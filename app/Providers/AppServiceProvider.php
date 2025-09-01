<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Observers\TicketObserver;
use App\Models\Ticket;
use App\Observers\InternalMessageObserver;
use App\Models\InternalMessage;
use App\Observers\VacationObserver;
use App\Models\Vacation;
use App\Observers\EmployeeObserver;
use App\Models\Employee;
use App\Observers\PostObserver;
use App\Models\Post;
use App\Observers\PayrollObserver;
use App\Models\Payroll;
use App\Observers\TimesheetObserver;
use App\Models\Timesheet;

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
        // Registrar observers para notificações em tempo real
        Ticket::observe(TicketObserver::class);
        InternalMessage::observe(InternalMessageObserver::class);
        Vacation::observe(VacationObserver::class);
        Employee::observe(EmployeeObserver::class);
        Post::observe(PostObserver::class);
        Payroll::observe(PayrollObserver::class);
        Timesheet::observe(TimesheetObserver::class);
    }
}

