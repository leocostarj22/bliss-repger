<x-filament::page>
    @php
        $displayName = auth()->user()->name ?? 'Guest';
        $locale = app()->getLocale();
    @endphp

    <div
        x-data="joinJitsi('{{ $displayName ?? (auth()->user()->name ?? 'Guest') }}', '{{ app()->getLocale() }}')"
        x-init="init()"
    >
        <div class="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <input
                type="url"
                x-model="meetingUrl"
                placeholder="Cole o link da reunião Jitsi (ex.: https://meet.jit.si/Sala)"
                class="w-full sm:w-[420px] border rounded px-3 py-2 bg-white text-black placeholder-gray-500 caret-black dark:bg-white dark:text-red-500 dark:placeholder-red-400 dark:caret-red-500"
            />
            <button
                type="button"
                @click="submitLink()"
                class="px-3 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
                Entrar
            </button>
            <button
                type="button"
                @click="createNewCall()"
                class="px-3 py-2 rounded bg-success-600 text-red hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
                Criar nova chamada
            </button>

            <template x-if="roomName">
                <span class="text-sm text-gray-600">
                    Sala: <strong x-text="roomName"></strong>
                </span>
            </template>
        </div>

        <template x-if="inviteUrl">
            <div class="mb-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <!-- Link estilizado como um input: clicável, texto preto no modo escuro -->
                <a
                    :href="inviteUrl"
                    target="_blank"
                    rel="noopener"
                    class="block w-full sm:w-[480px] border rounded px-3 py-2 bg-white dark:bg-white text-black dark:text-black break-all underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    x-text="inviteUrl"
                ></a>

                <button
                    type="button"
                    @click="copyInvite()"
                    class="px-3 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                    Copiar link
                </button>
            </div>
        </template>

        {{-- Container onde o Jitsi é montado --}}
        <div id="jitsi-container"
             class="w-full  overflow-hidden bg-black"
             style="height: 80vh;">
        </div>
    </div>

    <script src="https://meet.jit.si/external_api.js"></script>
    <script>
    function joinJitsi(displayName, locale) {
        return {
            displayName,
            locale,
            meetingUrl: '',
            roomName: '',
            inviteUrl: '',
            api: null,

            init() {
                const params = new URLSearchParams(window.location.search);
                const room = params.get('room');
                if (room) {
                    this.roomName = room;
                    this.inviteUrl = this.buildInviteUrl(room);
                    this.meetingUrl = this.inviteUrl;
                    this.openJitsi();
                }
            },

            buildInviteUrl(room) {
                const base = window.location.origin + window.location.pathname;
                return `${base}?room=${encodeURIComponent(room)}`;
            },

            generateRoomName() {
                const ts = Date.now();
                let rand = '';
                if (window.crypto && crypto.getRandomValues) {
                    const arr = new Uint32Array(2);
                    crypto.getRandomValues(arr);
                    rand = (arr[0].toString(36) + arr[1].toString(36)).slice(0, 8);
                } else {
                    rand = Math.random().toString(36).slice(2, 10);
                }
                return `repger-${ts}-${rand}`;
            },

            // Aceita links Jitsi (https://meet.jit.si/Sala) e também links do próprio sistema (?room=Sala)
            parseRoom(url) {
                try {
                    const u = new URL(url, window.location.origin);
                    const qpRoom = u.searchParams.get('room');
                    if (qpRoom) return qpRoom;

                    const segments = u.pathname.split('/').filter(Boolean);
                    return segments.pop() ?? '';
                } catch (e) {
                    return '';
                }
            },

            submitLink() {
                const room = this.parseRoom(this.meetingUrl);
                if (!room) {
                    alert('Link inválido. Verifique e tente novamente.');
                    return;
                }
                this.roomName = room;
                this.inviteUrl = this.buildInviteUrl(room);
                this.openJitsi();
            },

            createNewCall() {
                const room = this.generateRoomName();
                this.roomName = room;
                this.inviteUrl = this.buildInviteUrl(room);
                this.meetingUrl = this.inviteUrl;
                this.openJitsi();
            },

            copyInvite() {
                const text = this.inviteUrl;
                if (!text) return;
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(text).then(() => {
                        console.log('Link copiado!');
                    }).catch(() => alert('Não foi possível copiar o link.'));
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    document.body.appendChild(ta);
                    ta.select();
                    try { document.execCommand('copy'); alert('Link copiado!'); }
                    catch { alert('Não foi possível copiar o link.'); }
                    finally { document.body.removeChild(ta); }
                }
            },

            openJitsi() {
                if (!this.roomName) return;

                if (this.api) {
                    try { this.api.dispose(); } catch (e) {}
                    this.api = null;
                }

                const domain = 'meet.jit.si';
                const options = {
                    roomName: this.roomName,
                    parentNode: document.getElementById('jitsi-container'),
                    width: '100%',
                    height: '100%',
                    userInfo: { displayName: this.displayName },
                    configOverwrite: {
                        prejoinConfig: { enabled: true },
                        startWithAudioMuted: true,
                        startWithVideoMuted: false,
                        defaultLanguage: this.locale || 'pt',
                    },
                    interfaceConfigOverwrite: {
                        SHOW_JITSI_WATERMARK: false,
                        SHOW_BRAND_WATERMARK: false,
                    },
                    lang: this.locale || 'pt',
                };

                try {
                    this.api = new JitsiMeetExternalAPI(domain, options);
                } catch (e) {
                    console.error('Erro ao carregar Jitsi IFrame API:', e);
                    alert('Não foi possível iniciar a chamada. Verifique o link e tente novamente.');
                }
            },
        };
    }
    </script>
</x-filament::page>