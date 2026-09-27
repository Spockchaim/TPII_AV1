import { EventoRecomendacao } from './EventoRecomendacao.js';

export interface Observador {
  atualizar(evento: EventoRecomendacao): void;
}

