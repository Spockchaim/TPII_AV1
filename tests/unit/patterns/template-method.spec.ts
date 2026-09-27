import { describe, it, expect, vi } from 'vitest';
import { Projeto } from '../../../src/core/domain/Projeto.js';
import { Profissional } from '../../../src/core/domain/Profissional.js';
import { Papel } from '../../../src/core/domain/Papel.js';
import { VetorCompetencia } from '../../../src/core/domain/value-objects/VetorCompetencia.js';
import { Intervalo } from '../../../src/core/domain/value-objects/Intervalo.js';
import { Competencia } from '../../../src/core/domain/Competencia.js';
import { OrquestradorPadrao } from '../../../src/core/patterns/template-method/OrquestradorPadrao.js';
import { OrquestradorEquipe } from '../../../src/core/patterns/template-method/OrquestradorEquipe.js';
import { RecomendacaoStrategy } from '../../../src/core/patterns/strategy/RecomendacaoStrategy.js';
import { SimilaridadeCosseno } from '../../../src/core/patterns/strategy/SimilaridadeCosseno.js';

describe('Padrão Template Method — OrquestradorEquipe', () => {
  const futuro = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const dispFutura = new Intervalo(new Date(), futuro);

  const prof1 = new Profissional(
    'p1',
    'Alice',
    new VetorCompetencia([new Competencia(Papel.DIRETOR, 9)]),
    dispFutura,
    500
  );

  const prof2 = new Profissional(
    'p2',
    'Bob',
    new VetorCompetencia([new Competencia(Papel.EDITOR, 8)]),
    dispFutura,
    300
  );

  it('deve executar o fluxo completo (validar -> normalizar -> recomendar -> pós-processar -> produzir Equipe)', () => {
    const orquestrador = new OrquestradorPadrao([prof1, prof2]);
    const projeto = new Projeto(
      'proj-template',
      'Ficção',
      120,
      10000,
      futuro,
      [Papel.DIRETOR, Papel.EDITOR]
    );

    const equipe = orquestrador.orquestrar(projeto, new SimilaridadeCosseno());

    expect(equipe).toBeDefined();
    expect(equipe.membros).toHaveLength(2);
    expect(equipe.status).toBe('EM_FORMACAO');
    expect(projeto.equipe).toBe(equipe);
    expect(projeto.profissionaisRecomendados.length).toBeGreaterThan(0);
  });

  it('deve abortar o fluxo imediatamente se a validação de restrições falhar', () => {
    const orquestrador = new OrquestradorPadrao([prof1]);
    const projetoInvalido = new Projeto(
      'proj-sem-papeis',
      'Curta',
      15,
      5000,
      futuro,
      [] // Sem papéis obrigatórios!
    );

    const mockEstrategia: RecomendacaoStrategy = {
      recomendar: vi.fn(),
    };

    expect(() => orquestrador.orquestrar(projetoInvalido, mockEstrategia)).toThrowError(
      "Restrições do projeto 'proj-sem-papeis' não foram atendidas"
    );

    // A estratégia NUNCA deve ser chamada se a validação falhar
    expect(mockEstrategia.recomendar).not.toHaveBeenCalled();
  });

  it('deve garantir a invariância da ordem de execução através de espionagem de métodos', () => {
    class OrquestradorEspiao extends OrquestradorEquipe {
      public ordemExecucao: string[] = [];

      public override validarRestricoes(projeto: Projeto): boolean {
        this.ordemExecucao.push('1_validarRestricoes');
        return true;
      }
      public override normalizarDados(projeto: Projeto, profissionais: Profissional[]): Profissional[] {
        this.ordemExecucao.push('2_normalizarDados');
        return profissionais;
      }
      public override posProcessar(recomendacoes: Map<Papel, Profissional[]>): Map<Papel, Profissional[]> {
        this.ordemExecucao.push('4_posProcessar');
        return recomendacoes;
      }
    }

    const espiao = new OrquestradorEspiao([prof1]);
    const projeto = new Projeto('proj-1', 'Doc', 60, 2000, futuro, [Papel.DIRETOR]);

    const mockStrategy: RecomendacaoStrategy = {
      recomendar: vi.fn().mockImplementation((proj, profs) => {
        espiao.ordemExecucao.push('3_recomendar');
        const mapa = new Map<Papel, Profissional[]>();
        mapa.set(Papel.DIRETOR, profs);
        return mapa;
      }),
    };

    espiao.orquestrar(projeto, mockStrategy);

    // A invariância da sequência do Template Method é atestada aqui:
    expect(espiao.ordemExecucao).toEqual([
      '1_validarRestricoes',
      '2_normalizarDados',
      '3_recomendar',
      '4_posProcessar',
    ]);
  });
});

