<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MyFormulaQuizController extends Controller
{
    private function loadRows(Request $request)
    {
        $from = (string) $request->query('from', '');
        $to = (string) $request->query('to', '');

        return DB::connection('myformula')
            ->table('quiz')
            ->select(['quiz_id', 'post', 'date_added'])
            ->when($from !== '', fn ($q) => $q->whereDate('date_added', '>=', $from))
            ->when($to !== '', fn ($q) => $q->whereDate('date_added', '<=', $to))
            ->orderByDesc('date_added')
            ->get()
            ->map(function ($row) {
                return [
                    'quiz_id' => (string) ($row->quiz_id ?? ''),
                    'post' => $this->safePost($row->post ?? null),
                    'date_added' => $this->safeDate($row->date_added ?? null),
                ];
            });
    }

    private function safePost($raw): array
    {
        try {
            if (is_array($raw)) return $raw;
            if (is_object($raw)) {
                $encoded = json_encode($raw);
                $decoded = json_decode((string) $encoded, true);
                return is_array($decoded) ? $decoded : [];
            }
            if (is_string($raw) && trim($raw) !== '') {
                $decoded = json_decode($raw, true);
                return is_array($decoded) ? $decoded : [];
            }
        } catch (\Throwable) {
        }
        return [];
    }

    private function safeDate($raw): ?string
    {
        if ($raw === null || $raw === '') return null;
        try {
            return Carbon::parse((string) $raw)->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }

    private function isCompleted(array $post): bool
    {
        $step = (string) ($post['step'] ?? '');
        return $step === 'plans' || $step === '';
    }

    private function applyFilters($rows, Request $request)
    {
        $search = strtolower(trim((string) $request->query('search', '')));
        $status = (string) $request->query('status', 'all');
        $plan = (string) $request->query('plan', 'all');
        $gender = $request->query('gender');
        $ageRange = $request->query('age_range');

        return $rows->filter(function ($row) use ($search, $status, $plan, $gender, $ageRange) {
            $post = is_array($row['post'] ?? null) ? $row['post'] : [];

            if ($search !== '') {
                $hay = strtolower(
                    (string) ($row['quiz_id'] ?? '') . ' ' .
                    (string) ($post['name'] ?? '') . ' ' .
                    (string) ($post['email'] ?? '')
                );
                if (!str_contains($hay, $search)) return false;
            }

            $completed = $this->isCompleted($post);
            if ($status === 'completed' && ! $completed) return false;
            if ($status === 'incomplete' && $completed) return false;

            if ($gender && (($post['gender'] ?? null) !== $gender)) return false;

            if ($ageRange) {
                $birth = $post['birthdate'] ?? null;
                if (! $birth) return false;
                try { $age = Carbon::parse((string) $birth)->age; } catch (\Throwable) { return false; }
                if ($ageRange === '18-29' && !($age >= 18 && $age <= 29)) return false;
                if ($ageRange === '30-39' && !($age >= 30 && $age <= 39)) return false;
                if ($ageRange === '40-49' && !($age >= 40 && $age <= 49)) return false;
                if ($ageRange === '50+' && !($age >= 50)) return false;
            }

            if ($plan !== 'all') {
                $codes = array_filter(array_map('trim', explode(',', (string) ($post['improve_health'] ?? ''))));
                if (!in_array($plan, $codes, true)) return false;
            }

            return true;
        })->values();
    }

    public function index(Request $request)
    {
        try {
            $rows = $this->applyFilters($this->loadRows($request), $request);

            $data = $rows->map(function ($row) {
                return [
                    'quiz_id' => (string) ($row['quiz_id'] ?? ''),
                    'date_added' => $row['date_added'] ?? null,
                    'post' => is_array($row['post'] ?? null) ? $row['post'] : [],
                ];
            })->values();

            return response()->json(['data' => $data]);
        } catch (\Throwable $e) {
            Log::error('Quiz API index failed', ['error' => $e->getMessage()]);
            return response()->json(['data' => []]);
        }
    }

    public function stats(Request $request)
    {
        try {
            $rows = $this->applyFilters($this->loadRows($request), $request);
            $total = $rows->count();
            $completed = $rows->filter(function ($row) {
                return $this->isCompleted(is_array($row['post'] ?? null) ? $row['post'] : []);
            })->count();
            $notCompleted = $total - $completed;
            $rate = $total > 0 ? round(($completed / $total) * 100) : 0;

            return response()->json([
                'data' => [
                    'total' => $total,
                    'completed' => $completed,
                    'not_completed' => $notCompleted,
                    'completion_rate' => $rate,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Quiz API stats failed', ['error' => $e->getMessage()]);
            return response()->json(['data' => [
                'total' => 0,
                'completed' => 0,
                'not_completed' => 0,
                'completion_rate' => 0,
            ]]);
        }
    }
}