<x-filament-panels::page>
    @if($article)
        <div class="max-w-4xl mx-auto">
            <!-- Breadcrumb -->
            <nav class="mb-6">
                <ol class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <li><a href="{{ route('filament.admin.pages.help-center') }}" class="hover:text-blue-600 dark:hover:text-blue-400">Central de Ajuda</a></li>
                    <li>/</li>
                    <li class="text-gray-900 dark:text-white">{{ $article->title }}</li>
                </ol>
            </nav>

            <!-- Artigo -->
            <article class="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div class="p-8">
                    <header class="mb-6">
                        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">{{ $article->title }}</h1>
                        <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">{{ $article->category }}</span>
                            <span>{{ $article->view_count }} visualizações</span>
                            <span>Atualizado em {{ $article->updated_at->format('d/m/Y') }}</span>
                        </div>
                    </header>

                    @if($article->excerpt)
                        <div class="bg-gray-50 dark:bg-gray-700 border-l-4 border-blue-500 dark:border-blue-400 p-4 mb-6">
                            <p class="text-gray-700 dark:text-gray-300 font-medium">{{ $article->excerpt }}</p>
                        </div>
                    @endif

                    <div class="prose dark:prose-invert max-w-none">
                        {!! $article->content !!}
                    </div>

                    <!-- Feedback -->
                    <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Este artigo foi útil?</h3>
                        @if($wasHelpful === null)
                            <div class="flex gap-4">
                                <button 
                                    wire:click="markAsHelpful" 
                                    class="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                                >
                                    👍 Sim, foi útil
                                </button>
                                <button 
                                    wire:click="markAsNotHelpful" 
                                    class="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                                >
                                    👎 Não foi útil
                                </button>
                            </div>
                        @else
                            <div class="text-green-600 dark:text-green-400 font-medium">
                                ✓ Obrigado pelo seu feedback!
                            </div>
                        @endif
                    </div>
                </div>
            </article>

            <!-- Artigos Relacionados -->
            @if($this->getRelatedArticles()->count() > 0)
                <div class="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div class="p-6">
                        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Artigos Relacionados</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            @foreach($this->getRelatedArticles() as $relatedArticle)
                                <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-700">
                                    <h4 class="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-2">
                                        <a href="{{ route('filament.admin.pages.help-article', $relatedArticle->slug) }}">
                                            {{ $relatedArticle->title }}
                                        </a>
                                    </h4>
                                    @if($relatedArticle->excerpt)
                                        <p class="text-gray-600 dark:text-gray-300 text-sm">{{ Str::limit($relatedArticle->excerpt, 80) }}</p>
                                    @endif
                                </div>
                            @endforeach
                        </div>
                    </div>
                </div>
            @endif
        </div>
    @else
        <div class="max-w-4xl mx-auto">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Artigo não encontrado</h1>
                <p class="text-gray-600 dark:text-gray-300 mb-6">O artigo que você está procurando não existe ou não está disponível.</p>
                <a href="{{ route('filament.admin.pages.help-center') }}" class="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
                    ← Voltar para Central de Ajuda
                </a>
            </div>
        </div>
    @endif
</x-filament-panels::page>