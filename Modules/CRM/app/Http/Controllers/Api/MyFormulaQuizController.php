<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\Quiz;
use Carbon\Carbon;

class MyFormulaQuizController extends Controller
{
    private function buildQuery(Request $request)
    {
        $search   = trim((string) $request->query('search', ''));
        $status   = (string) $request->query('status', 'all');
        $plan     = (string) $request->query('plan', 'all');
        $gender   = $request->query('gender');
        $ageRange = $request->query('age_range');
        $from     = $request->query('from');
        $to       = $request->query('to');

        $q = Quiz::query()->betweenDates($from, $to);

        if ($search !== '') {
            $q->where(function ($x) use ($search) {
                $like = "%{$search}%";
                $x->where('quiz_id', 'like', $like)
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(post, '$.name')) LIKE ?", [$like])
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(post, '$.email')) LIKE ?", [$like]);
            });
        }

        if ($status === 'completed') {
            $q->where(function ($x) {
                $x->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(post, '$.step')) = 'plans'")
                  ->orWhereRaw("JSON_EXTRACT(post, '$.step') IS NULL");
            });
        } elseif ($status === 'incomplete') {
            $q->where(function ($x) {
                $x->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(post, '$.step')) <> 'plans'")
                  ->orWhereRaw("JSON_EXTRACT(post, '$.step') IS NULL");
            });
        }

        if ($gender) {
            $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(post, '$.gender')) = ?", [$gender]);
        }

        if ($ageRange) {
            $now = Carbon::now();
            if ($ageRange === '18-29') {
                $start = $now->copy()->subYears(30)->addDay()->format('Y-m-d');
                $end   = $now->copy()->subYears(18)->format('Y-m-d');
                $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(post, '$.birthdate')) BETWEEN ? AND ?", [$start, $end]);
            } elseif ($ageRange === '30-39') {
                $start = $now->copy()->subYears(40)->addDay()->format('Y-m-d');
                $end   = $now->copy()->subYears(30)->format('Y-m-d');
                $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(post, '$.birthdate')) BETWEEN ? AND ?", [$start, $end]);
            } elseif ($ageRange === '40-49') {
                $start = $now->copy()->subYears(50)->addDay()->format('Y-m-d');
                $end   = $now->copy()->subYears(40)->format('Y-m-d');
                $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(post, '$.birthdate')) BETWEEN ? AND ?", [$start, $end]);
            } elseif ($ageRange === '50+') {
                $end = $now->copy()->subYears(50)->format('Y-m-d');
                $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(post, '$.birthdate')) <= ?", [$end]);
            }
        }

        if ($plan !== 'all') {
            $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(post, '$.improve_health')) LIKE ?", ['%' . $plan . '%']);
        }

        return $q->orderByDesc('date_added');
    }

    public function index(Request $request)
    {
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
                try {
                    $age = \Carbon\Carbon::parse($birth)->age;
                } catch (\Throwable) {
                    return false;
                }
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
    }

    public function stats(Request $request)
    {
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
    }
}