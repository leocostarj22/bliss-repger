<?php

use Illuminate\Support\Facades\Broadcast;

// Canal para mensagens específicas do usuário
Broadcast::channel('messages.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Canal para todas as mensagens (admin)
Broadcast::channel('messages.all', function ($user) {
    return $user->hasRole('admin');
});

// Canal para tickets do usuário
Broadcast::channel('tickets.user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Canal para tickets (admin)
Broadcast::channel('tickets.admin', function ($user) {
    return $user->hasRole('admin');
});

// Canal para RH (admin)
Broadcast::channel('hr.admin', function ($user) {
    return $user->hasRole('admin');
});

// Canal para funcionários
Broadcast::channel('employees.all', function ($user) {
    return $user->hasRole(['admin', 'hr']);
});
