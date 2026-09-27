import { Projeto } from '../../domain/Projeto.js';
import { Profissional } from '../../domain/Profissional.js';

export interface VisitanteProjeto {
  visitarProjeto(projeto: Projeto): any;
  visitarProfissional(profissional: Profissional): any;
}
