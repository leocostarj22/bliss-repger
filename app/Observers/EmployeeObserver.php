<?php

namespace App\Observers;

use App\Models\Employee;
use App\Events\EmployeeCreated;
use App\Events\EmployeeUpdated;
use App\Jobs\ProcessHRBroadcast;

class EmployeeObserver
{
    /**
     * Handle the Employee "created" event.
     */
    public function created(Employee $employee): void
    {
        ProcessHRBroadcast::dispatch(new EmployeeCreated($employee));
    }

    /**
     * Handle the Employee "updated" event.
     */
    public function updated(Employee $employee): void
    {
        // Só disparar se campos importantes foram alterados
        $importantFields = ['position', 'department_id', 'salary', 'status', 'hire_date'];
        
        if ($employee->wasChanged($importantFields)) {
            ProcessHRBroadcast::dispatch(new EmployeeUpdated($employee, $employee->getChanges()));
        }
    }
}