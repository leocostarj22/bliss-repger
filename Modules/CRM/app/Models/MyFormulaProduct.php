<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class MyFormulaProduct extends Model
{
    protected $connection = 'myformula';
    protected $table = 'product';
    protected $primaryKey = 'product_id';
    public $timestamps = false;

    protected $fillable = [
        'model', 'sku', 'price', 'quantity', 'status', 'date_added'
    ];

    protected $casts = [
        'date_added' => 'datetime',
        'status' => 'boolean',
        'price' => 'float',
    ];
}