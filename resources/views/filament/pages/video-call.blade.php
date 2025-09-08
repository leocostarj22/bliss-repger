<x-filament::page>
    <div class="space-y-4">
        <h2 class="text-xl font-semibold">Video Call (Jitsi)</h2>

        {{-- Container que vai receber o Jitsi --}}
        <div id="jitsi-container"
             class="w-full border rounded overflow-hidden bg-black"
             style="height: 80vh;">
        </div>
    </div>

    @php
        $roomId = $roomId ?? request('room', 'BlissRepgerRoom');
        $displayName = auth()->user()->name ?? 'Guest';
        $locale = app()->getLocale();
    @endphp

    <script src="https://meet.jit.si/external_api.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const domain = 'meet.jit.si';
            const options = {
                roomName: @json($roomId),
                parentNode: document.querySelector('#jitsi-container'),
                width: '100%',
                height: '100%',
                userInfo: {
                    displayName: @json($displayName),
                },
                configOverwrite: {
                    startWithAudioMuted: true,
                    startWithVideoMuted: false,
                    defaultLanguage: @json($locale),
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_BRAND_WATERMARK: false,
                },
            };

            try {
                window.jitsiApi = new JitsiMeetExternalAPI(domain, options);
            } catch (e) {
                console.error('Erro ao carregar Jitsi IFrame API:', e);
            }
        });
    </script>
</x-filament::page>
