import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { PrismaClient } from '@prisma/client';
import { Projeto } from './core/domain/Projeto.js';
import { Papel } from './core/domain/Papel.js';
import { SistemaRecomendacao } from './core/services/SistemaRecomendacao.js';
import { Profissional } from './core/domain/Profissional.js';
import { Intervalo } from './core/domain/value-objects/Intervalo.js';
import { VetorCompetencia } from './core/domain/value-objects/VetorCompetencia.js';
import { Avaliacao } from './core/domain/Avaliacao.js';
import { Competencia } from './core/domain/Competencia.js';
import { RegrasOrcamento } from './core/patterns/strategy/RegrasOrcamento.js';
import { FiltragemColaborativa } from './core/patterns/strategy/FiltragemColaborativa.js';
import { SimilaridadeCosseno } from './core/patterns/strategy/SimilaridadeCosseno.js';
import { NotificadorEmail } from './core/patterns/observer/NotificadorEmail.js';
import { NotificadorInterno } from './core/patterns/observer/NotificadorInterno.js';
import { AuditoriaRecomendacao } from './core/patterns/observer/AuditoriaRecomendacao.js';
import { GeradorRelatorio } from './core/patterns/visitor/GeradorRelatorio.js';
import { ValidadorConsistencia } from './core/patterns/visitor/ValidadorConsistencia.js';
import { CalculadorCompatibilidade } from './core/patterns/visitor/CalculadorCompatibilidade.js';
import { Equipe } from './core/domain/Equipe.js';
import { MembroEquipe } from './core/domain/MembroEquipe.js';

const prisma = new PrismaClient();
const rl = readline.createInterface({ input, output });
const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

let projetoAtual: Projeto | null = null;
let sistema: SistemaRecomendacao | null = null;
let baseProfissionais: Profissional[] = [];
const auditoria = new AuditoriaRecomendacao();

function parseDataBr(dataStr: string): Date {
  const partes = dataStr.split('/');
  if (partes.length === 3) {
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const ano = parseInt(partes[2], 10);
    return new Date(ano, mes, dia);
  }
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);
}

async function carregarProfissionais() {
  const profsDb = await prisma.profissional.findMany({
    include: { competencias: true, avaliacoes: true, historicoProjetos: true }
  });
  return profsDb.map(p => {
    const vetor = new VetorCompetencia(p.competencias.map(c => new Competencia(c.nome as Papel, c.nivel)));
    const avaliacoes = p.avaliacoes.map(a => new Avaliacao(a.nota, a.comentario || ''));
    return new Profissional(p.id, p.nome, vetor, new Intervalo(p.disponibInicio, p.disponibFim), p.precoMedio, avaliacoes, [], [], p.localizacao);
  });
}

// Inicializa o Sistema
async function inicializarSistema() {
  baseProfissionais = await carregarProfissionais();
  sistema = new SistemaRecomendacao(undefined, undefined, baseProfissionais);
  sistema.adicionarObservador(new NotificadorEmail());
  sistema.adicionarObservador(new NotificadorInterno());
  sistema.adicionarObservador(auditoria);
}

async function carregarProjetoPorId(id: string) {
  const pDb = await prisma.projeto.findUnique({
    where: { id },
    include: { papeisObrigatorios: true, equipes: { include: { membros: { include: { profissional: { include: { competencias: true, avaliacoes: true } } } } } } }
  });
  if (!pDb) return null;
  
  const projeto = new Projeto(pDb.id, pDb.genero, pDb.duracao, pDb.orcamento, pDb.prazo, pDb.papeisObrigatorios.map(p => ({ papel: p.papel as Papel, peso: p.peso })), pDb.tipoCaptacao, pDb.localizacao);
  
  if (pDb.equipes.length > 0) {
    const eDb = pDb.equipes[0]; // Pega a equipe mais recente/ativa
    const membros = eDb.membros.map(m => {
      const vetor = new VetorCompetencia(m.profissional.competencias.map(c => new Competencia(c.nome as Papel, c.nivel)));
      const avaliacoes = m.profissional.avaliacoes.map(a => new Avaliacao(a.nota, a.comentario || ''));
      const prof = new Profissional(m.profissional.id, m.profissional.nome, vetor, new Intervalo(m.profissional.disponibInicio, m.profissional.disponibFim), m.profissional.precoMedio, avaliacoes, [], [], m.profissional.localizacao);
      return new MembroEquipe(m.papel as Papel, prof, m.confirmado);
    });
    const equipe = new Equipe(eDb.id, membros, eDb.dataFormacao, eDb.status);
    (equipe as any)._contagemSubstituicoes = eDb.contagemSubstituicoes;
    projeto.equipe = equipe;
  }
  return projeto;
}

async function menuCriarProjeto() {
  console.log('\n--- 📝 NOVO PROJETO ---');
  const genero = await rl.question('Gênero (ex: Ficção, Ação): ');
  const duracaoStr = await rl.question('Duração Estimada em min (ex: 120): ');
  const duracao = parseInt(duracaoStr) || 120;
  
  const orcamentoStr = await rl.question('Orçamento Total R$ (ex: 500000): ');
  const orcamento = parseFloat(orcamentoStr) || 500000;
  
  const prazoStr = await rl.question('Prazo de Entrega (DD/MM/AAAA): ');
  const tipoCaptacao = await rl.question('Tipo de Captação (ex: Digital, Analógico, Misto): ');
  const localizacao = await rl.question('Localização Principal (ex: São Paulo, Global): ');

  const listaPapeis = Object.values(Papel);
  console.log('\nPapéis válidos:');
  listaPapeis.forEach((p, index) => console.log(`  ${index + 1} - ${p}`));
  console.log(`  7 - EQUIPE COMPLETA (Todos os papéis)`);
  
  const papeisInput = await rl.question('\nDigite os NÚMEROS dos papéis necessários (separados por vírgula): ');
  const indicesEscolhidos = papeisInput.split(',').map(n => parseInt(n.trim()));
  let papeisLimpos: Papel[] = [];

  if (indicesEscolhidos.includes(7)) {
    papeisLimpos = [...listaPapeis];
  } else {
    papeisLimpos = indicesEscolhidos.map(i => i - 1).filter(i => !isNaN(i) && i >= 0 && i < listaPapeis.length).map(i => listaPapeis[i]);
  }

  if (papeisLimpos.length === 0) {
     console.log('Operação cancelada: Nenhum papel selecionado.');
     return;
  }

  const papeisObrigatorios = papeisLimpos.map(papel => ({ papel: papel as Papel, peso: 10 }));
  const id = `cli-proj-${Date.now()}`;
  
  projetoAtual = new Projeto(id, genero || 'Geral', duracao, orcamento, parseDataBr(prazoStr), papeisObrigatorios, tipoCaptacao || 'Ficção', localizacao || 'Global');

  try {
    await prisma.projeto.create({
      data: {
        id: projetoAtual.id, genero: projetoAtual.genero, duracao: projetoAtual.duracao, orcamento: projetoAtual.orcamento,
        prazo: projetoAtual.prazo, tipoCaptacao: projetoAtual.tipoCaptacao, localizacao: projetoAtual.localizacao,
        papeisObrigatorios: { create: projetoAtual.papeisObrigatorios.map(p => ({ papel: p.papel, peso: p.peso })) }
      }
    });
    console.log(`\n✅ Projeto salvo com o ID: ${projetoAtual.id}`);
  } catch (err) {
    console.error('Erro ao salvar projeto no DB:', String(err));
  }
}

async function menuRecomendarEquipe() {
  if (!projetoAtual) return console.log('⚠️ Selecione ou crie um projeto ativo primeiro.');
  if (projetoAtual.equipe) return console.log('⚠️ Este projeto já possui uma equipe. Você pode substituir membros ou reavaliar.');

  const estrategiaSelecionada = await rl.question('\nEstratégia (1-Cosseno/Técnico | 2-Colaborativa/Fama | 3-Orçamento): ');

  if (estrategiaSelecionada === '3') sistema!.definirEstrategia(new RegrasOrcamento());
  else if (estrategiaSelecionada === '2') sistema!.definirEstrategia(new FiltragemColaborativa());
  else sistema!.definirEstrategia(new SimilaridadeCosseno());

  console.log('\n🚀 Executando motor de IA...');
  try {
    const equipe = sistema!.executarRecomendacao(projetoAtual);
    
    // Salvar a Equipe no banco para este projeto
    const dbEquipe = await prisma.equipe.create({ data: { projetoId: projetoAtual.id, status: equipe.status } });
    for (const m of equipe.membros) {
      await prisma.membroEquipe.create({ data: { equipeId: dbEquipe.id, profissionalId: m.profissional.id, papel: m.papel, confirmado: false } });
    }
    
    console.log('\n✅ EQUIPE FORMADA COM SUCESSO!');
    console.log(`Custo Total: ${formatter.format(equipe.custoTotal())} / ${formatter.format(projetoAtual.orcamento)}`);
  } catch(e: any) {
    console.log(`❌ Falha: ${e.message}`);
  }
}

async function menuSelecionarProjeto() {
  console.log('\nCarregando últimos 10 projetos do banco...');
  const projetos = await prisma.projeto.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  if (projetos.length === 0) return console.log('Nenhum projeto no banco.');
  
  projetos.forEach((p, i) => console.log(`  ${i+1} - ID: ${p.id.substring(0,12)} | Gênero: ${p.genero} | Orçamento: ${formatter.format(p.orcamento)}`));
  const escolha = parseInt(await rl.question('\nDigite o número do projeto (ou 0 para cancelar): '));
  
  if (escolha > 0 && escolha <= projetos.length) {
    const pId = projetos[escolha - 1].id;
    projetoAtual = await carregarProjetoPorId(pId);
    console.log(`\n✅ Projeto [${projetoAtual?.id}] definido como Ativo!`);
  }
}

async function main() {
  console.log('==============================================');
  console.log('🎬 CINEBRIDGE - CLIENTE TERMINAL OFICIAL 🎬');
  console.log('==============================================');
  await inicializarSistema();
  console.log(`✅ ${baseProfissionais.length} profissionais conectados no motor.\n`);

  let executando = true;
  while (executando) {
    console.log('\n----------------------------------------------');
    console.log(`[PROJETO ATIVO: ${projetoAtual ? projetoAtual.id : 'NENHUM'}]`);
    console.log('1 - Criar Novo Projeto (Inserção Completa)');
    console.log('2 - Selecionar Projeto do Banco de Dados');
    console.log('3 - Gerar / Recomendar Equipe (IA)');
    console.log('4 - Ver Status da Equipe Atual');
    console.log('5 - Convites: Aceitar/Recusar');
    console.log('6 - Substituir Membro (Limite de 50%)');
    console.log('7 - Visitor: Relatórios e Análises');
    console.log('8 - Alterar Orçamento e Forçar Reavaliação Completa (RF05)');
    console.log('9 - Finalizar Projeto (Retroalimentar Currículos)');
    console.log('10 - Observer: Ver Logs de Auditoria');
    console.log('0 - Sair');
    
    const opcao = await rl.question('\nEscolha uma opção: ');

    if (opcao === '0') executando = false;
    else if (opcao === '1') await menuCriarProjeto();
    else if (opcao === '2') await menuSelecionarProjeto();
    else if (opcao === '10') {
      console.log('\n[Logs de Auditoria do Observer]');
      auditoria.logs.forEach((log, i) => console.log(`${i+1}. [${log.timestamp}] ${log.tipo} -> ${log.origem}`));
    }
    else if (!projetoAtual) console.log('⚠️ Selecione ou crie um projeto ativo primeiro.');
    else if (opcao === '3') await menuRecomendarEquipe();
    else if (!projetoAtual.equipe) console.log('⚠️ Este projeto ainda não tem equipe. Use a opção 3.');
    else if (opcao === '4') {
      console.log(`\nStatus: ${projetoAtual.equipe.status} | Subst: ${projetoAtual.equipe.contagemSubstituicoes || 0}`);
      projetoAtual.equipe.membros.forEach(m => console.log(`[${m.papel}] ${m.profissional.nome} -> Conf: ${m.confirmado ? 'SIM' : 'NÃO'} | ${formatter.format(m.profissional.precoMedio)}`));
    }
    else if (opcao === '5') {
      const papeis = projetoAtual.equipe.membros.map((m, i) => `${i + 1} - ${m.papel} (${m.profissional.nome})`);
      const esc = parseInt(await rl.question(`\nQual membro vai responder?\n${papeis.join('\n')}\nNúmero: `)) - 1;
      if (esc >= 0 && esc < projetoAtual.equipe.membros.length) {
        const res = await rl.question('Aceitou? (S/N): ');
        try {
          sistema!.responderConvite(projetoAtual, projetoAtual.equipe.membros[esc].profissional.id, res.toUpperCase() === 'S');
          console.log('Resposta registrada com sucesso!');
        } catch(e: any) { console.log(`Erro: ${e.message}`); }
      }
    }
    else if (opcao === '6') {
      const papeis = projetoAtual.equipe.membros.map((m, i) => `${i + 1} - ${m.papel} (${m.profissional.nome})`);
      const esc = parseInt(await rl.question(`\nQual papel substituir?\n${papeis.join('\n')}\nNúmero: `)) - 1;
      if (esc >= 0 && esc < projetoAtual.equipe.membros.length) {
        try {
          sistema!.substituirMembro(projetoAtual, projetoAtual.equipe.membros[esc].papel);
          console.log('Substituição realizada! Veja o novo status na opção 4.');
        } catch(e: any) { console.log(`Erro: ${e.message}`); }
      }
    }
    else if (opcao === '7') {
      console.log('\n' + projetoAtual.aceita(new GeradorRelatorio()));
      console.log(`Sinergia Técnica: ${projetoAtual.aceita(new CalculadorCompatibilidade())}%`);
      console.log(`Consistência Orçamentária: ${projetoAtual.aceita(new ValidadorConsistencia()) ? '✅ APROVADO' : '❌ ESTOURADO'}`);
    }
    else if (opcao === '8') {
      const novoOrcamento = parseFloat(await rl.question('\nNovo Orçamento R$: '));
      if (!isNaN(novoOrcamento) && novoOrcamento > 0) {
        (projetoAtual as any)._orcamento = novoOrcamento; 
        try {
          const novaEquipe = sistema!.reavaliarEquipe(projetoAtual);
          console.log(`\nEquipe reformulada! Novo Custo: ${formatter.format(novaEquipe.custoTotal())}`);
        } catch(e: any) { console.log('Erro:', e.message); }
      }
    }
    else if (opcao === '9') {
      const notaGeral = parseFloat(await rl.question('\nNota Final para a Equipe (1.0 a 5.0): '));
      const comentario = await rl.question('Comentário do Diretor: ');
      if (notaGeral >= 1 && notaGeral <= 5) {
        projetoAtual.equipe.status = 'FINALIZADA';
        for (const prof of projetoAtual.equipe.membros.map(m=>m.profissional)) {
          await prisma.historicoProjeto.create({ data: { profissionalId: prof.id, nomeProjeto: `${projetoAtual.genero} (CLI ID: ${projetoAtual.id})` }});
          await prisma.avaliacao.create({ data: { profissionalId: prof.id, nota: notaGeral, comentario }});
        }
        console.log('✅ Projeto FINALIZADO! Currículos da equipe retroalimentados no banco de dados!');
      } else console.log('Nota inválida.');
    }
    else console.log('Opção inválida.');
  }

  rl.close();
  await prisma.$disconnect();
  console.log('Saindo do CineBridge... Até a próxima!');
}

main().catch(err => {
  console.error('\nErro Crítico:', String(err));
  rl.close();
  prisma.$disconnect();
});
