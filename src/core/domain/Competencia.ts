export class Competencia {
  private _nome: string;
  private _nivel: number;

  constructor(nome: string, nivel: number) {
    if (!nome || nome.trim().length === 0) {
      throw new Error('O nome da competência não pode ser vazio.');
    }
    if (nivel < 0 || nivel > 10) {
      throw new Error('O nível da competência deve estar entre 0 e 10.');
    }
    this._nome = nome.trim();
    this._nivel = nivel;
  }

  public get nome(): string {
    return this._nome;
  }

  public get nivel(): number {
    return this._nivel;
  }
}

