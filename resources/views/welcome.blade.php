<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'Laravel') }}</title>
        
        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
        
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body, html {
                height: 100%;
                overflow: hidden;
                font-family: 'Instrument Sans', sans-serif;
            }
            
            .video-background {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -1;
                object-fit: cover;
            }
            
            .container {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                position: relative;
                z-index: 1;
                gap: 30px;
            }
            
            .logo {
                max-width: 400px;
                width: 90%;
                height: auto;
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
                animation: fadeIn 2s ease-in-out;
            }
            
            .login-buttons {
                display: flex;
                gap: 20px;
                animation: slideUp 2s ease-in-out 0.5s both;
            }
            
            .login-btn {
                padding: 15px 30px;
                border: none;
                border-radius: 8px;
                font-family: 'Instrument Sans', sans-serif;
                font-size: 16px;
                font-weight: 500;
                text-decoration: none;
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                min-width: 140px;
                text-align: center;
            }
            
            .admin-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: 2px solid rgba(255, 255, 255, 0.2);
            }
            
            .admin-btn:hover {
                background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            }
            
            .employee-btn {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                border: 2px solid rgba(255, 255, 255, 0.2);
            }
            
            .employee-btn:hover {
                background: linear-gradient(135deg, #e881f9 0%, #f3455a 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            }
            
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                z-index: 0;
            }
            
            @media (max-width: 768px) {
                .login-buttons {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .login-btn {
                    padding: 12px 25px;
                    font-size: 14px;
                    min-width: 120px;
                }
            }
        </style>
    </head>
    <body>
        <!-- Vídeo de Background -->
        <video class="video-background" autoplay muted loop>
            <source src="{{ asset('videos/videotech.mp4') }}" type="video/mp4">
            Seu navegador não suporta vídeos HTML5.
        </video>
        
        <!-- Overlay para melhorar a visibilidade da logo -->
        <div class="overlay"></div>
        
        <!-- Container da Logo e Botões -->
        <div class="container">
            <img src="{{ asset('images/multicontact.png') }}" alt="Multicontact Logo" class="logo">
            
            <div class="login-buttons">
                <a href="/admin/login" class="login-btn admin-btn">
                    🔧 Administrador
                </a>
                <a href="/employee/login" class="login-btn employee-btn">
                    👤 Colaborador
                </a>
            </div>
        </div>
    </body>
</html>