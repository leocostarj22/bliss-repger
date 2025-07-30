<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TicketAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'user_id',
        'ticket_comment_id',
        'original_name',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'disk',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relacionamentos
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function comment(): BelongsTo
    {
        return $this->belongsTo(TicketComment::class, 'ticket_comment_id');
    }

    // Scopes
    public function scopeForTicket($query, $ticketId)
    {
        return $query->where('ticket_id', $ticketId);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeImages($query)
    {
        return $query->where('mime_type', 'like', 'image/%');
    }

    public function scopeDocuments($query)
    {
        return $query->whereNotLike('mime_type', 'image/%');
    }

    // Métodos auxiliares
    public function getUrl(): string
    {
        return Storage::disk($this->disk)->url($this->file_path);
    }

    public function getDownloadUrl(): string
    {
        return route('tickets.attachments.download', $this->id);
    }

    public function exists(): bool
    {
        return Storage::disk($this->disk)->exists($this->file_path);
    }

    public function delete(): bool
    {
        // Remove o arquivo físico
        if ($this->exists()) {
            Storage::disk($this->disk)->delete($this->file_path);
        }
        
        // Remove o registro do banco
        return parent::delete();
    }

    public function isImage(): bool
    {
        return Str::startsWith($this->mime_type, 'image/');
    }

    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }

    public function isDocument(): bool
    {
        $documentTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ];
        
        return in_array($this->mime_type, $documentTypes);
    }

    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    public function getExtensionAttribute(): string
    {
        return pathinfo($this->original_name, PATHINFO_EXTENSION);
    }

    public function getIconAttribute(): string
    {
        if ($this->isImage()) {
            return 'heroicon-o-photo';
        }
        
        if ($this->isPdf()) {
            return 'heroicon-o-document-text';
        }
        
        return 'heroicon-o-document';
    }

    // Tipos de arquivo permitidos
    public static function getAllowedMimeTypes(): array
    {
        return [
            // Imagens
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            // Documentos
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
            // Arquivos compactados
            'application/zip',
            'application/x-rar-compressed',
        ];
    }

    public static function getMaxFileSize(): int
    {
        return 10 * 1024 * 1024; // 10MB
    }

    // Boot method
    protected static function boot()
    {
        parent::boot();
        
        // Ao deletar, remove o arquivo físico
        static::deleting(function ($attachment) {
            if ($attachment->exists()) {
                Storage::disk($attachment->disk)->delete($attachment->file_path);
            }
        });
    }
}