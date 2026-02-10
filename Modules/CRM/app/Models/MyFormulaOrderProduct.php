<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class MyFormulaOrderProduct extends Model
{
    protected $connection = 'myformula';
    protected $table = 'order_product';
    protected $primaryKey = 'order_product_id';
    public $timestamps = false;

    protected $fillable = [
        'order_id', 'product_id', 'name', 'model', 'quantity', 'price', 'total', 'tax'
    ];

    public function options()
    {
        return $this->hasMany(MyFormulaOrderOption::class, 'order_product_id', 'order_product_id');
    }
}