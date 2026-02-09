<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class BlissProduct extends Model
{
    protected $connection = 'blissnatura';
    protected $table = 'product';
    protected $primaryKey = 'product_id';
    public $timestamps = false;

    protected $fillable = [
        'model', 'quantity', 'price', 'status', 'date_added', 'date_modified', 'image'
    ];

    protected $casts = [
        'date_added' => 'datetime',
        'date_modified' => 'datetime',
        'status' => 'boolean',
    ];

    // Removido o filtro de language_id para garantir que traz algo. 
    // O ideal seria filtrar pelo idioma da loja, ex: ->where('language_id', 2) se for PT.
    public function description()
    {
        return $this->hasOne(BlissProductDescription::class, 'product_id', 'product_id');
    }

    public function getNameAttribute()
    {
        return $this->description->name ?? 'Sem Nome';
    }

    public function getImageUrlAttribute()
    {
        if (!$this->image) return null;
        
        // Separa o caminho por barras e codifica cada parte (para tratar espaços e acentos)
        $pathParts = explode('/', $this->image);
        $encodedPath = array_map('rawurlencode', $pathParts);
        $cleanPath = implode('/', $encodedPath);

        return 'https://blissnatura.pt/image/' . $cleanPath;
    }
}