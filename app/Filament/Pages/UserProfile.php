<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserProfile extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $title = 'Meu Perfil';
    protected static bool $shouldRegisterNavigation = false;
    protected static string $view = 'filament.pages.user-profile';

    public ?array $data = [];

    public function mount(): void
    {
        $user = auth()->user();

        $this->form->fill([
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'bio' => $user->bio,
            'current_password' => null,
            'new_password' => null,
            'new_password_confirmation' => null,
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informações Pessoais')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('Nome')
                            ->required()
                            ->maxLength(255),

                        Forms\Components\TextInput::make('email')
                            ->label('Email')
                            ->email()
                            ->required()
                            ->maxLength(255),

                        Forms\Components\TextInput::make('phone')
                            ->label('Telefone')
                            ->tel()
                            ->maxLength(255),

                        Forms\Components\Textarea::make('bio')
                            ->label('Biografia')
                            ->rows(3)
                            ->columnSpanFull()
                            ->maxLength(500),

                        Forms\Components\FileUpload::make('photo_path')
                            ->label('Alterar imagem de perfil')
                            ->image()
                            ->avatar()
                            ->directory('avatars')
                            ->maxSize(2048)
                            ->imageEditor()
                            ->columnSpanFull(),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Segurança')
                    ->schema([
                        Forms\Components\TextInput::make('current_password')
                            ->label('Password atual')
                            ->password()
                            ->revealable()
                            ->dehydrated(false),

                        Forms\Components\TextInput::make('new_password')
                            ->label('Nova password')
                            ->password()
                            ->revealable()
                            ->minLength(8)
                            ->dehydrated(false),

                        Forms\Components\TextInput::make('new_password_confirmation')
                            ->label('Confirmar nova password')
                            ->password()
                            ->revealable()
                            ->dehydrated(false),
                    ])
                    ->columns(2),
            ])
            ->statePath('data');
    }

    public function save(): void
    {
        $user = auth()->user();

        $data = $this->form->getState();

        // Validação manual para controlar regras de email e password
        $validated = validator($data, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:500'],
            'photo_path' => ['nullable', 'string'],
            'current_password' => ['nullable', 'string'],
            'new_password' => ['nullable', 'string', 'min:8', 'same:new_password_confirmation'],
            'new_password_confirmation' => ['nullable', 'string'],
        ], [
            'email.unique' => 'Este email já está em uso.',
            'new_password.min' => 'A nova password deve ter pelo menos :min caracteres.',
            'new_password.same' => 'A confirmação da nova password não coincide.',
        ])->validate();

        // Se o utilizador quer mudar a password, validar a atual
        if (!empty($validated['new_password'])) {
            if (empty($validated['current_password']) || ! Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => 'A password atual não está correta.',
                ]);
            }

            $user->password = Hash::make($validated['new_password']);
        }

        // Atualizar dados básicos
        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->phone = $validated['phone'] ?? null;
        $user->bio = $validated['bio'] ?? null;

        // Atualizar imagem de perfil (FileUpload já gravou o ficheiro e devolve o caminho)
        if (!empty($validated['photo_path'])) {
            $user->photo_path = $validated['photo_path'];
        }

        $user->save();

        // Recarregar o formulário com dados limpos (passwords vazias)
        $this->form->fill([
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'bio' => $user->bio,
            'current_password' => null,
            'new_password' => null,
            'new_password_confirmation' => null,
        ]);

        Notification::make()
            ->title('Perfil atualizado com sucesso.')
            ->success()
            ->send();
    }
}