<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->prefix('products')->name('products.')->group(function () {
    // As rotas web do módulo de Produtos vão aqui (Filament e páginas públicas, se necessário)
});