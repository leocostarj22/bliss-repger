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
        'email', 'telephone', 'total', 'order_status_id', 'date_added', 'date_modified',
        'payment_method', 'payment_code'
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

    public function products()
    {
        return $this->hasMany(MyFormulaOrderProduct::class, 'order_id', 'order_id');
    }

    public function options()
    {
        return $this->hasMany(MyFormulaOrderOption::class, 'order_id', 'order_id');
    }

    public function customFields()
    {
        return $this->hasMany(MyFormulaOrderCustomField::class, 'order_id', 'order_id');
    }

    public function quiz()
    {
        // Try to link via order_id if quiz has it, or fallback logic
        // Assuming quiz table might have order_id or we match by email/customer
        return $this->hasOne(Quiz::class, 'order_id', 'order_id');
    }

    public function status()
    {
        return $this->belongsTo(MyFormulaOrderStatus::class, 'order_status_id', 'order_status_id')
            ->where('language_id', 2);
    }
}