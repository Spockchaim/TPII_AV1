export class EventoRecomendacao {
  private _tipo: string;
  private _dados: Map<string, any>;
  private _origem: string;
  private _timestamp: Date;

  constructor(
    tipo: string,
    dados: Map<string, any> = new Map(),
    origem: string = 'SistemaRecomendacao',
    timestamp: Date = new Date()
  ) {
    this._tipo = tipo;
    this._dados = new Map(dados);
    this._origem = origem;
    this._timestamp = new Date(timestamp.getTime());
  }

  public get tipo(): string {
    return this._tipo;
  }

  public get dados(): ReadonlyMap<string, any> {
    return this._dados;
  }

  public get origem(): string {
    return this._origem;
  }

  public get timestamp(): Date {
    return new Date(this._timestamp.getTime());
  }

  public toJSON(): Record<string, any> {
    return {
      tipo: this._tipo,
      origem: this._origem,
      timestamp: this._timestamp.toISOString(),
      dados: Object.fromEntries(this._dados),
    };
  }
}

