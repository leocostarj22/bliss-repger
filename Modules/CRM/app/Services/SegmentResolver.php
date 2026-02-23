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

        // Static segment by explicit contact IDs
        $contactIds = $definition['contact_ids'] ?? [];
        if (!empty($contactIds)) {
            return Contact::whereIn('id', $contactIds)->get();
        }

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
                    if (is_string($value)) {
                        $query->whereRaw('LOWER(TRIM(' . $column . ')) = ?', [strtolower(trim($value))]);
                    } else {
                        $query->where($column, $value);
                    }
                    break;
                case 'neq':
                    if (is_string($value)) {
                        $query->whereRaw('LOWER(TRIM(' . $column . ')) != ?', [strtolower(trim($value))]);
                    } else {
                        $query->where($column, '!=', $value);
                    }
                    break;
                case 'in':
                    if ($column === 'tags') {
                        $vals = array_map(fn($v) => is_string($v) ? strtolower($v) : $v, (array) $value);
                        $query->where(function ($q) use ($vals) {
                            foreach ($vals as $v) {
                                $q->orWhereJsonContains('tags', $v)
                                  ->orWhereRaw('LOWER(CAST(tags AS CHAR)) LIKE ?', ['%"' . $v . '"%']);
                            }
                        });
                    } else {
                        $query->whereIn($column, (array) $value);
                    }
                    break;
                case 'not_null':
                    $query->whereNotNull($column);
                    break;
                case 'null':
                    $query->whereNull($column);
                    break;
                case 'contains':
                    if ($column === 'tags') {
                        $v = is_string($value) ? strtolower($value) : $value;
                        $query->where(function ($q) use ($v, $column) {
                            $q->whereJsonContains('tags', $v)
                              ->orWhereRaw('LOWER(CAST(tags AS CHAR)) LIKE ?', ['%"' . $v . '"%']);
                        });
                    } else {
                        $v = is_string($value) ? strtolower($value) : $value;
                        $query->whereRaw('LOWER(' . $column . ') LIKE ?', ['%' . $v . '%']);
                    }
                    break;
            }
        }

        return $query->get();
    }

    public function resolveByDefinition(array $definition): \Illuminate\Support\Collection
    {
        $query = Contact::query();
        $filters = $definition['filters'] ?? [];

        $contactIds = $definition['contact_ids'] ?? [];
        if (!empty($contactIds)) {
            return Contact::whereIn('id', $contactIds)->get();
        }

        foreach ($filters as $filter) {
            $field = $filter['field'] ?? null;
            $op = $filter['op'] ?? 'eq';
            $value = $filter['value'] ?? null;

            if (! $field) {
                continue;
            }

            $column = $field;

            switch ($op) {
                case 'eq':
                    if (is_string($value)) {
                        $query->whereRaw('LOWER(TRIM(' . $column . ')) = ?', [strtolower(trim($value))]);
                    } else {
                        $query->where($column, $value);
                    }
                    break;
                case 'neq':
                    if (is_string($value)) {
                        $query->whereRaw('LOWER(TRIM(' . $column . ')) != ?', [strtolower(trim($value))]);
                    } else {
                        $query->where($column, '!=', $value);
                    }
                    break;
                case 'in':
                    if ($column === 'tags') {
                        $vals = array_map(fn($v) => is_string($v) ? strtolower($v) : $v, (array) $value);
                        $query->where(function ($q) use ($vals) {
                            foreach ($vals as $v) {
                                $q->orWhereJsonContains('tags', $v)
                                  ->orWhereRaw('LOWER(CAST(tags AS CHAR)) LIKE ?', ['%"' . $v . '"%']);
                            }
                        });
                    } else {
                        $query->whereIn($column, (array) $value);
                    }
                    break;
                case 'not_null':
                    $query->whereNotNull($column);
                    break;
                case 'null':
                    $query->whereNull($column);
                    break;
                case 'contains':
                    if ($column === 'tags') {
                        $v = is_string($value) ? strtolower($value) : $value;
                        $query->where(function ($q) use ($v, $column) {
                            $q->whereJsonContains('tags', $v)
                              ->orWhereRaw('LOWER(CAST(tags AS CHAR)) LIKE ?', ['%"' . $v . '"%']);
                        });
                    } else {
                        $v = is_string($value) ? strtolower($value) : $value;
                        $query->whereRaw('LOWER(' . $column . ') LIKE ?', ['%' . $v . '%']);
                    }
                    break;
            }
        }

        return $query->get();
    }
}