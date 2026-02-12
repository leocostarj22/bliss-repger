<?php

namespace Modules\CRM\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\CRM\Models\Automation;
use Illuminate\Support\Facades\Validator;

class AutomationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Automation::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        if ($request->has('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        $perPage = $request->input('perPage', 10);
        $automations = $query->latest()->paginate($perPage);

        return response()->json($automations);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'status' => 'in:active,paused,draft',
            'trigger_type' => 'nullable|string',
            'trigger_config' => 'nullable|array',
            'graph_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $automation = Automation::create($request->all());

        return response()->json([
            'message' => 'Automation created successfully',
            'data' => $automation
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $automation = Automation::with('executions')->findOrFail($id);
        return response()->json(['data' => $automation]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $automation = Automation::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'status' => 'sometimes|in:active,paused,draft',
            'trigger_type' => 'nullable|string',
            'trigger_config' => 'nullable|array',
            'graph_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $automation->update($request->all());

        return response()->json([
            'message' => 'Automation updated successfully',
            'data' => $automation
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $automation = Automation::findOrFail($id);
        $automation->delete();

        return response()->json(['message' => 'Automation deleted successfully']);
    }

    /**
     * Duplicate the automation.
     */
    public function duplicate($id)
    {
        $automation = Automation::findOrFail($id);
        $newAutomation = $automation->replicate();
        $newAutomation->name = $automation->name . ' (Copy)';
        $newAutomation->status = 'draft';
        $newAutomation->triggered_count = 0;
        $newAutomation->save();

        return response()->json([
            'message' => 'Automation duplicated successfully',
            'data' => $newAutomation
        ]);
    }
}
