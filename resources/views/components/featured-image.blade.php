@if($getState())
    <div class="featured-image-container" style="text-align: center; margin: 20px 0;">
        <img 
            src="{{ $getState() }}" 
            alt="Imagem em Destaque" 
            style="width: 100%; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
        />
    </div>
@endif