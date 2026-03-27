@php
    $index = public_path('newfrontend/index.html');
    $hasBuild = file_exists($index);
    $isLocal = app()->environment('local');

    $cssCandidates = glob(public_path('newfrontend/assets/index-*.css')) ?: [];
    $jsCandidates = glob(public_path('newfrontend/assets/index-*.js')) ?: [];

    sort($cssCandidates);
    sort($jsCandidates);

    $cssFile = $cssCandidates[0] ?? null;
    $jsFile = $jsCandidates[0] ?? null;
    $hasHashedAssets = is_string($cssFile) && $cssFile !== '' && is_string($jsFile) && $jsFile !== '';
@endphp
@if ($hasBuild)
{!! file_get_contents($index) !!}
@elseif ($isLocal)
<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>GMCentral</title>
    <link rel="icon" href="/gmfavicon.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="http://127.0.0.1:5174/%40vite/client"></script>
    <script type="module" src="http://127.0.0.1:5174/src/main.tsx"></script>
  </body>
</html>
@elseif ($hasHashedAssets)
<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>GMCentral</title>
    <link rel="icon" href="/newfrontend/gmfavicon.png" />
    <link rel="stylesheet" href="/newfrontend/assets/{{ basename($cssFile) }}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/newfrontend/assets/{{ basename($jsFile) }}"></script>
  </body>
</html>
@else
<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>GMCentral</title>
  </head>
  <body>
    <div style="padding:16px;font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
      Build do frontend não encontrado.
    </div>
  </body>
</html>
@endif