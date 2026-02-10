<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class EspacoAbsolutoUserMessage extends Model
{
    protected $connection = 'espacoabsoluto';
    protected $table = 'user_messages';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'iduser', 'nome', 'telefone', 'email', 'subject', 'message', 
        'data_added', 'ip', 'apaga'
    ];

    protected $casts = [
        'data_added' => 'datetime',
        'apaga' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(EspacoAbsolutoCustomer::class, 'iduser', 'iduser');
    }
}