export class Avaliacao {
  private _nota: number;
  private _comentario: string;
  private _data: Date;

  constructor(nota: number, comentario: string, data: Date = new Date()) {
    if (nota < 0 || nota > 5) {
      throw new Error('A nota da avaliação deve estar entre 0 e 5.');
    }
    this._nota = nota;
    this._comentario = comentario;
    this._data = new Date(data.getTime());
  }

  public get nota(): number {
    return this._nota;
  }

  public get comentario(): string {
    return this._comentario;
  }

  public get data(): Date {
    return new Date(this._data.getTime());
  }
}

