import { Papel, PapelRequisito } from './Papel.js';
import { Profissional } from './Profissional.js';
import { Equipe } from './Equipe.js';
import { MembroEquipe } from './MembroEquipe.js';
import { VisitanteProjeto } from '../patterns/visitor/VisitanteProjeto.js';

export type PapelOuRequisito = Papel | PapelRequisito;

export class Projeto {
  private _id: string;
  private _genero: string;
  private _duracao: number;
  private _orcamento: number;
  private _prazo: Date;
  private _tipoCaptacao: string;
  private _localizacao: string;
  private _papeisObrigatorios: PapelRequisito[];
  private _profissionaisRecomendados: Profissional[] = [];
  private _equipe?: Equipe;
  private _precisaReavaliacao: boolean = false;

  constructor(
    id: string,
    genero: string,
    duracao: number,
    orcamento: number,
    prazo: Date,
    papeisObrigatorios: PapelOuRequisito[] = [],
    tipoCaptacao: string = "ficção",
    localizacao: string = "Global"
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('O ID do projeto é obrigatório.');
    }
    if (duracao <= 0) {
      throw new Error('A duração do projeto deve ser positiva.');
    }
    if (orcamento <= 0) {
      throw new Error('O orçamento do projeto deve ser positivo.');
    }

    this._id = id.trim();
    this._genero = genero;
    this._duracao = duracao;
    this._orcamento = orcamento;
    this._prazo = new Date(prazo.getTime());
    this._tipoCaptacao = tipoCaptacao;
    this._localizacao = localizacao;

    const papeisMapeados = papeisObrigatorios.map(p => {
      if (typeof p === 'string') {
        return { papel: p, peso: 10 / (papeisObrigatorios.length || 1) };
      }
      return p;
    });

    const somaPesos = papeisMapeados.reduce((soma, p) => soma + p.peso, 0);
    
    // Validação de totalização 
    if (papeisMapeados.length > 0 && Math.abs(somaPesos - 10) > 0.01) {
      throw new Error(`A soma total dos pesos dos papéis deve ser exatamente 10 . Soma atual enviada: ${somaPesos}`);
    }

    // Ordenação decrescente de peso para garantir prioridade de escolha na orquestração
    papeisMapeados.sort((a, b) => b.peso - a.peso);

    this._papeisObrigatorios = papeisMapeados;
  }

  public get id(): string {
    return this._id;
  }

  public get genero(): string {
    return this._genero;
  }

  public get duracao(): number {
    return this._duracao;
  }

  public get orcamento(): number {
    return this._orcamento;
  }

  public set orcamento(novoOrcamento: number) {
    if (novoOrcamento <= 0) throw new Error('O orçamento deve ser positivo.');
    this._orcamento = novoOrcamento;
    this._precisaReavaliacao = true;
  }

  public get prazo(): Date {
    return new Date(this._prazo.getTime());
  }

  public set prazo(novoPrazo: Date) {
    this._prazo = new Date(novoPrazo.getTime());
    this._precisaReavaliacao = true;
  }

  public get papeisObrigatorios(): ReadonlyArray<PapelRequisito> {
    return [...this._papeisObrigatorios];
  }

  public get profissionaisRecomendados(): ReadonlyArray<Profissional> {
    return [...this._profissionaisRecomendados];
  }

  public set profissionaisRecomendados(profissionais: Profissional[]) {
    this._profissionaisRecomendados = [...profissionais];
  }

  public get equipe(): Equipe | undefined {
    return this._equipe;
  }

  public set equipe(equipe: Equipe | undefined) {
    this._equipe = equipe;
    this._precisaReavaliacao = false;
  }

  public get precisaReavaliacao(): boolean {
    return this._precisaReavaliacao;
  }

  public aceitarRecomendacao(papel: Papel, profissional: Profissional): void {
    if (!this._equipe) {
      const novoMembro = new MembroEquipe(papel, profissional, true);
      this._equipe = new Equipe(`equipe-${this._id}`, [novoMembro]);
      return;
    }

    const membro = this._equipe.obterMembroPorPapel(papel);
    if (membro) {
      membro.confirmar();
    } else {
      const novoMembro = new MembroEquipe(papel, profissional, true);
      const membrosAtualizados = [...this._equipe.membros, novoMembro];
      this._equipe = new Equipe(this._equipe.id, membrosAtualizados, this._equipe.dataFormacao);
    }
  }

  public substituirMembro(papel: Papel, novoProfissional: Profissional): void {
    if (!this._equipe) {
      throw new Error('Não há equipe definida para realizar substituição.');
    }
    const sucesso = this._equipe.substituirMembro(papel, novoProfissional);
    if (!sucesso) {
      throw new Error(`Não foi encontrado membro com o papel ${papel} na equipe.`);
    }
  }

  public solicitarReavaliacao(): void {
    this._precisaReavaliacao = true;
  }

  public aceita(visitante: VisitanteProjeto): any {
    return visitante.visitarProjeto(this);
  }

  public get tipoCaptacao(): string {
    return this._tipoCaptacao;
  }

  public get localizacao(): string {
    return this._localizacao;
  }
}
