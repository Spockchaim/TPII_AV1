# 🎬 CineBridge — Microsserviço de Recomendação e Orquestração de Equipes

> **Atividade Prática ATVI — Técnicas de Programação II**  
> **Professor:** Dr. Eng. Gerson Penha — FATEC  
> **Aluno:** Pedro

Plataforma inteligente desenvolvida em **Node.js** com **TypeScript em modo estrito** e **Fastify**, voltada para a indústria criativa e de produção audiovisual independente. O microsserviço analisa as especificações técnicas de um projeto e orquestra a melhor equipe possível a partir de um catálogo de profissionais, garantindo flexibilidade algorítmica, fluxo de execução invariante, notificações desacopladas e operações analíticas especializadas.

---

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando as seguintes ferramentas e tecnologias modernas:
- **Node.js:** Ambiente de execução base.
- **TypeScript (Strict Mode):** Linguagem principal, garantindo tipagem forte e prevenção de erros em tempo de compilação.
- **Fastify:** Framework web extremamente rápido e de baixo *overhead* para construção da API REST.
- **Prisma ORM:** Mapeamento objeto-relacional moderno para modelagem e consultas seguras e tipadas no banco de dados.
- **PostgreSQL:** Banco de dados relacional robusto para a camada de persistência.
- **Vitest:** Framework de testes unitários e de integração de altíssima performance.
- **EventEmitter:** Biblioteca nativa do Node.js utilizada como barramento de eventos (Event-Driven Architecture) para os observadores.

---

## 🏗️ Padrões de Projeto GoF Implementados

O projeto atende rigorosamente aos 4 padrões de projeto comportamentais solicitados no diagrama de classes oficial:

1. **Strategy (`RecomendacaoStrategy`):**
   - Encapsula algoritmos intercambiáveis de recomendação:
     - `SimilaridadeCosseno`: calcula produto escalar e similaridade de cosseno sobre os vetores de competências.
     - `FiltragemColaborativa`: ranqueia por média e volume de avaliações em projetos anteriores.
     - `RegrasOrcamento`: otimiza o custo total para projetos de orçamento reduzido.
   - Permite troca dinâmica da estratégia em tempo de execução via `POST /projetos/:id/recomendar?estrategia=...`.

2. **Template Method (`OrquestradorEquipe`):**
   - Define o método molde `orquestrar(projeto, estrategia): Equipe`, garantindo a invariância da sequência:
     $$\text{validarRestricoes()} \longrightarrow \text{normalizarDados()} \longrightarrow \text{estrategia.recomendar()} \longrightarrow \text{posProcessar()} \longrightarrow \text{Equipe}$$
   - A subclasse concreta `OrquestradorPadrao` implementa a validação de datas e orçamentos, filtragem de disponibilidade e desempate/deduplicação de candidatos.

3. **Observer (`SistemaRecomendacao` & `Observador`):**
   - Desacoplamento reativo orientado a eventos com a entidade `EventoRecomendacao(tipo, dados, origem)`.
   - Observadores especializados:
     - `NotificadorEmail`: dispara notificações de convite e comunicados por e-mail.
     - `NotificadorInterno`: alimenta a caixa de mensagens e notificações in-app da plataforma.
     - `AuditoriaRecomendacao`: grava trilha de auditoria em logs estruturados JSON (**RNF04**).

4. **Visitor (`VisitanteProjeto`):**
   - Operações analíticas transversais sem poluir as classes de domínio (`Projeto` e `Profissional` utilizam _Double Dispatch_ via método `aceita(visitante)`):
     - `ValidadorConsistencia`: retorna `boolean` validando se todos os papéis obrigatórios foram atendidos sem ultrapassar o teto orçamentário.
     - `CalculadorCompatibilidade`: retorna `number` (score de 0 a 100) mensurando a sinergia técnica da equipe com o projeto.
     - `GeradorRelatorio`: retorna `string` formatada com sumário executivo completo do projeto e da equipe para o produtor.

---

## 📊 Métricas de Qualidade e Testes de Carga

| Requisito                                  | Meta da Atividade                     | Resultado Obtido                                                 |            Status             |
| :----------------------------------------- | :------------------------------------ | :--------------------------------------------------------------- | :---------------------------: |
| **RNF01 (Latência com 10k profissionais)** | Menos de 2 segundos (< 2.000ms)       | **~96ms a 140ms**                                                | ✅ Aprovado (20x mais rápido) |
| **RNF02 (Concorrência)**                   | No mínimo 100 requisições simultâneas | **100 req disparadas em paralelo** (tempo médio de 32ms por req) |          ✅ Aprovado          |
| **RNF06 (Cobertura de Código)**            | Superior a 80%                        | **86.09% Linhas / 91.93% Funções**                               |          ✅ Aprovado          |
| **Total de Testes Automatizados**          | Testes unitários e de integração      | **42 testes em 8 arquivos (100% passing)**                       |          ✅ Aprovado          |

---

## 🚀 Como Executar o Projeto

> **⚠️ IMPORTANTE: Pré-requisito do Banco de Dados**
> Para que o sistema funcione (tanto a API quanto o CLI), certifique-se de que o **PostgreSQL** esteja instalado e o serviço esteja rodando na sua máquina (porta `5432`). O Prisma precisa se conectar a ele para carregar os profissionais e projetos.
> 
> **Comandos úteis (Linux/Ubuntu):**
> ```bash
> # Verificar o status do banco
> sudo systemctl status postgresql
> 
> # Iniciar o banco (caso esteja parado)
> sudo systemctl start postgresql
> ```


### Pré-requisitos

- Node.js v20+ ou v24+
- npm v10+

### Instalação e Preparação do Banco de Dados

1. **Instale as dependências:**
```bash
npm install
```

2. **Configure suas credenciais:**
Renomeie o arquivo `.env.example` para `.env` e ajuste a URL do seu PostgreSQL local.

3. **Crie as tabelas no Banco de Dados:**
```bash
npx prisma db push
```

4. **Popule o banco com dados de teste (Seed):**
```bash
npx tsx prisma/seed.ts
```
*(Este comando gerará mais de 80 profissionais detalhados e 15 projetos fictícios com equipes, essenciais para testar as rotas da IA)*


### Rodar Todos os Testes

```bash
npm test
```

### Gerar Relatório de Cobertura de Código (> 80%)

```bash
npm run test:coverage
```

### Compilar o TypeScript (Modo Estrito)

```bash
npm run build
```

### Iniciar o Servidor Fastify Local (API REST)

```bash
npm run dev
```
O servidor iniciará em `http://localhost:3000`.

### Iniciar o Super CLI (Terminal Interativo)
O projeto conta com um cliente TUI (Terminal User Interface) completo que consome todo o núcleo do domínio sem necessidade de requisições HTTP. Ideal para apresentações!

```bash
npm run cli
```
*(Este comando abrirá um menu interativo completo no terminal, permitindo criar projetos, acionar a IA, gerenciar equipes e gerar relatórios executivos de forma orgânica).*

---

## 📡 Endpoints da API REST (Fastify)

### 1. Listar Profissionais (GET)
- **Endpoint:** `GET /profissionais`
- **Retorno:** Retorna o catálogo completo de profissionais injetados via seed (com histórico e competências).

### 2. Listar Todos os Projetos (GET)
- **Endpoint:** `GET /projetos`
- **Retorno:** Retorna todos os projetos criados no estúdio, com suas equipes (se existirem).

### 3. Criar Projeto (POST)
- **Endpoint:** `POST /projetos`
- **Body:**
  ```json
  {
    "genero": "Documentário",
    "duracao": 90,
    "orcamento": 20000,
    "prazo": "2026-12-31T00:00:00.000Z",
    "papeisObrigatorios": ["DIRETOR", "DIRETOR_FOTOGRAFIA", "EDITOR"],
    "tipoCaptacao": "Ficção",
    "localizacao": "Global"
  }
  ```

### 4. Consultar Projeto Específico (GET)
- **Endpoint:** `GET /projetos/:id`
- **Retorno:** Dados do projeto e equipe com os níveis de habilidade do profissional para o cargo.

### 5. Recomendar Equipe (Escolha Dinâmica de Estratégia) (POST)
- **Endpoint:** `POST /projetos/:id/recomendar?estrategia=cosseno`
- _Opções de estratégia:_ `cosseno`, `colaborativa`, `orcamento`.

### 6. Substituição Pontual de Membro (POST)
- **Endpoint:** `POST /projetos/:id/equipe/substituir`
- **Body:** `{ "papel": "DIRETOR" }` (Limite de 50% tolerado, depois reavalia a equipe inteira)

### 7. Responder a Convite (POST)
- **Endpoint:** `POST /projetos/:id/convites/responder`
- **Body:** `{ "profissionalId": "prof-1", "aceitou": true }`

### 8. Finalizar Projeto e Avaliar Equipe (POST)
- **Endpoint:** `POST /projetos/:id/finalizar`
- **Body:** `{ "notaGeral": 4.8, "comentario": "Excelente trabalho!" }`
- **Ação:** Retroalimenta o currículo de todos os profissionais (salva histórico e adiciona avaliação).

### 9. Edição Universal do Projeto e Orçamento (PATCH - RF05)
- **Endpoint:** `PATCH /projetos/:id`
- **Ação:** Altera as especificações. Caso altere orçamento ou prazo, reavalia e reformula toda a equipe!

### 10. Relatório Executivo (Visitor) (GET)
- **Endpoint:** `GET /projetos/:id/relatorio`

### 11. Análise de Consistência (Visitor) (GET)
- **Endpoint:** `GET /projetos/:id/analise`

### 12. Logs Estruturados JSON (Observer) (GET)
- **Endpoint:** `GET /auditoria`