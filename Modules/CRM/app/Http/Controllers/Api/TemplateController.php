<?php

namespace Modules\CRM\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\CRM\Models\Template;

class TemplateController extends Controller
{
    public function index()
    {
        $rows = Template::orderBy('updated_at', 'desc')->get()->map(fn ($t) => $this->transform($t));
        return response()->json(['data' => $rows]);
    }

    public function show($id)
    {
        $t = Template::findOrFail($id);
        return response()->json(['data' => $this->transform($t)]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:255',
            'content' => 'required',
            'type'    => 'nullable|string|max:50',
            'subject' => 'nullable|string|max:255',
            'status'  => 'nullable|string|max:50',
        ]);

        $content = is_string($validated['content']) ? $validated['content'] : json_encode($validated['content']);
        $t = Template::create([
            'name'    => $validated['name'],
            'type'    => $request->input('type', 'blocks'),
            'subject' => $request->input('subject'),
            'content' => $content,
            'status'  => $request->input('status', 'draft'),
        ]);

        return response()->json(['data' => $this->transform($t)], 201);
    }

    public function update(Request $request, $id)
    {
        $t = Template::findOrFail($id);
        $validated = $request->validate([
            'name'    => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required',
            'type'    => 'nullable|string|max:50',
            'subject' => 'nullable|string|max:255',
            'status'  => 'nullable|string|max:50',
        ]);

        $payload = [];
        if ($request->has('name'))    $payload['name'] = $validated['name'];
        if ($request->has('type'))    $payload['type'] = $request->input('type', 'blocks');
        if ($request->has('subject')) $payload['subject'] = $request->input('subject');
        if ($request->has('status'))  $payload['status'] = $request->input('status', 'draft');
        if ($request->has('content')) {
            $payload['content'] = is_string($validated['content']) ? $validated['content'] : json_encode($validated['content']);
        }

        $t->update($payload);

        return response()->json(['data' => $this->transform($t)]);
    }

    public function destroy($id)
    {
        $t = Template::findOrFail($id);
        $t->delete();
        return response()->json(null, 204);
    }

    private function transform(Template $t): array
    {
        $content = $t->content;
        $decoded = null;
        if (is_string($content)) {
            $decoded = json_decode($content, true);
        }

        return [
            'id'        => (string) $t->id,
            'name'      => $t->name,
            'content'   => $decoded !== null ? $decoded : $content,
            'createdAt' => optional($t->created_at)->toIso8601String(),
            'updatedAt' => optional($t->updated_at)->toIso8601String(),
        ];
    }
}