export class Intervalo {
  private readonly _inicio: Date;
  private readonly _fim: Date;

  constructor(inicio: Date, fim: Date) {
    if (fim < inicio) {
      throw new Error('A data final do intervalo não pode ser anterior à data inicial.');
    }
    this._inicio = new Date(inicio.getTime());
    this._fim = new Date(fim.getTime());
  }

  public get inicio(): Date {
    return new Date(this._inicio.getTime());
  }

  public get fim(): Date {
    return new Date(this._fim.getTime());
  }

  public sobrepoe(outro: Intervalo): boolean {
    return this._inicio <= outro._fim && this._fim >= outro._inicio;
  }

  public contem(data: Date): boolean {
    return data >= this._inicio && data <= this._fim;
  }

  public contemIntervalo(outro: Intervalo): boolean {
    return this._inicio <= outro._inicio && this._fim >= outro._fim;
  }
}

