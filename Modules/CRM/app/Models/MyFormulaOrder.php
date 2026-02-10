<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class MyFormulaOrder extends Model
{
    protected $connection = 'myformula';
    protected $table = 'order';
    protected $primaryKey = 'order_id';
    public $timestamps = false;

    protected $fillable = [
        'invoice_no', 'store_name', 'customer_id', 'firstname', 'lastname', 
        'email', 'telephone', 'total', 'order_status_id', 'date_added', 'date_modified'
    ];

    protected $casts = [
        'date_added' => 'datetime',
        'date_modified' => 'datetime',
        'total' => 'float',
    ];

    public function customer()
    {
        return $this->belongsTo(MyFormulaCustomer::class, 'customer_id', 'customer_id');
    }
}