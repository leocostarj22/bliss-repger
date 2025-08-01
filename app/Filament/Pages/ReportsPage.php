<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use App\Models\SystemLog;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Post;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class ReportsPage extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-chart-bar';
    protected static ?string $navigationLabel = 'Relatórios';
    protected static ?string $title = 'Relatórios do Sistema';
    protected static string $view = 'filament.pages.reports';
    protected static ?string $navigationGroup = 'Relatórios e Logs';
    protected static ?int $navigationSort = 2;

    public function getViewData(): array
    {
        $today = Carbon::today();
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();
        
        // Dados padrão caso não existam logs
        $defaultStats = [
            'total_logs' => 0,
            'logs_today' => 0,
            'logs_this_month' => 0,
            'errors_today' => 0,
            'active_users' => User::count(), // Usar count total em vez de is_active
            'total_tickets' => Ticket::count(),
            'open_tickets' => Ticket::whereIn('status', ['open', 'pending', 'new'])->count(), // Status mais comuns
            'total_posts' => Post::count(),
        ];
        
        $defaultCharts = [
            'logs_by_level' => [
                'info' => 0,
                'warning' => 0,
                'error' => 0,
                'critical' => 0,
            ],
            'activity_last_7_days' => $this->getLast7DaysDefault(),
        ];
        
        // Se a tabela SystemLog existir, buscar dados reais
        try {
            // Verificar se a tabela system_logs existe
            if (!Schema::hasTable('system_logs')) {
                return [
                    'stats' => $defaultStats,
                    'charts' => $defaultCharts,
                ];
            }
            
            $stats = [
                'total_logs' => SystemLog::count(),
                'logs_today' => SystemLog::whereDate('created_at', $today)->count(),
                'logs_this_month' => SystemLog::where('created_at', '>=', $thisMonth)->count(),
                'errors_today' => SystemLog::whereDate('created_at', $today)
                    ->whereIn('level', ['error', 'critical'])->count(),
                'active_users' => SystemLog::whereDate('created_at', $today)
                    ->where('action', 'login')
                    ->distinct('user_id')
                    ->count('user_id'),
                'total_tickets' => Ticket::count(),
                'open_tickets' => Ticket::whereIn('status', ['open', 'pending', 'new'])->count(),
                'total_posts' => Post::count(),
            ];
            
            $logsByLevel = SystemLog::selectRaw('level, COUNT(*) as count')
                ->groupBy('level')
                ->pluck('count', 'level')
                ->toArray();
            
            $activityLast7Days = SystemLog::selectRaw('DATE(created_at) as date, COUNT(*) as count')
                ->where('created_at', '>=', Carbon::now()->subDays(7))
                ->groupBy('date')
                ->orderBy('date')
                ->pluck('count', 'date')
                ->toArray();
            
            $charts = [
                'logs_by_level' => array_merge($defaultCharts['logs_by_level'], $logsByLevel),
                'activity_last_7_days' => $this->fillMissingDays($activityLast7Days),
            ];
            
        } catch (\Exception $e) {
            // Se houver erro (tabela não existe), usar dados padrão
            $stats = $defaultStats;
            $charts = $defaultCharts;
        }
        
        return [
            'stats' => $stats,
            'charts' => $charts,
        ];
    }
    
    private function getLast7DaysDefault(): array
    {
        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->format('Y-m-d');
            $days[$date] = 0;
        }
        return $days;
    }
    
    private function fillMissingDays(array $activityData): array
    {
        $filledData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->format('Y-m-d');
            $filledData[$date] = $activityData[$date] ?? 0;
        }
        return $filledData;
    }
}