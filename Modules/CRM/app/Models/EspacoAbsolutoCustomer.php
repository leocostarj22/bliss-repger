<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class EspacoAbsolutoCustomer extends Model
{
    protected $connection = 'espacoabsoluto';
    protected $table = 'user';
    protected $primaryKey = 'iduser';
    public $timestamps = false;

    protected $fillable = [
        'username', 'empresa', 'site', 'nome', 'email', 'telefone', 
        'data_added', 'data_edited', 'data_login', 'admin', 'top_admin'
    ];

    protected $casts = [
        'data_added' => 'datetime',
        'data_edited' => 'datetime',
        'data_login' => 'datetime',
        'admin' => 'boolean',
        'top_admin' => 'boolean',
    ];
}