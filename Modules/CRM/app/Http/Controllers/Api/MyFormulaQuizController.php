<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\Quiz;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class MyFormulaQuizController extends Controller
{
    private function loadRows(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');

        return Quiz::query()
            ->when($from, fn ($q) => $q->whereDate('date_added', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('date_added', '<=', $to))
            ->orderByDesc('date_added')
            ->get();
    }

    private function safePost($row): array
    {
        try {
            $raw = $row->getAttribute('post');
            if (is_array($raw)) return $raw;
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                return is_array($decoded) ? $decoded : [];
            }
        } catch (\Throwable) {}
        return [];
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
            $post = $this->safePost($row);

            if ($search !== '') {
                $hay = strtolower(
                    (string) $row->getKey() . ' ' .
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

            $data = $rows->map(function ($q) {
                $post = $this->safePost($q);
                return [
                    'quiz_id' => (string) $q->getKey(),
                    'date_added' => $q->date_added ? $q->date_added->toIso8601String() : null,
                    'post' => $post,
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
            $completed = $rows->filter(function ($q) {
                $post = $this->safePost($q);
                return $this->isCompleted($post);
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