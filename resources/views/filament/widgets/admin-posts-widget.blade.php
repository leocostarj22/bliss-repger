<x-filament-widgets::widget>
    <x-filament::section>
        <x-slot name="heading">
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                    <x-heroicon-o-megaphone class="h-5 w-5 text-primary-500" />
                    Comunicados e Novidades
                </div>
                <a href="{{ \App\Filament\Resources\PostResource::getUrl('index') }}" 
                   class="text-sm text-primary-600 hover:text-primary-800 font-medium">
                    Ver todos
                </a>
            </div>
        </x-slot>
        
        <div class="space-y-6 max-h-96 overflow-y-auto">
            @forelse($this->getPosts() as $post)
                <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden
                    {{ $post->is_pinned ? 'ring-2 ring-primary-500' : '' }}">
                    
                    {{-- Header do Post --}}
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                @if($post->author->photo_path)
                                    <img src="{{ Storage::url($post->author->photo_path) }}" 
                                         alt="{{ $post->author->name }}"
                                         class="w-10 h-10 rounded-full object-cover">
                                @else
                                    <div class="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                                        {{ substr($post->author->name, 0, 1) }}
                                    </div>
                                @endif
                                <div>
                                    <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        {{ $post->author->name }}
                                        @if($post->is_pinned)
                                            <x-heroicon-s-bookmark class="h-4 w-4 text-primary-500" />
                                        @endif
                                        @if($post->type === 'announcement')
                                            <span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                                Oficial
                                            </span>
                                        @endif
                                    </h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">
                                        {{ $post->published_at->diffForHumans() }}
                                        @if($post->priority !== 'normal')
                                            <span class="ml-2 px-2 py-1 text-xs rounded-full
                                                {{ $post->priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800' }}">
                                                {{ $post->priority === 'urgent' ? 'Urgente' : 'Importante' }}
                                            </span>
                                        @endif
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {{-- Conteúdo do Post --}}
                    <div class="p-4">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            {{ $post->title }}
                        </h2>
                        
                        {{-- Imagem em destaque --}}
                        @if($post->featured_image)
                            <div class="mb-4">
                                <img src="{{ Storage::url($post->featured_image) }}" 
                                     alt="{{ $post->title }}"
                                     class="w-full h-48 object-cover rounded-lg">
                            </div>
                        @endif
                        
                        {{-- Vídeo do YouTube --}}
                        @if($post->youtube_embed_url)
                            <div class="mb-4">
                                <div class="aspect-video">
                                    <iframe src="{{ $post->youtube_embed_url }}" 
                                            class="w-full h-full rounded-lg"
                                            frameborder="0" 
                                            allowfullscreen></iframe>
                                </div>
                            </div>
                        @endif
                        
                        {{-- Conteúdo --}}
                        <div class="prose dark:prose-invert max-w-none text-sm">
                            {!! Str::limit(strip_tags($post->content), 200) !!}
                            @if(strlen(strip_tags($post->content)) > 200)
                                <a href="{{ \App\Filament\Resources\PostResource::getUrl('view', ['record' => $post]) }}" 
                                   class="text-primary-600 hover:text-primary-800 font-medium ml-1">
                                    Ler mais
                                </a>
                            @endif
                        </div>
                        
                        {{-- Anexos --}}
                        @if($post->attachments && count($post->attachments) > 0)
                            <div class="mt-4 space-y-2">
                                <h4 class="font-medium text-gray-900 dark:text-white text-sm">Anexos:</h4>
                                @foreach($post->attachments as $attachment)
                                    <a href="{{ Storage::url($attachment['path']) }}" 
                                       class="flex items-center gap-2 text-primary-600 hover:text-primary-800 text-sm"
                                       target="_blank">
                                        <x-heroicon-o-paper-clip class="h-4 w-4" />
                                        {{ $attachment['name'] }}
                                    </a>
                                @endforeach
                            </div>
                        @endif
                    </div>
                    
                    {{-- Footer com ações --}}
                    <div class="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <button wire:click="likePost({{ $post->id }})" 
                                        class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors">
                                    <x-heroicon-o-heart class="h-4 w-4" />
                                    {{ $post->likes_count }}
                                </button>
                                <span class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    <x-heroicon-o-eye class="h-4 w-4" />
                                    {{ $post->views_count }}
                                </span>
                                <span class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    <x-heroicon-o-chat-bubble-left class="h-4 w-4" />
                                    0 {{-- Alterado de {{ $post->comments->count() }} --}}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                @if($post->type === 'announcement')
                                    <span class="text-xs text-red-600 dark:text-red-400 font-medium">
                                        Comunicado Oficial
                                    </span>
                                @else
                                    <span class="text-xs text-gray-500 dark:text-gray-400">
                                        {{ ucfirst($post->type) }}
                                    </span>
                                @endif
                            </div>
                        </div>
                    </div>
                </div>
            @empty
                <div class="text-center py-12">
                    <x-heroicon-o-megaphone class="mx-auto h-12 w-12 text-gray-400" />
                    <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum post disponível</h3>
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Aguarde novos comunicados da administração.</p>
                </div>
            @endforelse
        </div>
    </x-filament::section>
</x-filament-widgets::widget>