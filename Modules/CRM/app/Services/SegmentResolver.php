<?php

namespace Modules\CRM\Services;

use Illuminate\Support\Collection;
use Modules\CRM\Models\Segment;
use Modules\CRM\Models\Contact;

class SegmentResolver
{
    public function resolveContacts(int $segmentId): Collection
    {
        $segment = Segment::find($segmentId);
        if (! $segment) {
            return collect();
        }

        $query = Contact::query();

        $definition = $segment->definition ?? [];
        $filters = $definition['filters'] ?? [];

        // Aliases removed to allow direct filtering by 'source' column
        // If utm_source filtering is needed, the frontend should send 'utm_source' as field
        $aliases = [];

        foreach ($filters as $filter) {
            $field = $filter['field'] ?? null;
            $op = $filter['op'] ?? 'eq';
            $value = $filter['value'] ?? null;

            if (! $field) {
                continue;
            }

            $column = $aliases[$field] ?? $field;

            switch ($op) {
                case 'eq':
                    $query->where($column, $value);
                    break;
                case 'neq':
                    $query->where($column, '!=', $value);
                    break;
                case 'in':
                    $query->whereIn($column, (array) $value);
                    break;
                case 'not_null':
                    $query->whereNotNull($column);
                    break;
                case 'null':
                    $query->whereNull($column);
                    break;
                case 'contains':
                    $query->where($column, 'like', "%{$value}%");
                    break;
            }
        }

        return $query->get();
    }
}