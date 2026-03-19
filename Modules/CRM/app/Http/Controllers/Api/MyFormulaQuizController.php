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
                $x->where('quiz_id', 'like', "%{$search}%")
                  ->orWhere('post->name', 'like', "%{$search}%")
                  ->orWhere('post->email', 'like', "%{$search}%");
            });
        }

        if ($status === 'completed') {
            $q->where(function ($x) {
                $x->where('post->step', 'plans')->orWhereNull('post->step');
            });
        } elseif ($status === 'incomplete') {
            $q->where(function ($x) {
                $x->where('post->step', '!=', 'plans')
                  ->orWhereNull('post->step');
            });
        }

        if ($gender) {
            $q->where('post->gender', $gender);
        }

        if ($ageRange) {
            $now = Carbon::now();
            if ($ageRange === '18-29') {
                $start = $now->copy()->subYears(30)->addDay()->format('Y-m-d');
                $end   = $now->copy()->subYears(18)->format('Y-m-d');
                $q->whereBetween('post->birthdate', [$start, $end]);
            } elseif ($ageRange === '30-39') {
                $start = $now->copy()->subYears(40)->addDay()->format('Y-m-d');
                $end   = $now->copy()->subYears(30)->format('Y-m-d');
                $q->whereBetween('post->birthdate', [$start, $end]);
            } elseif ($ageRange === '40-49') {
                $start = $now->copy()->subYears(50)->addDay()->format('Y-m-d');
                $end   = $now->copy()->subYears(40)->format('Y-m-d');
                $q->whereBetween('post->birthdate', [$start, $end]);
            } elseif ($ageRange === '50+') {
                $end = $now->copy()->subYears(50)->format('Y-m-d');
                $q->where('post->birthdate', '<=', $end);
            }
        }

        if ($plan !== 'all') {
            $q->where('post->improve_health', 'like', '%' . $plan . '%');
        }

        return $q->orderByDesc('date_added');
    }

    public function index(Request $request)
    {
        $rows = $this->buildQuery($request)->get();

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
        $base = $this->buildQuery($request);
        $total = (clone $base)->count();
        $completed = (clone $base)->where(function ($x) {
            $x->where('post->step', 'plans')->orWhereNull('post->step');
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