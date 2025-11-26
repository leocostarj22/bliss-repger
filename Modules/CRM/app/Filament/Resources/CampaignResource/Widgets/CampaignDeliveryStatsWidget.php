<?php

namespace Modules\CRM\Filament\Resources\CampaignResource\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Modules\CRM\Models\Delivery;

class CampaignDeliveryStatsWidget extends BaseWidget
{
    public int $campaignId = 0;

    public function mount(): void
    {
        $this->campaignId = (int) (request()->route('record') ?? 0);
    }

    protected function getStats(): array
    {
        $campaignId = $this->campaignId;
        if (! $campaignId) {
            return [
                Stat::make('Entregas', 0)->color('primary'),
            ];
        }

        $total        = Delivery::where('campaign_id', $campaignId)->count();
        $queued       = Delivery::where('campaign_id', $campaignId)->where('status', 'queued')->count();
        $sending      = Delivery::where('campaign_id', $campaignId)->where('status', 'sending')->count();
        $sent         = Delivery::where('campaign_id', $campaignId)->where('status', 'sent')->count();
        $opened       = Delivery::where('campaign_id', $campaignId)->whereNotNull('opened_at')->count();
        $clicked      = Delivery::where('campaign_id', $campaignId)->whereNotNull('clicked_at')->count();
        $bounced      = Delivery::where('campaign_id', $campaignId)->whereNotNull('bounced_at')->count();
        $unsubscribed = Delivery::where('campaign_id', $campaignId)->whereNotNull('unsubscribed_at')->count();

        return [
            Stat::make('Total', $total)->color('primary'),
            Stat::make('Em fila', $queued)->color('warning'),
            Stat::make('Enviando', $sending)->color('info'),
            Stat::make('Enviadas', $sent)->color('success'),
            Stat::make('Abertas', $opened)->color('success'),
            Stat::make('Clicadas', $clicked)->color('success'),
            Stat::make('Falhas', $bounced)->color('danger'),
            Stat::make('Descadastrados', $unsubscribed)->color('gray'),
        ];
    }

    protected static ?string $pollingInterval = '5s';
    protected static bool $isLazy = false;
}