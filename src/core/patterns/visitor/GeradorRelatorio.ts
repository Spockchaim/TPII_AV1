import { VisitanteProjeto } from './VisitanteProjeto.js';
import { Projeto } from '../../domain/Projeto.js';
import { Profissional } from '../../domain/Profissional.js';

export class GeradorRelatorio implements VisitanteProjeto {
  /**
   * Compila um relatório executivo em formato texto/markdown para o produtor.
   */
  public visitarProjeto(projeto: Projeto): string {
    const linhas: string[] = [];

    linhas.push(`=== RELATÓRIO DO PROJETO: ${projeto.id} ===`);
    linhas.push(`Gênero: ${projeto.genero}`);
    linhas.push(`Duração estimada: ${projeto.duracao} min`);
    linhas.push(`Orçamento máximo: R$ ${projeto.orcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    linhas.push(`Prazo de entrega: ${projeto.prazo.toISOString().split('T')[0]}`);
    linhas.push(`Papéis exigidos: ${projeto.papeisObrigatorios.join(', ')}`);

    if (!projeto.equipe) {
      linhas.push(`Status da equipe: NENHUMA EQUIPE FORMADA`);
      return linhas.join('\n');
    }

    linhas.push(`\n--- COMPOSIÇÃO DA EQUIPE (${projeto.equipe.status}) ---`);
    linhas.push(`ID da Equipe: ${projeto.equipe.id}`);
    linhas.push(`Data de formação: ${projeto.equipe.dataFormacao.toISOString().split('T')[0]}`);

    for (const membro of projeto.equipe.membros) {
      const statusConvite = membro.confirmado ? '[CONFIRMADO]' : '[PENDENTE]';
      linhas.push(
        `- ${membro.papel}: ${membro.profissional.nome} (R$ ${membro.profissional.precoMedio}) ${statusConvite}`
      );
    }

    const custo = projeto.equipe.custoTotal();
    const saldo = projeto.orcamento - custo;

    linhas.push(`\nCusto Total da Equipe: R$ ${custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    linhas.push(`Saldo Restante: R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    linhas.push(`Todos os membros confirmados: ${projeto.equipe.todosConfirmados() ? 'SIM' : 'NÃO'}`);

    return linhas.join('\n');
  }

  /**
   * Compila o resumo do perfil de um profissional.
   */
  public visitarProfissional(profissional: Profissional): string {
    const linhas: string[] = [];
    linhas.push(`Profissional: ${profissional.nome} (ID: ${profissional.id})`);
    linhas.push(`Preço Médio: R$ ${profissional.precoMedio}`);
    linhas.push(`Média de Avaliações: ${profissional.calcularMediaAvaliacoes().toFixed(1)} / 5.0`);
    linhas.push(`Disponibilidade: ${profissional.disponibilidade.inicio.toISOString().split('T')[0]} até ${profissional.disponibilidade.fim.toISOString().split('T')[0]}`);
    linhas.push(`Competências: ${profissional.competencias.chaves().join(', ') || 'Nenhuma'}`);
    return linhas.join('\n');
  }
}

