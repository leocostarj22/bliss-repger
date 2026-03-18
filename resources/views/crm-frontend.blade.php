<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>CRM</title>
    <link rel="icon" href="{{ asset('images/gmfavicon.png') }}" />
    @vite('resources/assets/crm-frontend/src/main.tsx', 'build-crm')
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>