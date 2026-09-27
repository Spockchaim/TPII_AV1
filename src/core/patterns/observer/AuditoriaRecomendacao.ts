import { Observador } from './Observador.js';
import { EventoRecomendacao } from './EventoRecomendacao.js';

export interface LogAuditoria {
  id: string;
  timestamp: string;
  tipo: string;
  origem: string;
  dados: Record<string, any>;
}

export class AuditoriaRecomendacao implements Observador {
  private _logs: LogAuditoria[] = [];

  public atualizar(evento: EventoRecomendacao): void {
    const logItem: LogAuditoria = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: evento.timestamp.toISOString(),
      tipo: evento.tipo,
      origem: evento.origem,
      dados: Object.fromEntries(evento.dados),
    };

    this._logs.push(logItem);
  }

  public get logs(): ReadonlyArray<LogAuditoria> {
    return [...this._logs];
  }

  public exportarLogsJSON(): string {
    return JSON.stringify(this._logs, null, 2);
  }

  public limpar(): void {
    this._logs = [];
  }
}

