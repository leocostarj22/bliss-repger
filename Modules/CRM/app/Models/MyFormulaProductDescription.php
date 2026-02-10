<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class MyFormulaProductDescription extends Model
{
    protected $connection = 'myformula';
    protected $table = 'product_description';
    protected $primaryKey = 'product_id';
    public $timestamps = false;

    protected $fillable = [
        'product_id', 'language_id', 'name', 'description'
    ];
}