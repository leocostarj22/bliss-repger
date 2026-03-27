<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sms' => [
        'enabled' => env('SMS_ENABLE', false),
        'provider' => env('SMS_PROVIDER', 'nos'),
        'default_country_code' => env('SMS_DEFAULT_COUNTRY_CODE', '+351'),
    ],

    'nos_sms' => [
        'endpoint' => env('NOS_SMS_ENDPOINT', 'https://api-mpro.apg.nos.pt'),
        'version' => env('NOS_SMS_VERSION', 'v1'),
        'sender' => env('NOS_SMS_SENDER'),
        'key' => env('NOS_SMS_KEY'),
        'secret' => env('NOS_SMS_SECRET'),
        'verify_ssl' => env('NOS_SMS_VERIFY_SSL', true),
        'timeout' => env('NOS_SMS_TIMEOUT', 60),
        'connect_timeout' => env('NOS_SMS_CONNECT_TIMEOUT', 10),
    ],

];
