<?php

namespace Modules\CRM\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Modules\CRM\Models\Campaign;
use Modules\CRM\Models\Contact;
use Modules\CRM\Models\Delivery;

class DashboardController extends Controller
{
    /**
     * Get dashboard analytics data.
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        // Global Stats
        $totalSent = Delivery::whereNotNull('sent_at')->count();
        $totalOpened = Delivery::whereNotNull('opened_at')->count();
        $totalClicked = Delivery::whereNotNull('clicked_at')->count();
        $totalBounced = Delivery::whereNotNull('bounced_at')->count();

        $openRate = $totalSent > 0 ? round(($totalOpened / $totalSent) * 100, 1) : 0;
        $clickRate = $totalSent > 0 ? round(($totalClicked / $totalSent) * 100, 1) : 0;
        $bounceRate = $totalSent > 0 ? round(($totalBounced / $totalSent) * 100, 1) : 0;

        // Contacts Stats
        $totalContacts = Contact::count();
        
        // Calculate Growth (This Month vs Last Month)
        $contactsThisMonth = Contact::where('created_at', '>=', now()->startOfMonth())->count();
        $contactsLastMonth = Contact::whereBetween('created_at', [
            now()->subMonth()->startOfMonth(), 
            now()->subMonth()->endOfMonth()
        ])->count();
        
        if ($contactsLastMonth > 0) {
            $contactGrowth = round((($contactsThisMonth - $contactsLastMonth) / $contactsLastMonth) * 100, 1);
        } else {
            $contactGrowth = $contactsThisMonth > 0 ? 100 : 0;
        }

        $data = [
            'totalSent' => $totalSent,
            'openRate' => $openRate,
            'clickRate' => $clickRate,
            'bounceRate' => $bounceRate,
            'totalContacts' => $totalContacts,
            'contactGrowth' => $contactGrowth,
            'dailyMetrics' => $this->getDailyMetrics(),
            'topCampaigns' => $this->getTopCampaigns(),
            'heatmapData' => $this->getHeatmapData(),
        ];

        return response()->json(['data' => $data]);
    }

    private function getDailyMetrics(): array
    {
        // Group by date (last 30 days)
        $raw = Delivery::selectRaw('DATE(sent_at) as date, count(*) as sent')
            ->selectRaw('count(opened_at) as opened')
            ->selectRaw('count(clicked_at) as clicked')
            ->selectRaw('count(bounced_at) as bounced')
            ->where('sent_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->get()
            ->keyBy('date');

        $metrics = [];
        for ($i = 0; $i < 30; $i++) {
            $date = now()->subDays(29 - $i)->format('Y-m-d');
            $dayData = $raw->get($date);
            $metrics[] = [
                'date' => $date,
                'sent' => $dayData ? (int)$dayData->sent : 0,
                'opened' => $dayData ? (int)$dayData->opened : 0,
                'clicked' => $dayData ? (int)$dayData->clicked : 0,
                'bounced' => $dayData ? (int)$dayData->bounced : 0,
            ];
        }
        return $metrics;
    }

    private function getTopCampaigns(): array
    {
        // Top 5 campaigns by sent count
        return Campaign::withCount(['deliveries as sent' => function($q) {
                $q->whereNotNull('sent_at');
            }, 'deliveries as opened' => function($q) {
                $q->whereNotNull('opened_at');
            }, 'deliveries as clicked' => function($q) {
                $q->whereNotNull('clicked_at');
            }, 'deliveries as bounced' => function($q) {
                $q->whereNotNull('bounced_at');
            }])
            ->orderByDesc('sent')
            ->limit(5)
            ->get()
            ->map(function ($c) {
                return [
                    'campaignId' => (string)$c->id,
                    'campaignName' => $c->name,
                    'sent' => $c->sent ?? 0,
                    'opened' => $c->opened ?? 0,
                    'clicked' => $c->clicked ?? 0,
                    'bounced' => $c->bounced ?? 0,
                ];
            })
            ->toArray();
    }

    private function getHeatmapData(): array
    {
        // Heatmap based on open times (engagement)
        // 0=Sunday, 1=Monday... (matches JS usually if we adjust)
        
        $raw = Delivery::selectRaw('DAYOFWEEK(opened_at) - 1 as day, HOUR(opened_at) as hour, count(*) as value')
            ->whereNotNull('opened_at')
            ->groupBy('day', 'hour')
            ->get();
            
        return $raw->map(function($item) {
            return [
                'day' => (int)$item->day,
                'hour' => (int)$item->hour,
                'value' => (int)$item->value,
            ];
        })->toArray();
    }
}