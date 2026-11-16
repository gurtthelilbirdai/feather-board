// Feather Board API: shared kanban board for small birds, stored in SQLite
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA = path.join(__dirname, 'data');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (e) {}
const db = new Database(path.join(DATA, 'board.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    column TEXT NOT NULL DEFAULT 'todo',
    bird TEXT NOT NULL DEFAULT 'gurt',
    created TEXT NOT NULL,
    updated TEXT NOT NULL
  );
`);

const stmt = {
  list: db.prepare('SELECT * FROM cards ORDER BY created ASC'),
  get: db.prepare('SELECT * FROM cards WHERE id = ?'),
  insert: db.prepare('INSERT INTO cards (id,title,notes,column,bird,created,updated) VALUES (@id,@title,@notes,@column,@bird,@created,@updated)'),
  move: db.prepare('UPDATE cards SET column = ?, updated = ? WHERE id = ?'),
  update: db.prepare('UPDATE cards SET title = ?, notes = ?, updated = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM cards WHERE id = ?')
};

const COLUMNS = ['todo', 'doing', 'done'];

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 100000) req.destroy(); });
    req.on('end', () => {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch (e) { body = {}; }
      resolve(body);
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async function handler(req, res, seg) {
  const route = seg[0];

  if (req.method === 'GET' && route === 'cards') {
    const cards = stmt.list.all();
    const byColumn = {};
    COLUMNS.forEach(c => { byColumn[c] = []; });
    cards.forEach(c => { if (!byColumn[c.column]) byColumn[c.column] = []; byColumn[c.column].push(c); });
    return json(res, 200, { cards, byColumn, columns: COLUMNS, total: cards.length });
  }

  if (req.method === 'POST' && route === 'card' && seg[1] === 'new') {
    const body = await readBody(req);
    const title = String(body.title || '').trim().slice(0, 120);
    if (!title) return json(res, 400, { error: 'title required' });
    const column = COLUMNS.includes(body.column) ? body.column : 'todo';
    const now = new Date().toISOString();
    const card = {
      id: 'crd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      notes: String(body.notes || '').slice(0, 1000),
      column,
      bird: String(body.bird || 'gurt').trim().slice(0, 40) || 'gurt',
      created: now,
      updated: now
    };
    stmt.insert.run(card);
    return json(res, 200, { ok: true, card });
  }

  if (req.method === 'POST' && route === 'card' && seg[1] && seg[2] === 'move') {
    const body = await readBody(req);
    const row = stmt.get.get(seg[1]);
    if (!row) return json(res, 404, { error: 'no such card' });
    const column = COLUMNS.includes(body.column) ? body.column : row.column;
    const now = new Date().toISOString();
    stmt.move.run(column, now, row.id);
    return json(res, 200, { ok: true, card: stmt.get.get(row.id) });
  }

  if (req.method === 'POST' && route === 'card' && seg[1] && seg[2] === 'edit') {
    const body = await readBody(req);
    const row = stmt.get.get(seg[1]);
    if (!row) return json(res, 404, { error: 'no such card' });
    const title = String(body.title || row.title).trim().slice(0, 120) || row.title;
    const notes = String(body.notes === undefined ? row.notes : body.notes).slice(0, 1000);
    const now = new Date().toISOString();
    stmt.update.run(title, notes, now, row.id);
    return json(res, 200, { ok: true, card: stmt.get.get(row.id) });
  }

  if (req.method === 'POST' && route === 'card' && seg[1] && seg[2] === 'delete') {
    await readBody(req);
    const row = stmt.get.get(seg[1]);
    if (!row) return json(res, 404, { error: 'no such card' });
    stmt.remove.run(seg[1]);
    return json(res, 200, { ok: true, removed: seg[1] });
  }

  return false;
};
