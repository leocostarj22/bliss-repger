<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Delivery extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'contact_id',
        'status',
        'sent_at',
        'opened_at',
        'clicked_at',
        'clicked_url',
        'bounced_at',
        'unsubscribed_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'opened_at' => 'datetime',
        'clicked_at' => 'datetime',
        'bounced_at' => 'datetime',
        'unsubscribed_at' => 'datetime',
    ];

    public function campaign()
    {
        return $this->belongsTo(\Modules\CRM\Models\Campaign::class);
    }

    public function contact()
    {
        return $this->belongsTo(\Modules\CRM\Models\Contact::class);
    }
}