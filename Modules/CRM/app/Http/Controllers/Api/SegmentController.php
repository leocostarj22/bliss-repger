<?php

namespace Modules\CRM\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\CRM\Models\Segment;

class SegmentController extends Controller
{
    /**
     * Get list of segments.
     */
    public function index(Request $request): JsonResponse
    {
        $segments = Segment::orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $segments]);
    }

    /**
     * Create a new segment.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_ids' => 'nullable|array',
            'contact_ids.*' => 'exists:contacts,id',
            'filters' => 'nullable|array',
        ]);

        $definition = [];
        if (!empty($validated['contact_ids'])) {
            $definition['contact_ids'] = $validated['contact_ids'];
        }
        if (!empty($validated['filters'])) {
            $definition['filters'] = $validated['filters'];
        }

        $segment = Segment::create([
            'name' => $validated['name'],
            'definition' => $definition,
        ]);

        return response()->json(['data' => $segment], 201);
    }
}