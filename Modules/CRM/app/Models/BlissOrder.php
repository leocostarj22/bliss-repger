<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class BlissOrder extends Model
{
    protected $connection = 'blissnatura';
    protected $table = 'order';
    protected $primaryKey = 'order_id';
    public $timestamps = false;

    protected $fillable = [
        'invoice_no', 'customer_id', 'firstname', 'lastname', 'email', 
        'telephone', 'total', 'order_status_id', 'date_added', 'date_modified',
        'payment_method', 'payment_code', 'shipping_method', 'shipping_code'
    ];

    protected $casts = [
        'date_added' => 'datetime',
        'date_modified' => 'datetime',
        'total' => 'decimal:2',
    ];

    public function status()
    {
        return $this->hasOne(BlissOrderStatus::class, 'order_status_id', 'order_status_id');
    }

    public function products()
    {
        return $this->hasMany(BlissOrderProduct::class, 'order_id', 'order_id');
    }
}