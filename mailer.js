const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Helpers ────────────────────────────────────────────────
const fmtDate = d => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
};

const fmtBRL = v =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Template base ──────────────────────────────────────────
const emailBase = (content) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LUMINOR</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f0ede6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 32px 0;border-bottom:1px solid rgba(255,255,255,.08);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:500;letter-spacing:8px;color:#f0ede6;">LUMINOR</span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;letter-spacing:2px;color:rgba(240,237,230,.4);text-transform:uppercase;">Produção Audiovisual</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 0;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0 0;border-top:1px solid rgba(255,255,255,.06);">
              <p style="margin:0 0 8px 0;font-size:11px;color:rgba(240,237,230,.3);letter-spacing:1px;">LUMINOR — Cinematic Production</p>
              <p style="margin:0;font-size:11px;color:rgba(240,237,230,.2);">
                Este é um e-mail automático. Para dúvidas, responda a este e-mail ou acesse <a href="https://luminor.com.br" style="color:rgba(240,237,230,.4);">luminor.com.br</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ── Linha de info ──────────────────────────────────────────
const infoRow = (label, value) => `
  <tr>
    <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:40%;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(240,237,230,.4);">${label}</td>
          <td style="font-size:14px;color:#f0ede6;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`;


// ══════════════════════════════════════════════════════════
//  CONFIRMAÇÃO CLIENTE
// ══════════════════════════════════════════════════════════
async function sendClientConfirmation(booking) {
  const content = `
    <!-- Badge -->
    <div style="display:inline-block;background:rgba(174,25,1,.15);border:1px solid rgba(174,25,1,.3);color:#ae1901;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:999px;margin-bottom:28px;">
      Agendamento confirmado
    </div>

    <h1 style="margin:0 0 10px 0;font-size:32px;font-weight:300;color:#f0ede6;line-height:1.15;">
      Olá, <em style="font-style:italic;color:rgba(240,237,230,.6);">${booking.name.split(' ')[0]}</em>.
    </h1>
    <p style="margin:0 0 36px 0;font-size:15px;color:rgba(240,237,230,.6);line-height:1.7;">
      Seu agendamento com a LUMINOR foi confirmado. Estamos ansiosos para criar algo incrível juntos.
    </p>

    <!-- Booking details -->
    <div style="background:#0a0a0b;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px;margin-bottom:32px;">
      <p style="margin:0 0 20px 0;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#ae1901;">Detalhes do agendamento</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Protocolo', '#' + booking.id)}
        ${infoRow('Serviço', booking.service)}
        ${infoRow('Data', fmtDate(booking.date))}
        ${infoRow('Horário', booking.time + 'h')}
        ${infoRow('Duração', booking.duration + ' hora' + (booking.duration > 1 ? 's' : ''))}
        ${infoRow('Investimento', fmtBRL(booking.total))}
      </table>
    </div>

    <p style="font-size:13px;color:rgba(240,237,230,.45);line-height:1.75;margin:0 0 28px 0;">
      Você receberá um lembrete 24h antes da sessão. Em caso de dúvidas ou necessidade de reagendamento, entre em contato com antecedência.
    </p>

    <!-- CTA -->
    <a href="https://luminor.com.br" style="display:inline-block;background:#ae1901;color:#fff;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;border-radius:999px;text-decoration:none;">
      Visitar site
    </a>
  `;

  return resend.emails.send({
    from:    process.env.MAIL_FROM || 'LUMINOR <noreply@luminor.com.br>',
    to:      booking.email,
    subject: `Agendamento confirmado — LUMINOR #${booking.id}`,
    html:    emailBase(content),
  });
}


// ══════════════════════════════════════════════════════════
//  NOTIFICAÇÃO ADMIN
// ══════════════════════════════════════════════════════════
async function sendAdminNotification(booking) {
  const content = `
    <div style="display:inline-block;background:rgba(22,163,74,.15);border:1px solid rgba(22,163,74,.3);color:#16a34a;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:999px;margin-bottom:28px;">
      Novo agendamento
    </div>

    <h1 style="margin:0 0 28px 0;font-size:28px;font-weight:300;color:#f0ede6;">
      ${booking.name}
    </h1>

    <div style="background:#0a0a0b;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px;">
      <p style="margin:0 0 20px 0;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:rgba(240,237,230,.4);">Dados do cliente</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('E-mail', booking.email)}
        ${infoRow('Telefone', booking.phone)}
        ${booking.company ? infoRow('Empresa', booking.company) : ''}
        ${booking.notes   ? infoRow('Observações', booking.notes) : ''}
      </table>

      <p style="margin:24px 0 20px 0;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:rgba(240,237,230,.4);">Detalhes</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Protocolo', '#' + booking.id)}
        ${infoRow('Serviço', booking.service)}
        ${infoRow('Data', fmtDate(booking.date))}
        ${infoRow('Horário', booking.time + 'h')}
        ${infoRow('Duração', booking.duration + 'h')}
        ${infoRow('Total', fmtBRL(booking.total))}
      </table>
    </div>
  `;

  return resend.emails.send({
    from:    process.env.MAIL_FROM || 'LUMINOR <noreply@luminor.com.br>',
    to:      process.env.ADMIN_EMAIL,
    subject: `[LUMINOR] Novo agendamento — ${booking.name} — ${booking.date}`,
    html:    emailBase(content),
  });
}


// ══════════════════════════════════════════════════════════
//  CANCELAMENTO
// ══════════════════════════════════════════════════════════
async function sendCancellationEmail(booking) {
  const content = `
    <div style="display:inline-block;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#ef4444;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:999px;margin-bottom:28px;">
      Agendamento cancelado
    </div>

    <h1 style="margin:0 0 10px 0;font-size:28px;font-weight:300;color:#f0ede6;">
      Olá, ${booking.name.split(' ')[0]}.
    </h1>
    <p style="margin:0 0 28px 0;font-size:15px;color:rgba(240,237,230,.6);line-height:1.7;">
      Seu agendamento foi cancelado. Se precisar remarcar, entre em contato — será um prazer te atender.
    </p>

    <div style="background:#0a0a0b;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px;margin-bottom:28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Protocolo', '#' + booking.id)}
        ${infoRow('Serviço', booking.service)}
        ${infoRow('Data', fmtDate(booking.date))}
        ${infoRow('Horário', booking.time + 'h')}
      </table>
    </div>

    <a href="https://luminor.com.br/booking.html" style="display:inline-block;background:rgba(255,255,255,.08);color:#f0ede6;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;border-radius:999px;text-decoration:none;border:1px solid rgba(255,255,255,.12);">
      Fazer novo agendamento
    </a>
  `;

  return resend.emails.send({
    from:    process.env.MAIL_FROM || 'LUMINOR <noreply@luminor.com.br>',
    to:      booking.email,
    subject: `Agendamento cancelado — LUMINOR #${booking.id}`,
    html:    emailBase(content),
  });
}


// ══════════════════════════════════════════════════════════
//  LEMBRETE 24H
// ══════════════════════════════════════════════════════════
async function sendReminder24h(booking) {
  const content = `
    <div style="display:inline-block;background:rgba(234,179,8,.12);border:1px solid rgba(234,179,8,.25);color:#eab308;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:999px;margin-bottom:28px;">
      Lembrete — amanhã
    </div>

    <h1 style="margin:0 0 10px 0;font-size:28px;font-weight:300;color:#f0ede6;">
      Até amanhã, ${booking.name.split(' ')[0]}!
    </h1>
    <p style="margin:0 0 28px 0;font-size:15px;color:rgba(240,237,230,.6);line-height:1.7;">
      Seu agendamento com a LUMINOR é amanhã. Estamos preparados para criar algo incrível.
    </p>

    <div style="background:#0a0a0b;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Serviço', booking.service)}
        ${infoRow('Data', fmtDate(booking.date))}
        ${infoRow('Horário', booking.time + 'h')}
        ${infoRow('Duração prevista', booking.duration + 'h')}
      </table>
    </div>
  `;

  return resend.emails.send({
    from:    process.env.MAIL_FROM || 'LUMINOR <noreply@luminor.com.br>',
    to:      booking.email,
    subject: `Lembrete: seu agendamento LUMINOR é amanhã — ${booking.time}h`,
    html:    emailBase(content),
  });
}


// ══════════════════════════════════════════════════════════
//  LEMBRETE 1H
// ══════════════════════════════════════════════════════════
async function sendReminder1h(booking) {
  const content = `
    <div style="display:inline-block;background:rgba(174,25,1,.15);border:1px solid rgba(174,25,1,.3);color:#ae1901;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:999px;margin-bottom:28px;">
      Hoje — em 1 hora
    </div>

    <h1 style="margin:0 0 10px 0;font-size:28px;font-weight:300;color:#f0ede6;">
      Chegou a hora, ${booking.name.split(' ')[0]}.
    </h1>
    <p style="margin:0 0 28px 0;font-size:15px;color:rgba(240,237,230,.6);line-height:1.7;">
      Em aproximadamente 1 hora começa sua sessão com a LUMINOR. Nos vemos em breve.
    </p>

    <div style="background:#0a0a0b;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Serviço', booking.service)}
        ${infoRow('Horário', booking.time + 'h')}
        ${infoRow('Duração', booking.duration + 'h')}
      </table>
    </div>
  `;

  return resend.emails.send({
    from:    process.env.MAIL_FROM || 'LUMINOR <noreply@luminor.com.br>',
    to:      booking.email,
    subject: `Sua sessão LUMINOR começa em 1 hora — ${booking.time}h`,
    html:    emailBase(content),
  });
}


module.exports = {
  sendClientConfirmation,
  sendAdminNotification,
  sendCancellationEmail,
  sendReminder24h,
  sendReminder1h,
};
