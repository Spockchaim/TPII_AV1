export enum Papel {
  DIRETOR = 'DIRETOR',
  DIRETOR_FOTOGRAFIA = 'DIRETOR_FOTOGRAFIA',
  SONOPLASTA = 'SONOPLASTA',
  EDITOR = 'EDITOR',
  ROTEIRISTA = 'ROTEIRISTA',
  EFETOS_VISUAIS = 'EFETOS_VISUAIS',
}


export type PapelRequisito = {
  papel: Papel;
  peso: number;
};
