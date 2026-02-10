<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class MyFormulaOrderOption extends Model
{
    protected $connection = 'myformula';
    protected $table = 'order_option';
    protected $primaryKey = 'order_option_id';
    public $timestamps = false;

    protected $fillable = [
        'order_id', 'order_product_id', 'product_option_id', 'product_option_value_id', 'name', 'value', 'type'
    ];
}