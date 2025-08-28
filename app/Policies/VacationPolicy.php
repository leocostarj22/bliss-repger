<?php

namespace App\Policies;

use App\Models\Vacation;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class VacationPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $this->isHRManager($user) || $user->isSupervisor();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Vacation $vacation): bool
    {
        return $user->isAdmin() || $this->isHRManager($user) || $user->isSupervisor();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin() || $this->isHRManager($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Vacation $vacation): bool
    {
        return $user->isAdmin() || $this->isHRManager($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Vacation $vacation): bool
    {
        return $user->isAdmin() || $this->isHRManager($user);
    }

    /**
     * Determine whether the user can approve vacations.
     */
    public function approve(User $user, Vacation $vacation): bool
    {
        return $user->isAdmin() || $this->isHRManager($user) || $user->isSupervisor();
    }

    /**
     * Verifica se o usuário é gestor de RH
     */
    private function isHRManager(User $user): bool
    {
        return $user->isManager() && 
               $user->department && 
               strtolower($user->department->name) === 'recursos humanos';
    }
}