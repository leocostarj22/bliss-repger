<?php

namespace App\Filament\Pages;

use App\Models\HelpArticle;
use Filament\Pages\Page;
use Illuminate\Contracts\Support\Htmlable;

class HelpCenter extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-question-mark-circle';
    protected static ?string $navigationLabel = 'Central de Ajuda';
    protected static ?string $title = 'Central de Ajuda';
    protected static string $view = 'filament.pages.help-center';
    protected static ?int $navigationSort = 99;

    public $search = '';
    public $selectedCategory = '';

    public function getTitle(): string|Htmlable
    {
        return 'Central de Ajuda';
    }

    public function getHeading(): string|Htmlable
    {
        return 'Central de Ajuda';
    }

    public function getFeaturedArticles()
    {
        return HelpArticle::published()
            ->featured()
            ->forAudience($this->getUserAudience())
            ->orderBy('sort_order')
            ->limit(6)
            ->get();
    }

    public function getArticlesByCategory($category)
    {
        return HelpArticle::published()
            ->byCategory($category)
            ->forAudience($this->getUserAudience())
            ->orderBy('sort_order')
            ->limit(5)
            ->get();
    }

    public function searchArticles()
    {
        if (empty($this->search)) {
            return collect();
        }

        return HelpArticle::published()
            ->forAudience($this->getUserAudience())
            ->where(function ($query) {
                $query->where('title', 'like', '%' . $this->search . '%')
                      ->orWhere('content', 'like', '%' . $this->search . '%')
                      ->orWhere('excerpt', 'like', '%' . $this->search . '%');
            })
            ->when($this->selectedCategory, function ($query) {
                $query->byCategory($this->selectedCategory);
            })
            ->orderBy('sort_order')
            ->get();
    }

    protected function getUserAudience()
    {
        // Determinar se é admin ou employee baseado no painel atual
        $panel = filament()->getCurrentPanel();
        return $panel->getId() === 'admin' ? 'admin' : 'employee';
    }

    public function getCategories()
    {
        return [
            'tickets' => 'Tickets',
            'tasks' => 'Tarefas', 
            'messages' => 'Mensagens',
            'general' => 'Geral',
            'faq' => 'FAQ',
        ];
    }
}