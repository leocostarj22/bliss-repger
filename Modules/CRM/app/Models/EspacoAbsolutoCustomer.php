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

    public function messages()
    {
        return $this->hasMany(EspacoAbsolutoUserMessage::class, 'iduser', 'iduser');
    }

    public function getOriginAttribute()
    {
        $message = $this->messages()->orderBy('data_added', 'asc')->first();
        if (!$message) {
            return 'Desconhecido';
        }

        $subject = $message->subject;

        if (stripos($subject, 'Pergunta Grátis') !== false) return 'Pergunta Grátis';
        if (stripos($subject, 'Oração') !== false || stripos($subject, 'Orações') !== false) return 'CTA Orações';
        if (stripos($subject, 'E-book') !== false) return 'CTA E-book';
        if (stripos($subject, 'Tarot') !== false) return 'Tarot do Dia';
        if (stripos($subject, 'Pedido de Ligação') !== false) return 'Nós Ligamos';
        if (stripos($subject, 'Newsletter') !== false) return 'Newsletters';
        if (stripos($subject, 'Notícias') !== false) return 'Notícias';
        
        return 'Mensagens';
    }
}