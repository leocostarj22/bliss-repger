<?php

namespace App\Http\Controllers;

use App\Models\SystemLog;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SystemLogController extends Controller
{
    public function downloadJson(SystemLog $systemLog)
    {
        $logData = [
            'id' => $systemLog->id,
            'created_at' => $systemLog->created_at?->format('d/m/Y H:i:s'),
            'level' => $systemLog->level,
            'action' => $systemLog->action,
            'user' => [
                'id' => $systemLog->user?->id,
                'name' => $systemLog->user?->name ?? 'Sistema',
                'email' => $systemLog->user?->email,
            ],
            'model_type' => $systemLog->model_type,
            'model_id' => $systemLog->model_id,
            'description' => $systemLog->description,
            'ip_address' => $systemLog->ip_address,
            'user_agent' => $systemLog->user_agent,
            'context' => $systemLog->context,
        ];
        
        $fileName = 'log_' . $systemLog->id . '_' . now()->format('Y-m-d_H-i-s') . '.json';
        $jsonContent = json_encode($logData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        return response($jsonContent)
            ->header('Content-Type', 'application/json')
            ->header('Content-Disposition', 'attachment; filename="' . $fileName . '"');
    }
}