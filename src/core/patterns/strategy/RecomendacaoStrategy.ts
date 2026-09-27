import { Projeto } from '../../domain/Projeto.js';
import { Profissional } from '../../domain/Profissional.js';
import { Papel } from '../../domain/Papel.js';

export interface RecomendacaoStrategy {
  recomendar(
    projeto: Projeto,
    profissionais: Profissional[]
  ): Map<Papel, Profissional[]>;
}

