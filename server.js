require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const { v4: uuidv4 } = require('uuid');

const db       = require('./db');
const mailer   = require('./mailer');
const calendar = require('./calendar');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Helmet (segurança de headers) ─────────────────────────
try {
  const helmet = require('helmet');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        styleSrc:    ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
        fontSrc:     ["'self'", 'fonts.gstatic.com'],
        imgSrc:      ["'self'", 'data:', 'https:'],
        connectSrc:  ["'self'"],
        frameSrc:    ["'none'"],
      },
    },
  }));
} catch (e) {
  console.warn('[SECURITY] Helmet não instalado — execute: npm install helmet express-rate-limit');
}

// ── Rate Limiting ──────────────────────────────────────────
try {
  const rateLimit = require('express-rate-limit');

  // Limite geral: 200 req/15min
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

  // Limite específico para criação de agendamentos: 10/hora
  const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Muitas tentativas. Tente novamente em 1 hora.' },
  });
  app.use('/api/bookings', bookingLimiter);
} catch (e) {
  // silently skip if not installed
}

// ── Middlewares ────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Sanitização básica ────────────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>"'`]/g, '')
    .slice(0, 500);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
}

function isValidTime(t) {
  return /^\d{2}:\d{2}$/.test(t);
}

// ── Auth middleware (admin) ────────────────────────────────
function adminAuth(req, res, next) {
  const pwd = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (pwd !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}


// ══════════════════════════════════════════════════════════
//  ROTAS PÚBLICAS
// ══════════════════════════════════════════════════════════

// GET /api/availability
app.get('/api/availability', (req, res) => {
  res.json(db.get('availability').value());
});

// GET /api/bookings/slots?date=YYYY-MM-DD
app.get('/api/bookings/slots', (req, res) => {
  const { date } = req.query;
  if (!date || !isValidDate(date)) {
    return res.status(400).json({ error: 'Parâmetro date inválido' });
  }

  const allHours  = db.get('availability.hours').value() || [];
  const confirmed = db.get('bookings').filter({ date, status: 'confirmed' }).value();

  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const blockedSet = new Set();

  confirmed.forEach(bk => {
    const startMin = toMin(bk.time);
    const endMin   = startMin + (Number(bk.duration) || 1) * 60;
    allHours.forEach(slot => {
      const sMin = toMin(slot);
      if (sMin >= startMin && sMin < endMin) blockedSet.add(slot);
    });
  });

  res.json({ date, booked: [...blockedSet] });
});

// POST /api/bookings
app.post('/api/bookings', async (req, res) => {
  const raw = req.body || {};

  // Sanitizar inputs
  const name      = sanitize(raw.name      || '');
  const email     = sanitize(raw.email     || '');
  const phone     = sanitize(raw.phone     || '');
  const company   = sanitize(raw.company   || '');
  const notes     = sanitize(raw.notes     || '');
  const date      = sanitize(raw.date      || '');
  const time      = sanitize(raw.time      || '');
  const service   = sanitize(raw.service   || '');
  const serviceId = sanitize(raw.serviceId || '');
  const duration  = Number(raw.duration)   || 0;
  const total     = Number(raw.total)      || 0;

  // Validação
  const errors = [];
  if (!name)                    errors.push('Nome obrigatório');
  if (!isValidEmail(email))     errors.push('E-mail inválido');
  if (!phone)                   errors.push('Telefone obrigatório');
  if (!isValidDate(date))       errors.push('Data inválida');
  if (!isValidTime(time))       errors.push('Horário inválido');
  if (!service)                 errors.push('Serviço obrigatório');
  if (duration < 1 || duration > 12) errors.push('Duração inválida');
  if (total <= 0)               errors.push('Valor inválido');

  if (errors.length) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  // Anti-spam: checar se o mesmo e-mail agendou nas últimas 2h
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const recentSpam = db.get('bookings')
    .filter(b => b.email === email && b.createdAt > twoHoursAgo && b.status === 'confirmed')
    .value();
  if (recentSpam.length >= 3) {
    return res.status(429).json({ error: 'Muitos agendamentos recentes com este e-mail.' });
  }

  // Verificar conflito por sobreposição de intervalos
  const toMin     = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const confirmed = db.get('bookings').filter({ date, status: 'confirmed' }).value();
  const newStart  = toMin(time);
  const newEnd    = newStart + duration * 60;

  const conflict = confirmed.some(bk => {
    const bkStart = toMin(bk.time);
    const bkEnd   = bkStart + (Number(bk.duration) || 1) * 60;
    return newStart < bkEnd && newEnd > bkStart;
  });

  if (conflict) {
    return res.status(409).json({ error: 'Este horário conflita com um agendamento existente.' });
  }

  // Verificar se a data está habilitada
  const dayStatus = db.get(`availability.days.${date}`).value();
  if (dayStatus !== 'available') {
    return res.status(409).json({ error: 'Esta data não está disponível para agendamentos.' });
  }

  const booking = {
    id:          uuidv4().substr(0, 8).toUpperCase(),
    name, email, phone, company, notes,
    date, time, service, serviceId,
    duration, total,
    status:      'confirmed',
    createdAt:   new Date().toISOString(),
    gcalEventId: null,
  };

  db.get('bookings').push(booking).write();

  // Async: Google Calendar
  calendar.createEvent(booking)
    .then(gcalId => {
      if (gcalId) db.get('bookings').find({ id: booking.id }).assign({ gcalEventId: gcalId }).write();
    })
    .catch(console.error);

  // Async: E-mails
  mailer.sendClientConfirmation(booking).catch(console.error);
  mailer.sendAdminNotification(booking).catch(console.error);

  res.status(201).json({ success: true, bookingId: booking.id });
});


// ══════════════════════════════════════════════════════════
//  ROTAS ADMIN (protegidas)
// ══════════════════════════════════════════════════════════

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }
  res.json({ success: true });
});

app.get('/api/admin/bookings', adminAuth, (req, res) => {
  const { search, status, date } = req.query;
  let q = db.get('bookings');

  if (status)  q = q.filter({ status });
  if (date)    q = q.filter({ date });
  if (search) {
    const s = search.toLowerCase();
    q = q.filter(b =>
      b.name?.toLowerCase().includes(s) ||
      b.email?.toLowerCase().includes(s) ||
      b.company?.toLowerCase().includes(s)
    );
  }

  res.json(q.orderBy('createdAt', 'desc').value());
});

app.patch('/api/admin/bookings/:id/cancel', adminAuth, async (req, res) => {
  const booking = db.get('bookings').find({ id: req.params.id }).value();
  if (!booking) return res.status(404).json({ error: 'Agendamento não encontrado' });

  db.get('bookings').find({ id: req.params.id }).assign({ status: 'cancelled' }).write();

  if (booking.gcalEventId) calendar.deleteEvent(booking.gcalEventId).catch(console.error);
  mailer.sendCancellationEmail(booking).catch(console.error);

  res.json({ success: true });
});

app.delete('/api/admin/bookings/:id', adminAuth, (req, res) => {
  db.get('bookings').remove({ id: req.params.id }).write();
  res.json({ success: true });
});

app.put('/api/admin/availability', adminAuth, (req, res) => {
  const { days, hours } = req.body;
  if (days  !== undefined) db.set('availability.days',  days ).write();
  if (hours !== undefined) db.set('availability.hours', hours).write();
  res.json({ success: true });
});

app.get('/api/admin/stats', adminAuth, (req, res) => {
  const bookings  = db.get('bookings').value();
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextWeek  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const confirmed = bookings.filter(b => b.status === 'confirmed');

  // Agenda próximos 7 dias
  const today   = now.toISOString().slice(0, 10);
  const upcoming = confirmed
    .filter(b => b.date >= today && b.date <= nextWeek)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  res.json({
    total:     bookings.length,
    confirmed: confirmed.length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    thisMonth: confirmed.filter(b => b.date?.startsWith(thisMonth)).length,
    revenue:   confirmed.reduce((s, b) => s + (Number(b.total) || 0), 0),
    upcoming:  upcoming.slice(0, 10),
  });
});

// ── CSV Export ─────────────────────────────────────────────
app.get('/api/admin/export/csv', adminAuth, (req, res) => {
  const bookings = db.get('bookings').orderBy('date', 'asc').value();
  const header   = 'ID,Nome,Email,Telefone,Empresa,Serviço,Data,Horário,Duração,Total,Status,Criado em';
  const rows     = bookings.map(b =>
    [b.id, b.name, b.email, b.phone, b.company || '', b.service,
     b.date, b.time, b.duration + 'h', 'R$ ' + (b.total || 0).toFixed(2),
     b.status, b.createdAt].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=luminor-agendamentos.csv');
  res.send('\uFEFF' + csv); // BOM para Excel
});

// ── SPA fallback ───────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ██╗     ██╗   ██╗███╗   ███╗██╗███╗   ██╗ ██████╗ ██████╗`);
  console.log(`  ██║     ██║   ██║████╗ ████║██║████╗  ██║██╔═══██╗██╔══██╗`);
  console.log(`  ██║     ██║   ██║██╔████╔██║██║██╔██╗ ██║██║   ██║██████╔╝`);
  console.log(`  ██║     ██║   ██║██║╚██╔╝██║██║██║╚██╗██║██║   ██║██╔══██╗`);
  console.log(`  ███████╗╚██████╔╝██║ ╚═╝ ██║██║██║ ╚████║╚██████╔╝██║  ██║`);
  console.log(`  ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝\n`);
  console.log(`  🎬  Servidor rodando em http://localhost:${PORT}`);
  console.log(`  📅  Google Calendar: ${process.env.GCAL_CLIENT_EMAIL ? '✓' : '⚠ não configurado'}`);
  console.log(`  📧  E-mail:          ${process.env.RESEND_API_KEY   ? '✓' : '⚠ não configurado'}`);
  console.log(`  🔐  Admin:           /booking.html → aba "Painel Admin"\n`);
});
