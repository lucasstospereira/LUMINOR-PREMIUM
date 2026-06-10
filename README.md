# LUMINOR — Sistema de Agendamento

## Estrutura do projeto

```
luminor/
├── backend/
│   ├── server.js      ← Servidor Express (rotas da API)
│   ├── db.js          ← Banco de dados JSON local
│   ├── mailer.js      ← Envio de e-mails (Nodemailer/Gmail)
│   └── calendar.js    ← Integração Google Calendar
├── frontend/
│   ├── index.html     ← Site principal
│   ├── booking.html   ← Página de agendamento
│   ├── style.css      ← Estilos do site
│   └── app.js         ← Scripts do site
├── data/
│   └── db.json        ← Banco de dados (criado automaticamente)
├── .env.example       ← Template das variáveis de ambiente
├── .gitignore
└── package.json
```

---

## Instalação local

```bash
# 1. Instalar dependências
npm install

# 2. Criar arquivo .env
cp .env.example .env

# 3. Editar .env com seus dados (veja instruções abaixo)
nano .env   # ou abra no editor de texto

# 4. Iniciar o servidor
npm start

# O site estará disponível em:
# http://localhost:3000
```

---

## Configuração do .env

### E-mail (Gmail)

1. Acesse: https://myaccount.google.com
2. Segurança → Verificação em 2 etapas → **Ativar**
3. Segurança → **Senhas de app** → Selecionar app: "Outro" → gerar
4. Copie a senha de 16 caracteres (sem espaços) para `MAIL_PASS`

```env
MAIL_USER=seuemail@gmail.com
MAIL_PASS=abcd1234efgh5678
MAIL_FROM=LUMINOR <seuemail@gmail.com>
ADMIN_EMAIL=seuemail@gmail.com
```

### Google Calendar (Service Account)

1. Acesse: https://console.cloud.google.com
2. Crie um projeto (ou selecione um existente)
3. **APIs e Serviços → Biblioteca** → busque "Google Calendar API" → Ativar
4. **IAM e Admin → Contas de serviço → Criar conta de serviço**
   - Nome: luminor-calendar
   - Concluir
5. Clique na conta criada → **Chaves → Adicionar chave → JSON**
   - Baixe o arquivo JSON
   - Copie `client_email` e `private_key` para o `.env`
6. No **Google Calendar** (calendar.google.com):
   - Configurações do calendário → Compartilhar com pessoas específicas
   - Adicione o `client_email` da conta de serviço com permissão **"Fazer alterações em eventos"**

```env
GCAL_CLIENT_EMAIL=luminor@meu-projeto.iam.gserviceaccount.com
GCAL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GCAL_CALENDAR_ID=seuemail@gmail.com
```

---

## Hospedagem no Railway (recomendado — gratuito)

1. Crie conta em https://railway.app
2. Novo projeto → **Deploy from GitHub repo**
3. Conecte seu repositório
4. Em **Variables**, adicione todas as variáveis do `.env`
5. Em **Settings → Deploy** → Start Command: `npm start`
6. Railway gera uma URL pública automaticamente

### Alternativas gratuitas
- **Render**: render.com — mesma facilidade, free tier disponível
- **Fly.io**: fly.io — mais controle, CLI simples

---

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/availability | Dias e horários disponíveis |
| GET | /api/bookings/slots?date=YYYY-MM-DD | Horários ocupados numa data |
| POST | /api/bookings | Criar agendamento |
| POST | /api/admin/login | Autenticar admin |
| GET | /api/admin/bookings | Listar agendamentos (admin) |
| PATCH | /api/admin/bookings/:id/cancel | Cancelar agendamento (admin) |
| PUT | /api/admin/availability | Salvar disponibilidade (admin) |
| GET | /api/admin/stats | Estatísticas (admin) |

---

## Configurar serviços e preços

No arquivo `frontend/booking.html`, edite o array `SERVICES`:

```javascript
const SERVICES = [
  { id:'corp',   name:'Vídeo Corporativo', price:800,  unit:'por projeto', desc:'...' },
  { id:'mensal', name:'Vídeo Mensal',      price:600,  unit:'por mês',     desc:'...' },
  { id:'edit',   name:'Edição Premium',    price:300,  unit:'por hora',    desc:'...' },
  { id:'social', name:'Redes Sociais',     price:200,  unit:'por hora',    desc:'...' },
];
```

---

## Senha do painel admin

No `.env`:
```env
ADMIN_PASSWORD=sua_senha_forte_aqui
```

Acesse o painel em: `seusite.com/booking.html` → aba **Painel Admin**
