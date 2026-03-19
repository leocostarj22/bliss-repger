<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\Quiz;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class MyFormulaQuizController extends Controller
{
    private function buildQuery(Request $request)
    {
        $from = $request->query('from');
        $to   = $request->query('to');
        return Quiz::query()->betweenDates($from, $to)->orderByDesc('date_added');
    }

    public function index(Request $request)
    {
        try {
            $from = $request->query('from');
            $to   = $request->query('to');
            $rows = Quiz::query()
                ->when($from, fn ($q) => $q->whereDate('date_added', '>=', $from))
                ->when($to,   fn ($q) => $q->whereDate('date_added', '<=', $to))
                ->orderByDesc('date_added')
                ->get();

            $search   = trim((string) $request->query('search', ''));
            $status   = (string) $request->query('status', 'all');
            $plan     = (string) $request->query('plan', 'all');
            $gender   = $request->query('gender');
            $ageRange = $request->query('age_range');

            $rows = $rows->filter(function (Quiz $q) use ($search, $status, $plan, $gender, $ageRange) {
                $post = (array) ($q->post ?? []);
                if ($search !== '') {
                    $hay = strtolower((string) $q->getKey() . ' ' . (string) ($post['name'] ?? '') . ' ' . (string) ($post['email'] ?? ''));
                    if (strpos($hay, strtolower($search)) === false) return false;
                }
                $step = (string) ($post['step'] ?? '');
                $completed = $step === 'plans' || $step === '' || $step === null;
                if ($status === 'completed' && ! $completed) return false;
                if ($status === 'incomplete' && $completed) return false;
                if ($gender && (($post['gender'] ?? null) !== $gender)) return false;
                if ($ageRange) {
                    $birth = $post['birthdate'] ?? null;
                    if (! $birth) return false;
                    try { $age = \Carbon\Carbon::parse($birth)->age; } catch (\Throwable) { return false; }
                    if ($ageRange === '18-29' && !($age >= 18 && $age <= 29)) return false;
                    if ($ageRange === '30-39' && !($age >= 30 && $age <= 39)) return false;
                    if ($ageRange === '40-49' && !($age >= 40 && $age <= 49)) return false;
                    if ($ageRange === '50+'   && !($age >= 50)) return false;
                }
                if ($plan !== 'all') {
                    $codes = array_filter(array_map('trim', explode(',', (string) ($post['improve_health'] ?? ''))));
                    if (! in_array($plan, $codes, true)) return false;
                }
                return true;
            });

            $data = $rows->map(function (Quiz $q) {
                return [
                    'quiz_id'    => (string) $q->getKey(),
                    'date_added' => $q->date_added ? $q->date_added->toIso8601String() : null,
                    'post'       => $q->post ?? [],
                ];
            })->values();

            return response()->json(['data' => $data]);
        } catch (\Throwable $e) {
            Log::error('Quiz API index failed: ' . $e->getMessage());
            return response()->json(['data' => []]);
        }
    }

    public function stats(Request $request)
    {
        try {
            $from = $request->query('from');
            $to   = $request->query('to');
            $rows = Quiz::query()
                ->when($from, fn ($q) => $q->whereDate('date_added', '>=', $from))
                ->when($to,   fn ($q) => $q->whereDate('date_added', '<=', $to))
                ->orderByDesc('date_added')
                ->get();

            $search   = trim((string) $request->query('search', ''));
            $status   = (string) $request->query('status', 'all');
            $plan     = (string) $request->query('plan', 'all');
            $gender   = $request->query('gender');
            $ageRange = $request->query('age_range');

            $rows = $rows->filter(function (Quiz $q) use ($search, $status, $plan, $gender, $ageRange) {
                $post = (array) ($q->post ?? []);
                if ($search !== '') {
                    $hay = strtolower((string) $q->getKey() . ' ' . (string) ($post['name'] ?? '') . ' ' . (string) ($post['email'] ?? ''));
                    if (strpos($hay, strtolower($search)) === false) return false;
                }
                $step = (string) ($post['step'] ?? '');
                $completed = $step === 'plans' || $step === '' || $step === null;
                if ($status === 'completed' && ! $completed) return false;
                if ($status === 'incomplete' && $completed) return false;
                if ($gender && (($post['gender'] ?? null) !== $gender)) return false;
                if ($ageRange) {
                    $birth = $post['birthdate'] ?? null;
                    if (! $birth) return false;
                    try { $age = \Carbon\Carbon::parse($birth)->age; } catch (\Throwable) { return false; }
                    if ($ageRange === '18-29' && !($age >= 18 && $age <= 29)) return false;
                    if ($ageRange === '30-39' && !($age >= 30 && $age <= 39)) return false;
                    if ($ageRange === '40-49' && !($age >= 40 && $age <= 49)) return false;
                    if ($ageRange === '50+'   && !($age >= 50)) return false;
                }
                if ($plan !== 'all') {
                    $codes = array_filter(array_map('trim', explode(',', (string) ($post['improve_health'] ?? ''))));
                    if (! in_array($plan, $codes, true)) return false;
                }
                return true;
            });

            $total = $rows->count();
            $completed = $rows->filter(function (Quiz $q) {
                $step = (string) ((array) ($q->post ?? []))['step'] ?? '';
                return $step === 'plans' || $step === '' || $step === null;
            })->count();
            $notCompleted = $total - $completed;
            $rate = $total > 0 ? round(($completed / $total) * 100) : 0;

            return response()->json([
                'data' => [
                    'total'            => $total,
                    'completed'        => $completed,
                    'not_completed'    => $notCompleted,
                    'completion_rate'  => $rate,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Quiz API stats failed: ' . $e->getMessage());
            return response()->json(['data' => [
                'total' => 0,
                'completed' => 0,
                'not_completed' => 0,
                'completion_rate' => 0,
            ]]);
        }
    }
}