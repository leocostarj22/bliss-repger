<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class BlissCustomer extends Model
{
    protected $connection = 'blissnatura';
    protected $table = 'customer';
    protected $primaryKey = 'customer_id';
    public $timestamps = false;

    protected $fillable = [
        'firstname', 'lastname', 'email', 'telephone', 'status', 'date_added'
    ];

    protected $casts = [
        'date_added' => 'datetime',
        'status' => 'boolean',
    ];

    public function getFullNameAttribute()
    {
        return "{$this->firstname} {$this->lastname}";
    }

    public function orders()
    {
        return $this->hasMany(BlissOrder::class, 'customer_id', 'customer_id');
    }
}