<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckHRAccess
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();
        
        if (!$user) {
            abort(403, 'Acesso negado.');
        }

        // Admin sempre tem acesso
        if ($user->isAdmin()) {
            return $next($request);
        }

        // Gestor de RH tem acesso
        if ($user->isManager() && 
            $user->department && 
            strtolower($user->department->name) === 'recursos humanos') {
            return $next($request);
        }

        abort(403, 'Você não tem permissão para acessar recursos de RH.');
    }
}