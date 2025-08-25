<x-filament-panels::page>
    <div class="space-y-6">
        <!-- Barra de Pesquisa -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="max-w-2xl mx-auto">
                <h2 class="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-white">Como podemos ajudar?</h2>
                <div class="flex gap-4">
                    <div class="flex-1">
                        <input 
                            type="text" 
                            wire:model.live="search" 
                            placeholder="Pesquisar artigos de ajuda..."
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        >
                    </div>
                    <div>
                        <select wire:model.live="selectedCategory" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                            <option value="">Todas as categorias</option>
                            @foreach($this->getCategories() as $key => $label)
                                <option value="{{ $key }}">{{ $label }}</option>
                            @endforeach
                        </select>
                    </div>
                </div>
            </div>
        </div>

        @if($search)
            <!-- Resultados da Pesquisa -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div class="p-6">
                    <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Resultados da pesquisa para "{{ $search }}"</h3>
                    @forelse($this->searchArticles() as $article)
                        <div class="border-b border-gray-200 dark:border-gray-700 last:border-b-0 py-4 last:pb-0">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <h4 class="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                                        <a href="{{ route('filament.admin.pages.help-article', $article->slug) }}">
                                            {{ $article->title }}
                                        </a>
                                    </h4>
                                    @if($article->excerpt)
                                        <p class="text-gray-600 dark:text-gray-300 mt-1">{{ $article->excerpt }}</p>
                                    @endif
                                    <div class="flex items-center gap-2 mt-2">
                                        <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">{{ $this->getCategories()[$article->category] }}</span>
                                        <span class="text-gray-500 dark:text-gray-400 text-xs">{{ $article->view_count }} visualizações</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    @empty
                        <p class="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum artigo encontrado para sua pesquisa.</p>
                    @endforelse
                </div>
            </div>
        @else
            <!-- Artigos em Destaque -->
            @if($this->getFeaturedArticles()->count() > 0)
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div class="p-6">
                        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Artigos em Destaque</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            @foreach($this->getFeaturedArticles() as $article)
                                <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-700">
                                    <h4 class="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-2">
                                        <a href="{{ route('filament.admin.pages.help-article', $article->slug) }}">
                                            {{ $article->title }}
                                        </a>
                                    </h4>
                                    @if($article->excerpt)
                                        <p class="text-gray-600 dark:text-gray-300 text-sm mb-2">{{ Str::limit($article->excerpt, 100) }}</p>
                                    @endif
                                    <div class="flex items-center gap-2">
                                        <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">{{ $this->getCategories()[$article->category] }}</span>
                                        <span class="text-gray-500 dark:text-gray-400 text-xs">{{ $article->view_count }} views</span>
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    </div>
                </div>
            @endif

            <!-- Categorias -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                @foreach($this->getCategories() as $categoryKey => $categoryLabel)
                    @php $articles = $this->getArticlesByCategory($categoryKey) @endphp
                    @if($articles->count() > 0)
                        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
                            <div class="p-6">
                                <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{{ $categoryLabel }}</h3>
                                <div class="space-y-3">
                                    @foreach($articles as $article)
                                        <div class="flex justify-between items-center">
                                            <a href="{{ route('filament.admin.pages.help-article', $article->slug) }}" 
                                               class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
                                                {{ $article->title }}
                                            </a>
                                            <span class="text-gray-500 dark:text-gray-400 text-xs">{{ $article->view_count }} views</span>
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        </div>
                    @endif
                @endforeach
            </div>
        @endif
    </div>
</x-filament-panels::page>