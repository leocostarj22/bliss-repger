<?php

namespace App\Traits;

use App\Models\SystemLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait LogsActivity
{
    protected static function bootLogsActivity()
    {
        static::created(function ($model) {
            $model->logActivity('create', 'Registro criado');
        });

        static::updated(function ($model) {
            $model->logActivity('update', 'Registro atualizado');
        });

        static::deleted(function ($model) {
            $model->logActivity('delete', 'Registro excluído');
        });
    }

    public function logActivity(string $action, string $description, array $context = []): void
    {
        SystemLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'model_type' => get_class($this),
            'model_id' => $this->id,
            'description' => $description,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'level' => 'info',
            'context' => array_merge($context, [
                'model_data' => $this->toArray(),
            ]),
        ]);
    }
}