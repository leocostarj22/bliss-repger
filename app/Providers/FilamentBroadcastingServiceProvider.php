<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Filament\Support\Facades\FilamentView;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Traits\HasRoles;

class FilamentBroadcastingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Injetar dados do usuário no layout do Filament
        FilamentView::registerRenderHook(
            'panels::body.end',
            fn (): string => $this->getUserDataScript()
        );
    }
    
    private function getUserDataScript(): string
    {
        if (!Auth::check()) {
            return '';
        }
        
        $user = Auth::user();
        
        $userId = $user->id;
        $departmentId = $user->department_id ?? null;
        $companyId = $user->company_id ?? null;
        
        // Verificar se o usuário tem acesso ao RH baseado no role
        $canAccessHR = false;
        if (method_exists($user, 'hasRole')) {
            $canAccessHR = $user->hasRole('admin') || $user->hasRole('hr');
        } elseif (isset($user->role)) {
            $canAccessHR = in_array($user->role, ['admin', 'hr']);
        }
        
        $departmentIdJs = $departmentId ? $departmentId : 'null';
        $companyIdJs = $companyId ? $companyId : 'null';
        $canAccessHRJs = $canAccessHR ? 'true' : 'false';
        
        return "<script>
            document.addEventListener('DOMContentLoaded', function() {
                if (typeof window.setUserData === 'function') {
                    window.setUserData({$userId}, {$departmentIdJs}, {$companyIdJs}, {$canAccessHRJs});
                }
            });
        </script>";
    }
}