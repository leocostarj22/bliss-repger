<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AutomationLog extends Model
{
    use HasUuids;

    protected $table = 'crm_automation_logs';

    protected $fillable = [
        'execution_id',
        'node_id',
        'node_type',
        'node_label',
        'status',
        'message',
        'output',
    ];

    protected $casts = [
        'output' => 'array',
    ];

    public function execution()
    {
        return $this->belongsTo(AutomationExecution::class, 'execution_id');
    }
}