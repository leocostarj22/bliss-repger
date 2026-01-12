<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CampaignContact extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'gocontact_id',
        'load_date',
        'name',
        'phone_1',
        'phone_2',
        'phone_3',
        'phone_4',
        'phone_5',
        'phone_6',
        'phone_7',
        'phone_8',
        'email',
        'postal_code',
        'address',
        'city',
        'country',
        'question_1',
        'question_2',
        'question_3',
        'outcome',
        'total_calls',
        'total_recycle',
        'agent',
        'is_new',
        'is_closed',
        'is_in_recycle',
        'is_in_callback',
        'lead_status',
        'deleted',
    ];

    protected $casts = [
        'load_date' => 'datetime',
        'is_new' => 'boolean',
        'is_closed' => 'boolean',
        'is_in_recycle' => 'boolean',
        'is_in_callback' => 'boolean',
        'deleted' => 'boolean',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }
}