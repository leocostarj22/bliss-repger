<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\EspacoAbsolutoAppointment;
use Modules\CRM\Models\EspacoAbsolutoCustomer;
use Modules\CRM\Models\EspacoAbsolutoUserGroup;
use Modules\CRM\Models\EspacoAbsolutoUserMessage;

class EspacoAbsolutoController extends Controller
{
    public function overview()
    {
        $totalMessages = EspacoAbsolutoUserMessage::query()
            ->where(function ($q) {
                $q->whereNull('apaga')->orWhere('apaga', 0);
            })
            ->count();

        $groups = EspacoAbsolutoUserGroup::query()
            ->where('dashboard', 1)
            ->where(function ($q) {
                $q->whereNull('apaga')->orWhere('apaga', 0);
            })
            ->orderBy('nome')
            ->get();

        $cards = collect([[
            'key' => 'Mensagens',
            'title' => 'Mensagens',
            'description' => 'Total de mensagens',
            'count' => (int) $totalMessages,
        ]]);

        foreach ($groups as $group) {
            $count = EspacoAbsolutoCustomer::query()
                ->whereHas('groups', fn ($q) => $q->where('user_groups.idgrupo', $group->idgrupo))
                ->count();

            $cards->push([
                'key' => (string) $group->idgrupo,
                'title' => (string) ($group->nome ?? 'Origem'),
                'description' => 'Origem',
                'count' => (int) $count,
            ]);
        }

        return response()->json(['data' => ['cards' => $cards->values()->all()]]);
    }

    public function customers(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $origin = trim((string) $request->query('origin', 'all'));
        $registeredFrom = trim((string) $request->query('registered_from', ''));
        $registeredUntil = trim((string) $request->query('registered_until', ''));

        $page = max(1, (int) $request->query('page', 1));
        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(200, $perPage));

        $query = EspacoAbsolutoCustomer::query()
            ->with(['groups:idgrupo,nome', 'messages:id,iduser,subject,data_added'])
            ->orderByDesc('data_added');

        if ($registeredFrom !== '') {
            $query->whereDate('data_added', '>=', $registeredFrom);
        }

        if ($registeredUntil !== '') {
            $query->whereDate('data_added', '<=', $registeredUntil);
        }

        if ($search !== '') {
            $query->where(function ($w) use ($search) {
                $w->where('iduser', 'like', "%{$search}%")
                    ->orWhere('nome', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('telefone', 'like', "%{$search}%");
            });
        }

        $mapped = $query->get()->map(function (EspacoAbsolutoCustomer $c) {
            $origin = 'Desconhecido';
            $group = $c->groups->first();

            if ($group && is_string($group->nome) && $group->nome !== '') {
                $origin = $group->nome;
            } else {
                $msg = $c->messages->sortBy('data_added')->first();
                $origin = $this->originFromSubject($msg?->subject);
            }

            return [
                'id' => (int) $c->iduser,
                'name' => (string) ($c->nome ?? ''),
                'email' => (string) ($c->email ?? ''),
                'phone' => (string) ($c->telefone ?? ''),
                'origin' => $origin,
                'status' => true,
                'registered_at' => $c->data_added?->toIso8601String(),
                'last_seen_at' => $c->data_login?->toIso8601String(),
                'created_at' => $c->data_added?->toIso8601String(),
                'updated_at' => $c->data_edited?->toIso8601String(),
            ];
        });

        if ($origin !== '' && strtolower($origin) !== 'all') {
            $originNorm = mb_strtolower($origin);
            $mapped = $mapped->filter(fn ($row) => mb_strtolower((string) ($row['origin'] ?? '')) === $originNorm)->values();
        }

        if ($search !== '') {
            $q = mb_strtolower($search);
            $mapped = $mapped->filter(function ($row) use ($q) {
                $hay = mb_strtolower(
                    trim(($row['id'] ?? '') . ' ' . ($row['name'] ?? '') . ' ' . ($row['email'] ?? '') . ' ' . ($row['phone'] ?? '') . ' ' . ($row['origin'] ?? ''))
                );
                return str_contains($hay, $q);
            })->values();
        }

        $total = $mapped->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        $pageSafe = min($page, $totalPages);

        $data = $mapped->forPage($pageSafe, $perPage)->values()->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $total,
                'page' => $pageSafe,
                'perPage' => $perPage,
                'totalPages' => $totalPages,
            ],
        ]);
    }

    public function userGroups()
    {
        $rows = EspacoAbsolutoUserGroup::query()->orderBy('nome')->get();

        $data = $rows->map(fn (EspacoAbsolutoUserGroup $g) => [
            'id' => (int) $g->idgrupo,
            'name' => (string) ($g->nome ?? ''),
            'dashboard' => (bool) $g->dashboard,
            'is_active' => !((bool) $g->apaga),
            'created_at' => null,
            'updated_at' => null,
        ])->values();

        return response()->json(['data' => $data]);
    }

    public function userMessages(Request $request)
    {
        $userId = $request->query('user_id');
        $page = max(1, (int) $request->query('page', 1));
        $perPage = max(1, min(200, (int) $request->query('per_page', 50)));

        $base = EspacoAbsolutoUserMessage::query()
            ->where(function ($q) {
                $q->whereNull('apaga')->orWhere('apaga', 0);
            })
            ->when($userId !== null && $userId !== '', fn ($q) => $q->where('iduser', $userId))
            ->orderByDesc('data_added');

        $total = (clone $base)->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        $pageSafe = min($page, $totalPages);

        $rows = $base->forPage($pageSafe, $perPage)->get();

        $data = $rows->map(fn (EspacoAbsolutoUserMessage $m) => [
            'id' => (int) $m->id,
            'user_id' => (int) $m->iduser,
            'email' => (string) ($m->email ?? ''),
            'subject' => (string) ($m->subject ?? ''),
            'message' => (string) ($m->message ?? ''),
            'note' => null,
            'date' => $m->data_added?->toIso8601String(),
            'created_at' => $m->data_added?->toIso8601String(),
            'updated_at' => $m->data_added?->toIso8601String(),
        ])->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $total,
                'page' => $pageSafe,
                'perPage' => $perPage,
                'totalPages' => $totalPages,
            ],
        ]);
    }

    public function appointments(Request $request)
    {
        $page = max(1, (int) $request->query('page', 1));
        $perPage = max(1, min(200, (int) $request->query('per_page', 50)));

        $base = EspacoAbsolutoAppointment::query()->orderByDesc('date_from');

        $total = (clone $base)->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        $pageSafe = min($page, $totalPages);

        $rows = $base->forPage($pageSafe, $perPage)->get();

        $data = $rows->map(fn (EspacoAbsolutoAppointment $a) => [
            'id' => (int) $a->period_id,
            'customer_id' => 0,
            'treatment' => (string) ($a->type ?? ''),
            'scheduled_at' => $a->date_from?->toIso8601String(),
            'status' => (string) ($a->status ?? 'scheduled'),
            'notes' => $a->observations,
            'created_at' => $a->created_at?->toIso8601String(),
            'updated_at' => $a->updated_at?->toIso8601String(),
        ])->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $total,
                'page' => $pageSafe,
                'perPage' => $perPage,
                'totalPages' => $totalPages,
            ],
        ]);
    }

    private function originFromSubject(?string $subject): string
    {
        $s = (string) $subject;
        if ($s === '') return 'Desconhecido';
        if (stripos($s, 'Pergunta') !== false) return 'Pergunta Grátis';
        if (stripos($s, 'Oração') !== false || stripos($s, 'Orações') !== false) return 'CTA Orações';
        if (stripos($s, 'E-book') !== false) return 'CTA E-book';
        if (stripos($s, 'Tarot') !== false) return 'Tarot do Dia';
        if (stripos($s, 'Pedido') !== false || stripos($s, 'Ligação') !== false) return 'Nós ligamos!';
        if (stripos($s, 'Newsletter') !== false) return 'Newsletter';
        if (stripos($s, 'Notícias') !== false) return 'Notícias';
        return 'Mensagens';
    }
}