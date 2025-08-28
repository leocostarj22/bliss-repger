<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Contracts\UserInterface;
use Illuminate\Auth\Access\HandlesAuthorization;

class TicketPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any tickets.
     */
    public function viewAny(UserInterface $user): bool
    {
        // Todos os usuários autenticados podem ver tickets (com filtros aplicados no getEloquentQuery)
        return true;
    }

    /**
     * Determine whether the user can view the ticket.
     */
    public function view(UserInterface $user, Ticket $ticket): bool
    {
        // Admins podem ver todos os tickets
        if ($user->isAdmin()) {
            return true;
        }

        // Managers podem ver tickets da sua empresa
        if ($user->isManager() && $user->getEmployee() && $user->getEmployee()->company_id === $ticket->company_id) {
            return true;
        }

        // Usuários podem ver apenas tickets que criaram ou que foram atribuídos a eles
        return $ticket->user_id === $user->getId() || $ticket->assigned_to === $user->getId();
    }

    /**
     * Determine whether the user can create tickets.
     */
    public function create(UserInterface $user): bool
    {
        // Todos os usuários autenticados podem criar tickets
        return true;
    }

    /**
     * Determine whether the user can update the ticket.
     */
    public function update(UserInterface $user, Ticket $ticket): bool
    {
        // Admins podem editar todos os tickets
        if ($user->isAdmin()) {
            return true;
        }

        // Managers podem editar tickets da sua empresa
        if ($user->isManager() && $user->getEmployee() && $user->getEmployee()->company_id === $ticket->company_id) {
            return true;
        }

        // Usuários podem editar apenas tickets que criaram ou que foram atribuídos a eles
        return $ticket->user_id === $user->getId() || $ticket->assigned_to === $user->getId();
    }

    /**
     * Determine whether the user can delete the ticket.
     */
    public function delete(UserInterface $user, Ticket $ticket): bool
    {
        // Apenas admins podem deletar tickets
        if ($user->isAdmin()) {
            return true;
        }

        // Managers podem deletar tickets da sua empresa
        if ($user->isManager() && $user->getEmployee() && $user->getEmployee()->company_id === $ticket->company_id) {
            return true;
        }

        // Usuários podem deletar apenas tickets que criaram (e que ainda não foram atribuídos)
        return $ticket->user_id === $user->getId() && !$ticket->assigned_to;
    }

    /**
     * Determine whether the user can assign tickets.
     */
    public function assign(UserInterface $user, Ticket $ticket): bool
    {
        // Admins e managers podem atribuir tickets
        if ($user->isAdmin() || $user->isManager()) {
            return true;
        }

        // Agentes podem atribuir tickets que foram atribuídos a eles
        return $ticket->assigned_to === $user->getId();
    }
}