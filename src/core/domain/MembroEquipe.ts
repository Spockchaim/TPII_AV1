import { Papel } from './Papel.js';
import { Profissional } from './Profissional.js';

export class MembroEquipe {
  private _papel: Papel;
  private _confirmado: boolean;
  private _profissional: Profissional;

  constructor(papel: Papel, profissional: Profissional, confirmado: boolean = false) {
    this._papel = papel;
    this._profissional = profissional;
    this._confirmado = confirmado;
  }

  public get papel(): Papel {
    return this._papel;
  }

  public get confirmado(): boolean {
    return this._confirmado;
  }

  public get profissional(): Profissional {
    return this._profissional;
  }

  public confirmar(): void {
    this._confirmado = true;
  }

  public recusar(): void {
    this._confirmado = false;
  }

  public substituirProfissional(novoProfissional: Profissional): void {
    this._profissional = novoProfissional;
    this._confirmado = false;
  }
}

