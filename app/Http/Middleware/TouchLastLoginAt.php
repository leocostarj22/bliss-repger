<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TouchLastLoginAt
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();

        if ($user instanceof User) {
            $shouldTouch = $request->is('api/*') || $request->is('admin/*') || $request->is('newadmin/*');

            if ($shouldTouch && strtoupper((string) $request->method()) !== 'OPTIONS') {
                try {
                    $now = now();
                    $last = $user->last_login_at;

                    if ($last === null || $last->lt($now->copy()->subMinutes(5))) {
                        $user->forceFill(['last_login_at' => $now])->saveQuietly();
                    }
                } catch (\Throwable $e) {
                }
            }
        }

        return $next($request);
    }
}