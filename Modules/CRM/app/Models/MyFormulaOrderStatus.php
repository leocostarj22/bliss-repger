<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class MyFormulaOrderStatus extends Model
{
    protected $connection = 'myformula';
    protected $table = 'order_status';
    protected $primaryKey = 'order_status_id';
    public $timestamps = false;

    protected $fillable = [
        'language_id', 'name'
    ];
}