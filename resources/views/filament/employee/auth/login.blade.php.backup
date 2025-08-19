<style>
    html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        overflow: hidden; /* remove barra de rolagem */
    }
</style>

<div class="fi-simple-layout relative flex max-h-screen w-full items-center justify-center">
    <!-- Background limitado a 16:9 -->
    <div 
        class="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-0 aspect-video"
        style="background-image: url('{{ asset('images/employee.jpg') }}')"
    ></div>
    
    <!-- Overlay escuro -->
    <div class="fixed inset-0 bg-black bg-opacity-50 z-10"></div>

    <!-- Content (sempre centralizado) -->
    <div class="relative z-20 flex items-center justify-center w-full h-full">
        <main class="fi-simple-main w-full max-w-lg mx-auto my-auto bg-white px-6 py-12 shadow-2xl ring-1 ring-gray-950/5 
                    dark:bg-gray-900 dark:ring-white/10 
                    sm:rounded-xl sm:px-12">
            
            <!-- Header -->
            <div class="fi-simple-header mb-12 text-center">
                <div class="mb-4">
                    <img src="{{ asset('images/multicontact.png') }}" alt="Logo" class="mx-auto h-10 w-auto">
                </div>
                
                <h1 class="fi-simple-header-heading text-1xl font-bold tracking-tight text-gray-950 dark:text-white">
                    Acesso ao Sistema
                </h1>
                
                <p class="fi-simple-header-subheading mt-2 text-sm text-gray-500 dark:text-gray-400">
                    
                </p>
            </div>

            <!-- Hooks -->
            {{ \Filament\Support\Facades\FilamentView::renderHook('panels::auth.login.form.before') }}

            <!-- Formulário -->
            <x-filament-panels::form wire:submit="authenticate">
                {{ $this->form }}

                <x-filament-panels::form.actions
                    :actions="$this->getCachedFormActions()"
                    :full-width="$this->hasFullWidthFormActions()"
                />
            </x-filament-panels::form>

            {{ \Filament\Support\Facades\FilamentView::renderHook('panels::auth.login.form.after') }}
        </main>
    </div>
</div>
