<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Role;

class UserObserver
{
    /**
     * Handle the User "saving" event.
     */
    public function saving(User $user): void
    {
        // Se role_id foi alterado, sincronizar o campo role
        if ($user->isDirty('role_id')) {
            if ($user->role_id) {
                $role = Role::find($user->role_id);
                if ($role) {
                    $user->role = $role->name;
                }
            } else {
                $user->role = 'customer'; // valor padrão
            }
        }
        
        // Se role foi alterado diretamente, sincronizar role_id
        if ($user->isDirty('role') && !$user->isDirty('role_id')) {
            $role = Role::where('name', $user->role)->first();
            if ($role) {
                $user->role_id = $role->id;
            }
        }
    }
}