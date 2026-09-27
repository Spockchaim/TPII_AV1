import { buildApp } from './app.js';

const app = buildApp();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🎬 [CineBridge] Microsserviço de Recomendação rodando em http://${HOST}:${PORT}`);
    console.log(`📡 Endpoints disponíveis:`);
    console.log(`   GET  /profissionais                      -> Listar todos os profissionais`);
    console.log(`   GET  /projetos                           -> Listar todos os projetos`);
    console.log(`   POST /projetos                           -> Cadastrar projeto`);
    console.log(`   GET  /projetos/:id                       -> Consultar projeto e equipe`);
    console.log(`   POST /projetos/:id/recomendar?estrategia -> Executar IA e recomendação`);
    console.log(`   POST /projetos/:id/equipe/substituir     -> Substituição de membro (Limiar de 50%)`);
    console.log(`   POST /projetos/:id/convites/responder    -> Responder convite do profissional`);
    console.log(`   POST /projetos/:id/finalizar             -> Finalizar projeto e avaliar equipe`);
    console.log(`   GET  /projetos/:id/relatorio             -> Relatório (Visitor)`);
    console.log(`   GET  /projetos/:id/analise               -> Análise de consistência`);
    console.log(`   PATCH /projetos/:id                      -> Edição universal do projeto (RF05)`);
    console.log(`   GET   /auditoria                         -> Logs estruturados (Observer)`);
  } catch (err) {
    console.error('Erro ao iniciar o servidor Fastify:', err);
    process.exit(1);
  }
}

start();

