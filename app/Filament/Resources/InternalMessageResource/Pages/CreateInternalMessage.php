<?php

namespace App\Filament\Resources\InternalMessageResource\Pages;

use App\Filament\Resources\InternalMessageResource;
use App\Models\MessageRecipient;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;

class CreateInternalMessage extends CreateRecord
{
    protected static string $resource = InternalMessageResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['sender_id'] = Auth::id();
        return $data;
    }

    protected function handleRecordCreation(array $data): Model
    {
        // Extrair destinatários dos dados
        $recipients = $data['recipients'] ?? [];
        $ccRecipients = $data['cc_recipients'] ?? [];
        $bccRecipients = $data['bcc_recipients'] ?? [];
        
        // Remover destinatários dos dados da mensagem
        unset($data['recipients'], $data['cc_recipients'], $data['bcc_recipients']);
        
        // Criar a mensagem
        $record = static::getModel()::create($data);
        
        // Criar registros de destinatários
        foreach ($recipients as $recipientId) {
            MessageRecipient::create([
                'message_id' => $record->id,
                'recipient_id' => $recipientId,
                'type' => 'to',
            ]);
        }
        
        foreach ($ccRecipients as $recipientId) {
            MessageRecipient::create([
                'message_id' => $record->id,
                'recipient_id' => $recipientId,
                'type' => 'cc',
            ]);
        }
        
        foreach ($bccRecipients as $recipientId) {
            MessageRecipient::create([
                'message_id' => $record->id,
                'recipient_id' => $recipientId,
                'type' => 'bcc',
            ]);
        }
        
        return $record;
    }

    public function getTitle(): string
    {
        return 'Nova Mensagem';
    }
}