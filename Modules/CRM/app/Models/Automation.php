<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Automation extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'crm_automations';

    protected $fillable = [
        'name',
        'description',
        'status',
        'trigger_type',
        'trigger_config',
        'graph_data',
        'triggered_count',
    ];

    protected $casts = [
        'trigger_config' => 'array',
        'graph_data' => 'array',
    ];

    public function executions()
    {
        return $this->hasMany(AutomationExecution::class);
    }
}