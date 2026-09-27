import { RecomendacaoStrategy } from './RecomendacaoStrategy.js';
import { Projeto } from '../../domain/Projeto.js';
import { Profissional } from '../../domain/Profissional.js';
import { Papel } from '../../domain/Papel.js';
import { VetorCompetencia } from '../../domain/value-objects/VetorCompetencia.js';
import { Competencia } from '../../domain/Competencia.js';

export class SimilaridadeCosseno implements RecomendacaoStrategy {
  public recomendar(
    projeto: Projeto,
    profissionais: Profissional[]
  ): Map<Papel, Profissional[]> {
    const resultado = new Map<Papel, Profissional[]>();

    for (const req of projeto.papeisObrigatorios) {
      const papel = req.papel;
      // Cria vetor de referência ideal para o papel com nível baseado no peso (ou 10 como base)
      const vetorReferencia = new VetorCompetencia([
        new Competencia(papel, req.peso || 10),
      ]);

      // Ranquear profissionais pela similaridade de cosseno em ordem decrescente
      const pontuados = profissionais.map((prof) => {
        const score = prof.competencias.similaridadeCosseno(vetorReferencia) * req.peso;
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

