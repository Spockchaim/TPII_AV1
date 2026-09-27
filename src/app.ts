import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
import fastify, { FastifyInstance } from 'fastify';
import { Projeto } from './core/domain/Projeto.js';
import { Profissional } from './core/domain/Profissional.js';
import { Papel } from './core/domain/Papel.js';
import { VetorCompetencia } from './core/domain/value-objects/VetorCompetencia.js';
import { Intervalo } from './core/domain/value-objects/Intervalo.js';
import { Competencia } from './core/domain/Competencia.js';
import { Avaliacao } from './core/domain/Avaliacao.js';
import { SistemaRecomendacao } from './core/services/SistemaRecomendacao.js';
import { SimilaridadeCosseno } from './core/patterns/strategy/SimilaridadeCosseno.js';
import { FiltragemColaborativa } from './core/patterns/strategy/FiltragemColaborativa.js';
import { RegrasOrcamento } from './core/patterns/strategy/RegrasOrcamento.js';
import { NotificadorEmail } from './core/patterns/observer/NotificadorEmail.js';
import { NotificadorInterno } from './core/patterns/observer/NotificadorInterno.js';
import { AuditoriaRecomendacao } from './core/patterns/observer/AuditoriaRecomendacao.js';
import { ValidadorConsistencia } from './core/patterns/visitor/ValidadorConsistencia.js';
import { CalculadorCompatibilidade } from './core/patterns/visitor/CalculadorCompatibilidade.js';
import { GeradorRelatorio } from './core/patterns/visitor/GeradorRelatorio.js';

export interface AppDependencies {
  sistema?: SistemaRecomendacao;
  projetos?: Map<string, Projeto>;
  profissionais?: Profissional[];
  auditoria?: AuditoriaRecomendacao;
}

export function buildApp(dependencies: AppDependencies = {}): FastifyInstance {
  const app = fastify({ logger: false });

  // Repositório em memória para projetos
  const projetosRepo = dependencies.projetos ?? new Map<string, Projeto>();

  // Base inicial de profissionais de demonstração
  const profissionaisBase = dependencies.profissionais ?? [
    new Profissional(
      'prof-1',
      'Fernanda Montenegro',
      new VetorCompetencia([new Competencia(Papel.DIRETOR, 10)]),
      new Intervalo(new Date(), new Date(Date.now() + 1000 * 60 * 60 * 24 * 180)),
      3500,
      [new Avaliacao(5.0, 'Excelente')]
    ),
    new Profissional(
      'prof-2',
      'Walter Salles',
      new VetorCompetencia([new Competencia(Papel.DIRETOR, 9)]),
      new Intervalo(new Date(), new Date(Date.now() + 1000 * 60 * 60 * 24 * 180)),
      2500,
      [new Avaliacao(4.8, 'Ótimo')]
    ),
    new Profissional(
      'prof-3',
      'César Charlone',
      new VetorCompetencia([new Competencia(Papel.DIRETOR_FOTOGRAFIA, 10)]),
      new Intervalo(new Date(), new Date(Date.now() + 1000 * 60 * 60 * 24 * 180)),
      3000,
      [new Avaliacao(5.0, 'Incrível fotografia')]
    ),
    new Profissional(
      'prof-4',
      'Affonso Gonçalves',
      new VetorCompetencia([new Competencia(Papel.EDITOR, 9)]),
      new Intervalo(new Date(), new Date(Date.now() + 1000 * 60 * 60 * 24 * 180)),
      1800,
      [new Avaliacao(4.6, 'Montagem precisa')]
    ),
    new Profissional(
      'prof-5',
      'Beto Ferraz',
      new VetorCompetencia([new Competencia(Papel.SONOPLASTA, 8)]),
      new Intervalo(new Date(), new Date(Date.now() + 1000 * 60 * 60 * 24 * 180)),
      1200,
      [new Avaliacao(4.3, 'Ótima mixagem')]
    ),
  ];

  // Observadores
  const auditoria = dependencies.auditoria ?? new AuditoriaRecomendacao();
  const notificadorEmail = new NotificadorEmail();
  const notificadorInterno = new NotificadorInterno();

  // Sistema de Recomendação central
  const sistema = dependencies.sistema ?? new SistemaRecomendacao(
    new SimilaridadeCosseno(),
    undefined,
    profissionaisBase
  );
  sistema.adicionarObservador(auditoria);
  sistema.adicionarObservador(notificadorEmail);
  sistema.adicionarObservador(notificadorInterno);

  // Visitantes
  const validador = new ValidadorConsistencia();
  const calculador = new CalculadorCompatibilidade();
  const geradorRelatorio = new GeradorRelatorio();

  // --- ROTAS DA API ---

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', service: 'cinebridge-atv1' };
  });

  // POST /projetos - Cadastra um novo projeto
  app.post('/projetos', async (request, reply) => {
    const body = request.body as {
      id?: string;
      genero: string;
      duracao: number;
      orcamento: number;
      prazo: string;
      papeisObrigatorios: Papel[];
      tipoCaptacao?: string;
      localizacao?: string;
    };

    if (!body.genero || !body.duracao || !body.orcamento || !body.prazo || !body.papeisObrigatorios) {
      return reply.status(400).send({
        error: 'Campos obrigatórios: genero, duracao, orcamento, prazo, papeisObrigatorios',
      });
    }

    const id = body.id ?? `proj-${Date.now()}`;
    const projeto = new Projeto(
      id,
      body.genero,
      body.duracao,
      body.orcamento,
      new Date(body.prazo),
      body.papeisObrigatorios,
      body.tipoCaptacao ?? "ficção",
      body.localizacao ?? "Global"
    );

    projetosRepo.set(id, projeto);

    try {
      await prisma.projeto.create({
        data: {
          id: projeto.id,
          genero: projeto.genero,
          duracao: projeto.duracao,
          orcamento: projeto.orcamento,
          prazo: projeto.prazo,
          tipoCaptacao: projeto.tipoCaptacao,
          localizacao: projeto.localizacao,
          papeisObrigatorios: { create: projeto.papeisObrigatorios.map(p => ({ papel: p.papel, peso: p.peso })) }
        }
      });
    } catch (err) {
      console.warn('Aviso: Falha ao salvar projeto no DB físico:', String(err));
    }

    return reply.status(201).send({
      id: projeto.id,
      genero: projeto.genero,
      duracao: projeto.duracao,
      orcamento: projeto.orcamento,
      prazo: projeto.prazo.toISOString(),
      tipoCaptacao: projeto.tipoCaptacao,
      localizacao: projeto.localizacao,
      papeisObrigatorios: projeto.papeisObrigatorios,
    });
  });

app.get('/', async () => {
    return {
      status: 'online',
      mensagem: 'Bem-vindo à API do CineBridge',
      descricao: 'Sistema inteligente de recomendação e alocação de equipes para projetos audiovisuais.',
      versao: '1.0.0',
      rotasDisponiveis: [
        { metodo: 'GET', rota: '/health', descricao: 'Verifica a saúde do serviço' },
        { metodo: 'POST', rota: '/projetos', descricao: 'Cadastra um novo projeto' },
        { metodo: 'GET', rota: '/projetos/:id', descricao: 'Consulta projeto e equipe alocada' },
        { metodo: 'POST', rota: '/projetos/:id/recomendar', descricao: 'Executa o algoritmo de recomendação de equipe' },
        { metodo: 'POST', rota: '/projetos/:id/equipe/substituir', descricao: 'Realiza substituição pontual de membro da equipe' },
        { metodo: 'POST', rota: '/projetos/:id/convites/responder', descricao: 'Gerencia aceite ou recusa de convite por profissional' },
        { metodo: 'GET', rota: '/projetos/:id/relatorio', descricao: 'Gera relatório executivo detalhado do projeto' },
        { metodo: 'GET', rota: '/projetos/:id/analise', descricao: 'Avaliações transversais de consistência e compatibilidade' },
        { metodo: 'PATCH', rota: '/projetos/:id', descricao: 'Edição universal do projeto com reavaliação automática' },
        { metodo: 'GET', rota: '/auditoria', descricao: 'Consulta a trilha de auditoria em logs estruturados' },
      ],
    };
  });


  // GET /profissionais - Lista todos os profissionais cadastrados (Catálogo)
  app.get('/profissionais', async (_request, reply) => {
    // Busca do banco de dados para refletir as inserções do seed
    try {
      const profissionaisDb = await prisma.profissional.findMany({
        include: {
          competencias: true,
          avaliacoes: true,
          historicoProjetos: true,
          especialidades: true
        }
      });
      return reply.status(200).send({
        total: profissionaisDb.length,
        profissionais: profissionaisDb
      });
    } catch (e: any) {
      return reply.status(500).send({ error: String(e) });
    }
  });

  // GET /projetos - Lista todos os projetos cadastrados
  app.get('/projetos', async (_request, reply) => {
    try {
      const projetosDb = await prisma.projeto.findMany({
        include: {
          papeisObrigatorios: true,
          equipes: {
            include: { membros: { include: { profissional: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return reply.status(200).send({
        total: projetosDb.length,
        projetos: projetosDb
      });
    } catch (e: any) {
      return reply.status(500).send({ error: String(e) });
    }
  });

  // GET /projetos/:id - Consulta projeto e equipe
  app.get('/projetos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const projeto = projetosRepo.get(id);

    if (!projeto) {
      return reply.status(404).send({ error: `Projeto '${id}' não encontrado.` });
    }

    return {
      id: projeto.id,
      genero: projeto.genero,
      duracao: projeto.duracao,
      orcamento: projeto.orcamento,
      prazo: projeto.prazo.toISOString(),
      papeisObrigatorios: projeto.papeisObrigatorios,
      equipe: projeto.equipe
        ? {
            id: projeto.equipe.id,
            status: projeto.equipe.status,
            custoTotal: projeto.equipe.custoTotal(),
            todosConfirmados: projeto.equipe.todosConfirmados(),
            membros: projeto.equipe.membros.map((m) => ({
              papel: m.papel,
              confirmado: m.confirmado,
              profissional: {
                id: m.profissional.id,
                nome: m.profissional.nome,
                precoMedio: m.profissional.precoMedio,
                nivelHabilidade: m.profissional.competencias.obterNivel(m.papel),
              },
            })),
          }
        : null,
    };
  });

  // POST /projetos/:id/recomendar - Executa recomendação com escolha dinâmica de estratégia
  app.post('/projetos/:id/recomendar', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { estrategia?: string };
    const projeto = projetosRepo.get(id);

    if (!projeto) {
      return reply.status(404).send({ error: `Projeto '${id}' não encontrado.` });
    }

    // Configura estratégia dinamicamente (Strategy GoF)
    const estrategiaNome = query.estrategia?.toLowerCase() ?? 'cosseno';
    if (estrategiaNome === 'orcamento') {
      sistema.definirEstrategia(new RegrasOrcamento());
    } else if (estrategiaNome === 'colaborativa') {
      sistema.definirEstrategia(new FiltragemColaborativa());
    } else {
      sistema.definirEstrategia(new SimilaridadeCosseno());
    }

    const equipe = sistema.executarRecomendacao(projeto);

    return reply.status(200).send({
      mensagem: 'Equipe recomendada com sucesso.',
      estrategiaAplicada: sistema.estrategiaAtual.constructor.name,
      equipe: {
        id: equipe.id,
        status: equipe.status,
        custoTotal: equipe.custoTotal(),
        membros: equipe.membros.map((m) => ({
          papel: m.papel,
          confirmado: m.confirmado,
          profissional: {
            id: m.profissional.id,
            nome: m.profissional.nome,
            precoMedio: m.profissional.precoMedio,
                nivelHabilidade: m.profissional.competencias.obterNivel(m.papel),
          },
        })),
      },
    });
  });

  // POST /projetos/:id/equipe/substituir - Substituição pontual de membro (RF04)
  app.post('/projetos/:id/equipe/substituir', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { papel: Papel; novoProfissionalId?: string };
    const projeto = projetosRepo.get(id);

    if (!projeto || !projeto.equipe) {
      return reply.status(404).send({ error: `Projeto ou equipe '${id}' não encontrado.` });
    }

    if (!body.papel) {
      return reply.status(400).send({ error: 'Campo obrigatório: papel' });
    }

    let novoProfissional: Profissional | undefined;
    if (body.novoProfissionalId) {
      novoProfissional = profissionaisBase.find((p) => p.id === body.novoProfissionalId);
      if (!novoProfissional) {
        return reply.status(404).send({ error: `Profissional '${body.novoProfissionalId}' não encontrado.` });
      }
    }

    try {
      const sucesso = sistema.substituirMembro(projeto, body.papel, novoProfissional);
      return reply.status(200).send({
        mensagem: 'Membro substituído com sucesso mantendo os demais membros fixos.',
        sucesso,
        equipe: {
          id: projeto.equipe.id,
          membros: projeto.equipe.membros.map((m) => ({
            papel: m.papel,
            confirmado: m.confirmado,
            profissional: {
              id: m.profissional.id,
              nome: m.profissional.nome,
              precoMedio: m.profissional.precoMedio,
                nivelHabilidade: m.profissional.competencias.obterNivel(m.papel),
            },
          })),
        },
      });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Falha na substituição.' });
    }
  });

  // POST /projetos/:id/convites/responder - Aceite ou recusa de convite (RF06)
  app.post('/projetos/:id/convites/responder', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { profissionalId: string; aceitou: boolean };
    const projeto = projetosRepo.get(id);

    if (!projeto || !projeto.equipe) {
      return reply.status(404).send({ error: `Projeto '${id}' não encontrado ou sem equipe.` });
    }

    if (!body.profissionalId || typeof body.aceitou !== 'boolean') {
      return reply.status(400).send({ error: 'Campos obrigatórios: profissionalId, aceitou (boolean)' });
    }

    try {
      sistema.responderConvite(projeto, body.profissionalId, body.aceitou);
      return {
        mensagem: body.aceitou ? 'Convite aceito.' : 'Convite recusado e substituto alocado automaticamente.',
        equipeStatus: projeto.equipe.status,
        todosConfirmados: projeto.equipe.todosConfirmados(),
      };
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Erro ao responder convite.' });
    }
  });

  // GET /projetos/:id/relatorio - Relatório executivo emitido via Visitor (Padrão Visitor)
  app.get('/projetos/:id/relatorio', async (request, reply) => {
    const { id } = request.params as { id: string };
    const projeto = projetosRepo.get(id);

    if (!projeto) {
      return reply.status(404).send({ error: `Projeto '${id}' não encontrado.` });
    }

    const relatorio: string = projeto.aceita(geradorRelatorio);
    return reply.type('text/plain; charset=utf-8').send(relatorio);
  });

  // GET /projetos/:id/analise - Avaliações transversais via Visitor (Consistência e Compatibilidade)
  app.get('/projetos/:id/analise', async (request, reply) => {
    const { id } = request.params as { id: string };
    const projeto = projetosRepo.get(id);

    if (!projeto) {
      return reply.status(404).send({ error: `Projeto '${id}' não encontrado.` });
    }

    const consistente: boolean = projeto.aceita(validador);
    const compatibilidade: number = projeto.aceita(calculador);

    return {
      projetoId: projeto.id,
      consistente,
      scoreCompatibilidade: `${compatibilidade}%`,
    };
  });


  // PATCH /projetos/:id - Edição universal do projeto (acione reavaliação se alterar orçamento/prazo)
  app.patch('/projetos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const projeto = projetosRepo.get(id);

    if (!projeto) {
      return reply.status(404).send({ error: `Projeto '${id}' não encontrado.` });
    }

    let precisaReavaliar = false;
    const updateData: any = {};

    if (body.genero) {
      (projeto as any)._genero = body.genero;
      updateData.genero = body.genero;
    }
    if (body.duracao) {
      (projeto as any)._duracao = body.duracao;
      updateData.duracao = body.duracao;
    }
    if (body.tipoCaptacao) {
      (projeto as any)._tipoCaptacao = body.tipoCaptacao;
      updateData.tipoCaptacao = body.tipoCaptacao;
    }
    if (body.localizacao) {
      (projeto as any)._localizacao = body.localizacao;
      updateData.localizacao = body.localizacao;
    }

    // Regras de negócio sensíveis que afetam a equipe montada (RF05)
    if (body.orcamento && body.orcamento !== projeto.orcamento) {
      (projeto as any)._orcamento = body.orcamento;
      updateData.orcamento = body.orcamento;
      precisaReavaliar = true;
    }
    
    if (body.prazo) {
      const novoPrazo = new Date(body.prazo);
      if (novoPrazo.getTime() !== projeto.prazo.getTime()) {
        (projeto as any)._prazo = novoPrazo;
        updateData.prazo = novoPrazo;
        precisaReavaliar = true;
      }
    }

    // Salva no banco as edições
    if (Object.keys(updateData).length > 0) {
      try {
        await prisma.projeto.update({
          where: { id: projeto.id },
          data: updateData
        });
      } catch (err) {
        console.warn('Aviso: Falha ao atualizar DB', err);
      }
    }

    // Se as restrições mudaram fortemente, a IA reformula o time
    if (precisaReavaliar && projeto.equipe) {
      try {
        const novaEquipe = sistema.reavaliarEquipe(projeto);
        return reply.status(200).send({
          mensagem: 'Projeto atualizado. O Orçamento/Prazo mudou, então a equipe foi TOTALMENTE reavaliada!',
          projeto: { id: projeto.id, orcamento: projeto.orcamento, prazo: projeto.prazo },
          novaEquipe: {
            id: novaEquipe.id,
            custoTotal: novaEquipe.custoTotal(),
            membros: novaEquipe.membros.map(m => ({
              papel: m.papel,
              profissional: { nome: m.profissional.nome, precoMedio: m.profissional.precoMedio }
            }))
          }
        });
      } catch (e: any) {
        return reply.status(400).send({ error: `Erro ao reavaliar a equipe: ${e.message}` });
      }
    }

    // Se só trocou perfumaria (gênero, locação), retorna normal
    return reply.status(200).send({
      mensagem: 'Projeto atualizado com sucesso.',
      projeto: {
        id: projeto.id,
        genero: projeto.genero,
        duracao: projeto.duracao,
        orcamento: projeto.orcamento,
        prazo: projeto.prazo,
        tipoCaptacao: projeto.tipoCaptacao,
        localizacao: projeto.localizacao
      }
    });
  });

  // GET /auditoria - Consulta trilha de auditoria em logs JSON (RNF04)
  app.get('/auditoria', async () => {
    return {
      totalLogs: auditoria.logs.length,
      logs: auditoria.logs,
    };
  });

  return app;
}

