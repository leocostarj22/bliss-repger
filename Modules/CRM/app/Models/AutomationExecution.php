<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AutomationExecution extends Model
{
    use HasUuids;

    protected $table = 'crm_automation_executions';

    protected $fillable = [
        'automation_id',
        'contact_id',
        'current_node_id',
        'status',
        'next_run_at',
        'context',
    ];

    protected $casts = [
        'context' => 'array',
        'next_run_at' => 'datetime',
    ];

    public function automation()
    {
        return $this->belongsTo(Automation::class);
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }

    public function logs()
    {
        return $this->hasMany(AutomationLog::class, 'execution_id');
    }
}