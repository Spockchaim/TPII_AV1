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

describe('Testes de Desempenho e Carga — RNF01 e RNF02', () => {
  const TOTAL_PROFISSIONAIS = 10000;
  const REQUISICOES_SIMULTANEAS = 100;
  const papeisList = Object.values(Papel);

  // Gerador sintético de 10.000 profissionais ativos
  console.log(`Gerando base de ${TOTAL_PROFISSIONAIS} profissionais em memória...`);
  const t0 = performance.now();
  const base10k: Profissional[] = [];
  const futuro = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);
  const disp = new Intervalo(new Date(), futuro);

  for (let i = 1; i <= TOTAL_PROFISSIONAIS; i++) {
    const papelPrincipal = papeisList[i % papeisList.length];
    const nivel = 5 + (i % 6); // níveis de 5 a 10
    const preco = 500 + (i % 3000); // preços de 500 a 3500

    base10k.push(
      new Profissional(
        `prof-load-${i}`,
        `Profissional #${i}`,
        new VetorCompetencia([new Competencia(papelPrincipal, nivel)]),
        disp,
        preco,
        [new Avaliacao(3.5 + ((i % 15) / 10), 'Feedback')]
      )
    );
  }
  const tempoGeracao = Math.round(performance.now() - t0);
  console.log(`Base de 10.000 profissionais gerada em ${tempoGeracao}ms.`);

  const sistema = new SistemaRecomendacao(
    new SimilaridadeCosseno(),
    undefined,
    base10k
  );

  it('RNF01 — Deve responder a uma solicitação de recomendação em menos de 2 segundos com 10.000 profissionais', () => {
    const projeto = new Projeto(
      'proj-perf-single',
      'Longa-Metragem de Época',
      120,
      100000,
      futuro,
      [Papel.DIRETOR, Papel.DIRETOR_FOTOGRAFIA, Papel.SONOPLASTA, Papel.EDITOR]
    );

    const inicio = performance.now();
    const equipe = sistema.executarRecomendacao(projeto);
    const duracaoMs = performance.now() - inicio;

    console.log(`⏱️ Tempo de resposta com 10.000 profissionais: ${duracaoMs.toFixed(2)}ms`);

    expect(equipe).toBeDefined();
    expect(equipe.membros).toHaveLength(4);
    // Critério do RNF01: Menos de 2000ms (< 2 segundos)
    expect(duracaoMs).toBeLessThan(2000);
  });

  it('RNF02 — Deve suportar 100 requisições simultâneas com tempo individual abaixo de 2 segundos', async () => {
    const promessas: Promise<{ duracao: number; sucesso: boolean }>[] = [];

    const inicioGeral = performance.now();

    for (let req = 1; req <= REQUISICOES_SIMULTANEAS; req++) {
      const p = new Promise<{ duracao: number; sucesso: boolean }>((resolve) => {
        const projeto = new Projeto(
          `proj-concorrente-${req}`,
          'Filme Concorrente',
          90,
          50000 + (req * 100),
          futuro,
          [Papel.DIRETOR, Papel.EDITOR]
        );

        // Alterna estratégias aleatoriamente entre concorrentes
        const estrategia = req % 2 === 0 ? new SimilaridadeCosseno() : new RegrasOrcamento();
        sistema.definirEstrategia(estrategia);

        const inicioReq = performance.now();
        try {
          const eq = sistema.executarRecomendacao(projeto);
          const duracao = performance.now() - inicioReq;
          resolve({ duracao, sucesso: eq.membros.length === 2 });
        } catch {
          resolve({ duracao: performance.now() - inicioReq, sucesso: false });
        }
      });

      promessas.push(p);
    }

    const resultados = await Promise.all(promessas);
    const duracaoTotal = performance.now() - inicioGeral;

    const tempos = resultados.map((r) => r.duracao);
    const maxTempo = Math.max(...tempos);
    const minTempo = Math.min(...tempos);
    const mediaTempo = tempos.reduce((a, b) => a + b, 0) / tempos.length;
    const todasSucesso = resultados.every((r) => r.sucesso);

    console.log(`🚀 Concorrência de 100 requisições simultâneas:`);
    console.log(`   - Tempo total do lote: ${duracaoTotal.toFixed(2)}ms`);
    console.log(`   - Média por requisição: ${mediaTempo.toFixed(2)}ms`);
    console.log(`   - Mínimo: ${minTempo.toFixed(2)}ms | Máximo: ${maxTempo.toFixed(2)}ms`);

    // Todos os 100 produtores receberam suas equipes com sucesso
    expect(todasSucesso).toBe(true);
    // Cada requisição respondeu em menos de 2000ms (2s)
    expect(maxTempo).toBeLessThan(2000);
  });
});

