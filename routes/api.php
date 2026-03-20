<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use App\Models\Ticket;
use App\Models\Post;
use App\Models\PostLike;
use App\Models\PostComment;
use App\Models\InternalMessage;
use App\Models\MessageRecipient;
use App\Models\VideoCall;
use App\Models\Company;
use App\Models\Department;
use App\Models\User;
use App\Models\SystemLog;
use App\Models\Role;
use App\Models\Category;
use App\Models\Employee;
use App\Models\EmployeeUser;
use App\Models\Payroll;
use App\Models\Vacation;
use App\Models\Timesheet;
use Illuminate\Validation\Rule;
use Modules\Finance\Models\FinanceBankAccount;
use Modules\Finance\Models\FinanceCategory;
use Modules\Finance\Models\FinanceCostCenter;
use Modules\Finance\Models\FinanceTransaction;
use Modules\CRM\Models\EspacoAbsolutoAppointment;
use Modules\CRM\Models\EspacoAbsolutoCustomer;
use Modules\CRM\Models\EspacoAbsolutoUserGroup;
use Modules\CRM\Models\EspacoAbsolutoUserMessage;

Route::prefix('v1')->middleware(['web', 'auth'])->group(function () {
    Route::get('dashboard', function () {
        $user = auth()->user();

        $ticketQuery = Ticket::query();

        if (! $user->isAdmin()) {
            if ($user->isManager() && $user->company_id) {
                $ticketQuery->where('company_id', $user->company_id);
            } else {
                $ticketQuery->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                        ->orWhere('assigned_to', $user->id);
                });
            }
        }

        $ticketStats = (clone $ticketQuery)->selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN status IN (?, ?, ?) THEN 1 ELSE 0 END) as open_count,
            SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as resolved_count,
            SUM(CASE WHEN priority = ? AND status NOT IN (?, ?) THEN 1 ELSE 0 END) as urgent_count,
            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as new_this_week
        ', [
            Ticket::STATUS_OPEN,
            Ticket::STATUS_IN_PROGRESS,
            Ticket::STATUS_PENDING,
            Ticket::STATUS_RESOLVED,
            Ticket::STATUS_CLOSED,
            Ticket::PRIORITY_URGENT,
            Ticket::STATUS_RESOLVED,
            Ticket::STATUS_CLOSED,
        ])->first();

        $resolutionStats = (clone $ticketQuery)
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('
                COUNT(*) as total_last_month,
                SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as resolved_last_month
            ', [Ticket::STATUS_RESOLVED, Ticket::STATUS_CLOSED])
            ->first();

        $resolutionRate = ($resolutionStats && (int) $resolutionStats->total_last_month > 0)
            ? round(((int) $resolutionStats->resolved_last_month / (int) $resolutionStats->total_last_month) * 100, 1)
            : 0.0;

        $avgResolutionTime = (clone $ticketQuery)
            ->whereNotNull('resolved_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours')
            ->value('avg_hours');

        $avgTimeFormatted = 'N/A';
        $avgTimeDescription = 'Sem dados suficientes';

        if ($avgResolutionTime !== null) {
            $hours = round((float) $avgResolutionTime, 1);

            if ($hours > 0) {
                if ($hours < 24) {
                    $avgTimeFormatted = $hours . 'h';
                    $avgTimeDescription = 'Resolução rápida';
                } else {
                    $days = round($hours / 24, 1);
                    $avgTimeFormatted = $days . 'd';
                    $avgTimeDescription = $days <= 3 ? 'Dentro do prazo' : 'Pode melhorar';
                }
            }
        }

        $resolvedPercentageLabel = ($ticketStats && (int) $ticketStats->total > 0)
            ? round(((int) $ticketStats->resolved_count / (int) $ticketStats->total) * 100, 1) . '% do total'
            : 'Nenhum ticket ainda';

        $userId = $user->id;

        $unreadMessages = MessageRecipient::where('recipient_id', $userId)
            ->whereNull('read_at')
            ->whereHas('message', function ($query) {
                $query->where('status', 'sent');
            })
            ->count();

        $sentThisMonth = InternalMessage::where('sender_id', $userId)
            ->where('status', 'sent')
            ->whereMonth('sent_at', now()->month)
            ->whereYear('sent_at', now()->year)
            ->count();

        $drafts = InternalMessage::where('sender_id', $userId)
            ->where('status', 'draft')
            ->count();

        $starred = MessageRecipient::where('recipient_id', $userId)
            ->where('is_starred', true)
            ->count();

        $now = now();
        $onlineWindowMinutes = 15;
        $onlineCutoff = $now->copy()->subMinutes($onlineWindowMinutes);

        $onlineUsers = User::query()
            ->where('is_active', true)
            ->whereNotNull('last_login_at')
            ->where('last_login_at', '>=', $onlineCutoff)
            ->count();

        $accessesToday = 0;
        try {
            $accessesToday = (int) SystemLog::query()
                ->where('action', 'login')
                ->whereDate('created_at', $now->toDateString())
                ->count();
        } catch (\Throwable $e) {
            $accessesToday = 0;
        }

        if ($accessesToday <= 0) {
            $accessesToday = (int) User::query()
                ->whereNotNull('last_login_at')
                ->whereDate('last_login_at', $now->toDateString())
                ->count();
        }

        $posts = Post::published()
            ->when($user->department_id, function ($query) use ($user) {
                $query->forDepartment($user->department_id);
            })
            ->with(['author'])
            ->orderBy('is_pinned', 'desc')
            ->orderBy('published_at', 'desc')
            ->limit(10)
            ->get();

        $likedIds = PostLike::where('user_id', $userId)
            ->whereIn('post_id', $posts->pluck('id')->all())
            ->pluck('post_id')
            ->all();

        $likedSet = array_fill_keys($likedIds, true);

        return response()->json([
            'data' => [
                'tickets' => [
                    'total' => (int) ($ticketStats->total ?? 0),
                    'open_count' => (int) ($ticketStats->open_count ?? 0),
                    'resolved_count' => (int) ($ticketStats->resolved_count ?? 0),
                    'urgent_count' => (int) ($ticketStats->urgent_count ?? 0),
                    'new_this_week' => (int) ($ticketStats->new_this_week ?? 0),
                    'resolved_percentage_label' => $resolvedPercentageLabel,
                    'resolution_rate_30d' => (float) $resolutionRate,
                    'avg_time_formatted' => $avgTimeFormatted,
                    'avg_time_description' => $avgTimeDescription,
                ],
                'messages' => [
                    'unread' => (int) $unreadMessages,
                    'sent_this_month' => (int) $sentThisMonth,
                    'drafts' => (int) $drafts,
                    'starred' => (int) $starred,
                    'month_label' => now()->format('M/Y'),
                ],
                'activity' => [
                    'online_users' => (int) $onlineUsers,
                    'accesses_today' => (int) $accessesToday,
                    'online_window_minutes' => (int) $onlineWindowMinutes,
                ],
                'posts' => $posts->map(function (Post $p) use ($likedSet) {
                    $photo = $p->author?->photo_path;
                    if (is_string($photo) && $photo !== '' && ! str_starts_with($photo, 'http://') && ! str_starts_with($photo, 'https://') && ! str_starts_with($photo, 'data:') && ! str_starts_with($photo, '/')) {
                        $photo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photo), '/'));
                    }

                    return [
                        'id' => (string) $p->id,
                        'title' => $p->title,
                        'content' => (string) ($p->content ?? ''),
                        'is_pinned' => (bool) $p->is_pinned,
                        'published_at' => $p->published_at?->toIso8601String(),
                        'likes_count' => (int) ($p->likes_count ?? 0),
                        'liked_by_me' => isset($likedSet[$p->id]),
                        'author' => [
                            'id' => $p->author?->id !== null ? (string) $p->author->id : null,
                            'name' => $p->author?->name,
                            'photo_path' => $photo,
                        ],
                    ];
                })->values(),
            ],
        ]);
    });

    Route::get('me', function () {
        $u = auth()->user();
        abort_unless($u, 401);

        $photo = $u->photo_path;
        if (is_string($photo) && $photo !== '') {
            $norm = str_replace('\\', '/', $photo);
            if (! str_starts_with($norm, 'http://') && ! str_starts_with($norm, 'https://') && ! str_starts_with($norm, 'data:')) {
                if (str_starts_with($norm, '/storage/')) {
                    $photo = url($norm);
                } else {
                    $photo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $norm), '/'));
                }
            }
        }

        return response()->json([
            'data' => [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'is_admin' => (bool) $u->isAdmin(),
                'photo_path' => $photo,
            ],
        ]);
    });

    Route::get('admin/modules', function () {
        $me = auth()->user();
        abort_unless($me, 401);

        $moduleLabels = [
            'Administration' => 'Administração',
            'Support' => 'Suporte',
            'Finance' => 'Financeiro',
            'HumanResources' => 'Recursos Humanos',
            'Communication' => 'Comunicação',
            'CRM' => 'CRM',
            'Reports' => 'Relatórios e Logs',
            'BlissNatura' => 'Bliss Natura',
            'EspacoAbsoluto' => 'Espaço Absoluto',
            'MyFormula' => 'MyFormula',
            'Personal' => 'Pessoal',
            'Products' => 'Produtos',
        ];

        $statusPath = base_path('modules_statuses.json');
        $savedStatuses = [];
        if (File::exists($statusPath)) {
            $decoded = json_decode((string) File::get($statusPath), true);
            if (is_array($decoded)) $savedStatuses = $decoded;
        }

        $moduleKeys = array_keys($moduleLabels);
        $modulesRoot = base_path('Modules');
        if (File::isDirectory($modulesRoot)) {
            foreach (File::directories($modulesRoot) as $dir) {
                $name = basename($dir);
                $metaPath = $dir . DIRECTORY_SEPARATOR . 'module.json';
                if (File::exists($metaPath)) {
                    $meta = json_decode((string) File::get($metaPath), true);
                    if (is_array($meta) && isset($meta['name']) && is_string($meta['name']) && $meta['name'] !== '') $name = $meta['name'];
                }
                $moduleKeys[] = $name;
            }
        }

        foreach (array_keys($savedStatuses) as $key) $moduleKeys[] = (string) $key;

        $data = collect(array_values(array_unique($moduleKeys)))
            ->map(fn ($key) => [
                'key' => (string) $key,
                'name' => $moduleLabels[$key] ?? (string) $key,
                'enabled' => (bool) ($savedStatuses[$key] ?? true),
            ])
            ->sortBy('name')
            ->values()
            ->all();

        return response()->json(['data' => $data]);
    });

    Route::put('admin/modules', function () {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        $moduleLabels = [
            'Administration' => 'Administração', 'Support' => 'Suporte', 'Finance' => 'Financeiro',
            'HumanResources' => 'Recursos Humanos', 'Communication' => 'Comunicação', 'CRM' => 'CRM',
            'Reports' => 'Relatórios e Logs', 'BlissNatura' => 'Bliss Natura', 'EspacoAbsoluto' => 'Espaço Absoluto',
            'MyFormula' => 'MyFormula', 'Personal' => 'Pessoal', 'Products' => 'Produtos',
        ];

        $validated = request()->validate([
            'modules' => ['required', 'array', 'min:1'],
            'modules.*.key' => ['required', 'string', 'max:120'],
            'modules.*.enabled' => ['required', 'boolean'],
        ]);

        $statuses = [];
        foreach ($validated['modules'] as $module) $statuses[$module['key']] = (bool) $module['enabled'];

        File::put(base_path('modules_statuses.json'), json_encode($statuses, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $data = collect($statuses)
            ->map(fn ($enabled, $key) => [
                'key' => (string) $key,
                'name' => $moduleLabels[$key] ?? (string) $key,
                'enabled' => (bool) $enabled,
            ])
            ->sortBy('name')
            ->values()
            ->all();

        return response()->json(['data' => $data]);
    });

    Route::prefix('espacoabsoluto')->group(function () {
        Route::get('overview', function () {
            $totalMessages = EspacoAbsolutoUserMessage::query()->where(function ($q) {
                $q->whereNull('apaga')->orWhere('apaga', 0);
            })->count();

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
                    'title' => (string) $group->nome,
                    'description' => 'Origem',
                    'count' => (int) $count,
                ]);
            }

            return response()->json(['data' => ['cards' => $cards->values()->all()]]);
        });

        Route::get('customers', function () {
            $search = trim((string) request('search', ''));

            $rows = EspacoAbsolutoCustomer::query()
                ->with(['groups:idgrupo,nome', 'messages:id,iduser,subject,data_added'])
                ->when($search !== '', function ($q) use ($search) {
                    $q->where(function ($w) use ($search) {
                        $w->where('iduser', 'like', "%{$search}%")
                            ->orWhere('nome', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('telefone', 'like', "%{$search}%");
                    });
                })
                ->orderByDesc('data_added')
                ->limit(500)
                ->get();

            $data = $rows->map(function (EspacoAbsolutoCustomer $c) {
                $origin = 'Desconhecido';
                $group = $c->groups->first();
                if ($group && is_string($group->nome) && $group->nome !== '') {
                    $origin = $group->nome;
                } else {
                    $msg = $c->messages->sortBy('data_added')->first();
                    if ($msg && is_string($msg->subject)) {
                        $subject = $msg->subject;
                        if (stripos($subject, 'Pergunta') !== false) $origin = 'Pergunta Grátis';
                        elseif (stripos($subject, 'Oração') !== false || stripos($subject, 'Orações') !== false) $origin = 'CTA Orações';
                        elseif (stripos($subject, 'E-book') !== false) $origin = 'CTA E-book';
                        elseif (stripos($subject, 'Tarot') !== false) $origin = 'Tarot do Dia';
                        elseif (stripos($subject, 'Pedido') !== false || stripos($subject, 'Ligação') !== false) $origin = 'Nós ligamos!';
                        elseif (stripos($subject, 'Newsletter') !== false) $origin = 'Newsletter';
                        elseif (stripos($subject, 'Notícias') !== false) $origin = 'Notícias';
                        else $origin = 'Mensagens';
                    }
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
            })->values();

            return response()->json(['data' => $data]);
        });

        Route::get('user-groups', function () {
            $rows = EspacoAbsolutoUserGroup::query()->orderBy('nome')->get();
            $data = $rows->map(fn (EspacoAbsolutoUserGroup $g) => [
                'id' => (int) $g->idgrupo,
                'name' => (string) ($g->nome ?? ''),
                'dashboard' => (bool) $g->dashboard,
                'is_active' => ! ((bool) $g->apaga),
                'created_at' => null,
                'updated_at' => null,
            ])->values();
            return response()->json(['data' => $data]);
        });

        Route::get('user-messages', function () {
            $userId = request('user_id');
            $rows = EspacoAbsolutoUserMessage::query()
                ->when($userId !== null && $userId !== '', fn ($q) => $q->where('iduser', $userId))
                ->orderByDesc('data_added')
                ->limit(500)
                ->get();

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

            return response()->json(['data' => $data]);
        });

        Route::get('appointments', function () {
            $rows = EspacoAbsolutoAppointment::query()->orderByDesc('date_from')->limit(500)->get();
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
            return response()->json(['data' => $data]);
        });
    });

    // Reports & Logs — System Logs API
    Route::prefix('reports')->group(function () {
        Route::get('system-logs', function () {
            $q = \App\Models\SystemLog::query();

            $search = trim((string) request('search', ''));
            $level = trim((string) request('level', ''));
            $action = trim((string) request('action', ''));
            $userIdProvided = request()->has('user_id');
            $userId = $userIdProvided ? request('user_id') : null;

            if ($level !== '') $q->where('level', $level);
            if ($action !== '') $q->where('action', $action);
            if ($userIdProvided) {
                if ($userId === null || $userId === '' || strtolower((string) $userId) === 'null') {
                    $q->whereNull('user_id');
                } else {
                    $q->where('user_id', $userId);
                }
            }

            if ($search !== '') {
                $q->where(function ($w) use ($search) {
                    $w->where('action', 'like', "%{$search}%")
                      ->orWhere('model_type', 'like', "%{$search}%")
                      ->orWhere('model_id', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('level', 'like', "%{$search}%");
                });
            }

            $rows = $q->orderByDesc('created_at')->limit(200)->get();

            $data = $rows->map(function (\App\Models\SystemLog $log) {
                return [
                    'id' => (string) $log->id,
                    'user_id' => $log->user_id !== null ? (string) $log->user_id : null,
                    'action' => $log->action,
                    'model_type' => $log->model_type,
                    'model_id' => $log->model_id !== null ? (string) $log->model_id : null,
                    'description' => $log->description,
                    'ip_address' => $log->ip_address,
                    'user_agent' => $log->user_agent,
                    'level' => $log->level,
                    'context' => $log->context,
                    'created_at' => $log->created_at?->toIso8601String(),
                ];
            })->values();

            return response()->json(['data' => $data]);
        });

        Route::get('system-logs/{log}', function (\App\Models\SystemLog $log) {
            return response()->json(['data' => [
                'id' => (string) $log->id,
                'user_id' => $log->user_id !== null ? (string) $log->user_id : null,
                'action' => $log->action,
                'model_type' => $log->model_type,
                'model_id' => $log->model_id !== null ? (string) $log->model_id : null,
                'description' => $log->description,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'level' => $log->level,
                'context' => $log->context,
                'created_at' => $log->created_at?->toIso8601String(),
            ]]);
        });
    });

    Route::prefix('communication')->group(function () {
        Route::get('messages', function () {
            $user = auth()->user();
            abort_unless($user, 401);

            $folder = trim((string) request('folder', 'inbox'));
            $search = trim((string) request('search', ''));

            if ($folder === 'sent') {
                $q = InternalMessage::query()
                    ->where('sender_id', $user->id)
                    ->where('status', 'sent')
                    ->with(['recipients']);

                if ($search !== '') {
                    $q->where(function ($mq) use ($search) {
                        $mq->where('subject', 'like', "%{$search}%")
                            ->orWhere('body', 'like', "%{$search}%");
                    });
                }

                $msgs = $q->orderByDesc('sent_at')->limit(50)->get();

                $data = $msgs->flatMap(function (InternalMessage $m) {
                    return $m->recipients->map(function (MessageRecipient $r) use ($m) {
                        return [
                            'id' => (string) $r->id,
                            'from_user_id' => (string) $m->sender_id,
                            'to_user_id' => (string) $r->recipient_id,
                            'subject' => (string) ($m->subject ?? ''),
                            'body' => (string) ($m->body ?? ''),
                            'folder' => 'sent',
                            'read_at' => $r->read_at?->toIso8601String(),
                            'sent_at' => $m->sent_at?->toIso8601String(),
                            'created_at' => $m->created_at?->toIso8601String(),
                            'updated_at' => $m->updated_at?->toIso8601String(),
                        ];
                    });
                })->values();

                return response()->json(['data' => $data]);
            }

            $q = MessageRecipient::query()
                ->where('recipient_id', $user->id)
                ->where('is_deleted', false)
                ->where('is_archived', false)
                ->with(['message']);

            if ($search !== '') {
                $q->whereHas('message', function ($mq) use ($search) {
                    $mq->where('subject', 'like', "%{$search}%")
                        ->orWhere('body', 'like', "%{$search}%");
                });
            }

            $rows = $q->orderByDesc('created_at')->limit(50)->get();

            $data = $rows->map(function (MessageRecipient $r) {
                $m = $r->message;

                return [
                    'id' => (string) $r->id,
                    'from_user_id' => $m?->sender_id !== null ? (string) $m->sender_id : null,
                    'to_user_id' => (string) $r->recipient_id,
                    'subject' => (string) ($m?->subject ?? ''),
                    'body' => (string) ($m?->body ?? ''),
                    'folder' => 'inbox',
                    'read_at' => $r->read_at?->toIso8601String(),
                    'sent_at' => $m?->sent_at?->toIso8601String(),
                    'created_at' => $m?->created_at?->toIso8601String(),
                    'updated_at' => $m?->updated_at?->toIso8601String(),
                ];
            })->values();

            return response()->json(['data' => $data]);
        });

        Route::post('messages', function () {
            $user = auth()->user();
            abort_unless($user, 401);

            $validated = request()->validate([
                'to_user_id' => ['required', 'exists:users,id'],
                'subject' => ['nullable', 'string', 'max:255'],
                'body' => ['required', 'string'],
            ]);

            $subject = trim((string) ($validated['subject'] ?? ''));
            if ($subject === '') {
                $subject = '(Sem assunto)';
            }

            $message = InternalMessage::create([
                'subject' => $subject,
                'body' => (string) $validated['body'],
                'priority' => 'normal',
                'status' => 'sent',
                'sender_id' => $user->id,
                'is_broadcast' => false,
                'sent_at' => now(),
            ]);

            $recipient = MessageRecipient::create([
                'message_id' => $message->id,
                'recipient_id' => $validated['to_user_id'],
                'type' => 'to',
                'is_deleted' => false,
                'is_archived' => false,
                'is_starred' => false,
            ]);

            $recipientUser = User::find($validated['to_user_id']);
            if ($recipientUser && (int) $recipientUser->id !== (int) $user->id) {
                $senderName = trim((string) ($user->name ?? ''));
                if ($senderName === '') $senderName = 'Utilizador';

                \Filament\Notifications\Notification::make()
                    ->title("Nova mensagem de {$senderName}")
                    ->info()
                    ->body("Assunto: {$subject}")
                    ->sendToDatabase($recipientUser);

                $recipientUser->notify(new \App\Notifications\MessageSentNotification($message, $user, false));
            }

            return response()->json([
                'data' => [
                    'id' => (string) $recipient->id,
                    'from_user_id' => (string) $message->sender_id,
                    'to_user_id' => (string) $recipient->recipient_id,
                    'subject' => (string) ($message->subject ?? ''),
                    'body' => (string) ($message->body ?? ''),
                    'folder' => 'sent',
                    'read_at' => null,
                    'sent_at' => $message->sent_at?->toIso8601String(),
                    'created_at' => $message->created_at?->toIso8601String(),
                    'updated_at' => $message->updated_at?->toIso8601String(),
                ],
            ], 201);
        });

        Route::get('recipients', function () {
            $me = auth()->user();
            abort_unless($me, 401);

            $search = trim((string) request('search', ''));

            $q = User::query()
                ->where('is_active', true)
                ->whereKeyNot($me->id);

            if (! $me->isAdmin() && $me->company_id) {
                $q->where('company_id', $me->company_id);
            }

            if ($search !== '') {
                $q->where(function ($w) use ($search) {
                    $w->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            $rows = $q->orderBy('name')->limit(200)->get(['id', 'name', 'email', 'is_active']);

            $data = $rows->map(fn (User $u) => [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'is_active' => (bool) $u->is_active,
            ])->values();

            return response()->json(['data' => $data]);
        });

        Route::post('messages/{recipient}/read', function (MessageRecipient $recipient) {
            $user = auth()->user();
            abort_unless($user, 401);
            abort_unless((int) $recipient->recipient_id === (int) $user->id, 403);

            if ($recipient->read_at === null) {
                $recipient->forceFill(['read_at' => now()])->save();
            }

            $recipient->load('message');
            $m = $recipient->message;

            return response()->json([
                'data' => [
                    'id' => (string) $recipient->id,
                    'from_user_id' => $m?->sender_id !== null ? (string) $m->sender_id : null,
                    'to_user_id' => (string) $recipient->recipient_id,
                    'subject' => (string) ($m?->subject ?? ''),
                    'body' => (string) ($m?->body ?? ''),
                    'folder' => 'inbox',
                    'read_at' => $recipient->read_at?->toIso8601String(),
                    'sent_at' => $m?->sent_at?->toIso8601String(),
                    'created_at' => $m?->created_at?->toIso8601String(),
                    'updated_at' => $m?->updated_at?->toIso8601String(),
                ],
            ]);
        });

        Route::post('posts/attachments/upload', function () {
            $user = auth()->user();
            abort_unless($user, 401);
            abort_unless($user->isAdmin(), 403);

            $validated = request()->validate([
                'file' => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx'],
            ]);

            $file = $validated['file'];
            $original = (string) $file->getClientOriginalName();
            $ext = strtolower((string) $file->getClientOriginalExtension());
            $base = pathinfo($original, PATHINFO_FILENAME);
            $safe = Str::slug($base);
            if ($safe === '') {
                $safe = (string) Str::uuid();
            }

            $filename = $safe . '-' . Str::uuid() . ($ext ? ('.' . $ext) : '');
            $path = $file->storeAs('posts/attachments', $filename, 'public');
            $url = Storage::disk('public')->url($path);

            return response()->json([
                'url' => $url,
                'filename' => $filename,
            ], 201);
        });

        Route::get('posts/attachments/list', function () {
            $user = auth()->user();
            abort_unless($user, 401);
            abort_unless($user->isAdmin(), 403);

            $disk = Storage::disk('public');
            $files = $disk->files('posts/attachments');

            $items = collect($files)
                ->filter(fn ($path) => preg_match('/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i', $path))
                ->map(function ($path) use ($disk) {
                    $filename = basename($path);

                    return [
                        'filename' => $filename,
                        'url' => $disk->url($path),
                        'size' => $disk->size($path),
                        'last_modified' => $disk->lastModified($path),
                    ];
                })
                ->sortByDesc('last_modified')
                ->values();

            return response()->json(['data' => $items]);
        });

        Route::get('posts', function () {
            $user = auth()->user();
            abort_unless($user, 401);

            $posts = Post::published()
                ->when($user->department_id, function ($query) use ($user) {
                    $query->forDepartment($user->department_id);
                })
                ->with(['author'])
                ->orderBy('is_pinned', 'desc')
                ->orderBy('published_at', 'desc')
                ->limit(50)
                ->get();

            $likedIds = PostLike::where('user_id', $user->id)
                ->whereIn('post_id', $posts->pluck('id')->all())
                ->pluck('post_id')
                ->all();

            $likedSet = array_fill_keys($likedIds, true);

            return response()->json([
                'data' => $posts->map(function (Post $p) use ($likedSet, $user) {
                    $canPin = (bool) $user->isAdmin();
                    $canManage = $canPin || ((int) $p->author_id === (int) $user->id);

                    $photo = $p->author?->photo_path;
                    if (is_string($photo) && $photo !== '' && ! str_starts_with($photo, 'http://') && ! str_starts_with($photo, 'https://') && ! str_starts_with($photo, 'data:') && ! str_starts_with($photo, '/')) {
                        $photo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photo), '/'));
                    }

                    return [
                        'id' => (string) $p->id,
                        'title' => $p->title,
                        'content' => (string) ($p->content ?? ''),
                        'type' => $p->type,
                        'priority' => $p->priority,
                        'is_pinned' => (bool) $p->is_pinned,
                        'featured_image_url' => $p->featured_image_url,
                        'youtube_video_url' => $p->youtube_video_url,
                        'attachment_urls' => is_array($p->attachment_urls) ? $p->attachment_urls : [],
                        'published_at' => $p->published_at?->toIso8601String(),
                        'expires_at' => $p->expires_at?->toIso8601String(),
                        'likes_count' => (int) ($p->likes_count ?? 0),
                        'liked_by_me' => isset($likedSet[$p->id]),
                        'author' => [
                            'id' => $p->author?->id !== null ? (string) $p->author->id : null,
                            'name' => $p->author?->name,
                            'photo_path' => $photo,
                        ],
                        'can_pin' => $canPin,
                        'can_manage' => $canManage,
                        'created_at' => $p->created_at?->toIso8601String(),
                        'updated_at' => $p->updated_at?->toIso8601String(),
                    ];
                })->values(),
            ]);
        });

        Route::post('posts', function () {
            $user = auth()->user();
            abort_unless($user, 401);
            abort_unless($user->isAdmin(), 403);

            $validated = request()->validate([
                'title' => ['nullable', 'string', 'max:255'],
                'content' => ['required', 'string'],
                'type' => ['nullable', 'in:text,image,video,announcement'],
                'priority' => ['nullable', 'in:low,normal,high,urgent'],
                'featured_image_url' => ['nullable', 'url', 'max:2048'],
                'youtube_video_url' => ['nullable', 'url', 'max:2048'],
                'attachment_urls' => ['nullable', 'array'],
                'attachment_urls.*' => ['string', 'url', 'max:2048'],
                'is_pinned' => ['nullable', 'boolean'],
                'expires_at' => ['nullable', 'date'],
            ]);

            $title = trim((string) ($validated['title'] ?? ''));
            if ($title === '') {
                $title = 'Comunicado';
            }

            $post = Post::create([
                'title' => $title,
                'content' => (string) $validated['content'],
                'type' => $validated['type'] ?? 'announcement',
                'priority' => $validated['priority'] ?? 'normal',
                'status' => 'published',
                'is_pinned' => (bool) ($validated['is_pinned'] ?? false),
                'featured_image_url' => $validated['featured_image_url'] ?? null,
                'youtube_video_url' => $validated['youtube_video_url'] ?? null,
                'attachment_urls' => $validated['attachment_urls'] ?? null,
                'published_at' => now(),
                'expires_at' => $validated['expires_at'] ?? null,
                'author_id' => $user->id,
            ]);

            $post->load('author');

            $photo = $post->author?->photo_path;
            if (is_string($photo) && $photo !== '' && ! str_starts_with($photo, 'http://') && ! str_starts_with($photo, 'https://') && ! str_starts_with($photo, 'data:') && ! str_starts_with($photo, '/')) {
                $photo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photo), '/'));
            }

            return response()->json([
                'data' => [
                    'id' => (string) $post->id,
                    'title' => $post->title,
                    'content' => (string) ($post->content ?? ''),
                    'type' => $post->type,
                    'priority' => $post->priority,
                    'is_pinned' => (bool) $post->is_pinned,
                    'featured_image_url' => $post->featured_image_url,
                    'youtube_video_url' => $post->youtube_video_url,
                    'attachment_urls' => is_array($post->attachment_urls) ? $post->attachment_urls : [],
                    'published_at' => $post->published_at?->toIso8601String(),
                    'expires_at' => $post->expires_at?->toIso8601String(),
                    'likes_count' => (int) ($post->likes_count ?? 0),
                    'liked_by_me' => false,
                    'author' => [
                        'id' => $post->author?->id !== null ? (string) $post->author->id : null,
                        'name' => $post->author?->name,
                        'photo_path' => $photo,
                    ],
                    'can_pin' => true,
                    'can_manage' => true,
                    'created_at' => $post->created_at?->toIso8601String(),
                    'updated_at' => $post->updated_at?->toIso8601String(),
                ],
            ], 201);
        });

        Route::get('posts/{post}/comments', function (Post $post) {
            $user = auth()->user();
            abort_unless($user, 401);

            $visible = Post::published()
                ->when($user->department_id, function ($query) use ($user) {
                    $query->forDepartment($user->department_id);
                })
                ->whereKey($post->id)
                ->exists();

            abort_unless($visible, 404);

            $comments = PostComment::query()
                ->where('post_id', $post->id)
                ->where('is_approved', true)
                ->with(['user'])
                ->orderBy('created_at', 'asc')
                ->get();

            return response()->json([
                'data' => $comments->map(function (PostComment $c) {
                    $photo = $c->user?->photo_path;
                    if (is_string($photo) && $photo !== '' && ! str_starts_with($photo, 'http://') && ! str_starts_with($photo, 'https://') && ! str_starts_with($photo, 'data:') && ! str_starts_with($photo, '/')) {
                        $photo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photo), '/'));
                    }

                    return [
                        'id' => (string) $c->id,
                        'post_id' => (string) $c->post_id,
                        'user_id' => (string) $c->user_id,
                        'content' => (string) ($c->content ?? ''),
                        'createdAt' => $c->created_at?->toIso8601String(),
                        'user' => [
                            'id' => $c->user?->id !== null ? (string) $c->user->id : null,
                            'name' => $c->user?->name,
                            'photo_path' => $photo,
                        ],
                    ];
                })->values(),
            ]);
        });

        Route::post('posts/{post}/comments', function (Post $post) {
            $user = auth()->user();
            abort_unless($user, 401);

            $visible = Post::published()
                ->when($user->department_id, function ($query) use ($user) {
                    $query->forDepartment($user->department_id);
                })
                ->whereKey($post->id)
                ->exists();

            abort_unless($visible, 404);

            $validated = request()->validate([
                'content' => ['required', 'string', 'max:5000'],
            ]);

            $comment = PostComment::create([
                'post_id' => $post->id,
                'user_id' => $user->id,
                'content' => (string) $validated['content'],
                'is_approved' => true,
            ]);

            $comment->load('user');

            $photo = $comment->user?->photo_path;
            if (is_string($photo) && $photo !== '' && ! str_starts_with($photo, 'http://') && ! str_starts_with($photo, 'https://') && ! str_starts_with($photo, 'data:') && ! str_starts_with($photo, '/')) {
                $photo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photo), '/'));
            }

            return response()->json([
                'data' => [
                    'id' => (string) $comment->id,
                    'post_id' => (string) $comment->post_id,
                    'user_id' => (string) $comment->user_id,
                    'content' => (string) ($comment->content ?? ''),
                    'createdAt' => $comment->created_at?->toIso8601String(),
                    'user' => [
                        'id' => $comment->user?->id !== null ? (string) $comment->user->id : null,
                        'name' => $comment->user?->name,
                        'photo_path' => $photo,
                    ],
                ],
            ], 201);
        });

        Route::post('posts/{post}/toggle-like', function (Post $post) {
            $user = auth()->user();
            abort_unless($user, 401);

            $like = PostLike::where('post_id', $post->id)->where('user_id', $user->id)->first();
            if ($like) {
                $like->delete();
                $post->likes_count = max(0, (int) $post->likes_count - 1);
            } else {
                PostLike::create(['post_id' => $post->id, 'user_id' => $user->id]);
                $post->likes_count = (int) $post->likes_count + 1;
            }

            $post->save();
            $post->load('author');

            $canPin = (bool) $user->isAdmin();
            $canManage = $canPin || ((int) $post->author_id === (int) $user->id);

            $photo = $post->author?->photo_path;
            if (is_string($photo) && $photo !== '' && ! str_starts_with($photo, 'http://') && ! str_starts_with($photo, 'https://') && ! str_starts_with($photo, 'data:') && ! str_starts_with($photo, '/')) {
                $photo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photo), '/'));
            }

            return response()->json([
                'data' => [
                    'id' => (string) $post->id,
                    'title' => $post->title,
                    'content' => (string) ($post->content ?? ''),
                    'type' => $post->type,
                    'priority' => $post->priority,
                    'is_pinned' => (bool) $post->is_pinned,
                    'featured_image_url' => $post->featured_image_url,
                    'youtube_video_url' => $post->youtube_video_url,
                    'attachment_urls' => is_array($post->attachment_urls) ? $post->attachment_urls : [],
                    'published_at' => $post->published_at?->toIso8601String(),
                    'expires_at' => $post->expires_at?->toIso8601String(),
                    'likes_count' => (int) ($post->likes_count ?? 0),
                    'liked_by_me' => PostLike::where('post_id', $post->id)->where('user_id', $user->id)->exists(),
                    'author' => [
                        'id' => $post->author?->id !== null ? (string) $post->author->id : null,
                        'name' => $post->author?->name,
                        'photo_path' => $photo,
                    ],
                    'can_pin' => $canPin,
                    'can_manage' => $canManage,
                    'created_at' => $post->created_at?->toIso8601String(),
                    'updated_at' => $post->updated_at?->toIso8601String(),
                ],
            ]);
        });

        Route::post('posts/{post}/toggle-pin', function (Post $post) {
            $user = auth()->user();
            abort_unless($user && $user->isAdmin(), 403);

            $post->is_pinned = !(bool) $post->is_pinned;
            $post->save();
            $post->load('author');

            $photo = $post->author?->photo_path;
            if (is_string($photo) && $photo !== '' && ! str_starts_with($photo, 'http://') && ! str_starts_with($photo, 'https://') && ! str_starts_with($photo, 'data:') && ! str_starts_with($photo, '/')) {
                $photo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photo), '/'));
            }

            return response()->json([
                'data' => [
                    'id' => (string) $post->id,
                    'title' => $post->title,
                    'content' => (string) ($post->content ?? ''),
                    'type' => $post->type,
                    'priority' => $post->priority,
                    'is_pinned' => (bool) $post->is_pinned,
                    'featured_image_url' => $post->featured_image_url,
                    'youtube_video_url' => $post->youtube_video_url,
                    'attachment_urls' => is_array($post->attachment_urls) ? $post->attachment_urls : [],
                    'published_at' => $post->published_at?->toIso8601String(),
                    'expires_at' => $post->expires_at?->toIso8601String(),
                    'likes_count' => (int) ($post->likes_count ?? 0),
                    'liked_by_me' => PostLike::where('post_id', $post->id)->where('user_id', $user->id)->exists(),
                    'author' => [
                        'id' => $post->author?->id !== null ? (string) $post->author->id : null,
                        'name' => $post->author?->name,
                        'photo_path' => $photo,
                    ],
                    'can_pin' => true,
                    'can_manage' => true,
                    'created_at' => $post->created_at?->toIso8601String(),
                    'updated_at' => $post->updated_at?->toIso8601String(),
                ],
            ]);
        });

        Route::delete('posts/{post}', function (Post $post) {
            $user = auth()->user();
            abort_unless($user, 401);

            $canManage = (bool) $user->isAdmin() || ((int) $post->author_id === (int) $user->id);
            abort_unless($canManage, 403);

            $post->delete();
            return response()->json(['data' => true]);
        });

        Route::get('video-calls', function () {
            $user = auth()->user();
            abort_unless($user, 401);

            $calls = VideoCall::query()
                ->where('created_by', $user->id)
                ->orWhereHas('invites', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                })
                ->orderByDesc('created_at')
                ->limit(50)
                ->get();

            $data = $calls->map(function (VideoCall $c) {
                $scheduledAt = null;
                if (is_string($c->description) && $c->description !== '') {
                    $decoded = json_decode($c->description, true);
                    if (is_array($decoded) && array_key_exists('scheduled_at', $decoded)) {
                        $scheduledAt = $decoded['scheduled_at'];
                    }
                }

                return [
                    'id' => (string) $c->id,
                    'room_id' => $c->room_id,
                    'title' => (string) ($c->title ?: 'Reunião'),
                    'meet_url' => url('/admin/video-call?room=' . urlencode($c->room_id)),
                    'scheduled_at' => $scheduledAt,
                    'created_by' => (string) $c->created_by,
                    'createdAt' => $c->created_at?->toIso8601String(),
                    'updatedAt' => $c->updated_at?->toIso8601String(),
                ];
            })->values();

            return response()->json(['data' => $data]);
        });

        Route::post('video-calls', function () {
            $user = auth()->user();
            abort_unless($user, 401);

            $validated = request()->validate([
                'title' => ['required', 'string', 'max:255'],
                'scheduled_at' => ['nullable', 'date'],
                'room_id' => ['nullable', 'string', 'max:255'],
            ]);

            $roomId = trim((string) ($validated['room_id'] ?? ''));
            if ($roomId === '') {
                $roomId = 'repger-' . now()->timestamp . '-' . Str::lower(Str::random(8));
            }

            $call = VideoCall::create([
                'room_id' => $roomId,
                'created_by' => $user->id,
                'status' => 'active',
                'title' => $validated['title'],
                'description' => json_encode([
                    'scheduled_at' => $validated['scheduled_at'] ?? null,
                ]),
            ]);

            return response()->json([
                'data' => [
                    'id' => (string) $call->id,
                    'room_id' => $call->room_id,
                    'title' => (string) ($call->title ?: 'Reunião'),
                    'meet_url' => url('/admin/video-call?room=' . urlencode($call->room_id)),
                    'scheduled_at' => $validated['scheduled_at'] ?? null,
                    'created_by' => (string) $call->created_by,
                    'createdAt' => $call->created_at?->toIso8601String(),
                    'updatedAt' => $call->updated_at?->toIso8601String(),
                ],
            ], 201);
        });
    });

    Route::get('support/categories', function () {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $search = trim((string) request('search', ''));
        $companyId = trim((string) request('company_id', ''));

        $hasIsActive = request()->has('is_active');
        $isActive = $hasIsActive ? filter_var(request('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

        $query = Category::query()->orderByDesc('created_at');

        if ($companyId !== '') {
            $query->where('company_id', $companyId);
        }

        if ($hasIsActive && $isActive !== null) {
            $query->where('is_active', $isActive);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (Category $c) {
            return [
                'id' => (string) $c->id,
                'company_id' => (string) $c->company_id,
                'name' => $c->name,
                'description' => $c->description,
                'color' => $c->color,
                'is_active' => (bool) $c->is_active,
                'created_at' => $c->created_at?->toIso8601String(),
                'updated_at' => $c->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('support/categories/{category}', function (Category $category) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        return response()->json([
            'data' => [
                'id' => (string) $category->id,
                'company_id' => (string) $category->company_id,
                'name' => $category->name,
                'description' => $category->description,
                'color' => $category->color,
                'is_active' => (bool) $category->is_active,
                'created_at' => $category->created_at?->toIso8601String(),
                'updated_at' => $category->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('support/categories', function () {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $validated = request()->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:50'],
            'is_active' => ['required', 'boolean'],
        ]);

        $category = Category::create([
            'company_id' => $validated['company_id'],
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#3B82F6',
            'is_active' => (bool) $validated['is_active'],
        ]);

        return response()->json([
            'data' => [
                'id' => (string) $category->id,
                'company_id' => (string) $category->company_id,
                'name' => $category->name,
                'description' => $category->description,
                'color' => $category->color,
                'is_active' => (bool) $category->is_active,
                'created_at' => $category->created_at?->toIso8601String(),
                'updated_at' => $category->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('support/categories/{category}', function (Category $category) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $validated = request()->validate([
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        $category->fill($validated);
        $category->save();

        return response()->json([
            'data' => [
                'id' => (string) $category->id,
                'company_id' => (string) $category->company_id,
                'name' => $category->name,
                'description' => $category->description,
                'color' => $category->color,
                'is_active' => (bool) $category->is_active,
                'created_at' => $category->created_at?->toIso8601String(),
                'updated_at' => $category->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('support/categories/{category}', function (Category $category) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        try {
            $category->delete();
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage() ?: 'Falha ao eliminar categoria',
            ], 422);
        }

        return response()->json(['ok' => true]);
    });

    Route::get('finance/categories', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $search = trim((string) request('search', ''));
        $companyId = trim((string) request('company_id', ''));
        $type = trim((string) request('type', ''));

        $hasIsActive = request()->has('is_active');
        $isActive = $hasIsActive ? filter_var(request('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

        $query = FinanceCategory::query()->orderByDesc('created_at');

        if ($companyId !== '') {
            $query->where('company_id', $companyId);
        }

        if ($type !== '') {
            $query->where('type', $type);
        }

        if ($hasIsActive && $isActive !== null) {
            $query->where('is_active', $isActive);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (FinanceCategory $c) {
            return [
                'id' => (string) $c->id,
                'company_id' => (string) $c->company_id,
                'parent_id' => $c->parent_id !== null ? (string) $c->parent_id : null,
                'name' => $c->name,
                'type' => $c->type,
                'color' => $c->color,
                'is_active' => (bool) $c->is_active,
                'created_at' => $c->created_at?->toIso8601String(),
                'updated_at' => $c->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('finance/categories/{financeCategory}', function (FinanceCategory $financeCategory) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        return response()->json([
            'data' => [
                'id' => (string) $financeCategory->id,
                'company_id' => (string) $financeCategory->company_id,
                'parent_id' => $financeCategory->parent_id !== null ? (string) $financeCategory->parent_id : null,
                'name' => $financeCategory->name,
                'type' => $financeCategory->type,
                'color' => $financeCategory->color,
                'is_active' => (bool) $financeCategory->is_active,
                'created_at' => $financeCategory->created_at?->toIso8601String(),
                'updated_at' => $financeCategory->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('finance/categories', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $validated = request()->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'parent_id' => ['nullable', 'exists:finance_categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:income,expense'],
            'color' => ['nullable', 'string', 'max:50'],
            'is_active' => ['required', 'boolean'],
        ]);

        if (($validated['parent_id'] ?? null) !== null) {
            $parent = FinanceCategory::query()->find($validated['parent_id']);
            if (! $parent) {
                return response()->json(['message' => 'Categoria pai inválida'], 422);
            }
            if ((string) $parent->company_id !== (string) $validated['company_id']) {
                return response()->json(['message' => 'Categoria pai deve ser da mesma empresa'], 422);
            }
            if ((string) $parent->type !== (string) $validated['type']) {
                return response()->json(['message' => 'Categoria pai deve ter o mesmo tipo'], 422);
            }
        }

        $category = FinanceCategory::create([
            'company_id' => $validated['company_id'],
            'parent_id' => $validated['parent_id'] ?? null,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'color' => $validated['color'] ?? null,
            'is_active' => (bool) $validated['is_active'],
        ]);

        return response()->json([
            'data' => [
                'id' => (string) $category->id,
                'company_id' => (string) $category->company_id,
                'parent_id' => $category->parent_id !== null ? (string) $category->parent_id : null,
                'name' => $category->name,
                'type' => $category->type,
                'color' => $category->color,
                'is_active' => (bool) $category->is_active,
                'created_at' => $category->created_at?->toIso8601String(),
                'updated_at' => $category->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('finance/categories/{financeCategory}', function (FinanceCategory $financeCategory) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $validated = request()->validate([
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'parent_id' => ['nullable', 'exists:finance_categories,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'in:income,expense'],
            'color' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        $nextCompanyId = array_key_exists('company_id', $validated) ? (string) $validated['company_id'] : (string) $financeCategory->company_id;
        $nextType = array_key_exists('type', $validated) ? (string) $validated['type'] : (string) $financeCategory->type;
        $nextParentId = array_key_exists('parent_id', $validated) ? $validated['parent_id'] : $financeCategory->parent_id;

        if ($nextParentId !== null) {
            if ((string) $nextParentId === (string) $financeCategory->id) {
                return response()->json(['message' => 'Categoria não pode ser pai de si própria'], 422);
            }

            $parent = FinanceCategory::query()->find($nextParentId);
            if (! $parent) {
                return response()->json(['message' => 'Categoria pai inválida'], 422);
            }
            if ((string) $parent->company_id !== $nextCompanyId) {
                return response()->json(['message' => 'Categoria pai deve ser da mesma empresa'], 422);
            }
            if ((string) $parent->type !== $nextType) {
                return response()->json(['message' => 'Categoria pai deve ter o mesmo tipo'], 422);
            }
        }

        $financeCategory->fill($validated);
        $financeCategory->save();

        return response()->json([
            'data' => [
                'id' => (string) $financeCategory->id,
                'company_id' => (string) $financeCategory->company_id,
                'parent_id' => $financeCategory->parent_id !== null ? (string) $financeCategory->parent_id : null,
                'name' => $financeCategory->name,
                'type' => $financeCategory->type,
                'color' => $financeCategory->color,
                'is_active' => (bool) $financeCategory->is_active,
                'created_at' => $financeCategory->created_at?->toIso8601String(),
                'updated_at' => $financeCategory->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('finance/categories/{financeCategory}', function (FinanceCategory $financeCategory) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        if ($financeCategory->children()->exists()) {
            return response()->json([
                'message' => 'Não é possível eliminar: existem subcategorias.',
            ], 422);
        }

        if ($financeCategory->transactions()->exists()) {
            return response()->json([
                'message' => 'Não é possível eliminar: existem lançamentos associados a esta categoria.',
            ], 422);
        }

        $financeCategory->delete();

        return response()->json(['ok' => true]);
    });

    Route::get('finance/cost-centers', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $search = trim((string) request('search', ''));
        $companyId = trim((string) request('company_id', ''));

        $query = FinanceCostCenter::query()->orderByDesc('created_at');

        if ($companyId !== '') {
            $query->where('company_id', $companyId);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (FinanceCostCenter $c) {
            return [
                'id' => (string) $c->id,
                'company_id' => (string) $c->company_id,
                'name' => $c->name,
                'code' => $c->code,
                'created_at' => $c->created_at?->toIso8601String(),
                'updated_at' => $c->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('finance/cost-centers/{financeCostCenter}', function (FinanceCostCenter $financeCostCenter) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        return response()->json([
            'data' => [
                'id' => (string) $financeCostCenter->id,
                'company_id' => (string) $financeCostCenter->company_id,
                'name' => $financeCostCenter->name,
                'code' => $financeCostCenter->code,
                'created_at' => $financeCostCenter->created_at?->toIso8601String(),
                'updated_at' => $financeCostCenter->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('finance/cost-centers', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $validated = request()->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:255'],
        ]);

        $normalizedCode = strtolower($validated['code']);
        $exists = FinanceCostCenter::query()
            ->where('company_id', $validated['company_id'])
            ->whereRaw('LOWER(code) = ?', [$normalizedCode])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Código já existe nesta empresa',
            ], 422);
        }

        $costCenter = FinanceCostCenter::create([
            'company_id' => $validated['company_id'],
            'name' => $validated['name'],
            'code' => $validated['code'],
        ]);

        return response()->json([
            'data' => [
                'id' => (string) $costCenter->id,
                'company_id' => (string) $costCenter->company_id,
                'name' => $costCenter->name,
                'code' => $costCenter->code,
                'created_at' => $costCenter->created_at?->toIso8601String(),
                'updated_at' => $costCenter->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('finance/cost-centers/{financeCostCenter}', function (FinanceCostCenter $financeCostCenter) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $validated = request()->validate([
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'required', 'string', 'max:255'],
        ]);

        $nextCompanyId = array_key_exists('company_id', $validated) ? $validated['company_id'] : $financeCostCenter->company_id;
        $nextCode = array_key_exists('code', $validated) ? $validated['code'] : $financeCostCenter->code;

        if ($nextCompanyId !== null && $nextCode !== null) {
            $normalizedCode = strtolower((string) $nextCode);
            $exists = FinanceCostCenter::query()
                ->where('company_id', $nextCompanyId)
                ->where('id', '!=', $financeCostCenter->id)
                ->whereRaw('LOWER(code) = ?', [$normalizedCode])
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'Código já existe nesta empresa',
                ], 422);
            }
        }

        $financeCostCenter->fill($validated);
        $financeCostCenter->save();

        return response()->json([
            'data' => [
                'id' => (string) $financeCostCenter->id,
                'company_id' => (string) $financeCostCenter->company_id,
                'name' => $financeCostCenter->name,
                'code' => $financeCostCenter->code,
                'created_at' => $financeCostCenter->created_at?->toIso8601String(),
                'updated_at' => $financeCostCenter->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('finance/cost-centers/{financeCostCenter}', function (FinanceCostCenter $financeCostCenter) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        if ($financeCostCenter->transactions()->exists()) {
            return response()->json([
                'message' => 'Não é possível eliminar: existem lançamentos associados a este centro de custo.',
            ], 422);
        }

        $financeCostCenter->delete();

        return response()->json(['ok' => true]);
    });

    Route::get('finance/transactions', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $search = trim((string) request('search', ''));
        $companyId = trim((string) request('company_id', ''));
        $type = trim((string) request('type', ''));
        $status = trim((string) request('status', ''));

        $query = FinanceTransaction::query()->orderByDesc('created_at');

        if ($companyId !== '') {
            $query->where('company_id', $companyId);
        }
        if ($type !== '') {
            $query->where('type', $type);
        }
        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (FinanceTransaction $t) {
            return [
                'id' => (string) $t->id,
                'company_id' => (string) $t->company_id,
                'description' => $t->description,
                'notes' => $t->notes,
                'amount' => (float) $t->amount,
                'due_date' => $t->due_date?->toIso8601String(),
                'paid_at' => $t->paid_at?->toIso8601String(),
                'type' => $t->type,
                'status' => $t->status,
                'category_id' => $t->category_id !== null ? (string) $t->category_id : null,
                'cost_center_id' => $t->cost_center_id !== null ? (string) $t->cost_center_id : null,
                'bank_account_id' => $t->bank_account_id !== null ? (string) $t->bank_account_id : null,
                'payer_type' => $t->payer_type,
                'payer_id' => $t->payer_id !== null ? (string) $t->payer_id : null,
                'reference_type' => $t->reference_type,
                'reference_id' => $t->reference_id !== null ? (string) $t->reference_id : null,
                'created_at' => $t->created_at?->toIso8601String(),
                'updated_at' => $t->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('finance/transactions/{financeTransaction}', function (FinanceTransaction $financeTransaction) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        return response()->json([
            'data' => [
                'id' => (string) $financeTransaction->id,
                'company_id' => (string) $financeTransaction->company_id,
                'description' => $financeTransaction->description,
                'notes' => $financeTransaction->notes,
                'amount' => (float) $financeTransaction->amount,
                'due_date' => $financeTransaction->due_date?->toIso8601String(),
                'paid_at' => $financeTransaction->paid_at?->toIso8601String(),
                'type' => $financeTransaction->type,
                'status' => $financeTransaction->status,
                'category_id' => $financeTransaction->category_id !== null ? (string) $financeTransaction->category_id : null,
                'cost_center_id' => $financeTransaction->cost_center_id !== null ? (string) $financeTransaction->cost_center_id : null,
                'bank_account_id' => $financeTransaction->bank_account_id !== null ? (string) $financeTransaction->bank_account_id : null,
                'payer_type' => $financeTransaction->payer_type,
                'payer_id' => $financeTransaction->payer_id !== null ? (string) $financeTransaction->payer_id : null,
                'reference_type' => $financeTransaction->reference_type,
                'reference_id' => $financeTransaction->reference_id !== null ? (string) $financeTransaction->reference_id : null,
                'created_at' => $financeTransaction->created_at?->toIso8601String(),
                'updated_at' => $financeTransaction->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('finance/transactions', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $validated = request()->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'description' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'amount' => ['required', 'numeric'],
            'due_date' => ['required', 'date'],
            'paid_at' => ['nullable', 'date'],
            'type' => ['required', 'in:income,expense'],
            'status' => ['required', 'in:pending,paid,late,cancelled'],
            'category_id' => ['required', 'exists:finance_categories,id'],
            'cost_center_id' => ['nullable', 'exists:finance_cost_centers,id'],
            'bank_account_id' => ['nullable', 'exists:finance_bank_accounts,id'],
            'payer_type' => ['nullable', 'string', 'max:255'],
            'payer_id' => ['nullable'],
            'reference_type' => ['nullable', 'string', 'max:255'],
            'reference_id' => ['nullable'],
        ]);

        $category = FinanceCategory::query()->find($validated['category_id']);
        if (! $category) {
            return response()->json(['message' => 'Categoria inválida'], 422);
        }
        if ((string) $category->company_id !== (string) $validated['company_id']) {
            return response()->json(['message' => 'Categoria deve ser da mesma empresa'], 422);
        }
        if ((string) $category->type !== (string) $validated['type']) {
            return response()->json(['message' => 'Categoria deve ter o mesmo tipo do lançamento'], 422);
        }

        if (($validated['cost_center_id'] ?? null) !== null) {
            $cc = FinanceCostCenter::query()->find($validated['cost_center_id']);
            if (! $cc) {
                return response()->json(['message' => 'Centro de custo inválido'], 422);
            }
            if ((string) $cc->company_id !== (string) $validated['company_id']) {
                return response()->json(['message' => 'Centro de custo deve ser da mesma empresa'], 422);
            }
        }

        if (($validated['bank_account_id'] ?? null) !== null) {
            $ba = FinanceBankAccount::query()->find($validated['bank_account_id']);
            if (! $ba) {
                return response()->json(['message' => 'Conta bancária inválida'], 422);
            }
            if ((string) $ba->company_id !== (string) $validated['company_id']) {
                return response()->json(['message' => 'Conta bancária deve ser da mesma empresa'], 422);
            }
        }

        $tx = FinanceTransaction::create([
            'company_id' => $validated['company_id'],
            'description' => $validated['description'],
            'notes' => $validated['notes'] ?? null,
            'amount' => (float) $validated['amount'],
            'due_date' => $validated['due_date'],
            'paid_at' => $validated['paid_at'] ?? null,
            'type' => $validated['type'],
            'status' => $validated['status'],
            'category_id' => $validated['category_id'],
            'cost_center_id' => $validated['cost_center_id'] ?? null,
            'bank_account_id' => $validated['bank_account_id'] ?? null,
            'payer_type' => $validated['payer_type'] ?? null,
            'payer_id' => $validated['payer_id'] ?? null,
            'reference_type' => $validated['reference_type'] ?? null,
            'reference_id' => $validated['reference_id'] ?? null,
        ]);

        return response()->json([
            'data' => [
                'id' => (string) $tx->id,
                'company_id' => (string) $tx->company_id,
                'description' => $tx->description,
                'notes' => $tx->notes,
                'amount' => (float) $tx->amount,
                'due_date' => $tx->due_date?->toIso8601String(),
                'paid_at' => $tx->paid_at?->toIso8601String(),
                'type' => $tx->type,
                'status' => $tx->status,
                'category_id' => $tx->category_id !== null ? (string) $tx->category_id : null,
                'cost_center_id' => $tx->cost_center_id !== null ? (string) $tx->cost_center_id : null,
                'bank_account_id' => $tx->bank_account_id !== null ? (string) $tx->bank_account_id : null,
                'payer_type' => $tx->payer_type,
                'payer_id' => $tx->payer_id !== null ? (string) $tx->payer_id : null,
                'reference_type' => $tx->reference_type,
                'reference_id' => $tx->reference_id !== null ? (string) $tx->reference_id : null,
                'created_at' => $tx->created_at?->toIso8601String(),
                'updated_at' => $tx->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('finance/transactions/{financeTransaction}', function (FinanceTransaction $financeTransaction) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $validated = request()->validate([
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'description' => ['sometimes', 'required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'amount' => ['sometimes', 'required', 'numeric'],
            'due_date' => ['sometimes', 'required', 'date'],
            'paid_at' => ['nullable', 'date'],
            'type' => ['sometimes', 'required', 'in:income,expense'],
            'status' => ['sometimes', 'required', 'in:pending,paid,late,cancelled'],
            'category_id' => ['sometimes', 'required', 'exists:finance_categories,id'],
            'cost_center_id' => ['nullable', 'exists:finance_cost_centers,id'],
            'bank_account_id' => ['nullable', 'exists:finance_bank_accounts,id'],
            'payer_type' => ['nullable', 'string', 'max:255'],
            'payer_id' => ['nullable'],
            'reference_type' => ['nullable', 'string', 'max:255'],
            'reference_id' => ['nullable'],
        ]);

        $nextCompanyId = array_key_exists('company_id', $validated) ? $validated['company_id'] : $financeTransaction->company_id;
        $nextType = array_key_exists('type', $validated) ? $validated['type'] : $financeTransaction->type;
        $nextCategoryId = array_key_exists('category_id', $validated) ? $validated['category_id'] : $financeTransaction->category_id;

        if ($nextCategoryId !== null) {
            $category = FinanceCategory::query()->find($nextCategoryId);
            if (! $category) {
                return response()->json(['message' => 'Categoria inválida'], 422);
            }
            if ((string) $category->company_id !== (string) $nextCompanyId) {
                return response()->json(['message' => 'Categoria deve ser da mesma empresa'], 422);
            }
            if ((string) $category->type !== (string) $nextType) {
                return response()->json(['message' => 'Categoria deve ter o mesmo tipo do lançamento'], 422);
            }
        }

        $nextCostCenterId = array_key_exists('cost_center_id', $validated) ? $validated['cost_center_id'] : $financeTransaction->cost_center_id;
        if ($nextCostCenterId !== null) {
            $cc = FinanceCostCenter::query()->find($nextCostCenterId);
            if (! $cc) {
                return response()->json(['message' => 'Centro de custo inválido'], 422);
            }
            if ((string) $cc->company_id !== (string) $nextCompanyId) {
                return response()->json(['message' => 'Centro de custo deve ser da mesma empresa'], 422);
            }
        }

        $nextBankAccountId = array_key_exists('bank_account_id', $validated) ? $validated['bank_account_id'] : $financeTransaction->bank_account_id;
        if ($nextBankAccountId !== null) {
            $ba = FinanceBankAccount::query()->find($nextBankAccountId);
            if (! $ba) {
                return response()->json(['message' => 'Conta bancária inválida'], 422);
            }
            if ((string) $ba->company_id !== (string) $nextCompanyId) {
                return response()->json(['message' => 'Conta bancária deve ser da mesma empresa'], 422);
            }
        }

        if (array_key_exists('amount', $validated)) {
            $validated['amount'] = (float) $validated['amount'];
        }

        $financeTransaction->fill($validated);
        $financeTransaction->save();

        return response()->json([
            'data' => [
                'id' => (string) $financeTransaction->id,
                'company_id' => (string) $financeTransaction->company_id,
                'description' => $financeTransaction->description,
                'notes' => $financeTransaction->notes,
                'amount' => (float) $financeTransaction->amount,
                'due_date' => $financeTransaction->due_date?->toIso8601String(),
                'paid_at' => $financeTransaction->paid_at?->toIso8601String(),
                'type' => $financeTransaction->type,
                'status' => $financeTransaction->status,
                'category_id' => $financeTransaction->category_id !== null ? (string) $financeTransaction->category_id : null,
                'cost_center_id' => $financeTransaction->cost_center_id !== null ? (string) $financeTransaction->cost_center_id : null,
                'bank_account_id' => $financeTransaction->bank_account_id !== null ? (string) $financeTransaction->bank_account_id : null,
                'payer_type' => $financeTransaction->payer_type,
                'payer_id' => $financeTransaction->payer_id !== null ? (string) $financeTransaction->payer_id : null,
                'reference_type' => $financeTransaction->reference_type,
                'reference_id' => $financeTransaction->reference_id !== null ? (string) $financeTransaction->reference_id : null,
                'created_at' => $financeTransaction->created_at?->toIso8601String(),
                'updated_at' => $financeTransaction->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('finance/transactions/{financeTransaction}', function (FinanceTransaction $financeTransaction) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $financeTransaction->delete();

        return response()->json(['ok' => true]);
    });

    Route::get('finance/bank-accounts', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $search = trim((string) request('search', ''));
        $companyId = trim((string) request('company_id', ''));

        $hasIsActive = request()->has('is_active');
        $isActive = $hasIsActive ? filter_var(request('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

        $query = FinanceBankAccount::query()->orderByDesc('created_at');

        if ($companyId !== '') {
            $query->where('company_id', $companyId);
        }

        if ($hasIsActive && $isActive !== null) {
            $query->where('is_active', $isActive);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('bank_name', 'like', "%{$search}%")
                    ->orWhere('account_number', 'like', "%{$search}%")
                    ->orWhere('currency', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (FinanceBankAccount $a) {
            return [
                'id' => (string) $a->id,
                'company_id' => (string) $a->company_id,
                'name' => $a->name,
                'bank_name' => $a->bank_name,
                'account_number' => $a->account_number,
                'currency' => $a->currency,
                'initial_balance' => (float) $a->initial_balance,
                'current_balance' => (float) $a->current_balance,
                'is_active' => (bool) $a->is_active,
                'created_at' => $a->created_at?->toIso8601String(),
                'updated_at' => $a->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('finance/bank-accounts/{bankAccount}', function (FinanceBankAccount $bankAccount) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        return response()->json([
            'data' => [
                'id' => (string) $bankAccount->id,
                'company_id' => (string) $bankAccount->company_id,
                'name' => $bankAccount->name,
                'bank_name' => $bankAccount->bank_name,
                'account_number' => $bankAccount->account_number,
                'currency' => $bankAccount->currency,
                'initial_balance' => (float) $bankAccount->initial_balance,
                'current_balance' => (float) $bankAccount->current_balance,
                'is_active' => (bool) $bankAccount->is_active,
                'created_at' => $bankAccount->created_at?->toIso8601String(),
                'updated_at' => $bankAccount->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('finance/bank-accounts', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $validated = request()->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'name' => ['required', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:255'],
            'currency' => ['required', 'string', 'max:10'],
            'initial_balance' => ['nullable', 'numeric'],
            'current_balance' => ['nullable', 'numeric'],
            'is_active' => ['required', 'boolean'],
        ]);

        $initialBalance = array_key_exists('initial_balance', $validated) ? (float) $validated['initial_balance'] : 0.0;
        $currentBalance = array_key_exists('current_balance', $validated) ? (float) $validated['current_balance'] : $initialBalance;

        $bankAccount = FinanceBankAccount::create([
            'company_id' => $validated['company_id'],
            'name' => $validated['name'],
            'bank_name' => $validated['bank_name'] ?? null,
            'account_number' => $validated['account_number'] ?? null,
            'currency' => $validated['currency'],
            'initial_balance' => $initialBalance,
            'current_balance' => $currentBalance,
            'is_active' => (bool) $validated['is_active'],
        ]);

        return response()->json([
            'data' => [
                'id' => (string) $bankAccount->id,
                'company_id' => (string) $bankAccount->company_id,
                'name' => $bankAccount->name,
                'bank_name' => $bankAccount->bank_name,
                'account_number' => $bankAccount->account_number,
                'currency' => $bankAccount->currency,
                'initial_balance' => (float) $bankAccount->initial_balance,
                'current_balance' => (float) $bankAccount->current_balance,
                'is_active' => (bool) $bankAccount->is_active,
                'created_at' => $bankAccount->created_at?->toIso8601String(),
                'updated_at' => $bankAccount->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('finance/bank-accounts/{bankAccount}', function (FinanceBankAccount $bankAccount) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        $validated = request()->validate([
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:255'],
            'currency' => ['sometimes', 'required', 'string', 'max:10'],
            'initial_balance' => ['nullable', 'numeric'],
            'current_balance' => ['nullable', 'numeric'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        if (array_key_exists('initial_balance', $validated) && $validated['initial_balance'] !== null) {
            $validated['initial_balance'] = (float) $validated['initial_balance'];
        }
        if (array_key_exists('current_balance', $validated) && $validated['current_balance'] !== null) {
            $validated['current_balance'] = (float) $validated['current_balance'];
        }

        $bankAccount->fill($validated);
        $bankAccount->save();

        return response()->json([
            'data' => [
                'id' => (string) $bankAccount->id,
                'company_id' => (string) $bankAccount->company_id,
                'name' => $bankAccount->name,
                'bank_name' => $bankAccount->bank_name,
                'account_number' => $bankAccount->account_number,
                'currency' => $bankAccount->currency,
                'initial_balance' => (float) $bankAccount->initial_balance,
                'current_balance' => (float) $bankAccount->current_balance,
                'is_active' => (bool) $bankAccount->is_active,
                'created_at' => $bankAccount->created_at?->toIso8601String(),
                'updated_at' => $bankAccount->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('finance/bank-accounts/{bankAccount}', function (FinanceBankAccount $bankAccount) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && strtolower($user->department->name) === 'financeiro'
            )
        );
        abort_unless($allowed, 403);

        if ($bankAccount->transactions()->exists()) {
            return response()->json([
                'message' => 'Não é possível eliminar: existem lançamentos associados a esta conta.',
            ], 422);
        }

        $bankAccount->delete();

        return response()->json(['ok' => true]);
    });

    Route::get('support/tickets', function () {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $search = trim((string) request('search', ''));
        $status = trim((string) request('status', ''));
        $priority = trim((string) request('priority', ''));
        $companyId = trim((string) request('company_id', ''));
        $departmentId = trim((string) request('department_id', ''));
        $categoryId = trim((string) request('category_id', ''));
        $assignedTo = trim((string) request('assigned_to', ''));
        $overdue = request()->has('overdue') ? filter_var(request('overdue'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

        $query = Ticket::query()->orderByDesc('created_at');

        if ($companyId !== '') {
            $query->where('company_id', $companyId);
        }
        if ($departmentId !== '') {
            $query->where('department_id', $departmentId);
        }
        if ($categoryId !== '') {
            $query->where('category_id', $categoryId);
        }
        if ($status !== '') {
            $query->where('status', $status);
        }
        if ($priority !== '') {
            $query->where('priority', $priority);
        }
        if ($assignedTo !== '') {
            if ($assignedTo === 'none') {
                $query->whereNull('assigned_to');
            } else {
                $query->where('assigned_to', $assignedTo);
            }
        }
        if ($overdue === true) {
            $query
                ->whereNotNull('due_date')
                ->where('due_date', '<', now())
                ->whereNotIn('status', [Ticket::STATUS_RESOLVED, Ticket::STATUS_CLOSED]);
        }
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (Ticket $t) {
            return [
                'id' => (string) $t->id,
                'company_id' => (string) $t->company_id,
                'title' => $t->title,
                'description' => $t->description,
                'status' => $t->status,
                'priority' => $t->priority,
                'category_id' => $t->category_id !== null ? (string) $t->category_id : null,
                'department_id' => $t->department_id !== null ? (string) $t->department_id : null,
                'user_id' => (string) $t->user_id,
                'user_type' => $t->user_type,
                'assigned_to' => $t->assigned_to !== null ? (string) $t->assigned_to : null,
                'due_date' => $t->due_date?->toIso8601String(),
                'resolved_at' => $t->resolved_at?->toIso8601String(),
                'created_at' => $t->created_at?->toIso8601String(),
                'updated_at' => $t->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('support/tickets/{ticket}', function (Ticket $ticket) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        return response()->json([
            'data' => [
                'id' => (string) $ticket->id,
                'company_id' => (string) $ticket->company_id,
                'title' => $ticket->title,
                'description' => $ticket->description,
                'status' => $ticket->status,
                'priority' => $ticket->priority,
                'category_id' => $ticket->category_id !== null ? (string) $ticket->category_id : null,
                'department_id' => $ticket->department_id !== null ? (string) $ticket->department_id : null,
                'user_id' => (string) $ticket->user_id,
                'user_type' => $ticket->user_type,
                'assigned_to' => $ticket->assigned_to !== null ? (string) $ticket->assigned_to : null,
                'due_date' => $ticket->due_date?->toIso8601String(),
                'resolved_at' => $ticket->resolved_at?->toIso8601String(),
                'created_at' => $ticket->created_at?->toIso8601String(),
                'updated_at' => $ticket->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('support/tickets', function () {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $validated = request()->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'status' => ['required', 'in:' . implode(',', [Ticket::STATUS_OPEN, Ticket::STATUS_IN_PROGRESS, Ticket::STATUS_PENDING, Ticket::STATUS_RESOLVED, Ticket::STATUS_CLOSED])],
            'priority' => ['required', 'in:' . implode(',', [Ticket::PRIORITY_LOW, Ticket::PRIORITY_MEDIUM, Ticket::PRIORITY_HIGH, Ticket::PRIORITY_URGENT])],
            'category_id' => ['nullable', 'exists:categories,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
            'resolved_at' => ['nullable', 'date'],
        ]);

        $status = $validated['status'];
        $resolvedAt = $validated['resolved_at'] ?? null;
        if ($status === Ticket::STATUS_RESOLVED && $resolvedAt === null) {
            $resolvedAt = now()->toIso8601String();
        }
        if ($status !== Ticket::STATUS_RESOLVED) {
            $resolvedAt = null;
        }

        $ticket = Ticket::create([
            'company_id' => $validated['company_id'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'status' => $status,
            'priority' => $validated['priority'],
            'category_id' => $validated['category_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'user_id' => $user->id,
            'user_type' => \App\Models\User::class,
            'assigned_to' => $validated['assigned_to'] ?? null,
            'due_date' => $validated['due_date'] ?? null,
            'resolved_at' => $resolvedAt,
        ]);

        return response()->json([
            'data' => [
                'id' => (string) $ticket->id,
                'company_id' => (string) $ticket->company_id,
                'title' => $ticket->title,
                'description' => $ticket->description,
                'status' => $ticket->status,
                'priority' => $ticket->priority,
                'category_id' => $ticket->category_id !== null ? (string) $ticket->category_id : null,
                'department_id' => $ticket->department_id !== null ? (string) $ticket->department_id : null,
                'user_id' => (string) $ticket->user_id,
                'user_type' => $ticket->user_type,
                'assigned_to' => $ticket->assigned_to !== null ? (string) $ticket->assigned_to : null,
                'due_date' => $ticket->due_date?->toIso8601String(),
                'resolved_at' => $ticket->resolved_at?->toIso8601String(),
                'created_at' => $ticket->created_at?->toIso8601String(),
                'updated_at' => $ticket->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('support/tickets/{ticket}', function (Ticket $ticket) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $validated = request()->validate([
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'status' => ['sometimes', 'required', 'in:' . implode(',', [Ticket::STATUS_OPEN, Ticket::STATUS_IN_PROGRESS, Ticket::STATUS_PENDING, Ticket::STATUS_RESOLVED, Ticket::STATUS_CLOSED])],
            'priority' => ['sometimes', 'required', 'in:' . implode(',', [Ticket::PRIORITY_LOW, Ticket::PRIORITY_MEDIUM, Ticket::PRIORITY_HIGH, Ticket::PRIORITY_URGENT])],
            'category_id' => ['nullable', 'exists:categories,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
            'resolved_at' => ['nullable', 'date'],
        ]);

        $ticket->fill($validated);

        $nextStatus = array_key_exists('status', $validated) ? $validated['status'] : $ticket->status;
        if ($nextStatus === Ticket::STATUS_RESOLVED) {
            if (!array_key_exists('resolved_at', $validated) || $validated['resolved_at'] === null) {
                $ticket->resolved_at = $ticket->resolved_at ?? now();
            }
        } else {
            $ticket->resolved_at = null;
        }

        $ticket->save();

        return response()->json([
            'data' => [
                'id' => (string) $ticket->id,
                'company_id' => (string) $ticket->company_id,
                'title' => $ticket->title,
                'description' => $ticket->description,
                'status' => $ticket->status,
                'priority' => $ticket->priority,
                'category_id' => $ticket->category_id !== null ? (string) $ticket->category_id : null,
                'department_id' => $ticket->department_id !== null ? (string) $ticket->department_id : null,
                'user_id' => (string) $ticket->user_id,
                'user_type' => $ticket->user_type,
                'assigned_to' => $ticket->assigned_to !== null ? (string) $ticket->assigned_to : null,
                'due_date' => $ticket->due_date?->toIso8601String(),
                'resolved_at' => $ticket->resolved_at?->toIso8601String(),
                'created_at' => $ticket->created_at?->toIso8601String(),
                'updated_at' => $ticket->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('support/tickets/{ticket}', function (Ticket $ticket) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $ticket->delete();

        return response()->json(['ok' => true]);
    });

    Route::get('companies', function () {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $search = trim((string) request('search', ''));

        $query = Company::query()->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (Company $c) {
            $logo = $c->logo;
            if (is_string($logo) && $logo !== '' && ! str_starts_with($logo, 'http://') && ! str_starts_with($logo, 'https://') && ! str_starts_with($logo, 'data:')) {
                $logo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $logo), '/'));
            }

            return [
                'id' => (string) $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'email' => $c->email,
                'phone' => $c->phone,
                'address' => $c->address,
                'logo' => $logo,
                'settings' => $c->settings,
                'is_active' => (bool) $c->is_active,
                'createdAt' => $c->created_at?->toIso8601String(),
                'updatedAt' => $c->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('companies/{company}', function (Company $company) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $logo = $company->logo;
        if (is_string($logo) && $logo !== '' && ! str_starts_with($logo, 'http://') && ! str_starts_with($logo, 'https://') && ! str_starts_with($logo, 'data:')) {
            $logo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $logo), '/'));
        }

        return response()->json([
            'data' => [
                'id' => (string) $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'email' => $company->email,
                'phone' => $company->phone,
                'address' => $company->address,
                'logo' => $logo,
                'settings' => $company->settings,
                'is_active' => (bool) $company->is_active,
                'createdAt' => $company->created_at?->toIso8601String(),
                'updatedAt' => $company->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('companies', function () {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $validated = request()->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:companies,slug'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'logo' => ['nullable', 'string'],
            'settings' => ['nullable', 'array'],
            'is_active' => ['required', 'boolean'],
        ]);

        $logo = $validated['logo'] ?? null;
        if (is_string($logo) && str_startsWith($logo, 'data:image/')) {
            if (preg_match('/^data:(image\/(png|jpe?g|webp));base64,/', $logo, $m) !== 1) {
                abort(422, 'Formato de imagem inválido');
            }
            $mime = $m[1];
            $ext = match ($mime) {
                'image/png' => 'png',
                'image/jpeg' => 'jpg',
                'image/jpg' => 'jpg',
                'image/webp' => 'webp',
                default => 'png',
            };

            $raw = substr($logo, strpos($logo, ',') + 1);
            $bin = base64_decode($raw);
            if ($bin === false) {
                abort(422, 'Imagem inválida');
            }

            $original = (string) data_get($validated, 'settings.logoFileName', '');
            $baseName = trim(pathinfo($original, PATHINFO_FILENAME));
            $baseName = $baseName !== '' ? preg_replace('/[^A-Za-z0-9._-]/', '_', $baseName) : Str::uuid()->toString();
            $path = 'company-logos/' . $baseName . '.' . $ext;
            Storage::disk('public')->put($path, $bin);
            $validated['logo'] = $path;
        } elseif (is_string($logo) && $logo !== '') {
            $norm = str_replace('\\', '/', $logo);
            $norm = preg_replace('#^storage/app/public/#', '', $norm);
            $norm = preg_replace('#^public/#', '', $norm);
            $norm = preg_replace('#^storage/#', '', $norm);
            $validated['logo'] = ltrim($norm, '/');
        }

        $company = Company::create($validated);

        $logoOut = $company->logo;
        if (is_string($logoOut) && $logoOut !== '' && ! str_starts_with($logoOut, 'http://') && ! str_starts_with($logoOut, 'https://') && ! str_starts_with($logoOut, 'data:')) {
            $logoOut = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $logoOut), '/'));
        }

        return response()->json([
            'data' => [
                'id' => (string) $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'email' => $company->email,
                'phone' => $company->phone,
                'address' => $company->address,
                'logo' => $logoOut,
                'settings' => $company->settings,
                'is_active' => (bool) $company->is_active,
                'createdAt' => $company->created_at?->toIso8601String(),
                'updatedAt' => $company->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('companies/{company}', function (Company $company) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $validated = request()->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', 'unique:companies,slug,' . $company->id],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'logo' => ['nullable', 'string'],
            'settings' => ['nullable', 'array'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        if (array_key_exists('logo', $validated)) {
            $incoming = $validated['logo'];

            if ($company->logo && is_string($company->logo) && ! str_starts_with($company->logo, 'http://') && ! str_starts_with($company->logo, 'https://') && ! str_starts_with($company->logo, 'data:')) {
                if (Storage::disk('public')->exists($company->logo)) {
                    Storage::disk('public')->delete($company->logo);
                }
            }

            if (is_string($incoming) && str_starts_with($incoming, 'data:image/')) {
                if (preg_match('/^data:(image\/(png|jpe?g|webp));base64,/', $incoming, $m) !== 1) {
                    abort(422, 'Formato de imagem inválido');
                }
                $mime = $m[1];
                $ext = match ($mime) {
                    'image/png' => 'png',
                    'image/jpeg' => 'jpg',
                    'image/jpg' => 'jpg',
                    'image/webp' => 'webp',
                    default => 'png',
                };

                $raw = substr($incoming, strpos($incoming, ',') + 1);
                $bin = base64_decode($raw);
                if ($bin === false) {
                    abort(422, 'Imagem inválida');
                }

                $original = (string) data_get($validated, 'settings.logoFileName', '');
                $baseName = trim(pathinfo($original, PATHINFO_FILENAME));
                $baseName = $baseName !== '' ? preg_replace('/[^A-Za-z0-9._-]/', '_', $baseName) : Str::uuid()->toString();
                $path = 'company-logos/' . $baseName . '.' . $ext;
                Storage::disk('public')->put($path, $bin);
                $validated['logo'] = $path;
            } elseif (is_string($incoming) && $incoming !== '') {
                $norm = str_replace('\\', '/', $incoming);
                $norm = preg_replace('#^storage/app/public/#', '', $norm);
                $norm = preg_replace('#^public/#', '', $norm);
                $norm = preg_replace('#^storage/#', '', $norm);
                $validated['logo'] = ltrim($norm, '/');
            }
        }

        $company->fill($validated);
        $company->save();

        $logoOut = $company->logo;
        if (is_string($logoOut) && $logoOut !== '' && ! str_starts_with($logoOut, 'http://') && ! str_starts_with($logoOut, 'https://') && ! str_starts_with($logoOut, 'data:')) {
            $logoOut = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $logoOut), '/'));
        }

        return response()->json([
            'data' => [
                'id' => (string) $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'email' => $company->email,
                'phone' => $company->phone,
                'address' => $company->address,
                'logo' => $logoOut,
                'settings' => $company->settings,
                'is_active' => (bool) $company->is_active,
                'createdAt' => $company->created_at?->toIso8601String(),
                'updatedAt' => $company->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('companies/{company}', function (Company $company) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        if ($company->logo && is_string($company->logo) && ! str_starts_with($company->logo, 'http://') && ! str_starts_with($company->logo, 'https://') && ! str_starts_with($company->logo, 'data:')) {
            if (Storage::disk('public')->exists($company->logo)) {
                Storage::disk('public')->delete($company->logo);
            }
        }

        $company->delete();

        return response()->json(['ok' => true]);
    });

    Route::get('departments', function () {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $search = trim((string) request('search', ''));
        $companyId = trim((string) request('company_id', ''));

        $query = Department::query()->orderByDesc('created_at');

        if ($companyId !== '') {
            $query->where('company_id', $companyId);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (Department $d) {
            return [
                'id' => (string) $d->id,
                'name' => $d->name,
                'slug' => $d->slug,
                'description' => $d->description,
                'color' => $d->color,
                'email' => $d->email,
                'company_id' => (string) $d->company_id,
                'is_active' => (bool) $d->is_active,
                'createdAt' => $d->created_at?->toIso8601String(),
                'updatedAt' => $d->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('departments/{department}', function (Department $department) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        return response()->json([
            'data' => [
                'id' => (string) $department->id,
                'name' => $department->name,
                'slug' => $department->slug,
                'description' => $department->description,
                'color' => $department->color,
                'email' => $department->email,
                'company_id' => (string) $department->company_id,
                'is_active' => (bool) $department->is_active,
                'createdAt' => $department->created_at?->toIso8601String(),
                'updatedAt' => $department->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('departments', function () {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $validated = request()->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:departments,slug'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'company_id' => ['required', 'exists:companies,id'],
            'is_active' => ['required', 'boolean'],
        ]);

        $department = Department::create($validated);

        return response()->json([
            'data' => [
                'id' => (string) $department->id,
                'name' => $department->name,
                'slug' => $department->slug,
                'description' => $department->description,
                'color' => $department->color,
                'email' => $department->email,
                'company_id' => (string) $department->company_id,
                'is_active' => (bool) $department->is_active,
                'createdAt' => $department->created_at?->toIso8601String(),
                'updatedAt' => $department->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('departments/{department}', function (Department $department) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $validated = request()->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', 'unique:departments,slug,' . $department->id],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        $department->fill($validated);
        $department->save();

        return response()->json([
            'data' => [
                'id' => (string) $department->id,
                'name' => $department->name,
                'slug' => $department->slug,
                'description' => $department->description,
                'color' => $department->color,
                'email' => $department->email,
                'company_id' => (string) $department->company_id,
                'is_active' => (bool) $department->is_active,
                'createdAt' => $department->created_at?->toIso8601String(),
                'updatedAt' => $department->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('departments/{department}', function (Department $department) {
        $user = auth()->user();
        abort_unless($user && $user->isAdmin(), 403);

        $department->delete();

        return response()->json(['ok' => true]);
    });

    Route::get('hr/employees/stats', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && in_array(Str::slug($user->department->name), ['recursos-humanos', 'rh'])
            )
        );
        abort_unless($allowed, 403);

        $search = trim((string) request('search', ''));
        $companyId = trim((string) request('company_id', ''));
        $departmentId = trim((string) request('department_id', ''));

        $base = Employee::query();

        if ($companyId !== '') {
            $base->where('company_id', $companyId);
        }

        if ($departmentId !== '') {
            $base->where('department_id', $departmentId);
        }

        if ($search !== '') {
            $base->where(function ($q) use ($search) {
                $q->where('employee_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('nif', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%");
            });
        }

        $now = now();

        $total = (clone $base)->count();
        $active = (clone $base)->where('status', 'active')->count();
        $inactive = (clone $base)->where('status', 'inactive')->count();
        $onLeave = (clone $base)->where('status', 'on_leave')->count();

        $hiredThisMonth = (clone $base)
            ->whereYear('hire_date', $now->year)
            ->whereMonth('hire_date', $now->month)
            ->count();

        $birthdaysThisMonth = (clone $base)
            ->whereNotNull('birth_date')
            ->whereMonth('birth_date', $now->month)
            ->count();

        $retirementAgeYears = 66;
        $retirementWindowMonths = 12;
        $rangeStart = $now->copy()->subYears($retirementAgeYears)->startOfDay();
        $rangeEnd = $now->copy()->addMonthsNoOverflow($retirementWindowMonths)->subYears($retirementAgeYears)->endOfDay();

        $nearRetirement = (clone $base)
            ->whereNotNull('birth_date')
            ->whereBetween('birth_date', [$rangeStart, $rangeEnd])
            ->count();

        $onlineWindowMinutes = 15;
        $onlineCutoff = $now->copy()->subMinutes($onlineWindowMinutes);

        $online = EmployeeUser::query()
            ->where('is_active', true)
            ->whereNotNull('last_login_at')
            ->where('last_login_at', '>=', $onlineCutoff)
            ->whereHas('employee', function ($q) use ($companyId, $departmentId, $search) {
                if ($companyId !== '') {
                    $q->where('company_id', $companyId);
                }

                if ($departmentId !== '') {
                    $q->where('department_id', $departmentId);
                }

                if ($search !== '') {
                    $q->where(function ($qq) use ($search) {
                        $qq->where('employee_code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('nif', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('position', 'like', "%{$search}%")
                            ->orWhere('id', 'like', "%{$search}%");
                    });
                }

                $q->where('status', 'active');
            })
            ->count();

        return response()->json([
            'data' => [
                'total' => (int) $total,
                'online' => (int) $online,
                'hiredThisMonth' => (int) $hiredThisMonth,
                'birthdaysThisMonth' => (int) $birthdaysThisMonth,
                'active' => (int) $active,
                'inactive' => (int) $inactive,
                'onLeave' => (int) $onLeave,
                'nearRetirement' => (int) $nearRetirement,
            ],
        ]);
    });

    Route::get('hr/employees', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && in_array(Str::slug($user->department->name), ['recursos-humanos', 'rh'])
            )
        );
        abort_unless($allowed, 403);

        $search = trim((string) request('search', ''));
        $companyId = trim((string) request('company_id', ''));
        $departmentId = trim((string) request('department_id', ''));
        $status = trim((string) request('status', ''));

        $query = Employee::query()->with(['employeeUser'])->orderByDesc('created_at');

        if ($companyId !== '') {
            $query->where('company_id', $companyId);
        }

        if ($departmentId !== '') {
            $query->where('department_id', $departmentId);
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('employee_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('nif', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (Employee $e) {
            return [
                'id' => (string) $e->id,
                'employee_code' => $e->employee_code,
                'name' => $e->name,
                'email' => $e->email,
                'system_email' => $e->employeeUser?->email,
                'has_system_access' => (bool) $e->hasSystemAccess(),
                'nif' => $e->nif,
                'document_type' => $e->document_type,
                'document_number' => $e->document_number,
                'document_expiration_date' => $e->document_expiration_date?->toIso8601String(),
                'nis' => $e->nis,
                'birth_date' => $e->birth_date?->toIso8601String(),
                'gender' => $e->gender,
                'nationality' => $e->nationality,
                'marital_status' => $e->marital_status,
                'spouse_name' => $e->spouse_name,
                'spouse_nif' => $e->spouse_nif,
                'spouse_joint_irs' => (bool) $e->spouse_joint_irs,
                'has_children' => (bool) $e->has_children,
                'children_data' => $e->children_data,
                'phone' => $e->phone,
                'emergency_contact' => $e->emergency_contact,
                'emergency_phone' => $e->emergency_phone,
                'address' => $e->address,
                'address_number' => $e->address_number,
                'complement' => $e->complement,
                'neighborhood' => $e->neighborhood,
                'city' => $e->city,
                'state' => $e->state,
                'zip_code' => $e->zip_code,
                'position' => $e->position,
                'department_id' => $e->department_id !== null ? (string) $e->department_id : null,
                'company_id' => $e->company_id !== null ? (string) $e->company_id : null,
                'hire_date' => $e->hire_date?->toIso8601String(),
                'termination_date' => $e->termination_date?->toIso8601String(),
                'salary' => $e->salary !== null ? (float) $e->salary : null,
                'hourly_rate' => $e->hourly_rate !== null ? (float) $e->hourly_rate : null,
                'vacation_days_balance' => $e->vacation_days_balance,
                'last_vacation_calculation' => $e->last_vacation_calculation?->toIso8601String(),
                'employment_type' => $e->employment_type,
                'contract_duration' => $e->contract_duration,
                'auto_renew' => $e->auto_renew === null ? null : (bool) $e->auto_renew,
                'status' => $e->status,
                'bank_name' => $e->bank_name,
                'bank_agency' => $e->bank_agency,
                'bank_account' => $e->bank_account,
                'account_type' => $e->account_type,
                'notes' => $e->notes,
                'photo_path' => $e->photo_path,
                'has_disability' => $e->has_disability === null ? null : (bool) $e->has_disability,
                'disability_declarant' => $e->disability_declarant === null ? null : (bool) $e->disability_declarant,
                'disability_spouse' => $e->disability_spouse === null ? null : (bool) $e->disability_spouse,
                'disability_dependents' => $e->disability_dependents,
                'documents' => $e->documents,
                'medical_aptitude_date' => $e->medical_aptitude_date?->toIso8601String(),
                'medical_status' => $e->medical_status,
                'created_at' => $e->created_at?->toIso8601String(),
                'updated_at' => $e->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('hr/employees/{employee}', function (Employee $employee) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && in_array(Str::slug($user->department->name), ['recursos-humanos', 'rh'])
            )
        );
        abort_unless($allowed, 403);

        $employee->load(['employeeUser']);

        return response()->json([
            'data' => [
                'id' => (string) $employee->id,
                'employee_code' => $employee->employee_code,
                'name' => $employee->name,
                'email' => $employee->email,
                'system_email' => $employee->employeeUser?->email,
                'has_system_access' => (bool) $employee->hasSystemAccess(),
                'nif' => $employee->nif,
                'document_type' => $employee->document_type,
                'document_number' => $employee->document_number,
                'document_expiration_date' => $employee->document_expiration_date?->toIso8601String(),
                'nis' => $employee->nis,
                'birth_date' => $employee->birth_date?->toIso8601String(),
                'gender' => $employee->gender,
                'nationality' => $employee->nationality,
                'marital_status' => $employee->marital_status,
                'spouse_name' => $employee->spouse_name,
                'spouse_nif' => $employee->spouse_nif,
                'spouse_joint_irs' => (bool) $employee->spouse_joint_irs,
                'has_children' => (bool) $employee->has_children,
                'children_data' => $employee->children_data,
                'phone' => $employee->phone,
                'emergency_contact' => $employee->emergency_contact,
                'emergency_phone' => $employee->emergency_phone,
                'address' => $employee->address,
                'address_number' => $employee->address_number,
                'complement' => $employee->complement,
                'neighborhood' => $employee->neighborhood,
                'city' => $employee->city,
                'state' => $employee->state,
                'zip_code' => $employee->zip_code,
                'position' => $employee->position,
                'department_id' => $employee->department_id !== null ? (string) $employee->department_id : null,
                'company_id' => $employee->company_id !== null ? (string) $employee->company_id : null,
                'hire_date' => $employee->hire_date?->toIso8601String(),
                'termination_date' => $employee->termination_date?->toIso8601String(),
                'salary' => $employee->salary !== null ? (float) $employee->salary : null,
                'hourly_rate' => $employee->hourly_rate !== null ? (float) $employee->hourly_rate : null,
                'vacation_days_balance' => $employee->vacation_days_balance,
                'last_vacation_calculation' => $employee->last_vacation_calculation?->toIso8601String(),
                'employment_type' => $employee->employment_type,
                'contract_duration' => $employee->contract_duration,
                'auto_renew' => $employee->auto_renew === null ? null : (bool) $employee->auto_renew,
                'status' => $employee->status,
                'bank_name' => $employee->bank_name,
                'bank_agency' => $employee->bank_agency,
                'bank_account' => $employee->bank_account,
                'account_type' => $employee->account_type,
                'notes' => $employee->notes,
                'photo_path' => $employee->photo_path,
                'has_disability' => $employee->has_disability === null ? null : (bool) $employee->has_disability,
                'disability_declarant' => $employee->disability_declarant === null ? null : (bool) $employee->disability_declarant,
                'disability_spouse' => $employee->disability_spouse === null ? null : (bool) $employee->disability_spouse,
                'disability_dependents' => $employee->disability_dependents,
                'documents' => $employee->documents,
                'medical_aptitude_date' => $employee->medical_aptitude_date?->toIso8601String(),
                'medical_status' => $employee->medical_status,
                'created_at' => $employee->created_at?->toIso8601String(),
                'updated_at' => $employee->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('hr/employees', function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && in_array(Str::slug($user->department->name), ['recursos-humanos', 'rh'])
            )
        );
        abort_unless($allowed, 403);

        $validated = request()->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'nif' => ['required', 'string', 'max:9', 'unique:employees,nif'],
            'document_type' => ['required', 'in:cartao_cidadao,titulo_residencia,passaporte,bilhete_identidade,outro'],
            'document_number' => ['required', 'string', 'max:50'],
            'document_expiration_date' => ['nullable', 'date'],
            'nis' => ['nullable', 'string', 'max:11', 'unique:employees,nis'],
            'birth_date' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'max:50'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'marital_status' => ['nullable', 'string', 'max:50'],
            'spouse_name' => ['nullable', 'string', 'max:255'],
            'spouse_nif' => ['nullable', 'string', 'max:9'],
            'spouse_joint_irs' => ['nullable', 'boolean'],
            'has_children' => ['nullable', 'boolean'],
            'children_data' => ['nullable', 'array'],
            'phone' => ['nullable', 'string', 'max:255'],
            'emergency_contact' => ['nullable', 'string', 'max:255'],
            'emergency_phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'address_number' => ['nullable', 'string', 'max:255'],
            'complement' => ['nullable', 'string', 'max:255'],
            'neighborhood' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'zip_code' => ['nullable', 'string', 'max:255'],
            'position' => ['required', 'string', 'max:255'],
            'company_id' => ['required', 'exists:companies,id'],
            'department_id' => ['required', 'exists:departments,id'],
            'hire_date' => ['required', 'date'],
            'termination_date' => ['nullable', 'date'],
            'salary' => ['nullable', 'numeric'],
            'hourly_rate' => ['nullable', 'numeric'],
            'vacation_days_balance' => ['nullable', 'integer'],
            'last_vacation_calculation' => ['nullable', 'date'],
            'employment_type' => ['nullable', 'string', 'max:50'],
            'contract_duration' => ['nullable', 'integer'],
            'auto_renew' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', 'max:50'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_agency' => ['nullable', 'string', 'max:255'],
            'bank_account' => ['nullable', 'string', 'max:255'],
            'account_type' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'photo_path' => ['nullable', 'string', 'max:255'],
            'has_disability' => ['nullable', 'boolean'],
            'disability_declarant' => ['nullable', 'boolean'],
            'disability_spouse' => ['nullable', 'boolean'],
            'disability_dependents' => ['nullable', 'integer'],
            'documents' => ['nullable', 'array'],
            'medical_aptitude_date' => ['nullable', 'date'],
            'medical_status' => ['nullable', 'string', 'max:50'],
        ]);

        $department = Department::query()->find($validated['department_id']);
        if (! $department) {
            return response()->json(['message' => 'Departamento inválido'], 422);
        }
        if ((string) $department->company_id !== (string) $validated['company_id']) {
            return response()->json(['message' => 'Departamento deve ser da mesma empresa'], 422);
        }

        $employee = Employee::create($validated);
        $employee->load(['employeeUser']);

        return response()->json([
            'data' => [
                'id' => (string) $employee->id,
                'employee_code' => $employee->employee_code,
                'name' => $employee->name,
                'email' => $employee->email,
                'system_email' => $employee->employeeUser?->email,
                'has_system_access' => (bool) $employee->hasSystemAccess(),
                'nif' => $employee->nif,
                'document_type' => $employee->document_type,
                'document_number' => $employee->document_number,
                'document_expiration_date' => $employee->document_expiration_date?->toIso8601String(),
                'nis' => $employee->nis,
                'birth_date' => $employee->birth_date?->toIso8601String(),
                'gender' => $employee->gender,
                'nationality' => $employee->nationality,
                'marital_status' => $employee->marital_status,
                'spouse_name' => $employee->spouse_name,
                'spouse_nif' => $employee->spouse_nif,
                'spouse_joint_irs' => (bool) $employee->spouse_joint_irs,
                'has_children' => (bool) $employee->has_children,
                'children_data' => $employee->children_data,
                'phone' => $employee->phone,
                'emergency_contact' => $employee->emergency_contact,
                'emergency_phone' => $employee->emergency_phone,
                'address' => $employee->address,
                'address_number' => $employee->address_number,
                'complement' => $employee->complement,
                'neighborhood' => $employee->neighborhood,
                'city' => $employee->city,
                'state' => $employee->state,
                'zip_code' => $employee->zip_code,
                'position' => $employee->position,
                'department_id' => $employee->department_id !== null ? (string) $employee->department_id : null,
                'company_id' => $employee->company_id !== null ? (string) $employee->company_id : null,
                'hire_date' => $employee->hire_date?->toIso8601String(),
                'termination_date' => $employee->termination_date?->toIso8601String(),
                'salary' => $employee->salary !== null ? (float) $employee->salary : null,
                'hourly_rate' => $employee->hourly_rate !== null ? (float) $employee->hourly_rate : null,
                'vacation_days_balance' => $employee->vacation_days_balance,
                'last_vacation_calculation' => $employee->last_vacation_calculation?->toIso8601String(),
                'employment_type' => $employee->employment_type,
                'contract_duration' => $employee->contract_duration,
                'auto_renew' => $employee->auto_renew === null ? null : (bool) $employee->auto_renew,
                'status' => $employee->status,
                'bank_name' => $employee->bank_name,
                'bank_agency' => $employee->bank_agency,
                'bank_account' => $employee->bank_account,
                'account_type' => $employee->account_type,
                'notes' => $employee->notes,
                'photo_path' => $employee->photo_path,
                'has_disability' => $employee->has_disability === null ? null : (bool) $employee->has_disability,
                'disability_declarant' => $employee->disability_declarant === null ? null : (bool) $employee->disability_declarant,
                'disability_spouse' => $employee->disability_spouse === null ? null : (bool) $employee->disability_spouse,
                'disability_dependents' => $employee->disability_dependents,
                'documents' => $employee->documents,
                'medical_aptitude_date' => $employee->medical_aptitude_date?->toIso8601String(),
                'medical_status' => $employee->medical_status,
                'created_at' => $employee->created_at?->toIso8601String(),
                'updated_at' => $employee->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('hr/employees/{employee}', function (Employee $employee) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && in_array(Str::slug($user->department->name), ['recursos-humanos', 'rh'])
            )
        );
        abort_unless($allowed, 403);

        $validated = request()->validate([
            'employee_code' => ['sometimes', 'nullable', 'string', 'max:50', 'unique:employees,employee_code,' . $employee->id],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'nif' => ['sometimes', 'required', 'string', 'max:9', 'unique:employees,nif,' . $employee->id],
            'document_type' => ['sometimes', 'required', 'in:cartao_cidadao,titulo_residencia,passaporte,bilhete_identidade,outro'],
            'document_number' => ['sometimes', 'required', 'string', 'max:50'],
            'document_expiration_date' => ['nullable', 'date'],
            'nis' => ['nullable', 'string', 'max:11', 'unique:employees,nis,' . $employee->id],
            'birth_date' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'max:50'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'marital_status' => ['nullable', 'string', 'max:50'],
            'spouse_name' => ['nullable', 'string', 'max:255'],
            'spouse_nif' => ['nullable', 'string', 'max:9'],
            'spouse_joint_irs' => ['nullable', 'boolean'],
            'has_children' => ['nullable', 'boolean'],
            'children_data' => ['nullable', 'array'],
            'phone' => ['nullable', 'string', 'max:255'],
            'emergency_contact' => ['nullable', 'string', 'max:255'],
            'emergency_phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'address_number' => ['nullable', 'string', 'max:255'],
            'complement' => ['nullable', 'string', 'max:255'],
            'neighborhood' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'zip_code' => ['nullable', 'string', 'max:255'],
            'position' => ['sometimes', 'required', 'string', 'max:255'],
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'department_id' => ['sometimes', 'required', 'exists:departments,id'],
            'hire_date' => ['sometimes', 'required', 'date'],
            'termination_date' => ['nullable', 'date'],
            'salary' => ['nullable', 'numeric'],
            'hourly_rate' => ['nullable', 'numeric'],
            'vacation_days_balance' => ['nullable', 'integer'],
            'last_vacation_calculation' => ['nullable', 'date'],
            'employment_type' => ['nullable', 'string', 'max:50'],
            'contract_duration' => ['nullable', 'integer'],
            'auto_renew' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', 'max:50'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_agency' => ['nullable', 'string', 'max:255'],
            'bank_account' => ['nullable', 'string', 'max:255'],
            'account_type' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'photo_path' => ['nullable', 'string', 'max:255'],
            'has_disability' => ['nullable', 'boolean'],
            'disability_declarant' => ['nullable', 'boolean'],
            'disability_spouse' => ['nullable', 'boolean'],
            'disability_dependents' => ['nullable', 'integer'],
            'documents' => ['nullable', 'array'],
            'medical_aptitude_date' => ['nullable', 'date'],
            'medical_status' => ['nullable', 'string', 'max:50'],
        ]);

        $nextCompanyId = array_key_exists('company_id', $validated) ? (string) $validated['company_id'] : (string) $employee->company_id;
        $nextDepartmentId = array_key_exists('department_id', $validated) ? (string) $validated['department_id'] : (string) $employee->department_id;

        if ($nextCompanyId !== '' && $nextDepartmentId !== '') {
            $department = Department::query()->find($nextDepartmentId);
            if (! $department) {
                return response()->json(['message' => 'Departamento inválido'], 422);
            }
            if ((string) $department->company_id !== $nextCompanyId) {
                return response()->json(['message' => 'Departamento deve ser da mesma empresa'], 422);
            }
        }

        $employee->fill($validated);
        $employee->save();
        $employee->load(['employeeUser']);

        return response()->json([
            'data' => [
                'id' => (string) $employee->id,
                'employee_code' => $employee->employee_code,
                'name' => $employee->name,
                'email' => $employee->email,
                'system_email' => $employee->employeeUser?->email,
                'has_system_access' => (bool) $employee->hasSystemAccess(),
                'nif' => $employee->nif,
                'document_type' => $employee->document_type,
                'document_number' => $employee->document_number,
                'document_expiration_date' => $employee->document_expiration_date?->toIso8601String(),
                'nis' => $employee->nis,
                'birth_date' => $employee->birth_date?->toIso8601String(),
                'gender' => $employee->gender,
                'nationality' => $employee->nationality,
                'marital_status' => $employee->marital_status,
                'spouse_name' => $employee->spouse_name,
                'spouse_nif' => $employee->spouse_nif,
                'spouse_joint_irs' => (bool) $employee->spouse_joint_irs,
                'has_children' => (bool) $employee->has_children,
                'children_data' => $employee->children_data,
                'phone' => $employee->phone,
                'emergency_contact' => $employee->emergency_contact,
                'emergency_phone' => $employee->emergency_phone,
                'address' => $employee->address,
                'address_number' => $employee->address_number,
                'complement' => $employee->complement,
                'neighborhood' => $employee->neighborhood,
                'city' => $employee->city,
                'state' => $employee->state,
                'zip_code' => $employee->zip_code,
                'position' => $employee->position,
                'department_id' => $employee->department_id !== null ? (string) $employee->department_id : null,
                'company_id' => $employee->company_id !== null ? (string) $employee->company_id : null,
                'hire_date' => $employee->hire_date?->toIso8601String(),
                'termination_date' => $employee->termination_date?->toIso8601String(),
                'salary' => $employee->salary !== null ? (float) $employee->salary : null,
                'hourly_rate' => $employee->hourly_rate !== null ? (float) $employee->hourly_rate : null,
                'vacation_days_balance' => $employee->vacation_days_balance,
                'last_vacation_calculation' => $employee->last_vacation_calculation?->toIso8601String(),
                'employment_type' => $employee->employment_type,
                'contract_duration' => $employee->contract_duration,
                'auto_renew' => $employee->auto_renew === null ? null : (bool) $employee->auto_renew,
                'status' => $employee->status,
                'bank_name' => $employee->bank_name,
                'bank_agency' => $employee->bank_agency,
                'bank_account' => $employee->bank_account,
                'account_type' => $employee->account_type,
                'notes' => $employee->notes,
                'photo_path' => $employee->photo_path,
                'has_disability' => $employee->has_disability === null ? null : (bool) $employee->has_disability,
                'disability_declarant' => $employee->disability_declarant === null ? null : (bool) $employee->disability_declarant,
                'disability_spouse' => $employee->disability_spouse === null ? null : (bool) $employee->disability_spouse,
                'disability_dependents' => $employee->disability_dependents,
                'documents' => $employee->documents,
                'medical_aptitude_date' => $employee->medical_aptitude_date?->toIso8601String(),
                'medical_status' => $employee->medical_status,
                'created_at' => $employee->created_at?->toIso8601String(),
                'updated_at' => $employee->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('hr/employees/{employee}', function (Employee $employee) {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && in_array(Str::slug($user->department->name), ['recursos-humanos', 'rh'])
            )
        );
        abort_unless($allowed, 403);

        $employee->delete();

        return response()->json(['ok' => true]);
    });

    $hrUser = function () {
        $user = auth()->user();
        $allowed = $user && (
            $user->isAdmin()
            || (
                $user->isManager()
                && $user->department
                && in_array(Str::slug($user->department->name), ['recursos-humanos', 'rh'])
            )
        );
        abort_unless($allowed, 403);
        return $user;
    };

    Route::get('hr/payrolls', function () use ($hrUser) {
        $hrUser();

        $employeeId = trim((string) request('employee_id', ''));
        $companyId = trim((string) request('company_id', ''));
        $status = trim((string) request('status', ''));
        $referenceMonth = trim((string) request('reference_month', ''));
        $referenceYear = trim((string) request('reference_year', ''));

        $query = Payroll::query()->orderByDesc('created_at');

        if ($employeeId !== '') $query->where('employee_id', $employeeId);
        if ($companyId !== '') $query->where('company_id', $companyId);
        if ($status !== '') $query->where('status', $status);
        if ($referenceMonth !== '') $query->where('reference_month', $referenceMonth);
        if ($referenceYear !== '') $query->where('reference_year', $referenceYear);

        return response()->json(['data' => $query->get()]);
    });

    Route::get('hr/payrolls/{payroll}', function (Payroll $payroll) use ($hrUser) {
        $hrUser();
        return response()->json(['data' => $payroll]);
    });

    Route::post('hr/payrolls', function () use ($hrUser) {
        $user = $hrUser();

        $validated = request()->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'company_id' => ['required', 'exists:companies,id'],
            'reference_month' => [
                'required',
                'integer',
                'between:1,12',
                Rule::unique('payrolls', 'reference_month')->where(function ($q) {
                    return $q->where('employee_id', request('employee_id'))
                        ->where('reference_year', request('reference_year'));
                }),
            ],
            'reference_year' => ['required', 'integer', 'min:2000'],
            'base_salary' => ['required', 'numeric', 'min:0'],
            'overtime_hours' => ['nullable', 'numeric', 'min:0'],
            'overtime_amount' => ['nullable', 'numeric', 'min:0'],
            'holiday_allowance' => ['nullable', 'numeric', 'min:0'],
            'christmas_allowance' => ['nullable', 'numeric', 'min:0'],
            'meal_allowance' => ['nullable', 'numeric', 'min:0'],
            'transport_allowance' => ['nullable', 'numeric', 'min:0'],
            'other_allowances' => ['nullable', 'numeric', 'min:0'],
            'social_security_employee' => ['nullable', 'numeric', 'min:0'],
            'social_security_employer' => ['nullable', 'numeric', 'min:0'],
            'irs_withholding' => ['nullable', 'numeric', 'min:0'],
            'union_fee' => ['nullable', 'numeric', 'min:0'],
            'other_deductions' => ['nullable', 'numeric', 'min:0'],
            'gross_total' => ['required', 'numeric'],
            'total_deductions' => ['required', 'numeric'],
            'net_total' => ['required', 'numeric'],
            'status' => ['nullable', 'in:draft,approved,paid,cancelled'],
            'pdf_path' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $status = $validated['status'] ?? 'draft';
        $validated['created_by'] = $user?->id;

        if ($status === 'approved') {
            $validated['approved_by'] = $user?->id;
            $validated['approved_at'] = now();
        } else {
            $validated['approved_by'] = null;
            $validated['approved_at'] = null;
        }

        $payroll = Payroll::create($validated);

        return response()->json(['data' => $payroll], 201);
    });

    Route::put('hr/payrolls/{payroll}', function (Payroll $payroll) use ($hrUser) {
        $user = $hrUser();

        $employeeId = request('employee_id', $payroll->employee_id);
        $referenceYear = request('reference_year', $payroll->reference_year);

        $validated = request()->validate([
            'employee_id' => ['sometimes', 'required', 'exists:employees,id'],
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'reference_month' => [
                'sometimes',
                'required',
                'integer',
                'between:1,12',
                Rule::unique('payrolls', 'reference_month')->ignore($payroll->id)->where(function ($q) use ($employeeId, $referenceYear) {
                    return $q->where('employee_id', $employeeId)->where('reference_year', $referenceYear);
                }),
            ],
            'reference_year' => ['sometimes', 'required', 'integer', 'min:2000'],
            'base_salary' => ['sometimes', 'required', 'numeric', 'min:0'],
            'overtime_hours' => ['nullable', 'numeric', 'min:0'],
            'overtime_amount' => ['nullable', 'numeric', 'min:0'],
            'holiday_allowance' => ['nullable', 'numeric', 'min:0'],
            'christmas_allowance' => ['nullable', 'numeric', 'min:0'],
            'meal_allowance' => ['nullable', 'numeric', 'min:0'],
            'transport_allowance' => ['nullable', 'numeric', 'min:0'],
            'other_allowances' => ['nullable', 'numeric', 'min:0'],
            'social_security_employee' => ['nullable', 'numeric', 'min:0'],
            'social_security_employer' => ['nullable', 'numeric', 'min:0'],
            'irs_withholding' => ['nullable', 'numeric', 'min:0'],
            'union_fee' => ['nullable', 'numeric', 'min:0'],
            'other_deductions' => ['nullable', 'numeric', 'min:0'],
            'gross_total' => ['sometimes', 'required', 'numeric'],
            'total_deductions' => ['sometimes', 'required', 'numeric'],
            'net_total' => ['sometimes', 'required', 'numeric'],
            'status' => ['nullable', 'in:draft,approved,paid,cancelled'],
            'pdf_path' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        if (array_key_exists('status', $validated)) {
            if ($validated['status'] === 'approved') {
                $payroll->approved_by = $user?->id;
                $payroll->approved_at = now();
            } else {
                $payroll->approved_by = null;
                $payroll->approved_at = null;
            }
        }

        $payroll->fill($validated);
        $payroll->save();

        return response()->json(['data' => $payroll]);
    });

    Route::delete('hr/payrolls/{payroll}', function (Payroll $payroll) use ($hrUser) {
        $hrUser();
        $payroll->delete();
        return response()->json(['ok' => true]);
    });

    Route::get('hr/vacations', function () use ($hrUser) {
        $hrUser();

        $employeeId = trim((string) request('employee_id', ''));
        $companyId = trim((string) request('company_id', ''));
        $status = trim((string) request('status', ''));
        $vacationYear = trim((string) request('vacation_year', ''));
        $vacationType = trim((string) request('vacation_type', ''));

        $query = Vacation::query()->orderByDesc('created_at');

        if ($employeeId !== '') $query->where('employee_id', $employeeId);
        if ($companyId !== '') $query->where('company_id', $companyId);
        if ($status !== '') $query->where('status', $status);
        if ($vacationYear !== '') $query->where('vacation_year', $vacationYear);
        if ($vacationType !== '') $query->where('vacation_type', $vacationType);

        return response()->json(['data' => $query->get()]);
    });

    Route::get('hr/vacations/{vacation}', function (Vacation $vacation) use ($hrUser) {
        $hrUser();
        return response()->json(['data' => $vacation]);
    });

    Route::post('hr/vacations', function () use ($hrUser) {
        $user = $hrUser();

        $validated = request()->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'company_id' => ['required', 'exists:companies,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'requested_days' => ['required', 'integer', 'min:1'],
            'approved_days' => ['nullable', 'integer', 'min:0'],
            'vacation_year' => ['required', 'integer', 'min:2000'],
            'vacation_type' => ['required', 'in:annual_leave,maternity_leave,paternity_leave,sick_leave,marriage_leave,bereavement_leave,study_leave,unpaid_leave,other,compensatory_leave,advance_leave'],
            'status' => ['required', 'in:pending,approved,rejected,cancelled'],
            'requested_at' => ['required', 'date'],
            'approved_at' => ['nullable', 'date'],
            'rejected_at' => ['nullable', 'date'],
            'employee_notes' => ['nullable', 'string'],
            'manager_notes' => ['nullable', 'string'],
            'rejection_reason' => ['nullable', 'string'],
        ]);

        $status = $validated['status'];
        if ($status === 'approved') {
            $validated['approved_by'] = $user?->id;
            $validated['rejected_by'] = null;
            if (!array_key_exists('approved_at', $validated) || $validated['approved_at'] === null) {
                $validated['approved_at'] = now();
            }
            $validated['rejected_at'] = null;
            $validated['rejection_reason'] = null;
        }
        if ($status === 'rejected') {
            $validated['rejected_by'] = $user?->id;
            $validated['approved_by'] = null;
            if (!array_key_exists('rejected_at', $validated) || $validated['rejected_at'] === null) {
                $validated['rejected_at'] = now();
            }
            $validated['approved_at'] = null;
        }
        if ($status === 'pending' || $status === 'cancelled') {
            $validated['approved_by'] = null;
            $validated['rejected_by'] = null;
            $validated['approved_at'] = null;
            $validated['rejected_at'] = null;
            $validated['rejection_reason'] = null;
        }

        $validated['created_by'] = $user?->id;

        $vacation = Vacation::create($validated);

        return response()->json(['data' => $vacation], 201);
    });

    Route::put('hr/vacations/{vacation}', function (Vacation $vacation) use ($hrUser) {
        $user = $hrUser();

        $validated = request()->validate([
            'employee_id' => ['sometimes', 'required', 'exists:employees,id'],
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date', 'after_or_equal:start_date'],
            'requested_days' => ['sometimes', 'required', 'integer', 'min:1'],
            'approved_days' => ['nullable', 'integer', 'min:0'],
            'vacation_year' => ['sometimes', 'required', 'integer', 'min:2000'],
            'vacation_type' => ['sometimes', 'required', 'in:annual_leave,maternity_leave,paternity_leave,sick_leave,marriage_leave,bereavement_leave,study_leave,unpaid_leave,other,compensatory_leave,advance_leave'],
            'status' => ['sometimes', 'required', 'in:pending,approved,rejected,cancelled'],
            'requested_at' => ['nullable', 'date'],
            'approved_at' => ['nullable', 'date'],
            'rejected_at' => ['nullable', 'date'],
            'employee_notes' => ['nullable', 'string'],
            'manager_notes' => ['nullable', 'string'],
            'rejection_reason' => ['nullable', 'string'],
        ]);

        if (array_key_exists('status', $validated)) {
            $status = $validated['status'];
            if ($status === 'approved') {
                $validated['approved_by'] = $user?->id;
                $validated['rejected_by'] = null;
                $validated['rejected_at'] = null;
                $validated['rejection_reason'] = null;
                if (!array_key_exists('approved_at', $validated) || $validated['approved_at'] === null) {
                    $validated['approved_at'] = now();
                }
            }
            if ($status === 'rejected') {
                $validated['rejected_by'] = $user?->id;
                $validated['approved_by'] = null;
                $validated['approved_at'] = null;
                if (!array_key_exists('rejected_at', $validated) || $validated['rejected_at'] === null) {
                    $validated['rejected_at'] = now();
                }
            }
            if ($status === 'pending' || $status === 'cancelled') {
                $validated['approved_by'] = null;
                $validated['rejected_by'] = null;
                $validated['approved_at'] = null;
                $validated['rejected_at'] = null;
                $validated['rejection_reason'] = null;
            }
        }

        if (!array_key_exists('created_by', $validated) || $validated['created_by'] === null) {
            $validated['created_by'] = $vacation->created_by ?? $user?->id;
        }

        $vacation->fill($validated);
        $vacation->save();

        return response()->json(['data' => $vacation]);
    });

    Route::delete('hr/vacations/{vacation}', function (Vacation $vacation) use ($hrUser) {
        $hrUser();
        $vacation->delete();
        return response()->json(['ok' => true]);
    });

    Route::get('hr/timesheets', function () use ($hrUser) {
        $hrUser();

        $employeeId = trim((string) request('employee_id', ''));
        $companyId = trim((string) request('company_id', ''));
        $status = trim((string) request('status', ''));
        $workDate = trim((string) request('work_date', ''));

        $query = Timesheet::query()->orderByDesc('work_date');

        if ($employeeId !== '') $query->where('employee_id', $employeeId);
        if ($companyId !== '') $query->where('company_id', $companyId);
        if ($status !== '') $query->where('status', $status);
        if ($workDate !== '') $query->where('work_date', $workDate);

        return response()->json(['data' => $query->get()]);
    });

    Route::get('hr/timesheets/{timesheet}', function (Timesheet $timesheet) use ($hrUser) {
        $hrUser();
        return response()->json(['data' => $timesheet]);
    });

    Route::post('hr/timesheets', function () use ($hrUser) {
        $hrUser();

        $validated = request()->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'company_id' => ['required', 'exists:companies,id'],
            'work_date' => [
                'required',
                'date',
                Rule::unique('timesheets', 'work_date')->where(function ($q) {
                    return $q->where('employee_id', request('employee_id'));
                }),
            ],
            'clock_in' => ['nullable', 'date_format:H:i'],
            'lunch_start' => ['nullable', 'date_format:H:i'],
            'lunch_end' => ['nullable', 'date_format:H:i'],
            'clock_out' => ['nullable', 'date_format:H:i'],
            'total_hours' => ['nullable', 'numeric', 'min:0'],
            'lunch_hours' => ['nullable', 'numeric', 'min:0'],
            'overtime_hours' => ['nullable', 'numeric', 'min:0'],
            'expected_hours' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:present,absent,late,early_leave,holiday,sick_leave,vacation'],
            'day_type' => ['nullable', 'in:workday,weekend,holiday,vacation'],
            'ip_address' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'device_info' => ['nullable', 'string', 'max:255'],
            'employee_notes' => ['nullable', 'string'],
            'manager_notes' => ['nullable', 'string'],
            'approved_by' => ['nullable', 'exists:users,id'],
            'approved_at' => ['nullable', 'date'],
        ]);

        if (array_key_exists('day_type', $validated) && $validated['day_type'] === null) {
            unset($validated['day_type']);
        }

        $timesheet = Timesheet::create($validated);

        return response()->json(['data' => $timesheet], 201);
    });

    Route::put('hr/timesheets/{timesheet}', function (Timesheet $timesheet) use ($hrUser) {
        $employeeId = request('employee_id', $timesheet->employee_id);

        $validated = request()->validate([
            'employee_id' => ['sometimes', 'required', 'exists:employees,id'],
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'work_date' => [
                'sometimes',
                'required',
                'date',
                Rule::unique('timesheets', 'work_date')->ignore($timesheet->id)->where(function ($q) use ($employeeId) {
                    return $q->where('employee_id', $employeeId);
                }),
            ],
            'clock_in' => ['nullable', 'date_format:H:i'],
            'lunch_start' => ['nullable', 'date_format:H:i'],
            'lunch_end' => ['nullable', 'date_format:H:i'],
            'clock_out' => ['nullable', 'date_format:H:i'],
            'total_hours' => ['nullable', 'numeric', 'min:0'],
            'lunch_hours' => ['nullable', 'numeric', 'min:0'],
            'overtime_hours' => ['nullable', 'numeric', 'min:0'],
            'expected_hours' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:present,absent,late,early_leave,holiday,sick_leave,vacation'],
            'day_type' => ['nullable', 'in:workday,weekend,holiday,vacation'],
            'ip_address' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'device_info' => ['nullable', 'string', 'max:255'],
            'employee_notes' => ['nullable', 'string'],
            'manager_notes' => ['nullable', 'string'],
            'approved_by' => ['nullable', 'exists:users,id'],
            'approved_at' => ['nullable', 'date'],
        ]);

        if (array_key_exists('day_type', $validated) && $validated['day_type'] === null) {
            unset($validated['day_type']);
        }

        $timesheet->fill($validated);
        $timesheet->save();

        return response()->json(['data' => $timesheet]);
    });

    Route::delete('hr/timesheets/{timesheet}', function (Timesheet $timesheet) use ($hrUser) {
        $hrUser();
        $timesheet->delete();
        return response()->json(['ok' => true]);
    });

    Route::get('users', function () {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        $search = trim((string) request('search', ''));
        $companyId = trim((string) request('company_id', ''));
        $departmentId = trim((string) request('department_id', ''));

        $hasIsActive = request()->has('is_active');
        $isActive = $hasIsActive ? filter_var(request('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

        $query = User::query()->orderByDesc('created_at');

        if ($companyId !== '') {
            $query->where('company_id', $companyId);
        }

        if ($departmentId !== '') {
            $query->where('department_id', $departmentId);
        }

        if ($hasIsActive && $isActive !== null) {
            $query->where('is_active', $isActive);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('role', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (User $u) {
            $photo = $u->photo_path;
            if (is_string($photo) && $photo !== '' && ! str_starts_with($photo, 'http://') && ! str_starts_with($photo, 'https://') && ! str_starts_with($photo, 'data:')) {
                $photo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photo), '/'));
            }

            return [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'company_id' => $u->company_id !== null ? (string) $u->company_id : null,
                'department_id' => $u->department_id !== null ? (string) $u->department_id : null,
                'role_id' => $u->role_id !== null ? (string) $u->role_id : null,
                'role' => $u->role,
                'phone' => $u->phone,
                'bio' => $u->bio,
                'photo_path' => $photo,
                'is_active' => (bool) $u->is_active,
                'last_login_at' => $u->last_login_at?->toIso8601String(),
                'createdAt' => $u->created_at?->toIso8601String(),
                'updatedAt' => $u->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('users/{user}', function (User $user) {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        $photo = $user->photo_path;
        if (is_string($photo) && $photo !== '' && ! str_starts_with($photo, 'http://') && ! str_starts_with($photo, 'https://') && ! str_starts_with($photo, 'data:')) {
            $photo = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photo), '/'));
        }

        return response()->json([
            'data' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'company_id' => $user->company_id !== null ? (string) $user->company_id : null,
                'department_id' => $user->department_id !== null ? (string) $user->department_id : null,
                'role_id' => $user->role_id !== null ? (string) $user->role_id : null,
                'role' => $user->role,
                'phone' => $user->phone,
                'bio' => $user->bio,
                'photo_path' => $photo,
                'is_active' => (bool) $user->is_active,
                'last_login_at' => $user->last_login_at?->toIso8601String(),
                'createdAt' => $user->created_at?->toIso8601String(),
                'updatedAt' => $user->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('users', function () {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        $validated = request()->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'company_id' => ['nullable', 'exists:companies,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'role_id' => ['nullable', 'exists:roles,id'],
            'role' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
            'photo_path' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);

        if (array_key_exists('photo_path', $validated)) {
            $incoming = $validated['photo_path'];

            if (is_string($incoming) && str_starts_with($incoming, 'data:image/')) {
                if (preg_match('/^data:(image\/(png|jpe?g|webp));base64,/', $incoming, $m) !== 1) {
                    abort(422, 'Formato de imagem inválido');
                }
                $mime = $m[1];
                $ext = match ($mime) {
                    'image/png' => 'png',
                    'image/jpeg' => 'jpg',
                    'image/jpg' => 'jpg',
                    'image/webp' => 'webp',
                    default => 'png',
                };

                $raw = substr($incoming, strpos($incoming, ',') + 1);
                $bin = base64_decode($raw);
                if ($bin === false) {
                    abort(422, 'Imagem inválida');
                }

                $path = 'user-photos/' . Str::uuid()->toString() . '.' . $ext;
                Storage::disk('public')->put($path, $bin);
                $validated['photo_path'] = $path;
            } elseif (is_string($incoming) && $incoming !== '') {
                if (str_starts_with($incoming, '/storage/')) {
                    $validated['photo_path'] = ltrim(substr($incoming, strlen('/storage/')), '/');
                } elseif (preg_match('~^https?://[^/]+/storage/(.+)$~', $incoming, $m) === 1) {
                    $validated['photo_path'] = ltrim($m[1], '/');
                }
            }
        }

        $user = User::create($validated);

        $photoOut = $user->photo_path;
        if (is_string($photoOut) && $photoOut !== '' && ! str_starts_with($photoOut, 'http://') && ! str_starts_with($photoOut, 'https://') && ! str_starts_with($photoOut, 'data:')) {
            $photoOut = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photoOut), '/'));
        }

        return response()->json([
            'data' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'company_id' => $user->company_id !== null ? (string) $user->company_id : null,
                'department_id' => $user->department_id !== null ? (string) $user->department_id : null,
                'role_id' => $user->role_id !== null ? (string) $user->role_id : null,
                'role' => $user->role,
                'phone' => $user->phone,
                'bio' => $user->bio,
                'photo_path' => $photoOut,
                'is_active' => (bool) $user->is_active,
                'last_login_at' => $user->last_login_at?->toIso8601String(),
                'createdAt' => $user->created_at?->toIso8601String(),
                'updatedAt' => $user->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('users/{user}', function (User $user) {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        $validated = request()->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['sometimes', 'nullable', 'string', 'min:6'],
            'company_id' => ['nullable', 'exists:companies,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'role_id' => ['nullable', 'exists:roles,id'],
            'role' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
            'photo_path' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        if (array_key_exists('photo_path', $validated)) {
            $incoming = $validated['photo_path'];

            if ($user->photo_path && is_string($user->photo_path) && $user->photo_path !== '' && ! str_starts_with($user->photo_path, 'http://') && ! str_starts_with($user->photo_path, 'https://') && ! str_starts_with($user->photo_path, 'data:') && ! str_starts_with($user->photo_path, '/')) {
                if (Storage::disk('public')->exists($user->photo_path)) {
                    Storage::disk('public')->delete($user->photo_path);
                }
            }

            if (is_string($incoming) && str_starts_with($incoming, 'data:image/')) {
                if (preg_match('/^data:(image\/(png|jpe?g|webp));base64,/', $incoming, $m) !== 1) {
                    abort(422, 'Formato de imagem inválido');
                }
                $mime = $m[1];
                $ext = match ($mime) {
                    'image/png' => 'png',
                    'image/jpeg' => 'jpg',
                    'image/jpg' => 'jpg',
                    'image/webp' => 'webp',
                    default => 'png',
                };

                $raw = substr($incoming, strpos($incoming, ',') + 1);
                $bin = base64_decode($raw);
                if ($bin === false) {
                    abort(422, 'Imagem inválida');
                }

                $path = 'user-photos/' . Str::uuid()->toString() . '.' . $ext;
                Storage::disk('public')->put($path, $bin);
                $validated['photo_path'] = $path;
            } elseif (is_string($incoming) && $incoming !== '') {
                if (str_starts_with($incoming, '/storage/')) {
                    $validated['photo_path'] = ltrim(substr($incoming, strlen('/storage/')), '/');
                } elseif (preg_match('~^https?://[^/]+/storage/(.+)$~', $incoming, $m) === 1) {
                    $validated['photo_path'] = ltrim($m[1], '/');
                }
            }
        }

        if (array_key_exists('password', $validated) && ($validated['password'] === null || trim((string) $validated['password']) === '')) {
            unset($validated['password']);
        }

        $user->fill($validated);
        $user->save();

        $photoOut = $user->photo_path;
        if (is_string($photoOut) && $photoOut !== '' && ! str_starts_with($photoOut, 'http://') && ! str_starts_with($photoOut, 'https://') && ! str_starts_with($photoOut, 'data:')) {
            $photoOut = asset('storage/' . ltrim(preg_replace('/^storage\//', '', $photoOut), '/'));
        }

        return response()->json([
            'data' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'company_id' => $user->company_id !== null ? (string) $user->company_id : null,
                'department_id' => $user->department_id !== null ? (string) $user->department_id : null,
                'role_id' => $user->role_id !== null ? (string) $user->role_id : null,
                'role' => $user->role,
                'phone' => $user->phone,
                'bio' => $user->bio,
                'photo_path' => $photoOut,
                'is_active' => (bool) $user->is_active,
                'last_login_at' => $user->last_login_at?->toIso8601String(),
                'createdAt' => $user->created_at?->toIso8601String(),
                'updatedAt' => $user->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('users/{user}', function (User $user) {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        if ($user->photo_path && is_string($user->photo_path) && $user->photo_path !== '' && ! str_starts_with($user->photo_path, 'http://') && ! str_starts_with($user->photo_path, 'https://') && ! str_starts_with($user->photo_path, 'data:') && ! str_starts_with($user->photo_path, '/')) {
            if (Storage::disk('public')->exists($user->photo_path)) {
                Storage::disk('public')->delete($user->photo_path);
            }
        }

        $user->delete();

        return response()->json(['ok' => true]);
    });

    Route::get('roles', function () {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        $search = trim((string) request('search', ''));
        $hasIsActive = request()->has('is_active');
        $isActive = $hasIsActive ? filter_var(request('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

        $query = Role::query()->orderByDesc('created_at');

        if ($hasIsActive && $isActive !== null) {
            $query->where('is_active', $isActive);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('display_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('permissions', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();

        $data = $rows->map(function (Role $r) {
            return [
                'id' => (string) $r->id,
                'name' => $r->name,
                'display_name' => $r->display_name,
                'description' => $r->description,
                'permissions' => is_array($r->permissions) ? $r->permissions : [],
                'is_active' => (bool) $r->is_active,
                'createdAt' => $r->created_at?->toIso8601String(),
                'updatedAt' => $r->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $data]);
    });

    Route::get('roles/{role}', function (Role $role) {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        return response()->json([
            'data' => [
                'id' => (string) $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
                'permissions' => is_array($role->permissions) ? $role->permissions : [],
                'is_active' => (bool) $role->is_active,
                'createdAt' => $role->created_at?->toIso8601String(),
                'updatedAt' => $role->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::post('roles', function () {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        $validated = request()->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'display_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
            'is_active' => ['required', 'boolean'],
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'display_name' => $validated['display_name'],
            'description' => $validated['description'] ?? null,
            'permissions' => $validated['permissions'] ?? [],
            'is_active' => (bool) $validated['is_active'],
        ]);

        return response()->json([
            'data' => [
                'id' => (string) $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
                'permissions' => is_array($role->permissions) ? $role->permissions : [],
                'is_active' => (bool) $role->is_active,
                'createdAt' => $role->created_at?->toIso8601String(),
                'updatedAt' => $role->updated_at?->toIso8601String(),
            ],
        ], 201);
    });

    Route::put('roles/{role}', function (Role $role) {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        $validated = request()->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', 'unique:roles,name,' . $role->id],
            'display_name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        if (array_key_exists('permissions', $validated) && $validated['permissions'] === null) {
            $validated['permissions'] = [];
        }

        $role->fill($validated);
        $role->save();

        return response()->json([
            'data' => [
                'id' => (string) $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
                'permissions' => is_array($role->permissions) ? $role->permissions : [],
                'is_active' => (bool) $role->is_active,
                'createdAt' => $role->created_at?->toIso8601String(),
                'updatedAt' => $role->updated_at?->toIso8601String(),
            ],
        ]);
    });

    Route::delete('roles/{role}', function (Role $role) {
        $me = auth()->user();
        abort_unless($me && $me->isAdmin(), 403);

        $role->delete();

        return response()->json(['ok' => true]);
    });
});