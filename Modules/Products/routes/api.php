<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['api', 'auth:sanctum'])->prefix('products')->name('products.')->group(function () {
    // Rotas API do módulo de Produtos
});