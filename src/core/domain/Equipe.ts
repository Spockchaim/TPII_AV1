import { MembroEquipe } from './MembroEquipe.js';
import { Papel } from './Papel.js';
import { Profissional } from './Profissional.js';

export class Equipe {
  private _id: string;
  private _dataFormacao: Date;
  private _status: string;
  private _membros: MembroEquipe[];
  private _contagemSubstituicoes: number = 0;

  constructor(
    id: string,
    membros: MembroEquipe[],
    dataFormacao: Date = new Date(),
    status: string = 'EM_FORMACAO'
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('O ID da equipe é obrigatório.');
    }
    if (!membros || membros.length === 0) {
      throw new Error('Uma equipe deve conter pelo menos um membro (cardinalidade 1..*).');
    }

    this._id = id.trim();
    this._dataFormacao = new Date(dataFormacao.getTime());
    this._status = status;
    this._membros = [...membros];
  }

  public get id(): string {
    return this._id;
  }

  public get dataFormacao(): Date {
    return new Date(this._dataFormacao.getTime());
  }

  public get status(): string {
    return this._status;
  }

  public set status(novoStatus: string) {
    this._status = novoStatus;
  }

  public get membros(): ReadonlyArray<MembroEquipe> {
    return [...this._membros];
  }

  public obterMembroPorPapel(papel: Papel): MembroEquipe | undefined {
    return this._membros.find((m) => m.papel === papel);
  }

  public substituirMembro(papel: Papel, novoProfissional: Profissional): boolean {
    const membro = this.obterMembroPorPapel(papel);
    if (!membro) {
      return false;
    }
    membro.substituirProfissional(novoProfissional);
    this._contagemSubstituicoes++;
    this._status = 'EM_FORMACAO';
    return true;
  }

  public todosConfirmados(): boolean {
    return this._membros.every((m) => m.confirmado);
  }

  public get contagemSubstituicoes(): number {
    return this._contagemSubstituicoes;
  }

  public custoTotal(): number {
    return this._membros.reduce((acc, m) => acc + m.profissional.precoMedio, 0);
  }
}

