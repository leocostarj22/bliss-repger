<x-filament-panels::page>
    <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                Gestão de Módulos
            </h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Ative ou desative os módulos da aplicação. Ao desativar um módulo,
                os respetivos menus e funcionalidades deixam de estar disponíveis
                para os utilizadores.
            </p>
        </div>

        <form wire:submit.prevent="save" class="space-y-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
                @forelse($modules as $name => $enabled)
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">
                                {{ $name }}
                            </div>
                            <div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {{ $this->getModuleDescription($name) }}
                            </div>
                        </div>

                        <label class="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                class="sr-only peer"
                                wire:model.live="modules.{{ $name }}"
                            >
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2
                                       peer-focus:ring-primary-500 rounded-full peer
                                       dark:bg-gray-700 peer-checked:bg-green-500 relative"
                            >
                                <span
                                    class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                                           transform transition-transform duration-200 ease-in-out
                                           {{ $enabled ? 'translate-x-5' : 'translate-x-0' }}
                                           peer-checked:translate-x-5"
                                ></span>
                            </div>
                        </label>
                    </div>
                @empty
                    <div class="px-6 py-4">
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            Nenhum módulo encontrado na pasta <code>Modules</code>.
                        </p>
                    </div>
                @endforelse
            </div>
        </form>
    </div>
</x-filament-panels::page>