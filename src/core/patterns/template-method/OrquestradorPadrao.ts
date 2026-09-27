import { OrquestradorEquipe } from './OrquestradorEquipe.js';
import { Projeto } from '../../domain/Projeto.js';
import { Profissional } from '../../domain/Profissional.js';
import { Papel } from '../../domain/Papel.js';

export class OrquestradorPadrao extends OrquestradorEquipe {
  /**
   * Validação de restrições orçamentárias, prazo e papéis obrigatórios.
   */
  public override validarRestricoes(projeto: Projeto): boolean {
    if (projeto.orcamento <= 0) {
      return false;
    }
    if (projeto.papeisObrigatorios.length === 0) {
      return false;
    }
    if (isNaN(projeto.prazo.getTime())) {
      return false;
    }
    return true;
  }

  /**
   * Normalização e filtragem: seleciona profissionais aptos a participar do projeto.
   */
  public override normalizarDados(
    _projeto: Projeto,
    profissionais: Profissional[]
  ): Profissional[] {
    return profissionais.filter((prof) => {
      // 1. Não pode ter preço negativo ou zero
      if (prof.precoMedio <= 0) return false;

      // 2. Deve ter ao menos 1 competência cadastrada
      if (prof.competencias.chaves().length === 0) return false;

      // 3. Verifica se a disponibilidade do profissional cobre o prazo ou sobrepõe
      // (caso o prazo do projeto esteja no futuro)
      return prof.disponibilidade.fim >= new Date();
    });
  }

  /**
   * Pós-processamento das listas de recomendação por papel:
   * Evita duplicidade de alocação (mesmo profissional ocupando múltiplos papéis na mesma equipe).
   */
  public override posProcessar(
    recomendacoes: Map<Papel, Profissional[]>
  ): Map<Papel, Profissional[]> {
    const resultado = new Map<Papel, Profissional[]>();
    const profissionaisAlocadosEmPrimeiroLugar = new Set<string>();

    for (const [papel, candidatos] of recomendacoes.entries()) {
      // Prioriza candidatos ainda não alocados no topo de outro papel
      const candidatosFiltrados = candidatos.filter(
        (prof) => !profissionaisAlocadosEmPrimeiroLugar.has(prof.id)
      );

      if (candidatosFiltrados.length > 0) {
        profissionaisAlocadosEmPrimeiroLugar.add(candidatosFiltrados[0].id);
      }

      resultado.set(papel, candidatosFiltrados);
    }

    return resultado;
  }
}
