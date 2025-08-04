<?php

namespace App\Filament\Widgets;

use App\Models\InternalMessage;
use App\Models\MessageRecipient;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Auth;
use App\Filament\Resources\InboxResource;
use App\Filament\Resources\InternalMessageResource;

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
                ->description($unreadMessages > 0 ? 'Clique para ver mensagens não lidas' : 'Nenhuma mensagem não lida')
                ->descriptionIcon('heroicon-m-envelope')
                ->color($unreadMessages > 0 ? 'warning' : 'success')
                ->url(InboxResource::getUrl('index', [
                    'tableFilters' => [
                        'read_status' => [
                            'value' => 'unread'
                        ]
                    ]
                ])),
            
            Stat::make('Enviadas Este Mês', $sentThisMonth)
                ->description('Mensagens enviadas em ' . now()->format('M/Y'))
                ->descriptionIcon('heroicon-m-paper-airplane')
                ->color('success')
                ->url(InternalMessageResource::getUrl('index', [
                    'tableFilters' => [
                        'status' => [
                            'value' => 'sent'
                        ]
                    ]
                ])),
            
            Stat::make('Rascunhos', $drafts)
                ->description($drafts > 0 ? 'Clique para ver rascunhos' : 'Nenhum rascunho pendente')
                ->descriptionIcon('heroicon-m-document-text')
                ->color($drafts > 0 ? 'warning' : 'gray')
                ->url(InternalMessageResource::getUrl('index', [
                    'tableFilters' => [
                        'status' => [
                            'value' => 'draft'
                        ]
                    ]
                ])),
            
            Stat::make('Com Estrela', $starred)
                ->description($starred > 0 ? 'Mensagens marcadas como importantes' : 'Nenhuma mensagem com estrela')
                ->descriptionIcon('heroicon-m-star')
                ->color($starred > 0 ? 'warning' : 'gray')
                ->url(InboxResource::getUrl('index', [
                    'tableFilters' => [
                        'starred' => [
                            'value' => true
                        ]
                    ]
                ])),
        ];
    }
}