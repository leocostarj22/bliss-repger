<?php

namespace App\Filament\Pages;

use App\Models\HelpArticle;
use Filament\Pages\Page;
use Illuminate\Contracts\Support\Htmlable;

class HelpArticleView extends Page
{
    protected static string $view = 'filament.pages.help-article-view';
    protected static bool $shouldRegisterNavigation = false;
    protected static ?string $slug = 'help-article/{slug}';

    public ?HelpArticle $article = null;
    public $wasHelpful = null;

    // Adicionar estes métodos para definir explicitamente o nome da rota
    public static function getRouteBaseName(): ?string
    {
        return 'help-article';
    }

    public static function getRouteName(?string $panel = null): string
    {
        $panel = $panel ?? filament()->getCurrentPanel()->getId();
        return "filament.{$panel}.pages.help-article";
    }

    public function mount($slug)
    {
        $this->article = HelpArticle::published()
            ->where('slug', $slug)
            ->forAudience($this->getUserAudience())
            ->firstOrFail();
        
        $this->article->incrementViewCount();
    }

    public function getTitle(): string|Htmlable
    {
        return $this->article?->title ?? 'Artigo não encontrado';
    }

    public function markAsHelpful()
    {
        if ($this->wasHelpful === null && $this->article) {
            $this->article->markAsHelpful();
            $this->wasHelpful = true;
            $this->dispatch('notify', 'Obrigado pelo seu feedback!');
        }
    }

    public function markAsNotHelpful()
    {
        if ($this->wasHelpful === null && $this->article) {
            $this->article->markAsNotHelpful();
            $this->wasHelpful = false;
            $this->dispatch('notify', 'Obrigado pelo seu feedback!');
        }
    }

    protected function getUserAudience()
    {
        $panel = filament()->getCurrentPanel();
        return $panel->getId() === 'admin' ? 'admin' : 'employee';
    }

    public function getRelatedArticles()
    {
        if (!$this->article) {
            return collect();
        }

        return HelpArticle::published()
            ->byCategory($this->article->category)
            ->forAudience($this->getUserAudience())
            ->where('id', '!=', $this->article->id)
            ->orderBy('sort_order')
            ->limit(3)
            ->get();
    }
}