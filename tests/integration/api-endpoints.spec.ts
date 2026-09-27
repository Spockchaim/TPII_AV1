import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { Papel } from '../../src/core/domain/Papel.js';

describe('API REST Fastify — Endpoints do Microsserviço CineBridge', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health deve retornar status 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', service: 'cinebridge-atv1' });
  });

  it('deve realizar o fluxo completo de criação, recomendação, análise e relatório via REST', async () => {
    // 1. Cadastrar Projeto
    const criaProjRes = await app.inject({
      method: 'POST',
      url: '/projetos',
      payload: {
        id: 'proj-api-test',
        genero: 'Documentário Social',
        duracao: 80,
        orcamento: 15000,
        prazo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
        papeisObrigatorios: [Papel.DIRETOR, Papel.DIRETOR_FOTOGRAFIA, Papel.EDITOR],
      },
    });

    expect(criaProjRes.statusCode).toBe(201);
    expect(criaProjRes.json().id).toBe('proj-api-test');

    // 2. Executar recomendação com SimilaridadeCosseno
    const recRes = await app.inject({
      method: 'POST',
      url: '/projetos/proj-api-test/recomendar?estrategia=cosseno',
    });

    expect(recRes.statusCode).toBe(200);
    const recData = recRes.json();
    expect(recData.estrategiaAplicada).toBe('SimilaridadeCosseno');
    expect(recData.equipe.membros).toHaveLength(3);

    // 3. Consultar análise via Visitor (Consistência e Compatibilidade)
    const analiseRes = await app.inject({
      method: 'GET',
      url: '/projetos/proj-api-test/analise',
    });

    expect(analiseRes.statusCode).toBe(200);
    const analiseData = analiseRes.json();
    expect(analiseData.consistente).toBe(true);
    expect(typeof analiseData.scoreCompatibilidade).toBe('string');

    // 4. Emitir relatório executivo via Visitor (GeradorRelatorio)
    const relatRes = await app.inject({
      method: 'GET',
      url: '/projetos/proj-api-test/relatorio',
    });

    expect(relatRes.statusCode).toBe(200);
    expect(relatRes.headers['content-type']).toContain('text/plain');
    expect(relatRes.payload).toContain('RELATÓRIO DO PROJETO: proj-api-test');
    expect(relatRes.payload).toContain('COMPOSIÇÃO DA EQUIPE');

    // 5. Responder convite (Aceite)
    const diretorId = recData.equipe.membros[0].profissional.id;
    const respConvite = await app.inject({
      method: 'POST',
      url: '/projetos/proj-api-test/convites/responder',
      payload: {
        profissionalId: diretorId,
        aceitou: true,
      },
    });

    expect(respConvite.statusCode).toBe(200);
    expect(respConvite.json().mensagem).toBe('Convite aceito.');

    // 6. Consultar trilha de auditoria estruturada em JSON (RNF04)
    const auditRes = await app.inject({
      method: 'GET',
      url: '/auditoria',
    });

    expect(auditRes.statusCode).toBe(200);
    const auditData = auditRes.json();
    expect(auditData.totalLogs).toBeGreaterThan(0);
    expect(auditData.logs[0]).toHaveProperty('timestamp');
    expect(auditData.logs[0]).toHaveProperty('tipo');
  });

  it('deve retornar 404 para projeto não existente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/projetos/nao-existe',
    });
    expect(res.statusCode).toBe(404);
  });
});

