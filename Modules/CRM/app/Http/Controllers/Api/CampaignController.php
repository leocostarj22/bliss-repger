<?php

namespace Modules\CRM\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\CRM\Models\Campaign;

class CampaignController extends Controller
{
    /**
     * Get list of campaigns with stats.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Campaign::query();

        // Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Search Filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        // Eager load stats
        $query->withCount(['deliveries as sentCount' => function($q) {
                $q->whereNotNull('sent_at');
            }, 'deliveries as openedCount' => function($q) {
                $q->whereNotNull('opened_at');
            }, 'deliveries as clickedCount' => function($q) {
                $q->whereNotNull('clicked_at');
            }, 'deliveries as bouncedCount' => function($q) {
                $q->whereNotNull('bounced_at');
            }])
            ->with('segment');

        // Pagination
        $perPage = $request->input('perPage', 10);
        $campaigns = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Transform data
        $data = $campaigns->map(function ($campaign) {
            $sent = $campaign->sentCount;
            return [
                'id' => (string)$campaign->id,
                'name' => $campaign->name,
                'subject' => $campaign->subject ?? $campaign->name,
                'preheader' => $campaign->preheader,
                'fromName' => $campaign->from_name,
                'fromEmail' => $campaign->from_email,
                'status' => $campaign->status,
                'channel' => $campaign->channel,
                'listId' => (string)($campaign->segment_id ?? ''),
                'listName' => $campaign->segment ? $campaign->segment->name : 'All Contacts',
                'trackOpens' => $campaign->track_opens,
                'trackClicks' => $campaign->track_clicks,
                'trackReplies' => $campaign->track_replies,
                'useGoogleAnalytics' => $campaign->use_google_analytics,
                'isPublic' => $campaign->is_public,
                'physicalAddress' => $campaign->physical_address,
                'sentCount' => $sent,
                'openRate' => $sent > 0 ? round(($campaign->openedCount / $sent) * 100, 1) : 0,
                'clickRate' => $sent > 0 ? round(($campaign->clickedCount / $sent) * 100, 1) : 0,
                'bounceRate' => $sent > 0 ? round(($campaign->bouncedCount / $sent) * 100, 1) : 0,
                'scheduledAt' => $campaign->scheduled_at?->toIso8601String(),
                'sentAt' => $campaign->scheduled_at?->toIso8601String(),
                'createdAt' => $campaign->created_at->toIso8601String(),
                'updatedAt' => $campaign->updated_at->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $campaigns->total(),
                'page' => $campaigns->currentPage(),
                'perPage' => $campaigns->perPage(),
                'totalPages' => $campaigns->lastPage(),
            ]
        ]);
    }

    /**
     * Create a new campaign.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'subject' => 'nullable|string|max:255',
            'preheader' => 'nullable|string|max:255',
            'from_name' => 'nullable|string|max:255',
            'from_email' => 'nullable|email|max:255',
            'status' => 'required|in:draft,scheduled,sending,sent',
            'channel' => 'required|in:email,sms,whatsapp,gocontact',
            'segment_id' => 'nullable|exists:segments,id',
            'template_id' => 'nullable|exists:templates,id',
            'content' => 'nullable|string',
            'scheduled_at' => 'nullable|date',
            'filters' => 'nullable|array',
            'track_opens' => 'boolean',
            'track_clicks' => 'boolean',
            'track_replies' => 'boolean',
            'use_google_analytics' => 'boolean',
            'is_public' => 'boolean',
            'physical_address' => 'nullable|string',
        ]);

        if (!empty($validated['filters'])) {
            $segment = \Modules\CRM\Models\Segment::create([
                'name' => 'Auto Segment: ' . $validated['name'],
                'type' => 'dynamic',
                'definition' => ['filters' => $validated['filters']],
            ]);
            $validated['segment_id'] = $segment->id;
            unset($validated['filters']);
        }

        if ($validated['status'] === 'scheduled' && empty($validated['scheduled_at'])) {
            $validated['scheduled_at'] = now();
        }

        $campaign = Campaign::create($validated);

        return response()->json([
            'message' => 'Campaign created successfully',
            'data' => $campaign
        ], 201);
    }

    /**
     * Get single campaign details.
     */
    public function show($id): JsonResponse
    {
        $campaign = Campaign::with('segment')
            ->withCount(['deliveries as sentCount' => function($q) {
                $q->whereNotNull('sent_at');
            }, 'deliveries as openedCount' => function($q) {
                $q->whereNotNull('opened_at');
            }, 'deliveries as clickedCount' => function($q) {
                $q->whereNotNull('clicked_at');
            }, 'deliveries as bouncedCount' => function($q) {
                $q->whereNotNull('bounced_at');
            }])
            ->findOrFail($id);

        $sent = $campaign->sentCount;
        $data = [
            'id' => (string)$campaign->id,
            'name' => $campaign->name,
            'subject' => $campaign->subject ?? $campaign->name,
            'status' => $campaign->status,
            'channel' => $campaign->channel,
            'listId' => (string)($campaign->segment_id ?? ''),
            'listName' => $campaign->segment ? $campaign->segment->name : 'All Contacts',
            'sentCount' => $sent,
            'openRate' => $sent > 0 ? round(($campaign->openedCount / $sent) * 100, 1) : 0,
            'clickRate' => $sent > 0 ? round(($campaign->clickedCount / $sent) * 100, 1) : 0,
            'bounceRate' => $sent > 0 ? round(($campaign->bouncedCount / $sent) * 100, 1) : 0,
            'scheduledAt' => $campaign->scheduled_at?->toIso8601String(),
            'sentAt' => $campaign->scheduled_at?->toIso8601String(),
            'createdAt' => $campaign->created_at->toIso8601String(),
            'updatedAt' => $campaign->updated_at->toIso8601String(),
            'content' => $campaign->content,
        ];

        return response()->json(['data' => $data]);
    }

    /**
     * Update existing campaign.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'subject' => 'nullable|string|max:255',
            'status' => 'sometimes|required|in:draft,scheduled,sending,sent',
            'channel' => 'sometimes|required|in:email,sms,whatsapp,gocontact',
            'segment_id' => 'nullable|exists:segments,id',
            'template_id' => 'nullable|exists:templates,id',
            'content' => 'nullable|string',
            'scheduled_at' => 'nullable|date',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'scheduled' && empty($validated['scheduled_at'])) {
            $campaignScheduledAt = $campaign->scheduled_at;
            if (!$campaignScheduledAt) {
                 $validated['scheduled_at'] = now();
            }
        }

        $campaign->update($validated);

        return response()->json([
            'message' => 'Campaign updated successfully',
            'data' => $campaign
        ]);
    }

    /**
     * Delete a campaign.
     */
    public function destroy($id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        $campaign->delete();

        return response()->json([
            'message' => 'Campaign deleted successfully'
        ]);
    }

    /**
     * Duplicate a campaign.
     */
    public function duplicate($id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        
        $newCampaign = $campaign->replicate();
        $newCampaign->name = $campaign->name . ' (Copy)';
        $newCampaign->status = 'draft';
        $newCampaign->created_at = now();
        $newCampaign->updated_at = now();
        $newCampaign->save();

        return response()->json([
            'message' => 'Campaign duplicated successfully',
            'data' => $newCampaign
        ]);
    }

    /**
     * Get campaign delivery logs.
     */
    public function logs(Request $request, $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        
        $logs = $campaign->deliveries()
            ->with('contact:id,email,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));
            
        return response()->json($logs);
    }
}