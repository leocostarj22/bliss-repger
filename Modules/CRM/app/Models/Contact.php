<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contact extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'postal_code',
        'address',
        'city',
        'company_id',
        'source',
        'status',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'tags',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'tags' => 'array',
    ];

    public function company()
    {
        return $this->belongsTo(\App\Models\Company::class);
    }

    public function automationExecutions()
    {
        return $this->hasMany(AutomationExecution::class);
    }
}