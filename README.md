# Sistema de Gestão Empresarial - BlissRepGer

<div align="center">
  <img src="public/images/multicontact.png" alt="BlissRepGer Logo" width="200">
  
  [![Laravel](https://img.shields.io/badge/Laravel-12.x-red.svg)](https://laravel.com)
  [![Filament](https://img.shields.io/badge/Filament-3.3-orange.svg)](https://filamentphp.com)
  [![PHP](https://img.shields.io/badge/PHP-8.2+-blue.svg)](https://php.net)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## 📋 Descrição

O **BlissRepGer** é um sistema completo de gestão empresarial desenvolvido em Laravel com interface administrativa moderna utilizando Filament. O sistema oferece funcionalidades abrangentes para gestão de tickets, funcionários, empresas, departamentos e muito mais.

## 🚀 Tecnologias Utilizadas

- **Framework:** Laravel 12.x
- **Interface Admin:** Filament 3.3
- **PHP:** 8.2+
- **Base de Dados:** MySQL
- **Frontend:** Blade Templates + Filament UI
- **Testes:** Pest PHP
- **Qualidade de Código:** Laravel Pint

## 📦 Funcionalidades Principais

### 🎫 Sistema de Tickets
- ✅ Criação e gestão de tickets de suporte
- ✅ Sistema de prioridades (Baixa, Média, Alta, Urgente)
- ✅ Estados de ticket (Aberto, Em Progresso, Pendente, Resolvido, Fechado)
- ✅ Atribuição de tickets a utilizadores
- ✅ Sistema de comentários e anexos
- ✅ Filtros avançados e pesquisa
- ✅ Controlo de prazos e tickets em atraso

### 👥 Gestão de Utilizadores
- ✅ Sistema de autenticação e autorização
- ✅ Perfis de utilizador com fotos
- ✅ Gestão de permissões baseada em funções
- ✅ Registo de último login
- ✅ Integração com sistema de funcionários

### 🏢 Gestão Empresarial
- **Empresas:** Gestão completa de empresas clientes
- **Departamentos:** Organização por setores/departamentos
- **Funcionários:** Gestão de recursos humanos com dados completos
- **Categorias:** Classificação de tickets e serviços

### 🔐 Sistema de Permissões
| Função | Descrição | Permissões |
|--------|-----------|------------|
| **Administrador** | Acesso total ao sistema | Todas as permissões |
| **Gestor** | Gestão de equipas e relatórios | Tickets, Utilizadores, Relatórios |
| **Supervisor** | Supervisão de agentes e tickets | Tickets, Visualização de utilizadores |
| **Agente** | Gestão de tickets atribuídos | Tickets próprios |
| **Cliente** | Acesso limitado aos próprios tickets | Visualização própria |

### 📊 Funcionalidades Adicionais
- 📈 Dashboard com métricas e estatísticas
- 📎 Sistema de anexos para tickets
- 📄 Gestão de documentos de funcionários
- 🌐 Interface multilingue (Português)
- 🔔 Sistema de notificações
- 📊 Relatórios e análises

## 🛠️ Instalação

### Pré-requisitos
- PHP 8.2 ou superior
- Composer
- MySQL/MariaDB
- Node.js e NPM (para assets)

### Passos de Instalação

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd blissrepger
   ```

2. **Instale as dependências:**
   ```bash
   composer install
   npm install
   ```

3. **Configure o ambiente:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Configure a base de dados no arquivo `.env`:**
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=blissrepger
   DB_USERNAME=seu_usuario
   DB_PASSWORD=sua_senha
   ```

5. **Execute as migrações e seeders:**
   ```bash
   php artisan migrate --seed
   ```

6. **Crie o link simbólico para storage:**
   ```bash
   php artisan storage:link
   ```

7. **Compile os assets:**
   ```bash
   npm run build
   ```

8. **Inicie o servidor:**
   ```bash
   php artisan serve
   ```

## 🔧 Configuração

### Acesso Administrativo
Após a instalação, acesse `/admin` para entrar no painel administrativo.

### Configurações de Storage
O sistema utiliza storage público para imagens e anexos. Certifique-se de que o link simbólico foi criado corretamente.

### Configurações de Email
Configure as definições de email no arquivo `.env` para notificações:
```env
MAIL_MAILER=smtp
MAIL_HOST=seu_servidor_smtp
MAIL_PORT=587
MAIL_USERNAME=seu_email
MAIL_PASSWORD=sua_senha
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@blissrepger.com
MAIL_FROM_NAME="BlissRepGer"
```

## 📁 Estrutura do Projeto

### 🧪 Testes
Execute os testes com:

### 📝 Contribuição
1.
Faça fork do projeto
2.
Crie uma branch para sua feature (git checkout -b feature/nova-funcionalidade)
3.
Commit suas mudanças (git commit -am 'Adiciona nova funcionalidade')
4.
Push para a branch (git push origin feature/nova-funcionalidade)
5.
Abra um Pull Request

### 📄 Licença
Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

### 🆘 Suporte
Para suporte e dúvidas:

Abra uma issue no repositório
Consulte a documentação do Laravel
Consulte a documentação do Filament

### 🔄 Atualizações
Para manter o sistema atualizado:

Desenvolvido por Leonardo Silva - usando Laravel e Filament