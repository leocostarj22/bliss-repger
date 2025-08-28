<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TicketPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any tickets.
     */
    public function viewAny(User $user): bool
    {
        // Admins e managers podem ver todos os tickets
        return $user->isAdmin() || $user->isManager();
    }

    /**
     * Determine whether the user can view the ticket.
     */
    public function view(User $user, Ticket $ticket): bool
    {
        // Admins podem ver todos os tickets
        if ($user->isAdmin()) {
            return true;
        }

        // Managers podem ver tickets da sua empresa
        if ($user->isManager() && $user->employee && $user->employee->company_id === $ticket->company_id) {
            return true;
        }

        // Usuários podem ver apenas tickets que criaram ou que foram atribuídos a eles
        return $ticket->user_id === $user->id || $ticket->assigned_to === $user->id;
    }

    /**
     * Determine whether the user can create tickets.
     */
    public function create(User $user): bool
    {
        // Todos os usuários autenticados podem criar tickets
        return true;
    }

    /**
     * Determine whether the user can update the ticket.
     */
    public function update(User $user, Ticket $ticket): bool
    {
        // Admins podem editar todos os tickets
        if ($user->isAdmin()) {
            return true;
        }

        // Managers podem editar tickets da sua empresa
        if ($user->isManager() && $user->employee && $user->employee->company_id === $ticket->company_id) {
            return true;
        }

        // Usuários podem editar apenas tickets que criaram ou que foram atribuídos a eles
        return $ticket->user_id === $user->id || $ticket->assigned_to === $user->id;
    }

    /**
     * Determine whether the user can delete the ticket.
     */
    public function delete(User $user, Ticket $ticket): bool
    {
        // Apenas admins podem deletar tickets
        if ($user->isAdmin()) {
            return true;
        }

        // Managers podem deletar tickets da sua empresa
        if ($user->isManager() && $user->employee && $user->employee->company_id === $ticket->company_id) {
            return true;
        }

        // Usuários podem deletar apenas tickets que criaram (e que ainda não foram atribuídos)
        return $ticket->user_id === $user->id && !$ticket->assigned_to;
    }

    /**
     * Determine whether the user can assign tickets.
     */
    public function assign(User $user, Ticket $ticket): bool
    {
        // Admins e managers podem atribuir tickets
        if ($user->isAdmin() || $user->isManager()) {
            return true;
        }

        // Agentes podem atribuir tickets que foram atribuídos a eles
        return $ticket->assigned_to === $user->id;
    }
}