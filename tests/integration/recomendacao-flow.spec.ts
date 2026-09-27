import { describe, it, expect } from 'vitest';
import { Projeto } from '../../src/core/domain/Projeto.js';
import { Profissional } from '../../src/core/domain/Profissional.js';
import { Papel } from '../../src/core/domain/Papel.js';
import { VetorCompetencia } from '../../src/core/domain/value-objects/VetorCompetencia.js';
import { Intervalo } from '../../src/core/domain/value-objects/Intervalo.js';
import { Competencia } from '../../src/core/domain/Competencia.js';
import { Avaliacao } from '../../src/core/domain/Avaliacao.js';
import { SistemaRecomendacao } from '../../src/core/services/SistemaRecomendacao.js';
import { SimilaridadeCosseno } from '../../src/core/patterns/strategy/SimilaridadeCosseno.js';
import { RegrasOrcamento } from '../../src/core/patterns/strategy/RegrasOrcamento.js';
import { NotificadorEmail } from '../../src/core/patterns/observer/NotificadorEmail.js';
import { NotificadorInterno } from '../../src/core/patterns/observer/NotificadorInterno.js';
import { AuditoriaRecomendacao } from '../../src/core/patterns/observer/AuditoriaRecomendacao.js';

describe('Integração de Negócio — Ciclo Completo de Recomendação e Orquestração', () => {
  const futuro = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90);
  const disp = new Intervalo(new Date(), futuro);

  // Criando base rica de profissionais
  const diretorA = new Profissional(
    'dir-1',
    'Sofia Coppola',
    new VetorCompetencia([new Competencia(Papel.DIRETOR, 10)]),
    disp,
    4000,
    [new Avaliacao(5.0, 'Excelente')]
  );

  const diretorB = new Profissional(
    'dir-2',
    'Kleber Mendonça',
    new VetorCompetencia([new Competencia(Papel.DIRETOR, 9)]),
    disp,
    2500,
    [new Avaliacao(4.8, 'Ótimo')]
  );

  const fotografoA = new Profissional(
    'fot-1',
    'Roger Deakins',
    new VetorCompetencia([new Competencia(Papel.DIRETOR_FOTOGRAFIA, 10)]),
    disp,
    5000,
    [new Avaliacao(5.0, 'Impecável')]
  );

  const fotografoB = new Profissional(
    'fot-2',
    'César Charlone',
    new VetorCompetencia([new Competencia(Papel.DIRETOR_FOTOGRAFIA, 8)]),
    disp,
    2000,
    [new Avaliacao(4.5, 'Criativo')]
  );

  const editorA = new Profissional(
    'edit-1',
    'Walter Murch',
    new VetorCompetencia([new Competencia(Papel.EDITOR, 10)]),
    disp,
    3000,
    [new Avaliacao(5.0, 'Lenda')]
  );

  const editorB = new Profissional(
    'edit-2',
    'Affonso Gonçalves',
    new VetorCompetencia([new Competencia(Papel.EDITOR, 8)]),
    disp,
    1500,
    [new Avaliacao(4.2, 'Rápido')]
  );

  const baseProfissionais = [
    diretorA,
    diretorB,
    fotografoA,
    fotografoB,
    editorA,
    editorB,
  ];

  it('deve orquestrar a equipe completa, notificar os três observadores e iniciar o status EM_FORMACAO', () => {
    const emailObs = new NotificadorEmail();
    const internoObs = new NotificadorInterno();
    const auditoriaObs = new AuditoriaRecomendacao();

    const sistema = new SistemaRecomendacao(
      new SimilaridadeCosseno(),
      undefined,
      baseProfissionais
    );

    sistema.adicionarObservador(emailObs);
    sistema.adicionarObservador(internoObs);
    sistema.adicionarObservador(auditoriaObs);

    const projeto = new Projeto(
      'proj-longa-01',
      'Ficção Dramática',
      115,
      20000,
      futuro,
      [Papel.DIRETOR, Papel.DIRETOR_FOTOGRAFIA, Papel.EDITOR]
    );

    const equipe = sistema.executarRecomendacao(projeto);

    expect(equipe).toBeDefined();
    expect(equipe.membros).toHaveLength(3);
    expect(equipe.status).toBe('EM_FORMACAO');

    // Verifica que cada observador reagiu
    expect(emailObs.emailsEnviados.length).toBeGreaterThanOrEqual(3); // convite para os membros
    expect(internoObs.mensagens.length).toBeGreaterThanOrEqual(1);
    expect(auditoriaObs.logs.length).toBeGreaterThanOrEqual(4); // 1 equipe recomendada + 3 convites enviados
  });

  it('deve suportar troca dinâmica de estratégia via definirEstrategia()', () => {
    const sistema = new SistemaRecomendacao(
      new SimilaridadeCosseno(),
      undefined,
      baseProfissionais
    );

    const projeto = new Projeto('proj-orcamento', 'Documentário', 60, 6000, futuro, [
      Papel.DIRETOR,
      Papel.DIRETOR_FOTOGRAFIA,
    ]);

    // 1. Executa com Cosseno -> Sofia (4000) e Roger (5000)
    const equipeCosseno = sistema.executarRecomendacao(projeto);
    expect(equipeCosseno.obterMembroPorPapel(Papel.DIRETOR)?.profissional.id).toBe('dir-1');

    // 2. Troca dinâmica para RegrasOrcamento -> Kleber (2500) e César (2000)
    sistema.definirEstrategia(new RegrasOrcamento());
    const equipeOrcamento = sistema.executarRecomendacao(projeto);
    expect(equipeOrcamento.obterMembroPorPapel(Papel.DIRETOR)?.profissional.id).toBe('dir-2');
    expect(equipeOrcamento.obterMembroPorPapel(Papel.DIRETOR_FOTOGRAFIA)?.profissional.id).toBe('fot-2');
  });

  it('deve realizar substituição pontual mantendo os demais membros fixos (RF04)', () => {
    const auditoriaObs = new AuditoriaRecomendacao();
    const sistema = new SistemaRecomendacao(
      new SimilaridadeCosseno(),
      undefined,
      baseProfissionais
    );
    sistema.adicionarObservador(auditoriaObs);

    const projeto = new Projeto('proj-sub', 'Suspense', 90, 15000, futuro, [
      Papel.DIRETOR,
      Papel.EDITOR,
    ]);

    sistema.executarRecomendacao(projeto);

    // Membro original era Sofia Coppola (dir-1)
    expect(projeto.equipe?.obterMembroPorPapel(Papel.DIRETOR)?.profissional.id).toBe('dir-1');
    const editorOriginal = projeto.equipe?.obterMembroPorPapel(Papel.EDITOR)?.profissional.id;

    // Produtor substitui pontualmente o Diretor por Kleber Mendonça (dir-2)
    const substituiu = sistema.substituirMembro(projeto, Papel.DIRETOR, diretorB);
    expect(substituiu).toBe(true);

    // O diretor mudou para dir-2
    expect(projeto.equipe?.obterMembroPorPapel(Papel.DIRETOR)?.profissional.id).toBe('dir-2');
    // O editor permaneceu rigorosamente inalterado!
    expect(projeto.equipe?.obterMembroPorPapel(Papel.EDITOR)?.profissional.id).toBe(editorOriginal);

    // Auditoria registrou o evento MEMBRO_SUBSTITUIDO
    const logSub = auditoriaObs.logs.find((l) => l.tipo === 'MEMBRO_SUBSTITUIDO');
    expect(logSub).toBeDefined();
    expect(logSub?.dados.papel).toBe(Papel.DIRETOR);
  });

  it('deve tratar recusa de convite acionando substituição automática (RF06)', () => {
    const emailObs = new NotificadorEmail();
    const sistema = new SistemaRecomendacao(
      new SimilaridadeCosseno(),
      undefined,
      baseProfissionais
    );
    sistema.adicionarObservador(emailObs);

    const projeto = new Projeto('proj-convite', 'Ação', 100, 15000, futuro, [
      Papel.DIRETOR,
    ]);

    sistema.executarRecomendacao(projeto);

    // Sofia Coppola (dir-1) foi recomendada
    expect(projeto.equipe?.obterMembroPorPapel(Papel.DIRETOR)?.profissional.id).toBe('dir-1');

    // Sofia recusa o convite!
    sistema.responderConvite(projeto, 'dir-1', false);

    // O sistema automaticamente substituiu pelo próximo diretor disponível (dir-2)
    expect(projeto.equipe?.obterMembroPorPapel(Papel.DIRETOR)?.profissional.id).toBe('dir-2');

    // Notificador de email registrou convite para o substituto
    const conviteSubstituto = emailObs.emailsEnviados.some((e) =>
      e.corpo.includes('dir-2')
    );
    expect(conviteSubstituto).toBe(true);
  });

  it('deve consolidar a equipe quando todos os membros aceitarem o convite (RF07)', () => {
    const auditoriaObs = new AuditoriaRecomendacao();
    const sistema = new SistemaRecomendacao(
      new SimilaridadeCosseno(),
      undefined,
      baseProfissionais
    );
    sistema.adicionarObservador(auditoriaObs);

    const projeto = new Projeto('proj-consenso', 'Curta', 20, 10000, futuro, [
      Papel.DIRETOR,
      Papel.EDITOR,
    ]);

    sistema.executarRecomendacao(projeto);

    const idDiretor = projeto.equipe?.obterMembroPorPapel(Papel.DIRETOR)?.profissional.id!;
    const idEditor = projeto.equipe?.obterMembroPorPapel(Papel.EDITOR)?.profissional.id!;

    expect(projeto.equipe?.status).toBe('EM_FORMACAO');

    // Diretor aceita
    sistema.responderConvite(projeto, idDiretor, true);
    expect(projeto.equipe?.status).toBe('EM_FORMACAO');

    // Editor aceita -> agora TODOS confirmaram!
    sistema.responderConvite(projeto, idEditor, true);
    expect(projeto.equipe?.status).toBe('CONSOLIDADA');

    // Verifica emissão do evento de integração externa
    const eventoConsolidado = auditoriaObs.logs.find(
      (l) => l.tipo === 'EQUIPE_CONSOLIDADA'
    );
    expect(eventoConsolidado).toBeDefined();
    expect(eventoConsolidado?.dados.totalMembros).toBe(2);
  });

  it('deve demonstrar tolerância a falhas ativando base de dados de fallback em cache (RNF05)', () => {
    const auditoriaObs = new AuditoriaRecomendacao();
    const sistema = new SistemaRecomendacao(
      new SimilaridadeCosseno(),
      undefined,
      baseProfissionais // Cache local de fallback
    );
    sistema.adicionarObservador(auditoriaObs);

    const projeto = new Projeto('proj-resiliencia', 'Suspense', 80, 12000, futuro, [
      Papel.DIRETOR,
    ]);

    // Simula serviço externo caindo / fora do ar
    const servicoExternoComFalha = () => {
      throw new Error('Timeout de conexão com o microsserviço de profissionais');
    };

    // O sistema não deve quebrar: deve recorrer ao cache local de fallback e registrar o incidente
    const equipe = sistema.executarRecomendacao(projeto, servicoExternoComFalha);

    expect(equipe).toBeDefined();
    expect(equipe.membros).toHaveLength(1);

    const logFalha = auditoriaObs.logs.find(
      (l) => l.tipo === 'FALHA_CATALOGO_PROFISSIONAIS'
    );
    expect(logFalha).toBeDefined();
    expect(logFalha?.dados.acao).toContain('fallback');
  });
});

