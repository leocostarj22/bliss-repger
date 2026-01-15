<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Models\Lead;
use Modules\CRM\Models\Contact;
use Filament\Notifications\Notification;
use Illuminate\Database\Eloquent\Collection;
use Modules\CRM\Filament\Resources\QuizResource\Pages;
use Modules\CRM\Filament\Resources\QuizResource\Widgets\QuizStatsOverview;
use Modules\CRM\Models\Quiz;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class QuizResource extends Resource
{
    protected static ?string $model = Quiz::class;

    protected static ?string $navigationIcon = 'heroicon-o-beaker';
    protected static ?string $navigationGroup = 'CRM';
    protected static ?string $navigationLabel = 'MyFormula';
    protected static ?int $navigationSort = 100;

    public static function form(Form $form): Form
    {
        // Resource de leitura apenas – sem formulário de criação/edição
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('quiz_id')
                    ->label('ID')
                    ->sortable()
                    ->searchable(),

                Tables\Columns\TextColumn::make('post.name')
                    ->label('Nome')
                    ->searchable(['post->name', 'post->email']),

                Tables\Columns\TextColumn::make('post.email')
                    ->label('Email')
                    ->copyable(),

                Tables\Columns\TextColumn::make('genderLabel')
                    ->label('Género')
                    ->toggleable(),

                Tables\Columns\TextColumn::make('age')
                    ->label('Idade')
                    ->sortable(),

                Tables\Columns\TextColumn::make('firstPlanLabel')
                    ->label('Plano')
                    ->badge()
                    ->color('info'),

                Tables\Columns\TextColumn::make('statusLabel')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string =>
                        str_contains($state, 'Concluído') ? 'success' : 'warning'
                    ),

                Tables\Columns\TextColumn::make('date_added')
                    ->label('Data')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->defaultSort('date_added', 'desc')
            ->filters([
                Tables\Filters\Filter::make('name_filter')
                    ->label('Nome')
                    ->form([
                        Forms\Components\TextInput::make('name')->label('Nome'),
                    ])
                    ->query(function ($query, array $data) {
                        if (!empty($data['name'])) {
                            $query->where('post->name', 'like', '%' . $data['name'] . '%');
                        }
                    }),

                Tables\Filters\Filter::make('email_filter')
                    ->label('Email')
                    ->form([
                        Forms\Components\TextInput::make('email')->label('Email'),
                    ])
                    ->query(function ($query, array $data) {
                        if (!empty($data['email'])) {
                            $query->where('post->email', 'like', '%' . $data['email'] . '%');
                        }
                    }),

                Tables\Filters\SelectFilter::make('gender')
                    ->label('Género')
                    ->options([
                        'male'   => 'Masculino',
                        'female' => 'Feminino',
                        'other'  => 'Outro',
                    ])
                    ->query(function ($query, array $data) {
                        if (!empty($data['value'])) {
                            $query->where('post->gender', $data['value']);
                        }
                    }),

                Tables\Filters\SelectFilter::make('age_range')
                    ->label('Idade')
                    ->options([
                        '18-29' => '18-29',
                        '30-39' => '30-39',
                        '40-49' => '40-49',
                        '50+'   => '50+',
                    ])
                    ->query(function ($query, array $data) {
                        $value = $data['value'] ?? null;
                        if (!$value) {
                            return;
                        }

                        $now = \Carbon\Carbon::now();

                        if ($value === '18-29') {
                            $start = $now->copy()->subYears(30)->addDay()->format('Y-m-d');
                            $end   = $now->copy()->subYears(18)->format('Y-m-d');
                            $query->whereBetween('post->birthdate', [$start, $end]);
                        } elseif ($value === '30-39') {
                            $start = $now->copy()->subYears(40)->addDay()->format('Y-m-d');
                            $end   = $now->copy()->subYears(30)->format('Y-m-d');
                            $query->whereBetween('post->birthdate', [$start, $end]);
                        } elseif ($value === '40-49') {
                            $start = $now->copy()->subYears(50)->addDay()->format('Y-m-d');
                            $end   = $now->copy()->subYears(40)->format('Y-m-d');
                            $query->whereBetween('post->birthdate', [$start, $end]);
                        } elseif ($value === '50+') {
                            $end = $now->copy()->subYears(50)->format('Y-m-d');
                            $query->where('post->birthdate', '<=', $end);
                        }
                    }),

                Tables\Filters\SelectFilter::make('plan')
                    ->label('Plano')
                    ->options(Quiz::IMPROVE_HEALTH_LABELS)
                    ->query(function ($query, array $data) {
                        if (!empty($data['value'])) {
                            // filtra pelo primeiro código de plano (início da string), para alinhar com firstPlanLabel
                            $query->where('post->improve_health', 'like', $data['value'] . '%');
                        }
                    }),

                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'completed'  => 'Concluído',
                        'incomplete' => 'Não finalizado',
                    ])
                    ->query(function ($query, array $data) {
                        $value = $data['value'] ?? null;

                        if ($value === 'completed') {
                            $query->where(function ($q) {
                                $q->where('post->step', 'plans')
                                  ->orWhereNull('post->step');
                            });
                        } elseif ($value === 'incomplete') {
                            $query->where('post->step', 'NOT LIKE', 'plans');
                        }
                    }),

                Tables\Filters\Filter::make('date_range')
                    ->label('Período')
                    ->form([
                        Forms\Components\DatePicker::make('from')->label('De'),
                        Forms\Components\DatePicker::make('to')->label('Até'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query->betweenDates($data['from'] ?? null, $data['to'] ?? null);
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->label('Resumo')
                    ->modalHeading('Resumo do Quiz')
                    ->icon('heroicon-o-eye'),
            ])
            ->bulkActions([
                Tables\Actions\BulkAction::make('convertToLead')
                    ->label('Converter em Leads')
                    ->icon('heroicon-o-user-plus')
                    ->requiresConfirmation()
                    ->action(function (Collection $records) {
                        $count = 0;
                        foreach ($records as $record) {
                            $email = $record->post['email'] ?? null;
                            if (!$email) continue;

                            // Evita duplicidade
                            if (Lead::where('email', $email)->exists()) {
                                continue;
                            }

                            Lead::create([
                                'name' => $record->post['name'] ?? 'Sem nome',
                                'email' => $email,
                                'source' => 'quiz', // Identificador da origem
                                'status' => 'new',
                                'notes' => "Importado do Quiz #{$record->quiz_id}\n" .
                                           "Plano: " . ($record->firstPlanLabel ?? 'N/A') . "\n" .
                                           "Status: " . ($record->statusLabel ?? 'N/A'),
                            ]);

                            // Sincroniza com Contact para Campanhas
                            Contact::updateOrCreate(
                                ['email' => $email],
                                [
                                    'name' => $record->post['name'] ?? 'Sem nome',
                                    'source' => 'quiz',
                                    'utm_source' => 'quiz',
                                    'utm_medium' => 'crm_import',
                                    'utm_campaign' => $record->firstPlanLabel ?? 'Geral',
                                    'utm_content' => $record->statusLabel ?? 'N/A',
                                ]
                            );
                            $count++;
                        }

                        Notification::make()
                            ->title("$count Leads gerados com sucesso")
                            ->success()
                            ->send();
                    }),
            ]);
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Dados Principais')
                    ->columns(2)
                    ->schema([
                        Infolists\Components\TextEntry::make('post.name')
                            ->label('Nome'),
                        Infolists\Components\TextEntry::make('post.email')
                            ->label('Email')
                            ->icon('heroicon-m-envelope'),
                        Infolists\Components\TextEntry::make('genderLabel')
                            ->label('Género'),
                        Infolists\Components\TextEntry::make('age')
                            ->label('Idade'),
                    ]),

                Infolists\Components\Section::make('Resultado')
                    ->columns(2)
                    ->schema([
                        Infolists\Components\TextEntry::make('firstPlanLabel')
                            ->label('Plano Escolhido'),
                        Infolists\Components\TextEntry::make('statusLabel')
                            ->label('Situação')
                            ->badge()
                            ->color(fn ($state) =>
                                str_contains($state, 'Concluído') ? 'success' : 'warning'
                            ),
                    ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListQuizzes::route('/'),
        ];
    }

    public static function getWidgets(): array
    {
        return [
            QuizStatsOverview::class,
        ];
    }
}