import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const papeis = ['DIRETOR', 'DIRETOR_FOTOGRAFIA', 'EDITOR', 'SONOPLASTA', 'ROTEIRISTA', 'EFEITOS_VISUAIS'];
const nomesPrimeiros = ['Lucas', 'Ana', 'Pedro', 'Maria', 'João', 'Camila', 'Rafael', 'Julia', 'Carlos', 'Mariana', 'Fernando', 'Beatriz', 'Diego', 'Amanda', 'Rodrigo', 'Laura', 'Gabriel', 'Isabella', 'Thiago', 'Sofia'];
const nomesSobrenomes = ['Silva', 'Costa', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Ribeiro', 'Martins', 'Carvalho', 'Mendes', 'Nunes', 'Rocha', 'Moreira', 'Dias', 'Cardoso'];

function gerarNomeAleatorio() {
  const p = nomesPrimeiros[Math.floor(Math.random() * nomesPrimeiros.length)];
  const s = nomesSobrenomes[Math.floor(Math.random() * nomesSobrenomes.length)];
  return `${p} ${s}`;
}

async function main() {
  console.log('Limpando base antiga...');
  await prisma.projeto.deleteMany();
  await prisma.profissional.deleteMany();

  console.log('Gerando base robusta (> 10 profissionais por papel)...');

  let totaisGerados = 0;

  for (const papelPrincipal of papeis) {
    const qtdProfissionais = Math.floor(Math.random() * 4) + 12; 

    for (let i = 0; i < qtdProfissionais; i++) {
      const isTopTier = Math.random() < 0.15;
      const isMidTier = Math.random() < 0.50;
      
      let precoMedio = 0;
      let nivelPrincipal = 0;
      let notaBase = 0;
      
      if (isTopTier) {
        precoMedio = Math.floor(Math.random() * 100000) + 80000;
        nivelPrincipal = Math.floor(Math.random() * 2) + 9;
        notaBase = 4.5 + Math.random() * 0.5;
      } else if (isMidTier) {
        precoMedio = Math.floor(Math.random() * 30000) + 15000;
        nivelPrincipal = Math.floor(Math.random() * 3) + 6;
        notaBase = 3.5 + Math.random() * 1.0;
      } else {
        precoMedio = Math.floor(Math.random() * 8000) + 2000;
        nivelPrincipal = Math.floor(Math.random() * 3) + 3;
        notaBase = 2.0 + Math.random() * 1.5;
      }

      const competencias = [
        { nome: papelPrincipal, nivel: nivelPrincipal }
      ];

      const qtdSecundaria = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < qtdSecundaria; j++) {
        const papelSecundario = papeis[Math.floor(Math.random() * papeis.length)];
        if (papelSecundario !== papelPrincipal && !competencias.some(c => c.nome === papelSecundario)) {
           const nivelSecundario = Math.max(1, nivelPrincipal - (Math.floor(Math.random() * 4) + 3));
           competencias.push({ nome: papelSecundario, nivel: nivelSecundario });
        }
      }

      // Variando a disponibilidade temporal
      // Pode estar disponível hoje até +30 a +180 dias.
      const inicioDeslocamentoDias = Math.floor(Math.random() * 30); // começa de 0 a 30 dias no futuro
      const duracaoDias = Math.floor(Math.random() * 150) + 30; // fica disponível de 30 a 180 dias
      
      const disponibInicio = new Date();
      disponibInicio.setDate(disponibInicio.getDate() + inicioDeslocamentoDias);
      
      const disponibFim = new Date(disponibInicio);
      disponibFim.setDate(disponibFim.getDate() + duracaoDias);

      const titulosFilmes = ['O Vingador', 'Sombras da Noite', 'Dias de Sol', 'Futuro Distante', 'A Última Fronteira', 'Riso Fácil', 'Lágrimas do Passado'];

      // ...
      const qtdHistorico = Math.floor(Math.random() * 3) + 1;
      const historicoProjetos = [];
      for(let k = 0; k < qtdHistorico; k++) {
        historicoProjetos.push({ nomeProjeto: titulosFilmes[Math.floor(Math.random() * titulosFilmes.length)] + ' - ' + (2015 + Math.floor(Math.random() * 10)) });
      }

      await prisma.profissional.create({
        data: {
          nome: gerarNomeAleatorio() + (isTopTier ? ' (Elite)' : (isMidTier ? '' : ' (Júnior)')),
          precoMedio,
          disponibInicio,
          disponibFim,
          localizacao: ['São Paulo', 'Rio de Janeiro', 'Curitiba', 'Belo Horizonte', 'Remoto'][Math.floor(Math.random() * 5)],
          avaliacoes: {
            create: [
              { nota: Number(notaBase.toFixed(1)), comentario: 'Trabalho incrível no projeto ' + historicoProjetos[0].nomeProjeto },
              { nota: Number((notaBase - (Math.random() * 0.5)).toFixed(1)), comentario: 'Boa atuação.' }
            ],
          },
          historicoProjetos: {
            create: historicoProjetos
          },
          competencias: {
            create: competencias
          },
          especialidades: {
            create: (() => {
              const tagsBase = ['Edição 4K', 'Câmera Subaquática', 'CGI Avançado', 'Terror Psicológico', 'Animação Stop-Motion', 'Som Dolby Atmos', 'Iluminação Natural', 'Direção de Atores', 'Cenografia de Época', 'Roteiro de Comédia'];
              const qtd = Math.floor(Math.random() * 3) + 1; // 1 a 3 especialidades
              const shuffled = [...tagsBase].sort(() => 0.5 - Math.random());
              return shuffled.slice(0, qtd).map(tag => ({ nome: tag }));
            })()
          }
        }
      });
      totaisGerados++;
    }
  }

  
  console.log('Gerando Projetos fictícios ativos do estúdio...');
  const generos = ['Ficção Científica', 'Drama', 'Comédia', 'Documentário', 'Ação', 'Terror'];
  const locacoes = ['São Paulo', 'Rio de Janeiro', 'Nova Iorque', 'Londres', 'Remoto'];
  
  for (let i = 0; i < 15; i++) {
    const isFinished = Math.random() < 0.3; // 30% dos projetos já estão "FINALIZADOS"
    
    // Sorteia de 3 a 6 papéis aleatórios sem repetir
    const shuffledPapeis = [...papeis].sort(() => 0.5 - Math.random());
    const qtdPapeis = Math.floor(Math.random() * 4) + 3;
    const papeisEscolhidos = shuffledPapeis.slice(0, qtdPapeis);
    
    const projetoCriado = await prisma.projeto.create({
      data: {
        genero: generos[Math.floor(Math.random() * generos.length)],
        duracao: Math.floor(Math.random() * 120) + 60,
        orcamento: Math.floor(Math.random() * 900000) + 100000,
        prazo: new Date(Date.now() + 1000 * 60 * 60 * 24 * (Math.floor(Math.random() * 150) + 30)),
        localizacao: locacoes[Math.floor(Math.random() * locacoes.length)],
        papeisObrigatorios: {
          create: papeisEscolhidos.map(p => ({ papel: p, peso: 10 / papeisEscolhidos.length }))
        }
      },
      include: { papeisObrigatorios: true }
    });
    
    // Vamos simular uma Equipe já alocada se o projeto for finalizado ou em andamento avançado
    if (Math.random() < 0.6) {
      // Cria a equipe
      const equipe = await prisma.equipe.create({
        data: {
          projetoId: projetoCriado.id,
          status: isFinished ? 'FINALIZADA' : 'CONSOLIDADA',
        }
      });
      
      // Pega profissionais aleatórios do banco que tenham a competência para preencher
      for (const papelObrigatorio of projetoCriado.papeisObrigatorios) {
        const profsComHabilidade = await prisma.profissional.findMany({
          where: { competencias: { some: { nome: papelObrigatorio.papel, nivel: { gt: 3 } } } },
          take: 5
        });
        
        if (profsComHabilidade.length > 0) {
           const profSorteado = profsComHabilidade[Math.floor(Math.random() * profsComHabilidade.length)];
           await prisma.membroEquipe.create({
             data: {
               equipeId: equipe.id,
               profissionalId: profSorteado.id,
               papel: papelObrigatorio.papel,
               confirmado: true
             }
           });
        }
      }
    }
  }


  console.log('Injetando o Ronaldinho Gaúcho (Easter Egg)...');
  await prisma.profissional.create({
    data: {
      nome: 'Ronaldinho Gaúcho (O Bruxo da Edição)',
      precoMedio: 1000000,
      disponibInicio: new Date(),
      disponibFim: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      localizacao: 'Global',
      avaliacoes: {
        create: [
          { nota: 5.0, comentario: 'Mágico! Ele editou olhando pro outro lado.' },
          { nota: 5.0, comentario: 'Melhor editor da história. Fez o corte de letra.' }
        ],
      },
      historicoProjetos: {
        create: [
          { nomeProjeto: 'Bruxaria em Campo - 2002' }
        ]
      },
      competencias: {
        create: [
          { nome: 'EDITOR', nivel: 10 },
          { nome: 'DIRETOR', nivel: 8 }
        ]
      },
      especialidades: {
        create: [
          { nome: 'Edição Rolê Aleatório' },
          { nome: 'Corte de Letra' }
        ]
      }
    }
  });

  console.log(`Seed concluído com sucesso! Foram gerados ${totaisGerados} profissionais incrivelmente detalhados e distribuídos, agora com datas variadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
