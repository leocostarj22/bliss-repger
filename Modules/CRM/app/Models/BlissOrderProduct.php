<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class BlissOrderProduct extends Model
{
    protected $connection = 'blissnatura';
    protected $table = 'order_product';
    protected $primaryKey = 'order_product_id';
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'product_id',
        'name',
        'model',
        'quantity',
        'price',
        'total',
        'tax',
        'reward'
    ];
    
    protected $casts = [
        'price' => 'decimal:2',
        'total' => 'decimal:2',
        'tax' => 'decimal:2',
    ];
}