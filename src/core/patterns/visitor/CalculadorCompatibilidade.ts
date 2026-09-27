import { VisitanteProjeto } from './VisitanteProjeto.js';
import { Projeto } from '../../domain/Projeto.js';
import { Profissional } from '../../domain/Profissional.js';

export class CalculadorCompatibilidade implements VisitanteProjeto {
  /**
   * Calcula um score percentual (0 a 100) de compatibilidade da equipe com os requisitos do projeto.
   */
  public visitarProjeto(projeto: Projeto): number {
    if (!projeto.equipe || projeto.equipe.membros.length === 0) {
      return 0;
    }

    let somaPontos = 0;
    let totalPapeis = projeto.papeisObrigatorios.length;

    for (const req of projeto.papeisObrigatorios) {
      const papel = req.papel;
      const membro = projeto.equipe.obterMembroPorPapel(papel);
      if (!membro) {
        continue;
      }

      // Nível técnico específico para o papel (escala 0 a 10)
      const nivelTecnico = membro.profissional.competencias.obterNivel(papel);
      // Média de avaliações (escala 0 a 5) normalizada para escala 0 a 10
      const notaNormalizada = membro.profissional.calcularMediaAvaliacoes() * 2;

      // Ponderação: 60% habilidade técnica + 40% avaliações históricas
      const scoreIndividual = nivelTecnico * 6 + notaNormalizada * 4;
      somaPontos += Math.min(scoreIndividual, 100);
    }

    const mediaFinal = somaPontos / (totalPapeis || 1);
    return Math.round(mediaFinal * 100) / 100;
  }

  /**
   * Calcula a pontuação individual de um profissional com base nas suas competências e notas.
   */
  public visitarProfissional(profissional: Profissional): number {
    const mag = profissional.competencias.magnitude();
    const mediaAvaliacoes = profissional.calcularMediaAvaliacoes();
    const score = Math.min((mag * 5) + (mediaAvaliacoes * 10), 100);
    return Math.round(score * 100) / 100;
  }
}

