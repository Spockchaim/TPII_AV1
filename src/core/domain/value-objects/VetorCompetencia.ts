import { Competencia } from '../Competencia.js';

export class VetorCompetencia {
  private readonly _competencias: Map<string, number> = new Map();

  constructor(competencias: Competencia[] = []) {
    for (const comp of competencias) {
      this._competencias.set(comp.nome.toLowerCase(), comp.nivel);
    }
  }

  public get competencias(): Competencia[] {
    return Array.from(this._competencias.entries()).map(
      ([nome, nivel]) => new Competencia(nome, nivel)
    );
  }

  public obterNivel(nome: string): number {
    return this._competencias.get(nome.toLowerCase()) ?? 0;
  }

  public chaves(): string[] {
    return Array.from(this._competencias.keys());
  }

  public magnitude(): number {
    let somaQuadrados = 0;
    for (const nivel of this._competencias.values()) {
      somaQuadrados += nivel * nivel;
    }
    return Math.sqrt(somaQuadrados);
  }

  public similaridadeCosseno(outro: VetorCompetencia): number {
    const magA = this.magnitude();
    const magB = outro.magnitude();

    if (magA === 0 || magB === 0) {
      return 0;
    }

    let produtoEscalar = 0;
    for (const [chave, nivelA] of this._competencias.entries()) {
      const nivelB = outro.obterNivel(chave);
      produtoEscalar += nivelA * nivelB;
    }

    return produtoEscalar / (magA * magB);
  }
}

