import { VisitanteProjeto } from './VisitanteProjeto.js';
import { Projeto } from '../../domain/Projeto.js';
import { Profissional } from '../../domain/Profissional.js';

export class ValidadorConsistencia implements VisitanteProjeto {
  /**
   * Valida se todos os papéis obrigatórios foram atendidos na equipe e se o orçamento foi respeitado.
   */
  public visitarProjeto(projeto: Projeto): boolean {
    if (!projeto.equipe) {
      return false;
    }

    // 1. Verifica se todos os papéis obrigatórios estão preenchidos na equipe
    for (const req of projeto.papeisObrigatorios) {
      const papel = req.papel;
      const membro = projeto.equipe.obterMembroPorPapel(papel);
      if (!membro) {
        return false;
      }
    }

    // 2. Verifica se o custo total cabe no orçamento estipulado
    const custoTotal = projeto.equipe.custoTotal();
    if (custoTotal > projeto.orcamento) {
      return false;
    }

    return true;
  }

  /**
   * Valida se um profissional atende aos requisitos mínimos de integridade cadastral.
   */
  public visitarProfissional(profissional: Profissional): boolean {
    if (profissional.precoMedio <= 0) return false;
    if (profissional.competencias.chaves().length === 0) return false;
    if (profissional.disponibilidade.fim < profissional.disponibilidade.inicio) return false;
    return true;
  }
}

