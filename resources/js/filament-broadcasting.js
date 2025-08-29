// Listeners para eventos de broadcasting em tempo real no Filament
if (window.Echo) {
    // Configuração de notificações sonoras
    const playNotificationSound = (type = 'default') => {
        console.log('Tentando reproduzir som:', type); // DEBUG
        const audio = new Audio();
        switch (type) {
            case 'message':
                audio.src = '/sounds/message.mp3';
                break;
            case 'ticket':
                audio.src = '/sounds/ticket.mp3';
                break;
            case 'urgent':
                audio.src = '/sounds/urgent.mp3';
                break;
            default:
                audio.src = '/sounds/notification.mp3';
        }
        audio.volume = 0.5;
        console.log('Arquivo de som:', audio.src); // DEBUG
        audio.play()
            .then(() => console.log('Som reproduzido com sucesso!')) // DEBUG
            .catch(e => console.log('Erro ao reproduzir som:', e)); // DEBUG
    };

    // Função para mostrar notificação Filament
    const showFilamentNotification = (title, body, status = 'info', duration = 5000) => {
        new FilamentNotification()
            .title(title)
            .body(body)
            .status(status)
            .duration(duration)
            .send();
    };

    // Função para atualizar contadores em tempo real
    const updateCounters = () => {
        // Força atualização dos widgets que mostram contadores
        Livewire.emit('refreshComponent');
    };

    // 1. LISTENERS PARA MENSAGENS INTERNAS
    
    // Canal privado para mensagens do usuário atual
    window.Echo.private(`user.${window.authUserId}`)
        .listen('MessageSent', (e) => {
            console.log('Nova mensagem recebida:', e);
            
            showFilamentNotification(
                'Nova Mensagem',
                `De: ${e.message.sender_name} - ${e.message.subject}`,
                'info',
                6000
            );
            
            playNotificationSound('message');
            updateCounters();
            
            // Atualizar lista de mensagens se estiver na página de inbox
            if (window.location.pathname.includes('inbox')) {
                Livewire.emit('refreshInboxTable');
            }
        })
        .listen('MessageRead', (e) => {
            console.log('Mensagem marcada como lida:', e);
            updateCounters();
        });

    // 2. LISTENERS PARA TICKETS
    
    // Canal para tickets do departamento do usuário
    if (window.userDepartmentId) {
        window.Echo.private(`department.${window.userDepartmentId}`)
            .listen('TicketCreated', (e) => {
                console.log('Novo ticket criado:', e);
                
                showFilamentNotification(
                    'Novo Ticket',
                    `#${e.ticket.id} - ${e.ticket.subject}`,
                    'warning',
                    7000
                );
                
                playNotificationSound('ticket');
                updateCounters();
                
                // Atualizar tabela de tickets se estiver na página
                if (window.location.pathname.includes('tickets')) {
                    Livewire.emit('refreshTicketsTable');
                }
            })
            .listen('TicketStatusChanged', (e) => {
                console.log('Status do ticket alterado:', e);
                
                const statusColors = {
                    'open': 'info',
                    'in_progress': 'warning', 
                    'resolved': 'success',
                    'closed': 'success'
                };
                
                showFilamentNotification(
                    'Ticket Atualizado',
                    `#${e.ticket.id} - Status: ${e.ticket.status}`,
                    statusColors[e.ticket.status] || 'info'
                );
                
                updateCounters();
                
                if (window.location.pathname.includes('tickets')) {
                    Livewire.emit('refreshTicketsTable');
                }
            })
            .listen('TicketUpdated', (e) => {
                console.log('Ticket atualizado:', e);
                updateCounters();
                
                if (window.location.pathname.includes('tickets')) {
                    Livewire.emit('refreshTicketsTable');
                }
            });
    }

    // 3. LISTENERS PARA EVENTOS DE RH
    
    // Canal para eventos de RH (apenas para usuários autorizados)
    if (window.userCanAccessHR) {
        window.Echo.private('hr.employees')
            .listen('EmployeeCreated', (e) => {
                console.log('Novo funcionário cadastrado:', e);
                
                showFilamentNotification(
                    'Novo Funcionário',
                    `${e.employee.name} foi cadastrado`,
                    'success'
                );
                
                updateCounters();
            })
            .listen('EmployeeUpdated', (e) => {
                console.log('Funcionário atualizado:', e);
                updateCounters();
            });
            
        window.Echo.private('hr.payroll')
            .listen('PayrollGenerated', (e) => {
                console.log('Folha de pagamento gerada:', e);
                
                showFilamentNotification(
                    'Folha de Pagamento',
                    `Folha de ${e.payroll.period} gerada`,
                    'info'
                );
            })
            .listen('PayrollApproved', (e) => {
                console.log('Folha de pagamento aprovada:', e);
                
                showFilamentNotification(
                    'Folha Aprovada',
                    `Folha de ${e.payroll.period} foi aprovada`,
                    'success'
                );
            });
    }
    
    // Canal para eventos de férias do usuário
    window.Echo.private(`employee.${window.authUserId}`)
        .listen('VacationStatusChanged', (e) => {
            console.log('Status de férias alterado:', e);
            
            const statusMessages = {
                'approved': 'Suas férias foram aprovadas!',
                'rejected': 'Sua solicitação de férias foi rejeitada.',
                'cancelled': 'Suas férias foram canceladas.'
            };
            
            const statusColors = {
                'approved': 'success',
                'rejected': 'danger',
                'cancelled': 'warning'
            };
            
            showFilamentNotification(
                'Férias Atualizadas',
                statusMessages[e.vacation.status] || 'Status de férias alterado',
                statusColors[e.vacation.status] || 'info',
                8000
            );
            
            if (e.vacation.status === 'approved') {
                playNotificationSound('default');
            }
        })
        .listen('TimesheetClockIn', (e) => {
            console.log('Clock-in registrado:', e);
            
            showFilamentNotification(
                'Ponto Registrado',
                'Entrada registrada com sucesso',
                'success'
            );
        })
        .listen('TimesheetClockOut', (e) => {
            console.log('Clock-out registrado:', e);
            
            showFilamentNotification(
                'Ponto Registrado', 
                'Saída registrada com sucesso',
                'success'
            );
        });

    // 4. LISTENERS PARA POSTS ADMINISTRATIVOS
    
    // Canal da empresa para posts administrativos
    if (window.userCompanyId) {
        window.Echo.private(`company.${window.userCompanyId}`)
            .listen('PostPublished', (e) => {
                console.log('Novo post publicado:', e);
                
                showFilamentNotification(
                    'Novo Comunicado',
                    e.post.title,
                    'info',
                    10000
                );
                
                playNotificationSound('default');
                
                // Atualizar widget de posts se estiver no dashboard
                if (window.location.pathname.includes('admin') || window.location.pathname.includes('dashboard')) {
                    Livewire.emit('refreshPostsWidget');
                }
            })
            .listen('PostPinned', (e) => {
                console.log('Post fixado:', e);
                
                if (e.post.is_pinned) {
                    showFilamentNotification(
                        'Post Importante',
                        `${e.post.title} foi fixado`,
                        'warning',
                        8000
                    );
                    
                    playNotificationSound('urgent');
                }
            })
            .listen('PostUpdated', (e) => {
                console.log('Post atualizado:', e);
                
                // Atualizar widget de posts
                if (window.location.pathname.includes('admin') || window.location.pathname.includes('dashboard')) {
                    Livewire.emit('refreshPostsWidget');
                }
            });
    }

    // 5. CONFIGURAÇÕES GERAIS
    
    // Listener para erros de conexão
    window.Echo.connector.pusher.connection.bind('error', (err) => {
        console.error('Erro na conexão WebSocket:', err);
    });
    
    // Listener para reconexão
    window.Echo.connector.pusher.connection.bind('connected', () => {
        console.log('Conectado ao WebSocket');
    });
    
    // Listener para desconexão
    window.Echo.connector.pusher.connection.bind('disconnected', () => {
        console.log('Desconectado do WebSocket');
    });
    
    console.log('Listeners de broadcasting do Filament carregados com sucesso!');
} else {
    console.warn('Laravel Echo não está disponível. Verifique a configuração.');
}

// Função para definir variáveis globais do usuário (deve ser chamada no layout)
window.setUserData = function(userId, departmentId, companyId, canAccessHR = false) {
    window.authUserId = userId;
    window.userDepartmentId = departmentId;
    window.userCompanyId = companyId;
    window.userCanAccessHR = canAccessHR;
};