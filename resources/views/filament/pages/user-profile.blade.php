<x-filament-panels::page>
    <div class="space-y-6 max-w-3xl mx-auto">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center gap-6">
            <div class="shrink-0">
                <img
                    class="h-20 w-20 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700"
                    src="{{ auth()->user()->photo_path ? \Illuminate\Support\Facades\Storage::url(auth()->user()->photo_path) : 'https://ui-avatars.com/api/?name=' . urlencode(auth()->user()->name) . '&color=7F9CF5&background=EBF4FF' }}"
                    alt="{{ auth()->user()->name }}"
                />
            </div>
            <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                    {{ auth()->user()->name }}
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ auth()->user()->email }}
                </p>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Gerencie suas informações pessoais, biografia e segurança.
                </p>
            </div>
        </div>

        <x-filament-panels::form wire:submit="save">
            {{ $this->form }}

            <div class="mt-6 flex justify-end">
                <button
                    type="submit"
                    class="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white
                           text-sm font-medium hover:bg-primary-700 focus:outline-none
                           focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                           dark:focus:ring-offset-gray-900"
                >
                    Guardar alterações
                </button>
            </div>
        </x-filament-panels::form>
    </div>
</x-filament-panels::page>