<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class EspacoAbsolutoUserGroup extends Model
{
    protected $connection = 'espacoabsoluto';
    protected $table = 'user_groups';
    protected $primaryKey = 'idgrupo';
    public $timestamps = false;

    protected $fillable = [
        'nome', 'dashboard', 'system', 'apaga'
    ];
}