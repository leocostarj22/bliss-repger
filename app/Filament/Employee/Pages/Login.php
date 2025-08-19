<?php

namespace App\Filament\Employee\Pages;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Pages\Auth\Login as BaseLogin;
use Illuminate\Validation\ValidationException;

class Login extends BaseLogin
{
    protected static string $view = 'filament.employee.auth.login';
    
    public function form(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('email')
                    ->label('Email')
                    ->email()
                    ->required()
                    ->autocomplete()
                    ->autofocus()
                    ->extraInputAttributes(['tabindex' => 1]),
                TextInput::make('password')
                    ->label('Senha')
                    ->password()
                    ->required()
                    ->extraInputAttributes(['tabindex' => 2]),
            ]);
    }
    
    protected function getCredentialsFromFormData(array $data): array
    {
        return [
            'email' => $data['email'],
            'password' => $data['password'],
            'is_active' => true, // Apenas usuários ativos podem fazer login
        ];
    }
    
    protected function throwFailureValidationException(): never
    {
        throw ValidationException::withMessages([
            'data.email' => 'Credenciais inválidas ou conta inativa.',
        ]);
    }
}