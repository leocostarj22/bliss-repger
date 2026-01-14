<?php

namespace Modules\CRM\Filament\Resources;

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
                Tables\Filters\Filter::make('date_range')
                    ->label('Período')
                    ->form([
                        Forms\Components\DatePicker::make('from')->label('De'),
                        Forms\Components\DatePicker::make('to')->label('Até'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query->betweenDates($data['from'] ?? null, $data['to'] ?? null);
                    }),

                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'completed' => 'Concluído',
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
                            $query->where('post->step', '!=', 'plans')
                                  ->whereNotNull('post->step');
                        }
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->label('Resumo')
                    ->modalHeading('Resumo do Quiz')
                    ->icon('heroicon-o-eye'),
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