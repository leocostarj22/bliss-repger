<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Campaign extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'gocontact_id',
        'channel',
        'status',
        'segment_id',
        'template_id',
        'scheduled_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
    ];

    public function segment()
    {
        return $this->belongsTo(\Modules\CRM\Models\Segment::class);
    }

    public function template()
    {
        return $this->belongsTo(\Modules\CRM\Models\Template::class);
    }

    public function deliveries()
    {
        return $this->hasMany(\Modules\CRM\Models\Delivery::class);
    }
}