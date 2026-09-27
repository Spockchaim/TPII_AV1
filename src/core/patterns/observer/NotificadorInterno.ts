import { Observador } from './Observador.js';
import { EventoRecomendacao } from './EventoRecomendacao.js';

export interface MensagemInterna {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean;
  dataCriacao: Date;
}

export class NotificadorInterno implements Observador {
  private _mensagens: MensagemInterna[] = [];

  public atualizar(evento: EventoRecomendacao): void {
    const mensagemTexto = `Alerta do sistema: ${evento.tipo} processado com sucesso em ${evento.origem}.`;

    this._mensagens.push({
      id: `msg-${Date.now()}-${this._mensagens.length + 1}`,
      tipo: evento.tipo,
      mensagem: mensagemTexto,
      lida: false,
      dataCriacao: new Date(),
    });
  }

  public get mensagens(): ReadonlyArray<MensagemInterna> {
    return [...this._mensagens];
  }

  public marcarComoLida(id: string): void {
    const msg = this._mensagens.find((m) => m.id === id);
    if (msg) msg.lida = true;
  }

  public limpar(): void {
    this._mensagens = [];
  }
}

