import { RecomendacaoStrategy } from './RecomendacaoStrategy.js';
import { Projeto } from '../../domain/Projeto.js';
import { Profissional } from '../../domain/Profissional.js';
import { Papel } from '../../domain/Papel.js';

export class FiltragemColaborativa implements RecomendacaoStrategy {
  public recomendar(
    projeto: Projeto,
    profissionais: Profissional[]
  ): Map<Papel, Profissional[]> {
    const resultado = new Map<Papel, Profissional[]>();

    for (const req of projeto.papeisObrigatorios) {
      const papel = req.papel;
      // Filtra ou pondera candidatos com foco na média e volume de avaliações históricas
      const pontuados = profissionais.map((prof) => {
        const media = prof.calcularMediaAvaliacoes();
        const qtdAvaliacoes = prof.avaliacoes.length;
        const temAfinidadePapel = prof.competencias.obterNivel(papel) > 0 ? 1 : 0.5;

        // Score ponderado: média das notas + bônus logarítmico pelo volume de projetos,
        // multiplicado pelo peso do papel para o projeto
        const score = ((media * 0.8 + Math.min(qtdAvaliacoes * 0.2, 1.0)) * temAfinidadePapel) * req.peso;

        return { prof, score };
      });

      pontuados.sort((a, b) => b.score - a.score);

      resultado.set(
        papel,
        pontuados.map((item) => item.prof)
      );
    }

    return resultado;
  }
}

