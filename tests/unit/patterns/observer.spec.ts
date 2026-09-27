import { describe, it, expect } from 'vitest';
import { EventoRecomendacao } from '../../../src/core/patterns/observer/EventoRecomendacao.js';
import { NotificadorEmail } from '../../../src/core/patterns/observer/NotificadorEmail.js';
import { NotificadorInterno } from '../../../src/core/patterns/observer/NotificadorInterno.js';
import { AuditoriaRecomendacao } from '../../../src/core/patterns/observer/AuditoriaRecomendacao.js';

describe('Padrão Observer — Sistema de Notificações e Auditoria', () => {
  it('deve permitir que múltiplos observadores reajam de forma independente a um evento disparado', () => {
    const notificadorEmail = new NotificadorEmail();
    const notificadorInterno = new NotificadorInterno();
    const auditoria = new AuditoriaRecomendacao();

    const dados = new Map<string, any>();
    dados.set('projetoId', 'proj-123');
    dados.set('email', 'diretor@cinema.com');
    dados.set('totalMembros', 4);

    const evento = new EventoRecomendacao(
      'EQUIPE_RECOMENDADA',
      dados,
      'SistemaRecomendacao'
    );

    // Notifica os três observadores
    notificadorEmail.atualizar(evento);
    notificadorInterno.atualizar(evento);
    auditoria.atualizar(evento);

    // 1. NotificadorEmail gerou um e-mail com destinatário correto
    expect(notificadorEmail.emailsEnviados).toHaveLength(1);
    expect(notificadorEmail.emailsEnviados[0].destinatario).toBe('diretor@cinema.com');
    expect(notificadorEmail.emailsEnviados[0].assunto).toContain('EQUIPE_RECOMENDADA');

    // 2. NotificadorInterno gerou mensagem na plataforma não lida
    expect(notificadorInterno.mensagens).toHaveLength(1);
    expect(notificadorInterno.mensagens[0].tipo).toBe('EQUIPE_RECOMENDADA');
    expect(notificadorInterno.mensagens[0].lida).toBe(false);

    // 3. AuditoriaRecomendacao gravou log estruturado em JSON
    expect(auditoria.logs).toHaveLength(1);
    expect(auditoria.logs[0].tipo).toBe('EQUIPE_RECOMENDADA');
    expect(auditoria.logs[0].dados.projetoId).toBe('proj-123');

    const jsonExportado = auditoria.exportarLogsJSON();
    expect(jsonExportado).toContain('"projetoId": "proj-123"');
  });

  it('deve suportar múltiplos eventos acumulando histórico nos observadores', () => {
    const auditoria = new AuditoriaRecomendacao();
    const notificadorInterno = new NotificadorInterno();

    const evento1 = new EventoRecomendacao('CONVITE_ENVIADO', new Map([['profissionalId', 'p1']]));
    const evento2 = new EventoRecomendacao('CONVITE_ACEITO', new Map([['profissionalId', 'p1']]));

    [notificadorInterno, auditoria].forEach((obs) => {
      obs.atualizar(evento1);
      obs.atualizar(evento2);
    });

    expect(notificadorInterno.mensagens).toHaveLength(2);
    expect(auditoria.logs).toHaveLength(2);
    expect(auditoria.logs[0].tipo).toBe('CONVITE_ENVIADO');
    expect(auditoria.logs[1].tipo).toBe('CONVITE_ACEITO');
  });
});

