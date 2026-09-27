import { Observador } from './Observador.js';
import { EventoRecomendacao } from './EventoRecomendacao.js';

export interface EmailEnviado {
  destinatario: string;
  assunto: string;
  corpo: string;
  dataEnvio: Date;
}

export class NotificadorEmail implements Observador {
  private _emailsEnviados: EmailEnviado[] = [];

  public atualizar(evento: EventoRecomendacao): void {
    const dados = evento.dados;
    const destinatario = dados.get('email') ?? 'destinatario@cinebridge.com';
    const assunto = `[CineBridge] Atualização: ${evento.tipo}`;
    const corpo = `Notificação originada por ${evento.origem}. Detalhes: ${JSON.stringify(
      Object.fromEntries(dados)
    )}`;

    this._emailsEnviados.push({
      destinatario,
      assunto,
      corpo,
      dataEnvio: new Date(),
    });
  }

  public get emailsEnviados(): ReadonlyArray<EmailEnviado> {
    return [...this._emailsEnviados];
  }

  public limpar(): void {
    this._emailsEnviados = [];
  }
}

