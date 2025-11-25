<?php

namespace Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Segment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'definition',
    ];

    protected $casts = [
        'definition' => 'array',
        'created_at' => 'datetime',
    ];
}