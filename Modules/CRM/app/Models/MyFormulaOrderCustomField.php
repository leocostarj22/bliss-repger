<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class MyFormulaOrderCustomField extends Model
{
    protected $connection = 'myformula';
    protected $table = 'order_custom_field'; // Assuming standard OC table name
    protected $primaryKey = 'order_custom_field_id';
    public $timestamps = false;

    protected $fillable = [
        'order_id', 'custom_field_id', 'custom_field_value_id', 'name', 'value', 'type', 'location'
    ];
}