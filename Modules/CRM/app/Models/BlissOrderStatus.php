<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class BlissOrderStatus extends Model
{
    protected $connection = 'blissnatura';
    protected $table = 'order_status';
    protected $primaryKey = 'order_status_id';
    public $timestamps = false;
}