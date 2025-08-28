<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        // Rotas de logout do Filament
        'admin/logout',
        'employee/logout',
        // Outras rotas que podem precisar de exceção
        'api/*',
    ];
}