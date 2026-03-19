<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\MyFormulaProduct;
use Modules\CRM\Models\MyFormulaProductDescription;

class MyFormulaProductController extends Controller
{
    public function index(Request $request)
    {
        $search  = trim((string) $request->query('search', ''));
        $status  = (string) $request->query('status', 'all');

        $q = MyFormulaProduct::query()->with('description');

        if ($status !== 'all') {
            $q->where('status', $status === 'active' ? 1 : 0);
        }

        if ($search !== '') {
            $q->where(function ($x) use ($search) {
                $x->where('model', 'like', "%{$search}%")
                  ->orWhere('product_id', 'like', "%{$search}%")
                  ->orWhereHas('description', function ($d) use ($search) {
                      $d->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $rows = $q->orderByDesc('date_added')->get();

        $data = $rows->map(fn (MyFormulaProduct $p) => $this->transform($p))->values();

        return response()->json(['data' => $data]);
    }

    public function store(Request $request)
    {
        $payload = $request->validate([
            'model'       => 'required|string',
            'sku'         => 'nullable|string',
            'price'       => 'nullable|numeric',
            'quantity'    => 'nullable|integer',
            'status'      => 'nullable|boolean',
            'name'        => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        $prod = new MyFormulaProduct();
        $prod->model    = $payload['model'];
        $prod->sku      = $payload['sku'] ?? null;
        $prod->price    = isset($payload['price']) ? (float) $payload['price'] : null;
        $prod->quantity = isset($payload['quantity']) ? (int) $payload['quantity'] : null;
        $prod->status   = isset($payload['status']) ? (bool) $payload['status'] : true;
        $prod->date_added = now();
        $prod->save();

        $desc = new MyFormulaProductDescription();
        $desc->product_id  = $prod->getKey();
        $desc->language_id = 2;
        $desc->name        = $payload['name'] ?? $prod->model;
        $desc->description = $payload['description'] ?? null;
        $desc->save();

        $prod->load('description');

        return response()->json(['data' => $this->transform($prod)]);
    }

    public function update($id, Request $request)
    {
        $payload = $request->validate([
            'model'       => 'nullable|string',
            'sku'         => 'nullable|string',
            'price'       => 'nullable|numeric',
            'quantity'    => 'nullable|integer',
            'status'      => 'nullable|boolean',
            'name'        => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        $prod = MyFormulaProduct::findOrFail($id);

        if (array_key_exists('model', $payload))    $prod->model    = $payload['model'] ?? $prod->model;
        if (array_key_exists('sku', $payload))      $prod->sku      = $payload['sku'] ?? null;
        if (array_key_exists('price', $payload))    $prod->price    = isset($payload['price']) ? (float) $payload['price'] : null;
        if (array_key_exists('quantity', $payload)) $prod->quantity = isset($payload['quantity']) ? (int) $payload['quantity'] : null;
        if (array_key_exists('status', $payload))   $prod->status   = isset($payload['status']) ? (bool) $payload['status'] : $prod->status;
        $prod->save();

        $desc = MyFormulaProductDescription::query()
            ->where('product_id', $prod->getKey())
            ->where('language_id', 2)
            ->first();

        if (! $desc) {
            $desc = new MyFormulaProductDescription();
            $desc->product_id  = $prod->getKey();
            $desc->language_id = 2;
        }

        if (array_key_exists('name', $payload))        $desc->name        = $payload['name'] ?? $desc->name ?? $prod->model;
        if (array_key_exists('description', $payload)) $desc->description = $payload['description'] ?? null;
        $desc->save();

        $prod->load('description');

        return response()->json(['data' => $this->transform($prod)]);
    }

    public function destroy($id)
    {
        $prod = MyFormulaProduct::findOrFail($id);

        MyFormulaProductDescription::query()
            ->where('product_id', $prod->getKey())
            ->where('language_id', 2)
            ->delete();

        $prod->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    private function transform(MyFormulaProduct $p): array
    {
        return [
            'product_id'  => (string) $p->getKey(),
            'model'       => $p->model,
            'sku'         => $p->sku ?: null,
            'price'       => $p->price !== null ? (float) $p->price : null,
            'quantity'    => $p->quantity !== null ? (int) $p->quantity : null,
            'status'      => isset($p->status) ? (bool) $p->status : null,
            'date_added'  => $p->date_added ? $p->date_added->toIso8601String() : null,
            'description' => $p->relationLoaded('description') && $p->description
                ? [
                    'product_id'  => (string) $p->description->product_id,
                    'language_id' => (int) $p->description->language_id,
                    'name'        => $p->description->name,
                    'description' => $p->description->description,
                ]
                : null,
        ];
    }
}