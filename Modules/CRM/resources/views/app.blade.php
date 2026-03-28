<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    @php
        $faviconPath = public_path('images/nextfavicon.png');
        $faviconUrl = asset('images/nextfavicon.png');
        if (is_file($faviconPath)) {
            $faviconUrl .= '?v=' . filemtime($faviconPath);
        }
    @endphp
    <link rel="icon" type="image/png" href="{{ $faviconUrl }}" />
    <title>NextCRM</title>
    
    @vite([
        'resources/assets/crm-frontend/src/main.tsx'
    ], 'build-crm')
</head>
<body>
    <div id="root"></div>
</body>
</html>