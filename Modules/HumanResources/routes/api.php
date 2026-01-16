<?php

use Illuminate\Support\Facades\Route;
use Modules\HumanResources\Http\Controllers\HumanResourcesController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('humanresources', HumanResourcesController::class)->names('humanresources');
});
