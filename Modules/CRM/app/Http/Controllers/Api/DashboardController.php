<?php

namespace Modules\CRM\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
    public function index(Request $request): JsonResponse
    {
        $daysRaw = $request->query('days');
        $days = is_numeric($daysRaw) ? (int) $daysRaw : null;
        if ($days !== null) {
            $days = max(1, min(365, $days));
        }

        $sinceSent = $days !== null ? now()->subDays($days) : null;
        $sinceOpened = $days !== null ? now()->subDays($days) : null;

        // Global Stats (quando ?days=... é enviado, calcula apenas no período)
        $sentScope = Delivery::query()->whereNotNull('sent_at');
        if ($sinceSent) {
            $sentScope->where('sent_at', '>=', $sinceSent);
        }

        $totalSent = (clone $sentScope)->count();
        $totalOpened = (clone $sentScope)->whereNotNull('opened_at')->count();
        $totalClicked = (clone $sentScope)->whereNotNull('clicked_at')->count();
        $totalBounced = (clone $sentScope)->whereNotNull('bounced_at')->count();

        $openRate = $totalSent > 0 ? round(($totalOpened / $totalSent) * 100, 1) : 0;
        $clickRate = $totalSent > 0 ? round(($totalClicked / $totalSent) * 100, 1) : 0;
        $bounceRate = $totalSent > 0 ? round(($totalBounced / $totalSent) * 100, 1) : 0;

        // Contacts Stats (mantém global)
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

        $daysForDaily = $days ?? 30;

        $data = [
            'totalSent' => $totalSent,
            'openRate' => $openRate,
            'clickRate' => $clickRate,
            'bounceRate' => $bounceRate,
            'totalContacts' => $totalContacts,
            'contactGrowth' => $contactGrowth,
            'dailyMetrics' => $this->getDailyMetrics($daysForDaily),
            'topCampaigns' => $this->getTopCampaigns($sinceSent),
            'heatmapData' => $this->getHeatmapData($sinceOpened),
        ];

        return response()->json(['data' => $data]);
    }

    private function getDailyMetrics(int $days): array
    {
        $days = max(1, min(365, $days));
        $since = now()->subDays($days);

        $raw = Delivery::selectRaw('DATE(sent_at) as date, count(*) as sent')
            ->selectRaw('count(opened_at) as opened')
            ->selectRaw('count(clicked_at) as clicked')
            ->selectRaw('count(bounced_at) as bounced')
            ->where('sent_at', '>=', $since)
            ->groupBy('date')
            ->get()
            ->keyBy('date');

        $metrics = [];
        $start = now()->subDays($days - 1)->startOfDay();
        for ($i = 0; $i < $days; $i++) {
            $date = $start->copy()->addDays($i)->format('Y-m-d');
            $dayData = $raw->get($date);
            $metrics[] = [
                'date' => $date,
                'sent' => $dayData ? (int) $dayData->sent : 0,
                'opened' => $dayData ? (int) $dayData->opened : 0,
                'clicked' => $dayData ? (int) $dayData->clicked : 0,
                'bounced' => $dayData ? (int) $dayData->bounced : 0,
            ];
        }

        return $metrics;
    }

    private function getTopCampaigns(?\DateTimeInterface $sinceSent = null): array
    {
        return Campaign::withCount([
                'deliveries as sent' => function ($q) use ($sinceSent) {
                    $q->whereNotNull('sent_at');
                    if ($sinceSent) {
                        $q->where('sent_at', '>=', $sinceSent);
                    }
                },
                'deliveries as opened' => function ($q) use ($sinceSent) {
                    $q->whereNotNull('opened_at');
                    if ($sinceSent) {
                        $q->where('sent_at', '>=', $sinceSent);
                    }
                },
                'deliveries as clicked' => function ($q) use ($sinceSent) {
                    $q->whereNotNull('clicked_at');
                    if ($sinceSent) {
                        $q->where('sent_at', '>=', $sinceSent);
                    }
                },
                'deliveries as bounced' => function ($q) use ($sinceSent) {
                    $q->whereNotNull('bounced_at');
                    if ($sinceSent) {
                        $q->where('sent_at', '>=', $sinceSent);
                    }
                },
            ])
            ->orderByDesc('sent')
            ->limit(5)
            ->get()
            ->map(function ($c) {
                return [
                    'campaignId' => (string) $c->id,
                    'campaignName' => $c->name,
                    'sent' => $c->sent ?? 0,
                    'opened' => $c->opened ?? 0,
                    'clicked' => $c->clicked ?? 0,
                    'bounced' => $c->bounced ?? 0,
                ];
            })
            ->toArray();
    }

    private function getHeatmapData(?\DateTimeInterface $sinceOpened = null): array
    {
        $q = Delivery::selectRaw('DAYOFWEEK(opened_at) - 1 as day, HOUR(opened_at) as hour, count(*) as value')
            ->whereNotNull('opened_at');

        if ($sinceOpened) {
            $q->where('opened_at', '>=', $sinceOpened);
        }

        $raw = $q
            ->groupBy('day', 'hour')
            ->get();

        return $raw->map(function ($item) {
            return [
                'day' => (int) $item->day,
                'hour' => (int) $item->hour,
                'value' => (int) $item->value,
            ];
        })->toArray();
    }
}