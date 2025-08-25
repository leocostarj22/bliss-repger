<?php

namespace Database\Seeders;

use App\Models\HelpArticle;
use Illuminate\Database\Seeder;

class HelpArticleSeeder extends Seeder
{
    public function run()
    {
        $articles = [
            // TICKETS
            [
                'title' => 'Como criar um novo ticket',
                'category' => 'tickets',
                'target_audience' => 'both',
                'excerpt' => 'Aprenda a criar tickets para reportar problemas ou solicitar suporte.',
                'content' => '<h2>Criando um Novo Ticket</h2>
                <p>Os tickets são a forma principal de comunicação para reportar problemas, solicitar suporte ou fazer perguntas.</p>
                
                <h3>Passo a Passo:</h3>
                <ol>
                    <li><strong>Acesse a seção Tickets</strong><br>No menu lateral, clique em "Tickets"</li>
                    <li><strong>Clique em "Novo Ticket"</strong><br>Botão localizado no canto superior direito</li>
                    <li><strong>Preencha as informações:</strong>
                        <ul>
                            <li><strong>Título:</strong> Seja claro e específico (ex: "Erro ao fazer login")</li>
                            <li><strong>Categoria:</strong> Selecione a categoria mais apropriada</li>
                            <li><strong>Prioridade:</strong> Escolha entre Baixa, Média, Alta ou Crítica</li>
                            <li><strong>Descrição:</strong> Detalhe o problema ou solicitação</li>
                        </ul>
                    </li>
                    <li><strong>Anexe arquivos (opcional)</strong><br>Clique em "Anexar" para adicionar screenshots ou documentos</li>
                    <li><strong>Clique em "Criar Ticket"</strong></li>
                </ol>
                
                <h3>Dicas Importantes:</h3>
                <ul>
                    <li>Seja específico no título e descrição</li>
                    <li>Inclua screenshots quando relevante</li>
                    <li>Escolha a prioridade adequada</li>
                    <li>Você receberá um número de ticket para acompanhamento</li>
                </ul>',
                'featured' => true,
                'sort_order' => 1,
                'is_published' => true,
            ],
            [
                'title' => 'Como acompanhar o status do meu ticket',
                'category' => 'tickets',
                'target_audience' => 'both',
                'excerpt' => 'Saiba como verificar o andamento e responder aos seus tickets.',
                'content' => '<h2>Acompanhando Seus Tickets</h2>
                <p>Após criar um ticket, você pode acompanhar seu progresso e interagir com a equipe de suporte.</p>
                
                <h3>Como Verificar o Status:</h3>
                <ol>
                    <li><strong>Acesse "Meus Tickets"</strong><br>No menu lateral, clique em "Tickets"</li>
                    <li><strong>Visualize a lista</strong><br>Todos os seus tickets aparecerão com status atual</li>
                    <li><strong>Clique no ticket desejado</strong><br>Para ver detalhes e histórico completo</li>
                </ol>
                
                <h3>Status Possíveis:</h3>
                <ul>
                    <li><strong>Aberto:</strong> Ticket criado, aguardando análise</li>
                    <li><strong>Em Andamento:</strong> Equipe trabalhando na solução</li>
                    <li><strong>Aguardando Resposta:</strong> Aguardando informações suas</li>
                    <li><strong>Resolvido:</strong> Problema solucionado</li>
                    <li><strong>Fechado:</strong> Ticket finalizado</li>
                </ul>
                
                <h3>Como Responder:</h3>
                <ol>
                    <li>Abra o ticket específico</li>
                    <li>Role até o final da página</li>
                    <li>Digite sua resposta no campo "Comentário"</li>
                    <li>Anexe arquivos se necessário</li>
                    <li>Clique em "Enviar Resposta"</li>
                </ol>',
                'featured' => false,
                'sort_order' => 2,
                'is_published' => true,
            ],
            
            // TAREFAS
            [
                'title' => 'Como criar e gerenciar tarefas',
                'category' => 'tasks',
                'target_audience' => 'both',
                'excerpt' => 'Aprenda a criar, organizar e acompanhar suas tarefas no sistema.',
                'content' => '<h2>Gerenciamento de Tarefas</h2>
                <p>O sistema de tarefas ajuda você a organizar e acompanhar suas atividades diárias.</p>
                
                <h3>Criando uma Nova Tarefa:</h3>
                <ol>
                    <li><strong>Acesse "Tarefas"</strong><br>No menu lateral, clique em "Tarefas"</li>
                    <li><strong>Clique em "Nova Tarefa"</strong></li>
                    <li><strong>Preencha os campos:</strong>
                        <ul>
                            <li><strong>Título:</strong> Nome da tarefa</li>
                            <li><strong>Descrição:</strong> Detalhes da atividade</li>
                            <li><strong>Data de Vencimento:</strong> Prazo para conclusão</li>
                            <li><strong>Prioridade:</strong> Baixa, Média ou Alta</li>
                            <li><strong>Categoria:</strong> Tipo de tarefa</li>
                        </ul>
                    </li>
                    <li><strong>Clique em "Salvar"</strong></li>
                </ol>
                
                <h3>Gerenciando Tarefas:</h3>
                <ul>
                    <li><strong>Marcar como Concluída:</strong> Clique no checkbox ao lado da tarefa</li>
                    <li><strong>Editar:</strong> Clique no ícone de lápis</li>
                    <li><strong>Excluir:</strong> Clique no ícone de lixeira</li>
                    <li><strong>Filtrar:</strong> Use os filtros por status, prioridade ou categoria</li>
                </ul>
                
                <h3>Dicas de Produtividade:</h3>
                <ul>
                    <li>Defina prazos realistas</li>
                    <li>Use prioridades para organizar seu dia</li>
                    <li>Revise suas tarefas regularmente</li>
                    <li>Marque como concluída assim que finalizar</li>
                </ul>',
                'featured' => true,
                'sort_order' => 3,
                'is_published' => true,
            ],
            
            // MENSAGENS
            [
                'title' => 'Como enviar e gerenciar mensagens internas',
                'category' => 'messages',
                'target_audience' => 'both',
                'excerpt' => 'Guia completo para comunicação interna através do sistema de mensagens.',
                'content' => '<h2>Sistema de Mensagens Internas</h2>
                <p>Use o sistema de mensagens para comunicação rápida e eficiente com colegas e equipes.</p>
                
                <h3>Enviando uma Mensagem:</h3>
                <ol>
                    <li><strong>Acesse "Mensagens"</strong><br>No menu lateral, clique em "Mensagens"</li>
                    <li><strong>Clique em "Nova Mensagem"</strong></li>
                    <li><strong>Selecione os destinatários:</strong>
                        <ul>
                            <li>Digite o nome do usuário</li>
                            <li>Selecione da lista de sugestões</li>
                            <li>Adicione múltiplos destinatários se necessário</li>
                        </ul>
                    </li>
                    <li><strong>Digite o assunto</strong><br>Seja claro e específico</li>
                    <li><strong>Escreva a mensagem</strong><br>Use o editor de texto rico</li>
                    <li><strong>Anexe arquivos (opcional)</strong></li>
                    <li><strong>Clique em "Enviar"</strong></li>
                </ol>
                
                <h3>Gerenciando Mensagens:</h3>
                <ul>
                    <li><strong>Caixa de Entrada:</strong> Mensagens recebidas</li>
                    <li><strong>Enviadas:</strong> Mensagens que você enviou</li>
                    <li><strong>Rascunhos:</strong> Mensagens não enviadas</li>
                    <li><strong>Lixeira:</strong> Mensagens excluídas</li>
                </ul>
                
                <h3>Recursos Avançados:</h3>
                <ul>
                    <li><strong>Marcar como Lida/Não Lida</strong></li>
                    <li><strong>Responder ou Encaminhar</strong></li>
                    <li><strong>Buscar mensagens</strong> por remetente ou conteúdo</li>
                    <li><strong>Organizar por data</strong> ou importância</li>
                </ul>',
                'featured' => true,
                'sort_order' => 4,
                'is_published' => true,
            ],
            
            // PERFIL E CONFIGURAÇÕES
            [
                'title' => 'Como atualizar seu perfil e configurações',
                'category' => 'general',
                'target_audience' => 'both',
                'excerpt' => 'Personalize seu perfil e ajuste as configurações do sistema.',
                'content' => '<h2>Configurações de Perfil</h2>
                <p>Mantenha suas informações atualizadas e configure o sistema conforme suas preferências.</p>
                
                <h3>Atualizando Informações Pessoais:</h3>
                <ol>
                    <li><strong>Clique no seu avatar</strong><br>No canto superior direito</li>
                    <li><strong>Selecione "Perfil"</strong></li>
                    <li><strong>Edite as informações:</strong>
                        <ul>
                            <li>Nome completo</li>
                            <li>Email</li>
                            <li>Telefone</li>
                            <li>Foto do perfil</li>
                        </ul>
                    </li>
                    <li><strong>Clique em "Salvar Alterações"</strong></li>
                </ol>
                
                <h3>Alterando Senha:</h3>
                <ol>
                    <li>Acesse "Perfil" → "Segurança"</li>
                    <li>Digite a senha atual</li>
                    <li>Digite a nova senha</li>
                    <li>Confirme a nova senha</li>
                    <li>Clique em "Alterar Senha"</li>
                </ol>
                
                <h3>Configurações de Notificação:</h3>
                <ul>
                    <li><strong>Email:</strong> Receber notificações por email</li>
                    <li><strong>Sistema:</strong> Notificações dentro da plataforma</li>
                    <li><strong>Frequência:</strong> Imediata, diária ou semanal</li>
                </ul>
                
                <h3>Preferências de Interface:</h3>
                <ul>
                    <li><strong>Tema:</strong> Claro ou escuro</li>
                    <li><strong>Idioma:</strong> Português ou outros disponíveis</li>
                    <li><strong>Fuso Horário:</strong> Configure conforme sua localização</li>
                </ul>',
                'featured' => false,
                'sort_order' => 5,
                'is_published' => true,
            ],
            
            // RELATÓRIOS (ADMIN)
            [
                'title' => 'Como gerar e interpretar relatórios',
                'category' => 'general',
                'target_audience' => 'admin',
                'excerpt' => 'Guia para administradores sobre geração e análise de relatórios do sistema.',
                'content' => '<h2>Sistema de Relatórios</h2>
                <p>Os relatórios fornecem insights valiosos sobre o desempenho e uso do sistema.</p>
                
                <h3>Tipos de Relatórios Disponíveis:</h3>
                <ul>
                    <li><strong>Tickets:</strong> Volume, tempo de resolução, categorias</li>
                    <li><strong>Usuários:</strong> Atividade, login, performance</li>
                    <li><strong>Tarefas:</strong> Conclusão, atrasos, produtividade</li>
                    <li><strong>Sistema:</strong> Uso de recursos, logs de atividade</li>
                </ul>
                
                <h3>Gerando Relatórios:</h3>
                <ol>
                    <li><strong>Acesse "Relatórios"</strong><br>No menu de administração</li>
                    <li><strong>Selecione o tipo de relatório</strong></li>
                    <li><strong>Configure os filtros:</strong>
                        <ul>
                            <li>Período (data inicial e final)</li>
                            <li>Departamentos específicos</li>
                            <li>Usuários ou categorias</li>
                        </ul>
                    </li>
                    <li><strong>Escolha o formato:</strong> PDF, Excel ou visualização online</li>
                    <li><strong>Clique em "Gerar Relatório"</strong></li>
                </ol>
                
                <h3>Interpretando os Dados:</h3>
                <ul>
                    <li><strong>Gráficos:</strong> Tendências e comparações visuais</li>
                    <li><strong>Tabelas:</strong> Dados detalhados e específicos</li>
                    <li><strong>Métricas:</strong> KPIs e indicadores de performance</li>
                    <li><strong>Alertas:</strong> Situações que requerem atenção</li>
                </ul>',
                'featured' => false,
                'sort_order' => 6,
                'is_published' => true,
            ],
            
            // FAQ GERAL
            [
                'title' => 'Perguntas Frequentes (FAQ)',
                'category' => 'faq',
                'target_audience' => 'both',
                'excerpt' => 'Respostas para as dúvidas mais comuns sobre o sistema.',
                'content' => '<h2>Perguntas Frequentes</h2>
                
                <h3>🔐 Login e Acesso</h3>
                <p><strong>P: Esqueci minha senha, como recuperar?</strong><br>
                R: Clique em "Esqueci minha senha" na tela de login e siga as instruções enviadas por email.</p>
                
                <p><strong>P: Posso acessar o sistema pelo celular?</strong><br>
                R: Sim, o sistema é responsivo e funciona em dispositivos móveis.</p>
                
                <h3>🎫 Tickets</h3>
                <p><strong>P: Quanto tempo leva para responder um ticket?</strong><br>
                R: Tickets críticos: 2h | Altos: 4h | Médios: 24h | Baixos: 48h</p>
                
                <p><strong>P: Posso editar um ticket após criá-lo?</strong><br>
                R: Você pode adicionar comentários, mas não editar o conteúdo original.</p>
                
                <h3>📋 Tarefas</h3>
                <p><strong>P: Posso compartilhar tarefas com outros usuários?</strong><br>
                R: Atualmente, cada usuário gerencia suas próprias tarefas.</p>
                
                <p><strong>P: Existe limite de tarefas que posso criar?</strong><br>
                R: Não há limite para criação de tarefas.</p>
                
                <h3>💬 Mensagens</h3>
                <p><strong>P: As mensagens têm limite de tamanho?</strong><br>
                R: Mensagens podem ter até 10.000 caracteres.</p>
                
                <p><strong>P: Posso enviar arquivos por mensagem?</strong><br>
                R: Sim, arquivos até 10MB são permitidos.</p>
                
                <h3>⚙️ Configurações</h3>
                <p><strong>P: Como altero o idioma do sistema?</strong><br>
                R: Acesse Perfil → Configurações → Idioma.</p>
                
                <p><strong>P: Posso desativar notificações por email?</strong><br>
                R: Sim, em Perfil → Notificações você pode configurar suas preferências.</p>',
                'featured' => true,
                'sort_order' => 7,
                'is_published' => true,
            ],
        ];

        foreach ($articles as $articleData) {
            HelpArticle::create($articleData);
        }
    }
}