<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Categorias Financeiras (Hierárquicas)
        Schema::create('finance_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->index(); // Multi-tenancy
            $table->foreignId('parent_id')->nullable()->constrained('finance_categories')->nullOnDelete();
            $table->string('name');
            $table->string('type'); // 'income' | 'expense'
            $table->string('color')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Centros de Custo
        Schema::create('finance_cost_centers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->index();
            $table->string('name');
            $table->string('code')->nullable(); // Ex: 1.02
            $table->timestamps();
            $table->softDeletes();
        });

        // 3. Contas Bancárias
        Schema::create('finance_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->index();
            $table->string('name'); // Ex: Banco Santander, Caixa Pequeno
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('currency')->default('EUR');
            $table->decimal('initial_balance', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0); // Atualizado via triggers/events
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 4. Lançamentos (Transactions) - O Coração
        Schema::create('finance_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->index();
            
            $table->string('description');
            $table->text('notes')->nullable();
            
            // Valores e Datas
            $table->decimal('amount', 15, 2);
            $table->date('due_date'); // Vencimento
            $table->date('paid_at')->nullable(); // Pagamento Realizado
            
            // Classificação
            $table->string('type'); // 'income' | 'expense'
            $table->string('status')->default('pending'); // pending, paid, late, cancelled
            
            // Relacionamentos
            $table->foreignId('category_id')->constrained('finance_categories');
            $table->foreignId('cost_center_id')->nullable()->constrained('finance_cost_centers');
            $table->foreignId('bank_account_id')->nullable()->constrained('finance_bank_accounts'); // Só preenchido ao pagar
            
            // Polimórfico para Payer/Payee (Cliente, Fornecedor, Contato)
            $table->nullableMorphs('payer'); 
            
            // Polimórfico para Origem (Venda, Projeto, Contrato)
            $table->nullableMorphs('reference');
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_transactions');
        Schema::dropIfExists('finance_bank_accounts');
        Schema::dropIfExists('finance_cost_centers');
        Schema::dropIfExists('finance_categories');
    }
};