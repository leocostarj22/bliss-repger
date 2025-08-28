<?php

namespace App\Providers;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\Timesheet;
use App\Models\Vacation;
use App\Models\Ticket;
use App\Policies\EmployeePolicy;
use App\Policies\PayrollPolicy;
use App\Policies\TimesheetPolicy;
use App\Policies\VacationPolicy;
use App\Policies\TicketPolicy;
use App\Models\PostComment;
use App\Policies\PostCommentPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Employee::class => EmployeePolicy::class,
        Payroll::class => PayrollPolicy::class,
        Timesheet::class => TimesheetPolicy::class,
        Vacation::class => VacationPolicy::class,
        Ticket::class => TicketPolicy::class,
        //PostComment::class => PostCommentPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        //
    }
}