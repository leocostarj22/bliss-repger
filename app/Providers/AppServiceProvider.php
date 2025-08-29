<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\User;
use App\Models\Ticket;
use App\Models\InternalMessage;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\Post;
use App\Models\Vacation;
use App\Models\Timesheet;
use App\Observers\UserObserver;
use App\Observers\TicketObserver;
use App\Observers\InternalMessageObserver;
use App\Observers\EmployeeObserver;
use App\Observers\PayrollObserver;
use App\Observers\PostObserver;
use App\Observers\VacationObserver;
use App\Observers\TimesheetObserver;

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
    public function boot(): void
    {
        User::observe(UserObserver::class);
    
        // Registrar observers para broadcasting
        Ticket::observe(TicketObserver::class);
        InternalMessage::observe(InternalMessageObserver::class);
        Employee::observe(EmployeeObserver::class);
        Payroll::observe(PayrollObserver::class);
        Post::observe(PostObserver::class);
        Vacation::observe(VacationObserver::class);
        Timesheet::observe(TimesheetObserver::class);
    }
}
