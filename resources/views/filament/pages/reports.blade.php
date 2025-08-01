<x-filament-panels::page>
    <div class="space-y-6">
        <!-- Estatísticas Gerais -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div class="flex items-center">
                    <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Logs</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ number_format($stats['total_logs'] ?? 0) }}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div class="flex items-center">
                    <div class="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Logs Hoje</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ number_format($stats['logs_today'] ?? 0) }}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div class="flex items-center">
                    <div class="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                        <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Erros Hoje</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ number_format($stats['errors_today'] ?? 0) }}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div class="flex items-center">
                    <div class="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                        </svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Usuários Ativos</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ number_format($stats['active_users'] ?? 0) }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Gráficos -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Logs por Nível -->
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Logs por Nível</h3>
                <div class="space-y-3">
                    @if(isset($charts['logs_by_level']) && is_array($charts['logs_by_level']))
                        @foreach($charts['logs_by_level'] as $level => $count)
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <div class="w-3 h-3 rounded-full mr-3 
                                        @if($level === 'info') bg-blue-500
                                        @elseif($level === 'warning') bg-yellow-500
                                        @elseif($level === 'error') bg-red-500
                                        @elseif($level === 'critical') bg-red-700
                                        @else bg-gray-500
                                        @endif
                                    "></div>
                                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{{ $level }}</span>
                                </div>
                                <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ number_format($count ?? 0) }}</span>
                            </div>
                            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                @php
                                    $totalLogs = $stats['total_logs'] ?? 0;
                                    $percentage = $totalLogs > 0 ? (($count ?? 0) / $totalLogs) * 100 : 0;
                                @endphp
                                <div class="h-2 rounded-full 
                                    @if($level === 'info') bg-blue-500
                                    @elseif($level === 'warning') bg-yellow-500
                                    @elseif($level === 'error') bg-red-500
                                    @elseif($level === 'critical') bg-red-700
                                    @else bg-gray-500
                                    @endif
                                " style="width: {{ $percentage }}%"></div>
                            </div>
                        @endforeach
                    @else
                        <p class="text-sm text-gray-500 dark:text-gray-400">Nenhum dado disponível</p>
                    @endif
                </div>
            </div>

            <!-- Atividade dos Últimos 7 Dias -->
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Atividade dos Últimos 7 Dias</h3>
                <div class="space-y-3">
                    @if(isset($charts['activity_last_7_days']) && is_array($charts['activity_last_7_days']))
                        @php
                            $maxCount = max(array_values($charts['activity_last_7_days']));
                        @endphp
                        @foreach($charts['activity_last_7_days'] as $date => $count)
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ \Carbon\Carbon::parse($date)->format('d/m') }}</span>
                                <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ number_format($count ?? 0) }}</span>
                            </div>
                            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                @php
                                    $percentage = $maxCount > 0 ? (($count ?? 0) / $maxCount) * 100 : 0;
                                @endphp
                                <div class="bg-indigo-500 h-2 rounded-full" style="width: {{ $percentage }}%"></div>
                            </div>
                        @endforeach
                    @else
                        <p class="text-sm text-gray-500 dark:text-gray-400">Nenhum dado disponível</p>
                    @endif
                </div>
            </div>
        </div>

        <!-- Estatísticas do Sistema -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estatísticas do Sistema</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="text-center">
                    <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">{{ number_format($stats['total_tickets'] ?? 0) }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Total de Tickets</div>
                </div>
                <div class="text-center">
                    <div class="text-3xl font-bold text-green-600 dark:text-green-400">{{ number_format($stats['open_tickets'] ?? 0) }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Tickets Abertos</div>
                </div>
                <div class="text-center">
                    <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">{{ number_format($stats['total_posts'] ?? 0) }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Total de Posts</div>
                </div>
            </div>
        </div>

        <!-- Ações Rápidas -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ações Rápidas</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                @if(class_exists('\App\Filament\Resources\SystemLogResource'))
                    <a href="{{ \App\Filament\Resources\SystemLogResource::getUrl('index') }}" 
                       class="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                        <svg class="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <div>
                            <div class="font-semibold text-gray-900 dark:text-white">Ver Todos os Logs</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Acesse o histórico completo</div>
                        </div>
                    </a>
                @endif

                @if(class_exists('\App\Filament\Resources\TicketResource'))
                    <a href="{{ \App\Filament\Resources\TicketResource::getUrl('index') }}" 
                       class="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <svg class="w-8 h-8 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 11-4 0V9a2 2 0 11-4 0V5a2 2 0 00-2-2H5z"></path>
                        </svg>
                        <div>
                            <div class="font-semibold text-gray-900 dark:text-white">Gerenciar Tickets</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Visualizar e gerenciar tickets</div>
                        </div>
                    </a>
                @endif

                @if(class_exists('\App\Filament\Resources\UserResource'))
                    <a href="{{ \App\Filament\Resources\UserResource::getUrl('index') }}" 
                       class="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                        <svg class="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                        </svg>
                        <div>
                            <div class="font-semibold text-gray-900 dark:text-white">Gerenciar Usuários</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Administrar contas de usuário</div>
                        </div>
                    </a>
                @endif
            </div>
        </div>
    </div>
</x-filament-panels::page>