@if($getState())
    @php
        $videoId = null;
        $url = $getState();
        
        // Extrair ID do vídeo do YouTube
        if (preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $url, $matches)) {
            $videoId = $matches[1];
        }
    @endphp
    
    @if($videoId)
        <div class="youtube-video-container" style="
            position: relative; 
            padding-bottom: 56.25%; 
            height: 0; 
            overflow: hidden;
            border-radius: 8px;
            margin: 12px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
            <iframe 
                src="https://www.youtube.com/embed/{{ $videoId }}" 
                style="
                    position: absolute; 
                    top: 0; 
                    left: 0; 
                    width: 100%; 
                    height: 100%;
                    border-radius: 8px;
                " 
                frameborder="0" 
                allowfullscreen>
            </iframe>
        </div>
    @else
        <div style="
            padding: 20px;
            background-color: #f3f4f6;
            border-radius: 8px;
            text-align: center;
            color: #6b7280;
        ">
            <p>📹 URL do YouTube inválida</p>
        </div>
    @endif
@endif