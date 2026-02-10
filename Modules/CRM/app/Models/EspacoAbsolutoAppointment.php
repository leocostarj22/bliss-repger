<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class EspacoAbsolutoAppointment extends Model
{
    protected $connection = 'espacoabsoluto';
    protected $table = 'appointments_periods';
    protected $primaryKey = 'period_id';
    public $timestamps = true;

    protected $fillable = [
        'appointment_id', 'therapist_id', 'questions', 'type', 'channel',
        'has_calendar', 'date_from', 'date_to', 'name', 'birth_date',
        'job', 'address', 'zip_code', 'local', 'country_id', 'duration',
        'value', 'currency', 'phone', 'email', 'observations', 'user_questions',
        'ip', 'status'
    ];

    protected $casts = [
        'date_from' => 'datetime',
        'date_to' => 'datetime',
        'birth_date' => 'date',
        'has_calendar' => 'boolean',
    ];
}