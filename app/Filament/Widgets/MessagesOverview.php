<?php

namespace App\Filament\Widgets;

use App\Models\InternalMessage;
use App\Models\MessageRecipient;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Auth;

class MessagesOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $userId = Auth::id();
        
        // Mensagens não lidas recebidas
        $unreadMessages = MessageRecipient::where('recipient_id', $userId)
            ->whereNull('read_at')
            ->whereHas('message', function ($query) {
                $query->where('status', 'sent');
            })
            ->count();
        
        // Mensagens enviadas este mês
        $sentThisMonth = InternalMessage::where('sender_id', $userId)
            ->where('status', 'sent')
            ->whereMonth('sent_at', now()->month)
            ->whereYear('sent_at', now()->year)
            ->count();
        
        // Rascunhos
        $drafts = InternalMessage::where('sender_id', $userId)
            ->where('status', 'draft')
            ->count();
        
        // Mensagens com estrela
        $starred = MessageRecipient::where('recipient_id', $userId)
            ->where('is_starred', true)
            ->count();

        return [
            Stat::make('Mensagens Não Lidas', $unreadMessages)
                ->description('Mensagens recebidas')
                ->descriptionIcon('heroicon-m-envelope')
                ->color('warning'),
            
            Stat::make('Enviadas Este Mês', $sentThisMonth)
                ->description('Mensagens enviadas')
                ->descriptionIcon('heroicon-m-paper-airplane')
                ->color('success'),
            
            Stat::make('Rascunhos', $drafts)
                ->description('Mensagens em rascunho')
                ->descriptionIcon('heroicon-m-document-text')
                ->color('gray'),
            
            Stat::make('Com Estrela', $starred)
                ->description('Mensagens importantes')
                ->descriptionIcon('heroicon-m-star')
                ->color('warning'),
        ];
    }
}