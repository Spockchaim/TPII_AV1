import { RecomendacaoStrategy } from './RecomendacaoStrategy.js';
import { Projeto } from '../../domain/Projeto.js';
import { Profissional } from '../../domain/Profissional.js';
import { Papel } from '../../domain/Papel.js';

export class RegrasOrcamento implements RecomendacaoStrategy {
  public recomendar(
    projeto: Projeto,
    profissionais: Profissional[]
  ): Map<Papel, Profissional[]> {
    const resultado = new Map<Papel, Profissional[]>();
    const totalPapeis = projeto.papeisObrigatorios.length || 1;
    const tetoPorPapel = projeto.orcamento / totalPapeis;

    for (const req of projeto.papeisObrigatorios) {
      const papel = req.papel;
      // Filtra candidatos aptos para o papel técnico solicitado
      const aptosParaPapel = profissionais.filter(
        (p) => p.competencias.obterNivel(papel) > 0
      );
      const baseParaPapel = aptosParaPapel.length > 0 ? aptosParaPapel : profissionais;

      // Prioriza menor preço médio, dando preferência a quem cabe no teto proporcional
      const candidatos = [...baseParaPapel].sort((a, b) => {
        // Multiplica o teto pelo peso do papel (papeis mais importantes têm maior teto proporcional)
        // Como a lógica de negócio garante que a soma dos pesos é 10, (req.peso / 10) é exatamente o percentual!
        // Ex: Peso 8 = 80% do orçamento total, Peso 2 = 20% do orçamento total.
        const tetoAjustado = projeto.orcamento * (req.peso / 10);

        const dentroTetoA = a.precoMedio <= tetoAjustado ? 1 : 0;
        const dentroTetoB = b.precoMedio <= tetoAjustado ? 1 : 0;

        if (dentroTetoA !== dentroTetoB) {
          return dentroTetoB - dentroTetoA; // quem cabe no teto vem primeiro
        }

        // Critério de desempate: menor preço médio absoluto
        return a.precoMedio - b.precoMedio;
      });

      resultado.set(papel, candidatos);
    }

    return resultado;
  }
}

