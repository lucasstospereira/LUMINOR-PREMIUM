const low      = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path     = require('path');
const fs       = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db      = low(adapter);

db.defaults({
  bookings: [],
  availability: {
    days:  {},
    hours: ['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00']
  }
}).write();

module.exports = db;
