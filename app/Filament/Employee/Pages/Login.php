<?php

namespace App\Filament\Employee\Pages;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Pages\Auth\Login as BaseLogin;
use Illuminate\Validation\ValidationException;

class Login extends BaseLogin
{
    public function form(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('email')->label('Email')->email()->required()->autocomplete()->autofocus(),
                TextInput::make('password')->label('Senha')->password()->required(),
            ]);
    }

    protected function getGuardName(): ?string
    {
        return 'employee'; // ⚡ essencial para autenticar no guard correto
    }

    protected function getCredentialsFromFormData(array $data): array
    {
        return [
            'email' => $data['email'],
            'password' => $data['password'],
            'is_active' => true,
        ];
    }

    protected function throwFailureValidationException(): never
    {
        throw ValidationException::withMessages([
            'data.email' => 'Credenciais inválidas ou conta inativa.',
        ]);
    }
}
