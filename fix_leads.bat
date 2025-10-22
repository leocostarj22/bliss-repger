@echo off
echo Limpando caches...
php artisan optimize:clear
php artisan config:clear
php artisan view:clear
php artisan route:clear

echo Executando migrations...
php artisan module:migrate CRM

echo Otimizando aplicacao...
php artisan config:cache
php artisan route:cache

echo Concluido! Teste agora a funcionalidade de apagar leads.
pause