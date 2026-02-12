<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CRM GMCentral</title>
    
    @vite([
        'resources/assets/sass/app.scss',
        'resources/assets/crm-frontend/src/main.tsx'
    ], 'build-crm')
</head>
<body>
    <div id="root"></div>
</body>
</html>