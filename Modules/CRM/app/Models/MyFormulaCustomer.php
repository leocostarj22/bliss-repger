<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class MyFormulaCustomer extends Model
{
    protected $connection = 'myformula';
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

    public function getNameAttribute()
    {
        return "{$this->firstname} {$this->lastname}";
    }
}