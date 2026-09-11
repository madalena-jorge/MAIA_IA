# CareBridge - AI para Cuidadores Informais de Pessoas com Demência

Projeto de Mestrado – ISCTE – Instituto Universitário de Lisboa  
Engenharia Informática | Aluna: Madalena Rebelo Jorge

## 📋 Descrição do Projeto

O CareBridge é uma plataforma web que utiliza Inteligência Artificial para apoiar cuidadores informais de pessoas diagnosticadas com demência, abordando dilemas éticos do quotidiano. Segundo a OMS, mais de 55 milhões de pessoas vivem com demência no mundo, e os cuidadores informais (familiares, sem formação profissional) enfrentam enormes desafios emocionais, éticos, físicos e financeiros.

A metodologia utilizada é o Design Science Research (DSR), que foca na criação de artefactos inovadores e reais para resolver problemas identificados.

### Funcionalidades Principais

- **AllyCare Chatbot**: Assistente virtual baseado em IA para suporte 24/7
- **Perfil Personalizado**: Gestão de informações do cuidador e pessoa com demência
- **Comunidade**: Fórum para partilha de experiências e apoio entre cuidadores
- **Recursos e Orientações**: Guia ético, dicas de cuidado e quando procurar ajuda
- **Análise de Sentimentos**: Monitorização do estado emocional do cuidador
- **Geração de Relatórios**: Resumos estruturados para partilhar com profissionais de saúde

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5 semântico + Bootstrap 5 + CSS3 customizado
- **Backend**: Python (Flask)
- **Base de Dados**: SQLite com SQLAlchemy ORM
- **Autenticação**: Flask-Login
- **IA/NLP**: Integração com API da Anthropic (Claude) - placeholder com respostas básicas
- **Análise de Sentimentos**: VADER (NLTK) - placeholder com análise básica

## 📁 Estrutura do Projeto

```
carebridge/
├── app.py                    # Aplicação principal Flask
├── config.py                 # Configurações (dev/prod)
├── seed_database.py          # Script para preencher base de dados com dados demo
├── requirements.txt          # Dependências Python
├── .env.example             # Exemplo de variáveis de ambiente
├── models/
│   ├── __init__.py
│   ├── user.py              # Modelo utilizador/cuidador
│   ├── care_recipient.py    # Modelo pessoa com demência
│   ├── conversation.py      # Modelo conversas/histórico
│   └── community_post.py    # Modelo posts comunidade
├── routes/
│   ├── __init__.py
│   ├── auth.py              # Login/Registo
│   ├── dashboard.py         # Home/Dashboard
│   ├── allycare.py          # Chatbot IA
│   ├── profile.py           # Perfil cuidador
│   ├── community.py         # Comunidade
│   ├── resources.py         # Recursos/Learning
│   └── api.py               # Endpoints REST da IA
├── static/
│   ├── css/
│   │   └── carebridge.css   # Estilos customizados
│   ├── js/
│   └── images/
└── templates/
    ├── base.html            # Template base com navbar e footer
    ├── auth/
    │   ├── login.html
    │   └── register.html
    ├── dashboard/
    │   └── index.html
    ├── allycare/
    │   └── chat.html
    ├── profile/
    │   └── index.html
    ├── community/
    │   ├── index.html
    │   ├── view_post.html
    │   └── new_post.html
    └── resources/
        └── index.html
```

## 🚀 Instalação e Configuração

### Pré-requisitos

- Python 3.8 ou superior
- pip (gestor de pacotes Python)

### Passo 1: Clonar o repositório

```bash
cd carebridge
```

### Passo 2: Criar ambiente virtual (recomendado)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### Passo 3: Instalar dependências

```bash
pip install -r requirements.txt
```

### Passo 4: Configurar variáveis de ambiente

```bash
# Copiar o ficheiro de exemplo
cp .env.example .env

# Editar .env com as suas configurações (opcional para desenvolvimento)
# Para desenvolvimento, as configurações padrão funcionam
```

### Passo 5: Preencher a base de dados com dados de demonstração

```bash
python seed_database.py
```

Isto criará:
- Conta demo: `demo@carebridge.com` / `demo123`
- Perfil completo do cuidador (Sarah Johnson)
- Perfil da pessoa com demência (Margaret Johnson)
- 5 posts da comunidade de exemplo

### Passo 6: Correr a aplicação

```bash
python app.py
```

A aplicação estará disponível em: `http://localhost:5000`

## 🔐 Conta Demo

Para testar a aplicação imediatamente, use a conta demo:

- **Email**: demo@carebridge.com
- **Password**: demo123

Esta conta inclui:
- Perfil completo do cuidador (Sarah Johnson, 45 anos)
- Perfil da pessoa com demência (Margaret Johnson, 78 anos, Demência Vascular)
- Histórico médico, medicação e alergias
- Acesso a todas as funcionalidades

## 📚 Referências Académicas

Este projeto baseia-se na seguinte literatura académica:

- Ruggiano et al. (2021) – Chatbots to support people with dementia, JMIR
- Wang et al. (2024) – AI systems for supporting informal caregivers, ACM
- Borna et al. (2024) – AI support for informal patient caregivers, Bioengineering
- Chernova et al. (2024) – AI-CARING, AI Magazine
- Parsons (2021) – Ethical challenges in virtual environments, Journal of Clinical Medicine
- Zou et al. (2024) – mHealth apps for dementia caregivers, JMIR Aging
- Beauchamp & Childress – Princípios de ética biomédica: autonomia, beneficência, não-maleficência, justiça

## ⚠️ Notas Importantes

### Sobre a IA

- A implementação atual do AllyCare usa um sistema de respostas básicas (placeholder)
- Para integração completa com a API da Anthropic Claude, é necessário:
  1. Adicionar a API key no ficheiro `.env`
  2. Implementar a chamada à API em `routes/allycare.py`
  3. Substituir a função `generate_allycare_response()` pela integração real

### Segurança

- Em produção, usar sempre HTTPS
- Alterar a `SECRET_KEY` no ficheiro `.env`
- Usar uma base de dados robusta (PostgreSQL) em produção
- Nunca fazer commit de ficheiros `.env` com credenciais reais

### Ética

- O AllyCare nunca substitui aconselhamento médico profissional
- Em emergências, sempre encaminhar para 112
- Manter confidencialidade dos dados dos utilizadores
- Transparência sobre as limitações da IA

## 🐛 Troubleshooting

### Erro: "Module not found"

```bash
pip install -r requirements.txt
```

### Erro: "Database locked"

Apagar o ficheiro `carebridge.db` e correr `python seed_database.py` novamente.

### Erro: "Port 5000 already in use"

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

Ou usar uma porta diferente em `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

## 📄 Licença

Este projeto foi desenvolvido como parte de uma dissertação de mestrado no ISCTE.

## 👤 Autor

Madalena Rebelo Jorge  
Mestrado em Engenharia Informática  
ISCTE – Instituto Universitário de Lisboa
