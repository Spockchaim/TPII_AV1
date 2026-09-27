import { Projeto } from '../../domain/Projeto.js';
import { Profissional } from '../../domain/Profissional.js';
import { Equipe } from '../../domain/Equipe.js';
import { MembroEquipe } from '../../domain/MembroEquipe.js';
import { Papel } from '../../domain/Papel.js';
import { RecomendacaoStrategy } from '../strategy/RecomendacaoStrategy.js';

export abstract class OrquestradorEquipe {
  protected _profissionaisDisponiveis: Profissional[];

  constructor(profissionaisIniciais: Profissional[] = []) {
    this._profissionaisDisponiveis = [...profissionaisIniciais];
  }

  public definirProfissionais(profissionais: Profissional[]): void {
    this._profissionaisDisponiveis = [...profissionais];
  }

  /**
   * Template Method que define a sequência invariável do processo de orquestração.
   */
  public orquestrar(
    projeto: Projeto,
    estrategia: RecomendacaoStrategy
  ): Equipe {
    // 1. Validação invariante de restrições de projeto
    const valido = this.validarRestricoes(projeto);
    if (!valido) {
      throw new Error(
        `Restrições do projeto '${projeto.id}' não foram atendidas (orçamento ou prazo inválidos).`
      );
    }

    // 2. Normalização e filtragem de candidatos
    const profissionaisNormalizados = this.normalizarDados(
      projeto,
      this._profissionaisDisponiveis
    );

    // 3. Execução da estratégia de ranqueamento
    const recomendacoes = estrategia.recomendar(
      projeto,
      profissionaisNormalizados
    );

    // 4. Pós-processamento dos candidatos
    const recomendacoesProcessadas = this.posProcessar(recomendacoes);

    // 5. Montagem da equipe final (produz Equipe)
    const membros: MembroEquipe[] = [];
    const todosProfissionaisRecomendados: Profissional[] = [];

    for (const req of projeto.papeisObrigatorios) {
      const papel = req.papel;
      const candidatos = recomendacoesProcessadas.get(papel) ?? [];
      if (candidatos.length > 0) {
        // Aloca o melhor colocado da lista
        console.log("Candidatos para " + papel + ": " + candidatos.length); const escolhido = candidatos[0];
        membros.push(new MembroEquipe(papel, escolhido, false));
        todosProfissionaisRecomendados.push(...candidatos);
      }
    }

    if (membros.length !== projeto.papeisObrigatorios.length) {
      throw new Error(`Não foi possível encontrar profissionais para todos os papéis obrigatórios do projeto. Encontrados: ${membros.length}/${projeto.papeisObrigatorios.length}`);
    }

    const equipe = new Equipe(
      `equipe-${projeto.id}-${Date.now()}`,
      membros,
      new Date(),
      'EM_FORMACAO'
    );

    // Vincula a equipe e a lista de recomendados ao projeto
    projeto.equipe = equipe;
    projeto.profissionaisRecomendados = todosProfissionaisRecomendados;

    return equipe;
  }

  // Passos do Template Method delegados às subclasses
  protected abstract validarRestricoes(projeto: Projeto): boolean;
  protected abstract normalizarDados(
    projeto: Projeto,
    profissionais: Profissional[]
  ): Profissional[];
  protected abstract posProcessar(
    recomendacoes: Map<Papel, Profissional[]>
  ): Map<Papel, Profissional[]>;
}

