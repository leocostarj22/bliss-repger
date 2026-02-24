<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cancelamento de Subscrição</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f3f4f6;
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen p-4">
    <div class="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="p-8 text-center">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Subscrição Cancelada</h2>
            
            <p class="text-gray-600 mb-8">
                O seu email <strong>{{ $email ?? '' }}</strong> foi removido da nossa lista de envio com sucesso.
                Você não receberá mais comunicações desta campanha.
            </p>
            
            <div class="text-sm text-gray-500">
                Se foi um engano, entre em contacto connosco.
            </div>
        </div>
        <div class="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
            <p class="text-gray-500 text-sm">
                Esta janela fechará automaticamente em <span id="countdown" class="font-bold">10</span> segundos...
            </p>
        </div>
    </div>

    <script>
        let seconds = 10;
        const countdownEl = document.getElementById('countdown');
        const interval = setInterval(() => {
            seconds--;
            if (countdownEl) countdownEl.innerText = seconds;
            if (seconds <= 0) {
                clearInterval(interval);
                window.opener = null;
                window.open('', '_self');
                window.close();
                // Fallback visual message if close fails (browsers often block scripts closing windows they didn't open)
                document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;">Pode fechar esta janela agora.</div>';
            }
        }, 1000);
    </script>
</body>
</html>