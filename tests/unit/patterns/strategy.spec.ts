import { describe, it, expect } from 'vitest';
import { Projeto } from '../../../src/core/domain/Projeto.js';
import { Profissional } from '../../../src/core/domain/Profissional.js';
import { Papel } from '../../../src/core/domain/Papel.js';
import { VetorCompetencia } from '../../../src/core/domain/value-objects/VetorCompetencia.js';
import { Intervalo } from '../../../src/core/domain/value-objects/Intervalo.js';
import { Competencia } from '../../../src/core/domain/Competencia.js';
import { Avaliacao } from '../../../src/core/domain/Avaliacao.js';
import { SimilaridadeCosseno } from '../../../src/core/patterns/strategy/SimilaridadeCosseno.js';
import { FiltragemColaborativa } from '../../../src/core/patterns/strategy/FiltragemColaborativa.js';
import { RegrasOrcamento } from '../../../src/core/patterns/strategy/RegrasOrcamento.js';

describe('Padrão Strategy — RecomendacaoStrategy', () => {
  const dataInicio = new Date('2026-10-01');
  const dataFim = new Date('2026-10-30');
  const disponibilidadePadrao = new Intervalo(dataInicio, dataFim);

  // Profissional A: Altíssima competência técnica em DIRETOR (nível 10), preço alto (1000), poucas avaliações (1)
  const profA = new Profissional(
    'prof-A',
    'Mestre da Direção',
    new VetorCompetencia([new Competencia(Papel.DIRETOR, 10)]),
    disponibilidadePadrao,
    1000,
    [new Avaliacao(4.0, 'Bom')]
  );

  // Profissional B: Competência média em DIRETOR (nível 6), preço médio (500), histórico espetacular de avaliações (5 avaliações nota 5.0)
  const profB = new Profissional(
    'prof-B',
    'Amado Pela Equipe',
    new VetorCompetencia([new Competencia(Papel.DIRETOR, 6)]),
    disponibilidadePadrao,
    500,
    [
      new Avaliacao(5.0, 'Incrível'),
      new Avaliacao(5.0, 'Ótimo'),
      new Avaliacao(5.0, 'Pontual'),
      new Avaliacao(5.0, 'Criativo'),
      new Avaliacao(5.0, 'Sensacional'),
    ]
  );

  // Profissional C: Competência básica (nível 4), preço baixíssimo (150), avaliações medianas
  const profC = new Profissional(
    'prof-C',
    'Econômico e Barato',
    new VetorCompetencia([new Competencia(Papel.DIRETOR, 4)]),
    disponibilidadePadrao,
    150,
    [new Avaliacao(3.5, 'Ok')]
  );

  const profissionais = [profA, profB, profC];

  const projeto = new Projeto(
    'proj-curta',
    'Drama Independente',
    30,
    1000, // Orçamento total modesto
    new Date('2026-11-01'),
    [Papel.DIRETOR]
  );

  it('SimilaridadeCosseno deve ranquear em primeiro quem tem maior afinidade técnica de competência', () => {
    const estrategia = new SimilaridadeCosseno();
    const resultado = estrategia.recomendar(projeto, profissionais);
    const recomendados = resultado.get(Papel.DIRETOR)!;

    expect(recomendados).toBeDefined();
    // O Profissional A tem nível 10 em DIRETOR, logo tem o maior cosseno
    expect(recomendados[0].id).toBe('prof-A');
  });

  it('FiltragemColaborativa deve ranquear em primeiro quem possui melhor histórico e volume de avaliações', () => {
    const estrategia = new FiltragemColaborativa();
    const resultado = estrategia.recomendar(projeto, profissionais);
    const recomendados = resultado.get(Papel.DIRETOR)!;

    expect(recomendados).toBeDefined();
    // O Profissional B tem nota 5.0 e 5 avaliações
    expect(recomendados[0].id).toBe('prof-B');
  });

  it('RegrasOrcamento deve ranquear em primeiro quem cobra o menor preço para orçamentos reduzidos', () => {
    const estrategia = new RegrasOrcamento();
    const resultado = estrategia.recomendar(projeto, profissionais);
    const recomendados = resultado.get(Papel.DIRETOR)!;

    expect(recomendados).toBeDefined();
    // O Profissional C cobra apenas 150
    expect(recomendados[0].id).toBe('prof-C');
  });

  it('deve demonstrar concretamente que trocar a estratégia altera o primeiro colocado para o mesmo projeto', () => {
    const stratCosseno = new SimilaridadeCosseno();
    const stratColab = new FiltragemColaborativa();
    const stratOrcamento = new RegrasOrcamento();

    const primeiroCosseno = stratCosseno.recomendar(projeto, profissionais).get(Papel.DIRETOR)![0];
    const primeiroColab = stratColab.recomendar(projeto, profissionais).get(Papel.DIRETOR)![0];
    const primeiroOrcamento = stratOrcamento.recomendar(projeto, profissionais).get(Papel.DIRETOR)![0];

    expect(primeiroCosseno.id).toBe('prof-A');
    expect(primeiroColab.id).toBe('prof-B');
    expect(primeiroOrcamento.id).toBe('prof-C');

    // Comprovação formal de que são três profissionais distintos
    expect(primeiroCosseno.id).not.toBe(primeiroColab.id);
    expect(primeiroColab.id).not.toBe(primeiroOrcamento.id);
    expect(primeiroCosseno.id).not.toBe(primeiroOrcamento.id);
  });
});

