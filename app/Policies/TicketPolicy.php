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
        return (int) $ticket->assigned_to === (int) $user->getId() || ((string) $ticket->user_type === \App\Models\User::class && (int) $ticket->user_id === (int) $user->getId());
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
        return (int) $ticket->assigned_to === (int) $user->getId() || ((string) $ticket->user_type === \App\Models\User::class && (int) $ticket->user_id === (int) $user->getId());
    }

    /**
     * Determine whether the user can delete the ticket.
     */
    public function delete(UserInterface $user, Ticket $ticket): bool
    {
        return (string) $ticket->user_type === \App\Models\User::class && (int) $ticket->user_id === (int) $user->getId() && !$ticket->assigned_to;
    }

    /**
     * Determine whether the user can assign tickets.
     */
    public function assign(UserInterface $user, Ticket $ticket): bool
    {
        return (int) $ticket->assigned_to === (int) $user->getId() || ((string) $ticket->user_type === \App\Models\User::class && (int) $ticket->user_id === (int) $user->getId());
    }
}