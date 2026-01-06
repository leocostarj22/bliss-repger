<?php

return [
    'name' => 'CRM',
    'gocontact' => [
        'base_url' => env('GOCONTACT_BASE_URL', 'https://grupomulticontact.go-contact.com'),
        'username' => env('GOCONTACT_USERNAME'),
        'password' => env('GOCONTACT_PASSWORD'),
    ],
];
