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

    /**
     * Estimate recipients for a given segment.
     */
    public function estimate($id, \Modules\CRM\Services\SegmentResolver $resolver): JsonResponse
    {
        $segment = Segment::findOrFail($id);
        try {
            $count = $resolver->resolveContacts($segment->id)->count();
        } catch (\Throwable $e) {
            $count = 0;
        }

        return response()->json(['data' => [
            'id' => (string)$segment->id,
            'name' => $segment->name,
            'estimated' => $count,
        ]]);
    }

    /**
     * Estimate recipients using ad-hoc filters (without persisting a Segment).
     */
    public function estimateByFilters(Request $request, \Modules\CRM\Services\SegmentResolver $resolver): JsonResponse
    {
        $validated = $request->validate([
            'filters' => 'required|array',
        ]);

        try {
            $count = $resolver->resolveByDefinition(['filters' => $validated['filters']])->count();
        } catch (\Throwable $e) {
            $count = 0;
        }

        return response()->json(['data' => [
            'estimated' => $count,
        ]]);
    }

    /**
     * Show a single segment.
     */
    public function show($id): JsonResponse
    {
        $segment = Segment::findOrFail($id);

        return response()->json(['data' => $segment]);
    }

    /**
     * Update segment basic data (currently only name).
     */
    public function update(Request $request, $id): JsonResponse
    {
        $segment = Segment::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $segment->update([
            'name' => $validated['name'],
        ]);

        return response()->json(['data' => $segment]);
    }

    /**
     * Delete a segment.
     */
    public function destroy($id): JsonResponse
    {
        $segment = Segment::findOrFail($id);
        $segment->delete();

        return response()->json(['message' => 'Segment deleted']);
    }
}