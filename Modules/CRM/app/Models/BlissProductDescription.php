<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class BlissProductDescription extends Model
{
    protected $connection = 'blissnatura';
    protected $table = 'product_description';
    // Chave composta não é suportada nativamente pelo Eloquent para save(), 
    // mas funciona para leitura via relacionamentos.
    protected $primaryKey = 'product_id'; 
    public $timestamps = false;

    protected $fillable = ['product_id', 'language_id', 'name', 'description'];
}