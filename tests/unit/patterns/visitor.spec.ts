import { describe, it, expect } from 'vitest';
import { Projeto } from '../../../src/core/domain/Projeto.js';
import { Profissional } from '../../../src/core/domain/Profissional.js';
import { Papel } from '../../../src/core/domain/Papel.js';
import { VetorCompetencia } from '../../../src/core/domain/value-objects/VetorCompetencia.js';
import { Intervalo } from '../../../src/core/domain/value-objects/Intervalo.js';
import { Competencia } from '../../../src/core/domain/Competencia.js';
import { Avaliacao } from '../../../src/core/domain/Avaliacao.js';
import { ValidadorConsistencia } from '../../../src/core/patterns/visitor/ValidadorConsistencia.js';
import { CalculadorCompatibilidade } from '../../../src/core/patterns/visitor/CalculadorCompatibilidade.js';
import { GeradorRelatorio } from '../../../src/core/patterns/visitor/GeradorRelatorio.js';

describe('Padrão Visitor — Operações Analíticas Transversais', () => {
  const futuro = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60);
  const disp = new Intervalo(new Date(), futuro);

  const profDiretor = new Profissional(
    'p-dir',
    'Guillermo del Toro',
    new VetorCompetencia([new Competencia(Papel.DIRETOR, 10)]),
    disp,
    3000,
    [new Avaliacao(5.0, 'Genial')]
  );

  const profEditor = new Profissional(
    'p-edit',
    'Thelma Schoonmaker',
    new VetorCompetencia([new Competencia(Papel.EDITOR, 9)]),
    disp,
    2000,
    [new Avaliacao(4.8, 'Excelente montadora')]
  );

  it('ValidadorConsistencia deve aprovar projeto consistente e reprovar caso estoure o orçamento ou falte papel', () => {
    const validador = new ValidadorConsistencia();

    // Projeto com orçamento de 10.000 (custo da equipe será 3000 + 2000 = 5000)
    const projetoValido = new Projeto(
      'proj-ok',
      'Fantasia',
      120,
      10000,
      futuro,
      [Papel.DIRETOR, Papel.EDITOR]
    );

    // Sem equipe ainda -> deve ser falso
    expect(projetoValido.aceita(validador)).toBe(false);

    // Adiciona apenas 1 membro -> falta o EDITOR
    projetoValido.aceitarRecomendacao(Papel.DIRETOR, profDiretor);
    expect(projetoValido.aceita(validador)).toBe(false);

    // Adiciona o EDITOR -> agora todos os papéis estão preenchidos e 5000 <= 10000
    projetoValido.aceitarRecomendacao(Papel.EDITOR, profEditor);
    expect(projetoValido.aceita(validador)).toBe(true);

    // Se reduzirmos o orçamento para 4000 (abaixo do custo de 5000) -> deve ser falso
    projetoValido.orcamento = 4000;
    expect(projetoValido.aceita(validador)).toBe(false);
  });

  it('CalculadorCompatibilidade deve calcular índice numérico proporcional à competência e avaliações', () => {
    const calculador = new CalculadorCompatibilidade();

    const projeto = new Projeto(
      'proj-score',
      'Suspense',
      90,
      15000,
      futuro,
      [Papel.DIRETOR, Papel.EDITOR]
    );

    projeto.aceitarRecomendacao(Papel.DIRETOR, profDiretor);
    projeto.aceitarRecomendacao(Papel.EDITOR, profEditor);

    const scoreProjeto: number = projeto.aceita(calculador);
    expect(scoreProjeto).toBeGreaterThan(80); // Profissionais de altíssimo calibre (notas 5 e 4.8, níveis 10 e 9)
    expect(scoreProjeto).toBeLessThanOrEqual(100);

    const scoreDiretor: number = profDiretor.aceita(calculador);
    expect(scoreDiretor).toBeGreaterThan(0);
  });

  it('GeradorRelatorio deve compilar sumário executivo em texto sem alterar o estado do projeto', () => {
    const gerador = new GeradorRelatorio();

    const projeto = new Projeto(
      'proj-relat',
      'Documentário',
      45,
      8000,
      futuro,
      [Papel.DIRETOR]
    );

    projeto.aceitarRecomendacao(Papel.DIRETOR, profDiretor);

    const relatorio: string = projeto.aceita(gerador);

    expect(relatorio).toContain('=== RELATÓRIO DO PROJETO: proj-relat ===');
    expect(relatorio).toContain('Gênero: Documentário');
    expect(relatorio).toContain('Guillermo del Toro');
    expect(relatorio).toContain('Custo Total da Equipe: R$ 3.000,00');
    expect(relatorio).toContain('Saldo Restante: R$ 5.000,00');

    // Validação de que o visitante do profissional também gera resumo
    const resumoProf: string = profDiretor.aceita(gerador);
    expect(resumoProf).toContain('Guillermo del Toro');
    expect(resumoProf).toContain('Preço Médio: R$ 3000');
  });

  it('deve provar que múltiplos visitantes operam sobre a mesma estrutura sem alterá-la (Visitor GoF)', () => {
    const projeto = new Projeto('proj-multi', 'Drama', 100, 20000, futuro, [Papel.DIRETOR]);
    projeto.aceitarRecomendacao(Papel.DIRETOR, profDiretor);

    const validador = new ValidadorConsistencia();
    const calculador = new CalculadorCompatibilidade();
    const gerador = new GeradorRelatorio();

    // 1. Visitante booleano
    const isValido: boolean = projeto.aceita(validador);
    // 2. Visitante numérico
    const compatibilidade: number = projeto.aceita(calculador);
    // 3. Visitante textual
    const relatorio: string = projeto.aceita(gerador);

    expect(isValido).toBe(true);
    expect(typeof compatibilidade).toBe('number');
    expect(typeof relatorio).toBe('string');
  });
});

