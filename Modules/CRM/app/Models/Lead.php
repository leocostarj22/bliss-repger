<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lead extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'company',
        'status',
        'source',
        'notes',
        'assigned_to',
        'value',
        'expected_close_date',
    ];

    protected $casts = [
        'expected_close_date' => 'date',
        'value' => 'decimal:2',
    ];

    public function assignedTo()
    {
        return $this->belongsTo(\App\Models\User::class, 'assigned_to');
    }

    public function getStatusColorAttribute()
    {
        return match($this->status) {
            'new' => 'gray',
            'contacted' => 'blue',
            'qualified' => 'yellow',
            'proposal' => 'purple',
            'negotiation' => 'orange',
            'won' => 'success',
            'lost' => 'danger',
            default => 'gray',
        };
    }

    public static function getStatuses()
    {
        return [
            'new' => 'Novo',
            'contacted' => 'Contatado',
            'qualified' => 'Qualificado',
            'proposal' => 'Proposta',
            'negotiation' => 'Negociação',
            'won' => 'Ganho',
            'lost' => 'Perdido',
        ];
    }

    public static function getSources()
    {
        return [
            'website'       => 'Website',
            'referral'      => 'Indicação',
            'social_media'  => 'Redes Sociais',
            'email_marketing' => 'Email Marketing',
            'cold_call'     => 'Cold Call',
            'event'         => 'Evento',
            'quiz'          => 'Quiz MyFormula',
            'other'         => 'Outro',
        ];
    }

    protected static function newFactory()
    {
        return \Modules\CRM\Database\Factories\LeadFactory::new();
    }
}