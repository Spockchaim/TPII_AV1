import { EventEmitter } from 'events';
import { Projeto } from '../domain/Projeto.js';
import { Equipe } from '../domain/Equipe.js';
import { Profissional } from '../domain/Profissional.js';
import { Papel } from '../domain/Papel.js';
import { RecomendacaoStrategy } from '../patterns/strategy/RecomendacaoStrategy.js';
import { OrquestradorEquipe } from '../patterns/template-method/OrquestradorEquipe.js';
import { OrquestradorPadrao } from '../patterns/template-method/OrquestradorPadrao.js';
import { Observador } from '../patterns/observer/Observador.js';
import { EventoRecomendacao } from '../patterns/observer/EventoRecomendacao.js';
import { SimilaridadeCosseno } from '../patterns/strategy/SimilaridadeCosseno.js';

export class SistemaRecomendacao {
  private _observadores: Observador[] = [];
  private _estrategiaAtual: RecomendacaoStrategy;
  private _orquestrador: OrquestradorEquipe;
  private _fallbackProfissionais: Profissional[] = [];

  constructor(
    estrategiaInicial: RecomendacaoStrategy = new SimilaridadeCosseno(),
    orquestrador?: OrquestradorEquipe,
    profissionaisIniciais: Profissional[] = []
  ) {
    this._estrategiaAtual = estrategiaInicial;
    this._eventBus = new EventEmitter();
    this._orquestrador = orquestrador ?? new OrquestradorPadrao(profissionaisIniciais);
    this._fallbackProfissionais = [...profissionaisIniciais];
  }

  public get estrategiaAtual(): RecomendacaoStrategy {
    return this._estrategiaAtual;
  }

  public definirEstrategia(estrategia: RecomendacaoStrategy): void {
    this._estrategiaAtual = estrategia;
  }

  public adicionarObservador(obs: Observador): void {
    this._observadores.push(obs);
    // Binding com EventEmitter do Node.js para cumprir requisito arquitetural (Event-Driven)
    this._eventBus.on('CINEBRIDGE_EVENTO', (evento: EventoRecomendacao) => {
      try { obs.atualizar(evento); } catch(err) { console.error('Falha no observador:', err); }
    });
  }

  public removerObservador(obs: Observador): void {
    this._observadores = this._observadores.filter((o) => o !== obs);
    this._eventBus.removeAllListeners('CINEBRIDGE_EVENTO'); // Reset listeners simplificado
    this._observadores.forEach(o => this._eventBus.on('CINEBRIDGE_EVENTO', (evento: EventoRecomendacao) => o.atualizar(evento)));
  }

  public notificarObservadores(evento: EventoRecomendacao): void {
    // Delegação do evento para o EventBus (Permite fácil troca para RabbitMQ no futuro)
    try {
      this._eventBus.emit('CINEBRIDGE_EVENTO', evento);
    } catch (err) {
      console.error('Erro na notificação geral:', err);
    }
  }

  /**
   * Executa a orquestração de recomendação de equipe com a estratégia ativa.
   * Suporta resiliência com fallback para base local caso ocorra indisponibilidade.
   */
  public executarRecomendacao(
    projeto: Projeto,
    provedorExternoProfissionais?: () => Profissional[]
  ): Equipe {
    let profissionais: Profissional[];

    try {
      if (provedorExternoProfissionais) {
        profissionais = provedorExternoProfissionais();
      } else {
        profissionais = this._fallbackProfissionais;
      }
    } catch (erro) {
      // RNF05: Resiliência e Fallback caso o serviço externo de profissionais esteja indisponível
      this.notificarObservadores(
        new EventoRecomendacao(
          'FALHA_CATALOGO_PROFISSIONAIS',
          new Map<string, any>([
            ['projetoId', projeto.id],
            ['motivo', erro instanceof Error ? erro.message : 'Falha desconhecida'],
            ['acao', 'Ativando base de dados de fallback em cache local'],
          ]),
          'SistemaRecomendacao'
        )
      );
      profissionais = this._fallbackProfissionais;
    }

    console.log("Definindo: " + profissionais.length); this._orquestrador.definirProfissionais(profissionais);
    const equipe = this._orquestrador.orquestrar(projeto, this._estrategiaAtual);

    // Dispara evento de equipe gerada
    this.notificarObservadores(
      new EventoRecomendacao(
        'EQUIPE_RECOMENDADA',
        new Map<string, any>([
          ['projetoId', projeto.id],
          ['equipeId', equipe.id],
          ['totalMembros', equipe.membros.length],
          ['estrategia', this._estrategiaAtual.constructor.name],
          ['custoTotal', equipe.custoTotal()],
        ]),
        'SistemaRecomendacao'
      )
    );

    // Notifica convites para cada profissional recomendado
    for (const membro of equipe.membros) {
      this.notificarObservadores(
        new EventoRecomendacao(
          'CONVITE_ENVIADO',
          new Map<string, any>([
            ['projetoId', projeto.id],
            ['profissionalId', membro.profissional.id],
            ['profissionalNome', membro.profissional.nome],
            ['papel', membro.papel],
          ]),
          'SistemaRecomendacao'
        )
      );
    }

    return equipe;
  }

  /**
   * Realiza a substituição pontual de um membro para um papel específico,
   * mantendo as demais escolhas da equipe fixas (RF04).
   */
  public substituirMembro(
    projeto: Projeto,
    papel: Papel,
    novoProfissional?: Profissional
  ): boolean {
    if (!projeto.equipe) {
      throw new Error('O projeto não possui uma equipe formada para substituição.');
    }

    let profissionalParaAlocar = novoProfissional;

    // Se nenhum profissional específico foi passado, busca o próximo candidato disponível
    if (!profissionalParaAlocar) {
      const membrosJaAlocados = new Set(
        projeto.equipe.membros.map((m) => m.profissional.id)
      );

      const candidatos = projeto.profissionaisRecomendados.filter(
        (p) =>
          !membrosJaAlocados.has(p.id) &&
          p.competencias.obterNivel(papel) > 0
      );

      if (candidatos.length === 0) {
        throw new Error(
          `Não há candidatos substitutos disponíveis para o papel ${papel}.`
        );
      }

      profissionalParaAlocar = candidatos[0];
    }

    const sucesso = projeto.equipe.substituirMembro(papel, profissionalParaAlocar);

    // Regra de Negócio: Se mudar mais de 50% das pessoas do time, reavalia a equipe inteira
    const limiteSubstituicoes = Math.max(1, Math.floor(projeto.equipe.membros.length / 2));
    if (projeto.equipe.contagemSubstituicoes > limiteSubstituicoes) {
       console.log(`⚠️ Alerta: Mais de ${limiteSubstituicoes} substituições realizadas. Refazendo o time inteiro!`);
       this.reavaliarEquipe(projeto);
       return true;
    }

    if (sucesso) {
      this.notificarObservadores(
        new EventoRecomendacao(
          'MEMBRO_SUBSTITUIDO',
          new Map<string, any>([
            ['projetoId', projeto.id],
            ['papel', papel],
            ['novoProfissionalId', profissionalParaAlocar.id],
            ['novoProfissionalNome', profissionalParaAlocar.nome],
          ]),
          'SistemaRecomendacao'
        )
      );

      // Emite novo convite para o substituto
      this.notificarObservadores(
        new EventoRecomendacao(
          'CONVITE_ENVIADO',
          new Map<string, any>([
            ['projetoId', projeto.id],
            ['profissionalId', profissionalParaAlocar.id],
            ['papel', papel],
          ]),
          'SistemaRecomendacao'
        )
      );
    }

    return sucesso;
  }

  /**
   * Responde ao convite de um profissional. Se aceito, atualiza a equipe.
   * Se recusado, aciona a busca e alocação automática de um substituto (RF06).
   */
  public responderConvite(
    projeto: Projeto,
    profissionalId: string,
    aceitou: boolean
  ): void {
    if (!projeto.equipe) {
      throw new Error('O projeto não possui equipe formada.');
    }

    const membro = projeto.equipe.membros.find(
      (m) => m.profissional.id === profissionalId
    );

    if (!membro) {
      throw new Error(
        `Profissional com ID '${profissionalId}' não foi encontrado na equipe do projeto.`
      );
    }

    if (aceitou) {
      membro.confirmar();

      this.notificarObservadores(
        new EventoRecomendacao(
          'CONVITE_ACEITO',
          new Map<string, any>([
            ['projetoId', projeto.id],
            ['profissionalId', profissionalId],
            ['papel', membro.papel],
          ]),
          'SistemaRecomendacao'
        )
      );

      // Se todos estiverem confirmados, registra fechamento consensual (RF07)
      if (projeto.equipe.todosConfirmados()) {
        projeto.equipe.status = 'CONSOLIDADA';

        this.notificarObservadores(
          new EventoRecomendacao(
            'EQUIPE_CONSOLIDADA',
            new Map<string, any>([
              ['projetoId', projeto.id],
              ['equipeId', projeto.equipe.id],
              ['totalMembros', projeto.equipe.membros.length],
              ['custoFinal', projeto.equipe.custoTotal()],
            ]),
            'SistemaRecomendacao'
          )
        );
      }
    } else {
      membro.recusar();

      this.notificarObservadores(
        new EventoRecomendacao(
          'CONVITE_RECUSADO',
          new Map<string, any>([
            ['projetoId', projeto.id],
            ['profissionalId', profissionalId],
            ['papel', membro.papel],
          ]),
          'SistemaRecomendacao'
        )
      );

      // Dispara substituição automática para o papel afetado
      this.substituirMembro(projeto, membro.papel);
    }
  }

  /**
   * Reavaliação completa da equipe caso haja alterações significativas no orçamento ou cronograma (RF05).
   */
  public reavaliarEquipe(projeto: Projeto): Equipe {
    projeto.solicitarReavaliacao();

    this.notificarObservadores(
      new EventoRecomendacao(
        'REAVALIACAO_SOLICITADA',
        new Map<string, any>([
          ['projetoId', projeto.id],
          ['novoOrcamento', projeto.orcamento],
          ['novoPrazo', projeto.prazo.toISOString()],
        ]),
        'SistemaRecomendacao'
      )
    );

    return this.executarRecomendacao(projeto);
  }
}
