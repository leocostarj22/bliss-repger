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
        'subject',
        'preheader',
        'from_name',
        'from_email',
        'content',
        'gocontact_id',
        'channel',
        'status',
        'active',
        'segment_id',
        'template_id',
        'scheduled_at',
        'track_opens',
        'track_clicks',
        'track_replies',
        'use_google_analytics',
        'is_public',
        'physical_address',
        'created_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'active' => 'boolean',
        'track_opens' => 'boolean',
        'track_clicks' => 'boolean',
        'track_replies' => 'boolean',
        'use_google_analytics' => 'boolean',
        'is_public' => 'boolean',
    ];

    public function segment()
    {
        return $this->belongsTo(\Modules\CRM\Models\Segment::class);
    }

    public function campaignContacts()
    {
        return $this->hasMany(\Modules\CRM\Models\CampaignContact::class);
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