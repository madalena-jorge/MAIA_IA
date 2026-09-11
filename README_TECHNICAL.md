# CareBridge - Guia Técnico e Arquitetura do Projeto

Este documento destina-se a programadores, avaliadores da tese e qualquer pessoa que necessite de navegar pelo código-fonte do projeto **CareBridge**. O objetivo é proporcionar uma visão clara da arquitetura, onde encontrar cada componente e qual a função de cada ficheiro, para que a navegação seja intuitiva.

## 1. Visão Geral da Arquitetura

O CareBridge está dividido em duas partes principais, localizadas dentro da pasta `carebridge/`:
*   **Frontend**: Interface visual do utilizador construída com HTML5, CSS3, Vanilla JavaScript e Bootstrap 5.
*   **Backend**: Servidor API construído em Node.js (compatível com Bun) utilizando Express e uma base de dados SQLite.

## 2. Como Navegar no Código

Abaixo está o mapa do projeto, com a explicação do que faz cada pasta e ficheiro chave. Se está à procura de algo específico (ex: "Onde mudo o prompt da IA?"), consulte este mapa.

### Estrutura de Pastas

```text
carebridge/
├── backend/                  # Código do Servidor e API
│   ├── config/               # Configurações globais
│   │   └── database.js       # Inicialização da base de dados SQLite e criação de conta Demo
│   ├── database/             # Ficheiros e esquemas de dados
│   │   ├── carebridge.db     # Base de dados (gerada automaticamente)
│   │   └── schema.sql        # Esquema das tabelas SQL (Users, Patients, Messages, etc.)
│   ├── middleware/           # Intercetores de pedidos HTTP
│   │   └── auth.js           # Validação de Tokens JWT (Segurança)
│   ├── routes/               # Definição dos Endpoints da API
│   │   ├── auth.js           # Rotas de Login e Registo
│   │   ├── chat.js           # Rotas de envio de mensagens e histórico (Integração IA)
│   │   └── profile.js        # Rotas para gerir os dados do Cuidador e Paciente
│   ├── services/             # Lógica de negócio e integrações externas
│   │   ├── openrouterService.js # Faz as chamadas à API da OpenRouter (LLM)
│   │   ├── prompt.md         # AQUI FICA O PROMPT DA IA: Define a personalidade do AllyCare
│   │   └── strandsSDK.js     # Mock do Strands SDK para gestão de contexto/memória da IA
│   ├── .env                  # Variáveis de ambiente (Chaves de API, Modelos, Porta)
│   └── server.js             # Ponto de entrada do Backend (Inicia o Express)
│
└── frontend/                 # Código da Interface do Utilizador
    ├── css/                  
    │   └── main.css          # Estilos globais (Organizado por variáveis e classes)
    ├── js/                   # Lógica e interatividade do lado do cliente
    │   ├── auth.js           # Faz o pedido de Login e guarda o Token JWT
    │   ├── chat.js           # Lógica do chat (renderização de mensagens, histórico)
    │   └── utils.js          # Funções utilitárias (ex: chamadas à API com autenticação)
    ├── index.html            # Página inicial (Login)
    ├── dashboard.html        # Painel central após login
    ├── allycare.html         # Interface do Chat com o Assistente Virtual (IA)
    ├── profile.html          # Perfil do Cuidador e Paciente
    ├── community.html        # Página da Comunidade
    ├── daily-tips.html       # Dicas Diárias
    └── resources.html        # Recursos Educativos
```

## 3. Localizações Frequentes (Cheatsheet)

*   **Onde configuro o comportamento da Inteligência Artificial?**
    *   O prompt principal está em: `backend/services/prompt.md`. É aqui que define as diretrizes éticas e o comportamento do assistente.
*   **Onde altero o modelo LLM ou a API Key?**
    *   No ficheiro `backend/.env`. Altere `OPENROUTER_MODEL` ou `OPENROUTER_API_KEY`.
*   **Onde é gerido o histórico (memória) das conversas?**
    *   A gestão de contexto é feita em `backend/services/strandsSDK.js`, que guarda e recupera mensagens na base de dados SQLite.
*   **Onde está a lógica de autenticação e segurança?**
    *   No backend: `backend/routes/auth.js` (geração de tokens e bcrypt) e `backend/middleware/auth.js` (validação de rotas).
*   **Onde altero as cores globais do site?**
    *   No ficheiro `frontend/css/main.css`, nas variáveis `:root` (ex: `--primary-color`).

## 4. Decisões de Arquitetura e Boas Práticas (Contexto Académico)

Este projeto foi desenhado seguindo a metodologia **Design Science Research (DSR)**. Para assegurar a qualidade e validação do artefacto, foram tomadas as seguintes decisões:
1.  **Segurança e Privacidade**: As passwords não são guardadas em texto limpo; utiliza-se `bcrypt`. As chamadas à API são protegidas por `JSON Web Tokens (JWT)`, garantindo que apenas cuidadores autorizados acedam aos dados sensíveis dos pacientes.
2.  **Desacoplamento (Backend/Frontend)**: A separação clara entre cliente e servidor permite que, futuramente, a API possa alimentar uma aplicação mobile sem qualquer alteração no backend.
3.  **Abstração de Serviços**: A integração com a IA está isolada em `openrouterService.js` e a gestão de contexto em `strandsSDK.js`. Isto significa que se quisermos trocar de fornecedor de IA (ex: passar da OpenRouter para a OpenAI direta), apenas precisamos de alterar um único ficheiro.
4.  **UI/UX e Bootstrap**: O Frontend foca-se na clareza e acessibilidade, utilizando componentes nativos do Bootstrap e minimizando CSS customizado redundante. Todas as páginas partilham uma estrutura de navegação consistente.
5.  **Internacionalização (i18n)**: O código frontend foi preparado para suportar traduções automáticas (ex: via DeepL API), contendo marcações nos elementos HTML para facilitar expansões futuras. Atualmente, o idioma predefinido é o Português de Portugal.
