const { google } = require('googleapis');

function getCalendarClient() {
  if (!process.env.GCAL_CLIENT_EMAIL || !process.env.GCAL_PRIVATE_KEY) return null;

  const auth = new google.auth.JWT({
    email: process.env.GCAL_CLIENT_EMAIL,
    key:   process.env.GCAL_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return google.calendar({ version: 'v3', auth });
}

async function createEvent(booking) {
  const calendar = getCalendarClient();
  if (!calendar) return null;

  const [y, m, d] = booking.date.split('-').map(Number);
  const [h, min]  = booking.time.split(':').map(Number);

  const start = new Date(y, m - 1, d, h, min);
  const end   = new Date(start.getTime() + booking.duration * 3600000);

  const toISO = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  };

  try {
    const res = await calendar.events.insert({
      calendarId: process.env.GCAL_CALENDAR_ID || 'primary',
      resource: {
        summary:     `LUMINOR — ${booking.service} | ${booking.name}`,
        description: [
          `Cliente: ${booking.name}`,
          `E-mail: ${booking.email}`,
          `Telefone: ${booking.phone}`,
          `Empresa: ${booking.company || '—'}`,
          `Serviço: ${booking.service}`,
          `Duração: ${booking.duration}h`,
          `Total: R$ ${booking.total.toLocaleString('pt-BR')}`,
          `Observações: ${booking.notes || '—'}`,
          `ID: #${booking.id}`,
        ].join('\n'),
        start: { dateTime: toISO(start), timeZone: 'America/Sao_Paulo' },
        end:   { dateTime: toISO(end),   timeZone: 'America/Sao_Paulo' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 }, // 24h antes
            { method: 'popup', minutes: 60  },  // 1h antes
          ],
        },
        colorId: '11', // vermelho no Google Calendar
      },
    });
    return res.data.id;
  } catch (err) {
    console.error('[GCal] Erro ao criar evento:', err.message);
    return null;
  }
}

async function deleteEvent(eventId) {
  const calendar = getCalendarClient();
  if (!calendar || !eventId) return;
  try {
    await calendar.events.delete({
      calendarId: process.env.GCAL_CALENDAR_ID || 'primary',
      eventId,
    });
  } catch (err) {
    console.error('[GCal] Erro ao deletar evento:', err.message);
  }
}

module.exports = { createEvent, deleteEvent };
