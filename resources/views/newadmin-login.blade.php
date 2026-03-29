<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="csrf-token" content="{{ csrf_token() }}">

    @php
      $__brandingPath = base_path('branding.json');
      $__defaults = [
        'app_name' => 'GMCentral',
        'app_title' => 'GMCentral',
        'app_favicon' => 'images/gmfavicon.png',
      ];

      $__branding = $__defaults;
      if (is_file($__brandingPath)) {
        $__decoded = json_decode((string) file_get_contents($__brandingPath), true);
        if (is_array($__decoded)) $__branding = array_merge($__branding, $__decoded);
      }

      $__resolveAsset = function ($path) {
        $p = trim((string) $path);
        if ($p === '') return null;
        if (str_starts_with($p, 'http://') || str_starts_with($p, 'https://') || str_starts_with($p, 'data:')) return $p;
        $p = ltrim($p, '/');
        if (str_starts_with($p, 'branding/')) return asset('storage/' . $p);
        if (str_starts_with($p, 'storage/')) return asset($p);
        return asset($p);
      };

      $__appName = trim((string) ($__branding['app_name'] ?? '')) ?: 'GMCentral';
      $__faviconUrl = $__resolveAsset($__branding['app_favicon'] ?? null) ?? asset('images/gmfavicon.png');

      $__shortcutUrl = url('/admin');
      $__installUrl = url('/newadmin/login') . '?install=1';
      $__qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' . urlencode($__installUrl);
    @endphp

    <title>Entrar — {{ $__appName }}</title>
    <link rel="icon" href="{{ $__faviconUrl }}" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#0b0c0f" />
    <style>
      :root { color-scheme: dark light; }
      body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: radial-gradient(1000px 400px at 20% -10%, rgba(34,211,238,.08), transparent), radial-gradient(800px 320px at 100% 0%, rgba(232,121,249,.08), transparent), #0b0c0f; color:#e6e7eb; }
      .wrap { min-height:100dvh; display:grid; place-items:center; padding:24px; }
      .stack { width:100%; max-width:720px; display:flex; flex-direction:column; gap:16px; }
      .card { width:100%; max-width:420px; background:#10131a; border:1px solid #1c2332; border-radius:14px; padding:28px; box-shadow: 0 12px 40px rgba(0,0,0,.30); backdrop-filter:saturate(120%) blur(6px); }
      .form { max-width:320px; margin:0 auto; }

      .qr-card { max-width:420px; padding:18px; display:flex; align-items:center; justify-content:center; }
      .qr-img { width:min(240px, 80vw); height:auto; aspect-ratio:1 / 1; border-radius:0; border:0; background:transparent; display:block; }

      .install-overlay { position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.55); z-index:9999; }
      .install-overlay[data-open="1"] { display:flex; }
      .install-btn { width:76px; height:76px; border-radius:18px; border:1px solid #253047; background:linear-gradient(90deg,#22d3ee,#e879f9); color:#0b0c0f; display:grid; place-items:center; cursor:pointer; box-shadow: 0 12px 40px rgba(0,0,0,.35); }
      .install-btn:active { transform: translateY(1px); }
      .install-btn svg { width:34px; height:34px; }

      @media (max-width: 480px) {
        .wrap { padding:16px; }
        .card { padding:20px; }
        .qr-card { padding:18px; }
      }

      @media (min-width: 900px) {
        .stack { flex-direction:row; align-items:flex-start; max-width:860px; }
        .qr-card { max-width:320px; }
      }
      h1 { margin:0 0 6px; font-size:22px; }
      p { margin:0 0 18px; color:#a8afc0; font-size:13px; }
      label { display:block; font-size:12px; color:#9aa3b2; margin:12px 0 6px; }
      input[type="email"], input[type="password"] {
        width:100%; padding:10px 12px; border-radius:8px; border:1px solid #253047; background:#0f1320; color:#e6e7eb; outline:none; transition:border-color .2s, box-shadow .2s;
      }
      input[type="email"]::placeholder, input[type="password"]::placeholder { color:#6b7280; }
      input[type="email"]:focus, input[type="password"]:focus { border-color:#22d3ee; box-shadow:0 0 0 3px rgba(34,211,238,.15); }
      .row { display:flex; align-items:center; justify-content:space-between; margin:12px 0 18px; }
      .row label { display:flex; align-items:center; gap:8px; margin:0; color:#a8afc0; font-size:12px; }
      .btn { width:100%; padding:12px 16px; background:linear-gradient(90deg,#22d3ee,#e879f9); color:#0b0c0f; font-weight:700; border:0; border-radius:10px; cursor:pointer; transition: filter .15s ease, transform .06s ease; }
      .btn:hover { filter:brightness(1.05); }
      .btn:active { transform: translateY(1px); }
      .err { margin:8px 0; color:#fda4af; font-size:12px; }
      .muted { margin-top:14px; font-size:12px; color:#7b8398; text-align:center; }
      .logo { display:flex; align-items:center; gap:12px; margin-bottom:18px; }
      .logo img { width:32px; height:32px; border-radius:8px; box-shadow:0 4px 16px rgba(34,211,238,.25); }
      a { color:#a8afc0; text-decoration:none; font-size:12px; }
      a:hover { color:#cbd5e1; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="stack">
        <form class="card" method="POST" action="/newadmin/login">
          @csrf
          <div class="logo" aria-label="Identidade visual">
            <img src="{{ $__faviconUrl }}" alt="{{ $__appName }}">
            <div>
              <h1>Entrar</h1>
              <p>Acesse o painel administrativo</p>
            </div>
          </div>
          <div class="form">

          @if ($errors->any())
            <div class="err">
              {{ $errors->first() }}
            </div>
          @endif

          <label for="email">Email</label>
          <input id="email" name="email" type="email" value="{{ old('email') }}" placeholder="seu@email.com" autocomplete="username" required autofocus />

          <label for="password">Senha</label>
          <input id="password" name="password" type="password" placeholder="********" autocomplete="current-password" required />

          <div class="row">
            <label><input type="checkbox" name="remember" value="1" {{ old('remember') ? 'checked' : '' }}/> Lembrar‑me</label>
            <a href="/filament-admin/forgot-password">Esqueci a senha</a>
          </div>

          <button type="submit" class="btn">Entrar</button>
          <div class="muted">Após autenticar, será redirecionado para /admin (novo painel).</div>
          </div>
        </form>

        <div class="card qr-card" aria-label="Atalho no telemóvel">
          <img class="qr-img" src="{{ $__qrUrl }}" alt="QR Code" loading="lazy" />
        </div>
      </div>
    </div>

    <div id="install-overlay" class="install-overlay" aria-hidden="true">
      <button id="install-btn" class="install-btn" type="button" aria-label="Instalar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v10" />
          <path d="m8 11 4 4 4-4" />
          <path d="M4 21h16" />
        </svg>
      </button>
    </div>

    <script>
      (function () {
        try {
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/service-worker.js").catch(function () {});
          }
        } catch (e) {}

        var params;
        try {
          params = new URLSearchParams(window.location.search || "");
        } catch (e) {
          params = null;
        }
        var shouldInstall = !!(params && params.get("install") === "1");

        var deferredPrompt = null;
        window.addEventListener("beforeinstallprompt", function (e) {
          e.preventDefault();
          deferredPrompt = e;
          if (shouldInstall) {
            var overlay = document.getElementById("install-overlay");
            if (overlay) overlay.setAttribute("data-open", "1");
          }
        });

        if (!shouldInstall) return;

        var overlay = document.getElementById("install-overlay");
        var btn = document.getElementById("install-btn");
        if (!overlay || !btn) return;

        var promptOnce = function () {
          if (!deferredPrompt) return;
          try {
            deferredPrompt.prompt();
          } catch (e) {}
          deferredPrompt = null;
          overlay.removeAttribute("data-open");
        };

        btn.addEventListener("click", promptOnce);
      })();
    </script>
  </body>
</html>