<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Illuminate\Support\Str;

class VideoCall extends Page
{
    protected static ?string $navigationGroup = 'Comunicação';
    protected static ?string $navigationIcon = 'heroicon-o-video-camera';
    protected static string $view = 'filament.pages.video-call';

    public string $roomId;

    public function mount(): void
    {
        $this->roomId = 'sala-' . Str::random(8);
    }
}
