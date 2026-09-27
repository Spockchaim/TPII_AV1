import { describe, it, expect, vi } from 'vitest';
import { Papel } from '../../../src/core/domain/Papel.js';
import { Intervalo } from '../../../src/core/domain/value-objects/Intervalo.js';
import { Competencia } from '../../../src/core/domain/Competencia.js';
import { VetorCompetencia } from '../../../src/core/domain/value-objects/VetorCompetencia.js';
import { Avaliacao } from '../../../src/core/domain/Avaliacao.js';
import { Profissional } from '../../../src/core/domain/Profissional.js';
import { MembroEquipe } from '../../../src/core/domain/MembroEquipe.js';
import { Equipe } from '../../../src/core/domain/Equipe.js';
import { Projeto } from '../../../src/core/domain/Projeto.js';
import { VisitanteProjeto } from '../../../src/core/patterns/visitor/VisitanteProjeto.js';

describe('Núcleo de Domínio — Testes Unitários', () => {
  describe('Papel (Enum)', () => {
    it('deve conter exatamente os 6 papéis técnicos obrigatórios da atividade', () => {
      expect(Papel.DIRETOR).toBe('DIRETOR');
      expect(Papel.DIRETOR_FOTOGRAFIA).toBe('DIRETOR_FOTOGRAFIA');
      expect(Papel.SONOPLASTA).toBe('SONOPLASTA');
      expect(Papel.EDITOR).toBe('EDITOR');
      expect(Papel.ROTEIRISTA).toBe('ROTEIRISTA');
      expect(Papel.EFETOS_VISUAIS).toBe('EFETOS_VISUAIS');
      expect(Object.keys(Papel)).toHaveLength(6);
    });
  });

  describe('Intervalo (Value Object)', () => {
    it('deve instanciar intervalo válido e proteger imutabilidade', () => {
      const inicio = new Date('2026-10-01');
      const fim = new Date('2026-10-31');
      const intervalo = new Intervalo(inicio, fim);

      expect(intervalo.inicio.getTime()).toBe(inicio.getTime());
      expect(intervalo.fim.getTime()).toBe(fim.getTime());

      // Alterar a data externa não deve alterar o objeto interno
      inicio.setFullYear(2020);
      expect(intervalo.inicio.getFullYear()).toBe(2026);
    });

    it('deve lançar erro se a data final for anterior à data inicial', () => {
      const inicio = new Date('2026-10-31');
      const fim = new Date('2026-10-01');
      expect(() => new Intervalo(inicio, fim)).toThrowError(
        'A data final do intervalo não pode ser anterior à data inicial.'
      );
    });

    it('deve verificar sobreposição de intervalos corretamente', () => {
      const interA = new Intervalo(new Date('2026-10-01'), new Date('2026-10-15'));
      const interB = new Intervalo(new Date('2026-10-10'), new Date('2026-10-25'));
      const interC = new Intervalo(new Date('2026-10-20'), new Date('2026-10-30'));

      expect(interA.sobrepoe(interB)).toBe(true);
      expect(interB.sobrepoe(interA)).toBe(true);
      expect(interA.sobrepoe(interC)).toBe(false);
    });

    it('deve verificar se contém uma data ou intervalo', () => {
      const inter = new Intervalo(new Date('2026-10-01'), new Date('2026-10-31'));
      expect(inter.contem(new Date('2026-10-15'))).toBe(true);
      expect(inter.contem(new Date('2026-11-01'))).toBe(false);

      const subInter = new Intervalo(new Date('2026-10-05'), new Date('2026-10-20'));
      expect(inter.contemIntervalo(subInter)).toBe(true);
    });
  });

  describe('Competencia e VetorCompetencia', () => {
    it('deve criar competência e validar nível entre 0 e 10', () => {
      const comp = new Competencia('Câmera 4K', 8);
      expect(comp.nome).toBe('Câmera 4K');
      expect(comp.nivel).toBe(8);

      expect(() => new Competencia('', 5)).toThrowError('O nome da competência não pode ser vazio.');
      expect(() => new Competencia('Edição', -1)).toThrowError('O nível da competência deve estar entre 0 e 10.');
      expect(() => new Competencia('Edição', 11)).toThrowError('O nível da competência deve estar entre 0 e 10.');
    });

    it('deve calcular magnitude e similaridade de cosseno corretamente', () => {
      const comp1 = new Competencia('Direcao', 4);
      const comp2 = new Competencia('Roteiro', 3);
      const vetorA = new VetorCompetencia([comp1, comp2]);

      // Magnitude: sqrt(4^2 + 3^2) = 5
      expect(vetorA.magnitude()).toBe(5);

      // Vetor idêntico -> cosseno = 1
      expect(vetorA.similaridadeCosseno(vetorA)).toBeCloseTo(1.0, 5);

      // Vetor ortogonal -> cosseno = 0
      const vetorOrtogonal = new VetorCompetencia([new Competencia('Sonoplastia', 5)]);
      expect(vetorA.similaridadeCosseno(vetorOrtogonal)).toBe(0);

      // Vetor vazio -> cosseno = 0
      const vetorVazio = new VetorCompetencia([]);
      expect(vetorA.similaridadeCosseno(vetorVazio)).toBe(0);
    });
  });

  describe('Avaliacao', () => {
    it('deve criar avaliação com nota válida e proteger a data', () => {
      const data = new Date('2026-05-10');
      const avaliacao = new Avaliacao(4.5, 'Excelente trabalho na fotografia', data);

      expect(avaliacao.nota).toBe(4.5);
      expect(avaliacao.comentario).toBe('Excelente trabalho na fotografia');
      expect(avaliacao.data.getTime()).toBe(data.getTime());

      expect(() => new Avaliacao(-0.1, 'Ruim')).toThrowError('A nota da avaliação deve estar entre 0 e 5.');
      expect(() => new Avaliacao(5.1, 'Muito bom')).toThrowError('A nota da avaliação deve estar entre 0 e 5.');
    });
  });

  describe('Profissional', () => {
    it('deve criar profissional com todos os atributos e calcular média de avaliações', () => {
      const competencias = new VetorCompetencia([new Competencia('Fotografia', 9)]);
      const disponibilidade = new Intervalo(new Date('2026-10-01'), new Date('2026-12-31'));
      const profissional = new Profissional(
        'prof-1',
        'Alice Fotógrafa',
        competencias,
        disponibilidade,
        350
      );

      expect(profissional.id).toBe('prof-1');
      expect(profissional.nome).toBe('Alice Fotógrafa');
      expect(profissional.precoMedio).toBe(350);
      expect(profissional.avaliacoes).toHaveLength(0);
      expect(profissional.calcularMediaAvaliacoes()).toBe(0);

      profissional.adicionarAvaliacao(new Avaliacao(5.0, 'Perfeita'));
      profissional.adicionarAvaliacao(new Avaliacao(4.0, 'Muito boa'));
      expect(profissional.avaliacoes).toHaveLength(2);
      expect(profissional.calcularMediaAvaliacoes()).toBe(4.5);
    });

    it('deve suportar o padrão Visitor via método aceita', () => {
      const profissional = new Profissional(
        'prof-2',
        'Bob Diretor',
        new VetorCompetencia(),
        new Intervalo(new Date('2026-10-01'), new Date('2026-10-15')),
        500
      );

      const visitanteMock: VisitanteProjeto = {
        visitarProjeto: vi.fn(),
        visitarProfissional: vi.fn().mockReturnValue('visitou profissional com sucesso'),
      };

      const resultado = profissional.aceita(visitanteMock);
      expect(visitanteMock.visitarProfissional).toHaveBeenCalledWith(profissional);
      expect(resultado).toBe('visitou profissional com sucesso');
    });
  });

  describe('MembroEquipe e Equipe', () => {
    it('deve instanciar MembroEquipe e gerenciar status de confirmação', () => {
      const prof = new Profissional(
        'prof-1',
        'Carlos Editor',
        new VetorCompetencia(),
        new Intervalo(new Date('2026-10-01'), new Date('2026-10-20')),
        200
      );
      const membro = new MembroEquipe(Papel.EDITOR, prof, false);

      expect(membro.papel).toBe(Papel.EDITOR);
      expect(membro.confirmado).toBe(false);
      expect(membro.profissional.id).toBe('prof-1');

      membro.confirmar();
      expect(membro.confirmado).toBe(true);

      membro.recusar();
      expect(membro.confirmado).toBe(false);

      const novoProf = new Profissional(
        'prof-2',
        'Daniela Editora',
        new VetorCompetencia(),
        new Intervalo(new Date('2026-10-01'), new Date('2026-10-20')),
        220
      );
      membro.substituirProfissional(novoProf);
      expect(membro.profissional.nome).toBe('Daniela Editora');
      expect(membro.confirmado).toBe(false);
    });

    it('deve lançar erro se tentar criar uma equipe vazia (cardinalidade 1..*)', () => {
      expect(() => new Equipe('eq-1', [])).toThrowError(
        'Uma equipe deve conter pelo menos um membro (cardinalidade 1..*).'
      );
    });

    it('deve gerenciar membros da equipe e calcular custo total', () => {
      const prof1 = new Profissional(
        'p1',
        'Ana',
        new VetorCompetencia(),
        new Intervalo(new Date('2026-10-01'), new Date('2026-10-20')),
        300
      );
      const prof2 = new Profissional(
        'p2',
        'Bruno',
        new VetorCompetencia(),
        new Intervalo(new Date('2026-10-01'), new Date('2026-10-20')),
        200
      );

      const m1 = new MembroEquipe(Papel.DIRETOR, prof1, true);
      const m2 = new MembroEquipe(Papel.SONOPLASTA, prof2, false);

      const equipe = new Equipe('eq-1', [m1, m2]);

      expect(equipe.membros).toHaveLength(2);
      expect(equipe.custoTotal()).toBe(500);
      expect(equipe.todosConfirmados()).toBe(false);

      // Confirmar m2
      m2.confirmar();
      expect(equipe.todosConfirmados()).toBe(true);

      // Substituir membro por papel
      const prof3 = new Profissional(
        'p3',
        'Caio',
        new VetorCompetencia(),
        new Intervalo(new Date('2026-10-01'), new Date('2026-10-20')),
        250
      );
      const substituiu = equipe.substituirMembro(Papel.SONOPLASTA, prof3);
      expect(substituiu).toBe(true);
      expect(equipe.obterMembroPorPapel(Papel.SONOPLASTA)?.profissional.nome).toBe('Caio');
      expect(equipe.custoTotal()).toBe(550);
      expect(equipe.status).toBe('EM_FORMACAO');

      // Tentar substituir papel que não existe
      expect(equipe.substituirMembro(Papel.EFETOS_VISUAIS, prof3)).toBe(false);
    });
  });

  describe('Projeto', () => {
    it('deve instanciar Projeto com atributos válidos', () => {
      const prazo = new Date('2026-12-15');
      const projeto = new Projeto(
        'proj-101',
        'Ficção Científica',
        110,
        150000,
        prazo,
        [Papel.DIRETOR, Papel.DIRETOR_FOTOGRAFIA, Papel.EDITOR]
      );

      expect(projeto.id).toBe('proj-101');
      expect(projeto.genero).toBe('Ficção Científica');
      expect(projeto.duracao).toBe(110);
      expect(projeto.orcamento).toBe(150000);
      expect(projeto.prazo.getTime()).toBe(prazo.getTime());
      expect(projeto.papeisObrigatorios).toHaveLength(3);
      expect(projeto.precisaReavaliacao).toBe(false);
    });

    it('deve sinalizar reavaliação se orçamento ou prazo forem alterados', () => {
      const projeto = new Projeto('p1', 'Drama', 90, 50000, new Date('2026-12-01'));
      expect(projeto.precisaReavaliacao).toBe(false);

      projeto.orcamento = 60000;
      expect(projeto.precisaReavaliacao).toBe(true);

      projeto.solicitarReavaliacao();
      expect(projeto.precisaReavaliacao).toBe(true);
    });

    it('deve aceitar recomendação e compor equipe', () => {
      const projeto = new Projeto('p1', 'Doc', 60, 40000, new Date('2026-11-01'));
      const prof = new Profissional(
        'p1',
        'Elisa',
        new VetorCompetencia(),
        new Intervalo(new Date('2026-10-01'), new Date('2026-11-01')),
        300
      );

      projeto.aceitarRecomendacao(Papel.DIRETOR, prof);
      expect(projeto.equipe).toBeDefined();
      expect(projeto.equipe?.membros).toHaveLength(1);
      expect(projeto.equipe?.membros[0].confirmado).toBe(true);

      // Adicionar outro papel
      const prof2 = new Profissional(
        'p2',
        'Fabio',
        new VetorCompetencia(),
        new Intervalo(new Date('2026-10-01'), new Date('2026-11-01')),
        250
      );
      projeto.aceitarRecomendacao(Papel.EDITOR, prof2);
      expect(projeto.equipe?.membros).toHaveLength(2);
    });

    it('deve substituir membro na equipe do projeto', () => {
      const projeto = new Projeto('p1', 'Doc', 60, 40000, new Date('2026-11-01'));
      const prof1 = new Profissional('p1', 'Gabi', new VetorCompetencia(), new Intervalo(new Date('2026-10-01'), new Date('2026-11-01')), 300);
      const prof2 = new Profissional('p2', 'Helena', new VetorCompetencia(), new Intervalo(new Date('2026-10-01'), new Date('2026-11-01')), 320);

      expect(() => projeto.substituirMembro(Papel.DIRETOR, prof2)).toThrowError(
        'Não há equipe definida para realizar substituição.'
      );

      projeto.aceitarRecomendacao(Papel.DIRETOR, prof1);
      projeto.substituirMembro(Papel.DIRETOR, prof2);
      expect(projeto.equipe?.obterMembroPorPapel(Papel.DIRETOR)?.profissional.nome).toBe('Helena');

      expect(() => projeto.substituirMembro(Papel.ROTEIRISTA, prof2)).toThrowError(
        `Não foi encontrado membro com o papel ${Papel.ROTEIRISTA} na equipe.`
      );
    });

    it('deve suportar o padrão Visitor via método aceita', () => {
      const projeto = new Projeto('p1', 'Doc', 60, 40000, new Date('2026-11-01'));
      const visitanteMock: VisitanteProjeto = {
        visitarProjeto: vi.fn().mockReturnValue('visitou projeto com sucesso'),
        visitarProfissional: vi.fn(),
      };

      const resultado = projeto.aceita(visitanteMock);
      expect(visitanteMock.visitarProjeto).toHaveBeenCalledWith(projeto);
      expect(resultado).toBe('visitou projeto com sucesso');
    });
  });
});

