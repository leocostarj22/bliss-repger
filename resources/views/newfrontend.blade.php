@php
    $index = public_path('newfrontend/index.html');
    $hasBuild = file_exists($index);
    $isLocal = app()->environment('local');
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
@else
<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>GMCentral</title>
  </head>
  <body>
    <div id="root"></div>
    <link rel="stylesheet" href="/newfrontend/assets/index.css">
    <script type="module" src="/newfrontend/assets/index.js"></script>
  </body>
</html>
@endif