import { VetorCompetencia } from './value-objects/VetorCompetencia.js';
import { Intervalo } from './value-objects/Intervalo.js';
import { Avaliacao } from './Avaliacao.js';
import { VisitanteProjeto } from '../patterns/visitor/VisitanteProjeto.js';

export class Profissional {
  private _id: string;
  private _nome: string;
  private _competencias: VetorCompetencia;
  private _disponibilidade: Intervalo;
  private _precoMedio: number;
  private _avaliacoes: Avaliacao[];
  private _historicoProjetos: string[];
  private _especialidades: string[];
  private _localizacao: string;

  constructor(
    id: string,
    nome: string,
    competencias: VetorCompetencia,
    disponibilidade: Intervalo,
    precoMedio: number,
    avaliacoes: Avaliacao[] = [],
    historicoProjetos: string[] = [],
    especialidades: string[] = [],
    localizacao: string = "Global"
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('O ID do profissional é obrigatório.');
    }
    if (!nome || nome.trim().length === 0) {
      throw new Error('O nome do profissional é obrigatório.');
    }
    if (precoMedio < 0) {
      throw new Error('O preço médio não pode ser negativo.');
    }

    this._id = id.trim();
    this._nome = nome.trim();
    this._competencias = competencias;
    this._disponibilidade = disponibilidade;
    this._historicoProjetos = [...historicoProjetos];
    this._especialidades = [...especialidades];
    this._localizacao = localizacao;
    this._precoMedio = precoMedio;
    this._avaliacoes = [...avaliacoes];
  }

  public get id(): string {
    return this._id;
  }

  public get nome(): string {
    return this._nome;
  }

  public get competencias(): VetorCompetencia {
    return this._competencias;
  }

  public get disponibilidade(): Intervalo {
    return this._disponibilidade;
  }

  public get precoMedio(): number {
    return this._precoMedio;
  }

  public get avaliacoes(): ReadonlyArray<Avaliacao> {
    return [...this._avaliacoes];
  }

  public adicionarAvaliacao(avaliacao: Avaliacao): void {
    this._avaliacoes.push(avaliacao);
  }

  public calcularMediaAvaliacoes(): number {
    if (this._avaliacoes.length === 0) return 0;
    const soma = this._avaliacoes.reduce((acc, curr) => acc + curr.nota, 0);
    return soma / this._avaliacoes.length;
  }

  public aceita(visitante: VisitanteProjeto): any {
    return visitante.visitarProfissional(this);
  }

  public get historicoProjetos(): ReadonlyArray<string> {
    return [...this._historicoProjetos];
  }

  public get especialidades(): ReadonlyArray<string> {
    return [...this._especialidades];
  }

  public get localizacao(): string {
    return this._localizacao;
  }
}
