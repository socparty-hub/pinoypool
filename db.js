/* ── PinoyPool MySQL persistence layer ── */
console.error('[DB] db.js loading...');
try { require('dotenv').config(); } catch(e) {}

console.error('[DB] requiring mysql2...');
const mysql = require('mysql2/promise');
console.error('[DB] mysql2 loaded OK');

const ALLOWED_KEYS = [
  'pp_adminMatches',
  'pp_registeredUsers',
  'pp_approvedPlayers',
  'pp_approvedHalls',
  'pp_pendingHalls',
  'pp_tournaments',
  'pp_testPasswords',
  'pp_notifications',
  'pp_push_subscriptions',
  'pp_manualPending',
];

// Keys stored as raw JSON blobs in pp_store (no relational benefit)
const KV_KEYS = ['pp_testPasswords', 'pp_manualPending'];

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  charset:            'utf8mb4',
});

/** Expose pool for direct queries in server.js */
function query(sql, params) { return pool.execute(sql, params || []); }

/** Create all tables on startup */
async function init() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id                  VARCHAR(64)   NOT NULL,
      name                VARCHAR(200)  NOT NULL,
      username            VARCHAR(20)   NOT NULL,
      email               VARCHAR(200)  DEFAULT NULL,
      phone               VARCHAR(20)   DEFAULT NULL,
      dob                 VARCHAR(20)   DEFAULT NULL,
      role                VARCHAR(20)   NOT NULL DEFAULT 'player',
      region              VARCHAR(200)  DEFAULT NULL,
      moniker             VARCHAR(100)  DEFAULT NULL,
      hall_name           VARCHAR(200)  DEFAULT NULL,
      city                VARCHAR(200)  DEFAULT NULL,
      password_hash       VARCHAR(255)  DEFAULT NULL,
      verification_status VARCHAR(20)   NOT NULL DEFAULT 'pending',
      career_status       VARCHAR(50)   DEFAULT NULL,
      ppr                 DECIMAL(10,2) NOT NULL DEFAULT 0,
      ppr9                DECIMAL(10,2) NOT NULL DEFAULT 0,
      ppr10               DECIMAL(10,2) NOT NULL DEFAULT 0,
      initial_ppr         DECIMAL(10,2) NOT NULL DEFAULT 0,
      wins                INT NOT NULL DEFAULT 0,
      losses              INT NOT NULL DEFAULT 0,
      wins9               INT NOT NULL DEFAULT 0,
      losses9             INT NOT NULL DEFAULT 0,
      wins10              INT NOT NULL DEFAULT 0,
      losses10            INT NOT NULL DEFAULT 0,
      fmt                 VARCHAR(20)   NOT NULL DEFAULT '9-Ball',
      colors              VARCHAR(20)   NOT NULL DEFAULT '#1a3a22',
      submitted_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at         DATETIME      DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_username (username),
      KEY idx_email  (email),
      KEY idx_role   (role),
      KEY idx_status (verification_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS halls (
      id             VARCHAR(64)  NOT NULL,
      name           VARCHAR(200) NOT NULL,
      owner_name     VARCHAR(200) DEFAULT NULL,
      owner_username VARCHAR(20)  DEFAULT NULL,
      owner_email    VARCHAR(200) DEFAULT NULL,
      city           VARCHAR(200) DEFAULT NULL,
      region         VARCHAR(200) DEFAULT NULL,
      phone          VARCHAR(20)  DEFAULT NULL,
      fb_page        VARCHAR(300) DEFAULT NULL,
      tables_count   INT NOT NULL DEFAULT 0,
      status         VARCHAR(20)  NOT NULL DEFAULT 'pending',
      submitted_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at    DATETIME     DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_status         (status),
      KEY idx_owner_username (owner_username),
      KEY idx_owner_email    (owner_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS matches (
      id             VARCHAR(64)  NOT NULL,
      p1_name        VARCHAR(200) DEFAULT NULL,
      p2_name        VARCHAR(200) DEFAULT NULL,
      score          VARCHAR(20)  DEFAULT NULL,
      fmt            VARCHAR(20)  NOT NULL DEFAULT '9-Ball',
      match_type     VARCHAR(50)  NOT NULL DEFAULT 'Exhibition',
      venue          VARCHAR(300) DEFAULT NULL,
      match_date     VARCHAR(20)  DEFAULT NULL,
      status         VARCHAR(50)  NOT NULL DEFAULT 'pending',
      p1_ok          TINYINT(1)   NOT NULL DEFAULT 0,
      p2_ok          TINYINT(1)   NOT NULL DEFAULT 0,
      venue_ok       TINYINT(1)   NOT NULL DEFAULT 0,
      winner         VARCHAR(200) DEFAULT NULL,
      race_to        INT NOT NULL DEFAULT 9,
      tournament_name VARCHAR(200) DEFAULT NULL,
      hcp_label      VARCHAR(300) DEFAULT NULL,
      hcp_rack       VARCHAR(50)  DEFAULT NULL,
      owner_name     VARCHAR(200) DEFAULT NULL,
      p1_career      VARCHAR(50)  DEFAULT NULL,
      p2_career      VARCHAR(50)  DEFAULT NULL,
      admin_recorded TINYINT(1)   NOT NULL DEFAULT 0,
      submitted_at   DATETIME     DEFAULT NULL,
      approved_at    DATETIME     DEFAULT NULL,
      approved_by    VARCHAR(200) DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_status     (status),
      KEY idx_match_date (match_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id          VARCHAR(64)  NOT NULL,
      name        VARCHAR(200) NOT NULL,
      fmt         VARCHAR(20)  NOT NULL DEFAULT '9-Ball',
      venue       VARCHAR(300) DEFAULT NULL,
      start_date  VARCHAR(20)  DEFAULT NULL,
      end_date    VARCHAR(20)  DEFAULT NULL,
      status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
      owner_name  VARCHAR(200) DEFAULT NULL,
      owner_email VARCHAR(200) DEFAULT NULL,
      notes       TEXT         DEFAULT NULL,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME     DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         INT         NOT NULL AUTO_INCREMENT,
      notif_id   VARCHAR(64) NOT NULL,
      username   VARCHAR(20) NOT NULL,
      type       VARCHAR(50) DEFAULT NULL,
      message    TEXT        DEFAULT NULL,
      is_read    TINYINT(1)  NOT NULL DEFAULT 0,
      created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_notif_id (notif_id),
      KEY idx_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         INT  NOT NULL AUTO_INCREMENT,
      username   VARCHAR(20) NOT NULL,
      endpoint   TEXT NOT NULL,
      p256dh     TEXT DEFAULT NULL,
      auth_key   TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS pp_store (
      \`key\`   VARCHAR(100) NOT NULL,
      \`value\` LONGTEXT     NOT NULL,
      PRIMARY KEY (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('[DB] MySQL connected and all tables ready.');
}

/* ─────────────────────────────────────────────────────────────
   getAll()  →  reconstructs legacy {pp_key: jsonString} map
   from proper tables so the server can inject window.__SD__
───────────────────────────────────────────────────────────── */
async function getAll() {
  const result = {};

  /* ── users ─────────────────────────────────────────────── */
  const [userRows] = await pool.execute(`SELECT * FROM users ORDER BY submitted_at DESC`);

  const toIso = d => d ? new Date(d).toISOString() : null;

  result['pp_registeredUsers'] = JSON.stringify(userRows.map(u => ({
    id:                 u.id,
    name:               u.name,
    username:           u.username,
    email:              u.email              || '',
    phone:              u.phone              || '',
    dob:                u.dob                || '',
    role:               u.role,
    region:             u.region             || '',
    moniker:            u.moniker            || '',
    hall:               u.hall_name          || '',
    hallName:           u.hall_name          || '',
    city:               u.city               || '',
    password:           u.password_hash      || '',
    verificationStatus: u.verification_status || 'pending',
    careerStatus:       u.career_status      || null,
    ppr:                parseFloat(u.ppr)    || 0,
    submittedAt:        toIso(u.submitted_at),
    approvedAt:         toIso(u.approved_at),
  })));

  result['pp_approvedPlayers'] = JSON.stringify(
    userRows
      .filter(u => u.verification_status === 'active' && u.role !== 'owner')
      .map(u => ({
        id:          u.id,
        name:        u.name,
        username:    u.username           || '',
        email:       u.email              || '',
        region:      u.region             || '',
        careerStatus:u.career_status      || null,
        ppr:         parseFloat(u.ppr)    || 0,
        ppr9:        parseFloat(u.ppr9)   || parseFloat(u.ppr) || 0,
        ppr10:       parseFloat(u.ppr10)  || parseFloat(u.ppr) || 0,
        initialPpr:  parseFloat(u.initial_ppr) || parseFloat(u.ppr) || 0,
        approvedAt:  toIso(u.approved_at),
        status:      'active',
        fmt:         u.fmt    || '9-Ball',
        colors:      u.colors || '#1a3a22',
        mw:          u.wins   || 0,  ml:   u.losses   || 0,
        mw9:         u.wins9  || 0,  ml9:  u.losses9  || 0,
        mw10:        u.wins10 || 0,  ml10: u.losses10 || 0,
        rw: 0, rl: 0, mi: 0,
      }))
  );

  /* ── halls ─────────────────────────────────────────────── */
  const [hallRows] = await pool.execute(`SELECT * FROM halls ORDER BY submitted_at DESC`);
  const hallMap = h => ({
    id:        h.id,
    name:      h.name,
    owner:     h.owner_name     || '',
    username:  h.owner_username || '',
    email:     h.owner_email    || '',
    city:      h.city           || '',
    region:    h.region         || '',
    tables:    h.tables_count   || 0,
    contact:   h.phone          || '',
    fb:        h.fb_page        || '—',
    status:    h.status,
    submitted: h.submitted_at ? new Date(h.submitted_at).toISOString().slice(0, 10) : '',
  });
  result['pp_approvedHalls'] = JSON.stringify(hallRows.filter(h => h.status === 'active').map(hallMap));
  result['pp_pendingHalls']   = JSON.stringify(hallRows.filter(h => h.status === 'pending' || h.status === 'review').map(hallMap));

  /* ── matches ───────────────────────────────────────────── */
  const [matchRows] = await pool.execute(`SELECT * FROM matches ORDER BY submitted_at DESC`);
  result['pp_adminMatches'] = JSON.stringify(matchRows.map(m => ({
    id:             m.id,
    p1:             m.p1_name        || '',
    p2:             m.p2_name        || '',
    score:          m.score          || '0-0',
    sc:             m.score          || '0-0',
    fmt:            m.fmt            || '9-Ball',
    type:           m.match_type     || 'Exhibition',
    venue:          m.venue          || '—',
    date:           m.match_date     || '',
    status:         m.status         || 'pending',
    p1ok:           !!m.p1_ok,
    p2ok:           !!m.p2_ok,
    venueOk:        !!m.venue_ok,
    winner:         m.winner         || null,
    raceTo:         m.race_to        || 9,
    tournament:     m.tournament_name || null,
    hcp:            m.hcp_label      || 'None',
    hcpRack:        m.hcp_rack ? JSON.parse(m.hcp_rack) : [0, 0],
    hcpBall:        [0, 0],
    ownerName:      m.owner_name     || null,
    p1CareerStatus: m.p1_career      || null,
    p2CareerStatus: m.p2_career      || null,
    adminRecorded:  !!m.admin_recorded,
    submittedAt:    toIso(m.submitted_at),
    approvedAt:     toIso(m.approved_at),
    approvedBy:     m.approved_by    || null,
  })));

  /* ── tournaments ───────────────────────────────────────── */
  const [tournRows] = await pool.execute(`SELECT * FROM tournaments ORDER BY created_at DESC`);
  result['pp_tournaments'] = JSON.stringify(tournRows.map(t => ({
    id:          t.id,
    name:        t.name,
    fmt:         t.fmt        || '9-Ball',
    venue:       t.venue      || '',
    date:        t.start_date || '',
    edate:       t.end_date   || '',
    status:      t.status     || 'pending',
    ownerName:   t.owner_name  || 'Admin',
    ownerEmail:  t.owner_email || '',
    notes:       t.notes      || '',
    submittedAt: toIso(t.created_at),
    approvedAt:  toIso(t.approved_at),
  })));

  /* ── notifications ─────────────────────────────────────── */
  const [notifRows] = await pool.execute(
    `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 300`
  );
  result['pp_notifications'] = JSON.stringify(notifRows.map(n => ({
    id:       n.notif_id,
    username: n.username,
    type:     n.type    || '',
    message:  n.message || '',
    ts:       toIso(n.created_at),
    read:     !!n.is_read,
  })));

  /* ── push subscriptions ────────────────────────────────── */
  const [subRows] = await pool.execute(`SELECT * FROM push_subscriptions`);
  const pushSubs = {};
  subRows.forEach(s => {
    if (!pushSubs[s.username]) pushSubs[s.username] = [];
    pushSubs[s.username].push({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } });
  });
  result['pp_push_subscriptions'] = JSON.stringify(pushSubs);

  /* ── misc kv store ─────────────────────────────────────── */
  const [kvRows] = await pool.execute(`SELECT \`key\`, \`value\` FROM pp_store`);
  kvRows.forEach(r => { result[r.key] = r.value; });

  return result;
}

/* ─────────────────────────────────────────────────────────────
   set(key, jsonString)  →  writes to proper table
───────────────────────────────────────────────────────────── */
async function set(key, value) {
  if (!ALLOWED_KEYS.includes(key)) return false;
  const v = typeof value === 'string' ? value : JSON.stringify(value);

  /* misc kv keys go straight to pp_store */
  if (KV_KEYS.includes(key)) {
    await pool.execute(
      `INSERT INTO pp_store (\`key\`, \`value\`) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
      [key, v]
    );
    return true;
  }

  let data;
  try { data = JSON.parse(v); } catch { return false; }

  /* ── pp_registeredUsers ────────────────────────────────── */
  if (key === 'pp_registeredUsers') {
    if (!Array.isArray(data)) return false;
    for (const u of data) {
      await pool.execute(
        `INSERT INTO users
           (id, name, username, email, phone, dob, role, region, moniker,
            hall_name, city, password_hash, verification_status, career_status,
            ppr, submitted_at, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name               = VALUES(name),
           email              = VALUES(email),
           phone              = VALUES(phone),
           dob                = VALUES(dob),
           region             = VALUES(region),
           moniker            = VALUES(moniker),
           hall_name          = VALUES(hall_name),
           city               = VALUES(city),
           password_hash      = COALESCE(VALUES(password_hash), password_hash),
           verification_status = VALUES(verification_status),
           career_status      = COALESCE(VALUES(career_status), career_status),
           ppr                = GREATEST(VALUES(ppr), ppr),
           approved_at        = COALESCE(VALUES(approved_at), approved_at)`,
        [
          String(u.id || ''), u.name || '', u.username || '', u.email || '',
          u.phone || '', u.dob || '', u.role || 'player', u.region || '',
          u.moniker || '', u.hall || u.hallName || '', u.city || '',
          u.password || '',
          u.verificationStatus || 'pending',
          u.careerStatus || null,
          parseFloat(u.ppr) || 0,
          u.submittedAt ? new Date(u.submittedAt) : new Date(),
          u.approvedAt  ? new Date(u.approvedAt)  : null,
        ]
      );
    }
    return true;
  }

  /* ── pp_approvedPlayers ────────────────────────────────── */
  if (key === 'pp_approvedPlayers') {
    if (!Array.isArray(data)) return false;
    for (const p of data) {
      await pool.execute(
        `INSERT INTO users
           (id, name, username, email, region, career_status,
            ppr, ppr9, ppr10, initial_ppr,
            wins, losses, wins9, losses9, wins10, losses10,
            fmt, colors, verification_status, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
         ON DUPLICATE KEY UPDATE
           career_status       = VALUES(career_status),
           ppr                 = VALUES(ppr),
           ppr9                = VALUES(ppr9),
           ppr10               = VALUES(ppr10),
           initial_ppr         = COALESCE(initial_ppr, VALUES(initial_ppr)),
           wins                = VALUES(wins),
           losses              = VALUES(losses),
           wins9               = VALUES(wins9),
           losses9             = VALUES(losses9),
           wins10              = VALUES(wins10),
           losses10            = VALUES(losses10),
           fmt                 = VALUES(fmt),
           colors              = VALUES(colors),
           verification_status = 'active',
           approved_at         = COALESCE(VALUES(approved_at), approved_at)`,
        [
          String(p.id || ''), p.name || '', p.username || '', p.email || '',
          p.region || '', p.careerStatus || null,
          parseFloat(p.ppr)        || 0,
          parseFloat(p.ppr9)       || parseFloat(p.ppr) || 0,
          parseFloat(p.ppr10)      || parseFloat(p.ppr) || 0,
          parseFloat(p.initialPpr) || parseFloat(p.ppr) || 0,
          parseInt(p.mw)   || 0, parseInt(p.ml)   || 0,
          parseInt(p.mw9)  || 0, parseInt(p.ml9)  || 0,
          parseInt(p.mw10) || 0, parseInt(p.ml10) || 0,
          p.fmt || '9-Ball', p.colors || '#1a3a22',
          p.approvedAt ? new Date(p.approvedAt) : null,
        ]
      );
    }
    return true;
  }

  /* ── pp_approvedHalls ──────────────────────────────────── */
  if (key === 'pp_approvedHalls') {
    if (!Array.isArray(data)) return false;
    for (const h of data) {
      await pool.execute(
        `INSERT INTO halls
           (id, name, owner_name, owner_username, owner_email,
            city, region, phone, fb_page, tables_count, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
         ON DUPLICATE KEY UPDATE
           name           = VALUES(name),
           owner_name     = VALUES(owner_name),
           owner_username = VALUES(owner_username),
           owner_email    = VALUES(owner_email),
           city           = VALUES(city),
           region         = VALUES(region),
           phone          = VALUES(phone),
           fb_page        = VALUES(fb_page),
           tables_count   = VALUES(tables_count),
           status         = 'active'`,
        [
          String(h.id || ''), h.name || '', h.owner || '', h.username || '',
          h.email || '', h.city || '', h.region || '',
          h.contact || '', h.fb || '', parseInt(h.tables) || 0,
          h.submitted ? new Date(h.submitted) : new Date(),
        ]
      );
    }
    return true;
  }

  /* ── pp_pendingHalls ───────────────────────────────────── */
  if (key === 'pp_pendingHalls') {
    if (!Array.isArray(data)) return false;
    for (const h of data) {
      await pool.execute(
        `INSERT INTO halls
           (id, name, owner_name, owner_username, owner_email,
            city, region, phone, fb_page, tables_count, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name           = VALUES(name),
           owner_name     = VALUES(owner_name),
           owner_email    = VALUES(owner_email),
           city           = VALUES(city),
           region         = VALUES(region),
           phone          = VALUES(phone),
           -- never downgrade an active hall back to pending
           status         = IF(status = 'active', 'active', VALUES(status))`,
        [
          String(h.id || ''), h.name || '', h.owner || '', h.username || '',
          h.email || '', h.city || h.region || '', h.region || '',
          h.contact || '', h.fb || '', parseInt(h.tables) || 0,
          h.status || 'pending',
          h.submitted ? new Date(h.submitted) : new Date(),
        ]
      );
    }
    return true;
  }

  /* ── pp_adminMatches ───────────────────────────────────── */
  if (key === 'pp_adminMatches') {
    if (!Array.isArray(data)) return false;
    for (const m of data) {
      await pool.execute(
        `INSERT INTO matches
           (id, p1_name, p2_name, score, fmt, match_type, venue, match_date,
            status, p1_ok, p2_ok, venue_ok, winner, race_to, tournament_name,
            hcp_label, hcp_rack, owner_name, p1_career, p2_career,
            admin_recorded, submitted_at, approved_at, approved_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status       = VALUES(status),
           p1_ok        = VALUES(p1_ok),
           p2_ok        = VALUES(p2_ok),
           venue_ok     = VALUES(venue_ok),
           winner       = COALESCE(VALUES(winner),     winner),
           approved_at  = COALESCE(VALUES(approved_at),  approved_at),
           approved_by  = COALESCE(VALUES(approved_by),  approved_by)`,
        [
          String(m.id || ''), m.p1 || '', m.p2 || '',
          m.score || m.sc || '0-0',
          m.fmt  || '9-Ball', m.type || 'Exhibition',
          m.venue || '—', m.date || '',
          m.status || 'pending',
          m.p1ok    ? 1 : 0,
          m.p2ok    ? 1 : 0,
          m.venueOk ? 1 : 0,
          m.winner  || null,
          parseInt(m.raceTo) || 9,
          m.tournament  || null,
          m.hcp         || 'None',
          JSON.stringify(m.hcpRack || [0, 0]),
          m.ownerName       || null,
          m.p1CareerStatus  || null,
          m.p2CareerStatus  || null,
          m.adminRecorded   ? 1 : 0,
          m.submittedAt ? new Date(m.submittedAt) : null,
          m.approvedAt  ? new Date(m.approvedAt)  : null,
          m.approvedBy  || null,
        ]
      );
    }
    return true;
  }

  /* ── pp_tournaments ────────────────────────────────────── */
  if (key === 'pp_tournaments') {
    if (!Array.isArray(data)) return false;
    for (const t of data) {
      await pool.execute(
        `INSERT INTO tournaments
           (id, name, fmt, venue, start_date, end_date,
            status, owner_name, owner_email, notes, created_at, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name        = VALUES(name),
           status      = VALUES(status),
           approved_at = COALESCE(VALUES(approved_at), approved_at)`,
        [
          String(t.id || ''), t.name || '', t.fmt || '9-Ball',
          t.venue || '', t.date || '', t.edate || '',
          t.status || 'pending',
          t.ownerName || 'Admin', t.ownerEmail || '',
          t.notes || '',
          t.submittedAt ? new Date(t.submittedAt) : new Date(),
          t.approvedAt  ? new Date(t.approvedAt)  : null,
        ]
      );
    }
    return true;
  }

  /* ── pp_notifications ──────────────────────────────────── */
  if (key === 'pp_notifications') {
    if (!Array.isArray(data)) return false;
    for (const n of data) {
      await pool.execute(
        `INSERT INTO notifications (notif_id, username, type, message, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_read = VALUES(is_read)`,
        [
          n.id || ('n' + Date.now() + Math.random()),
          n.username || '', n.type || '',
          n.message  || '',
          n.read ? 1 : 0,
          n.ts ? new Date(n.ts) : new Date(),
        ]
      );
    }
    return true;
  }

  /* ── pp_push_subscriptions ─────────────────────────────── */
  if (key === 'pp_push_subscriptions') {
    if (typeof data !== 'object' || Array.isArray(data)) return false;
    await pool.execute(`DELETE FROM push_subscriptions WHERE 1`);
    for (const [username, subs] of Object.entries(data)) {
      if (!Array.isArray(subs)) continue;
      for (const sub of subs) {
        await pool.execute(
          `INSERT INTO push_subscriptions (username, endpoint, p256dh, auth_key)
           VALUES (?, ?, ?, ?)`,
          [username, sub.endpoint || '', sub.keys?.p256dh || '', sub.keys?.auth || '']
        );
      }
    }
    return true;
  }

  return false;
}

/* ─────────────────────────────────────────────────────────────
   Direct DB helpers used by server.js
───────────────────────────────────────────────────────────── */

/** Update a user record directly (used by PATCH /api/registrations/:id) */
async function updateUser(id, fields, ownerEmail) {
  const colMap = {
    status:       'verification_status',
    careerStatus: 'career_status',
    ppr:          'ppr',
    approvedAt:   'approved_at',
  };
  const setClauses = [], values = [];
  for (const [k, v] of Object.entries(fields)) {
    const col = colMap[k] || k;
    setClauses.push(`\`${col}\` = ?`);
    values.push(k === 'approvedAt' && v ? new Date(v) : v);
  }
  if (!setClauses.length) return;
  values.push(String(id));
  await pool.execute(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, values);
  // If approving an owner, also activate their hall.
  // Use owner_email as fallback because the hall row may have been inserted with a
  // different ID (h...) than the user row (r...) when registration was offline.
  if (fields.status === 'active') {
    await pool.execute(
      `UPDATE halls SET status = 'active', approved_at = NOW()
       WHERE id = ? OR owner_email = ?`,
      [String(id), ownerEmail || '']
    );
  }
}

/** Get all subscriptions for a user */
async function getPushSubs(username) {
  const [rows] = await pool.execute(
    `SELECT endpoint, p256dh, auth_key FROM push_subscriptions WHERE username = ?`,
    [username]
  );
  return rows.map(r => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth_key } }));
}

/** Add a push subscription (dedup by endpoint) */
async function addPushSub(username, sub) {
  const [existing] = await pool.execute(
    `SELECT id FROM push_subscriptions WHERE username = ? AND endpoint = ?`,
    [username, sub.endpoint]
  );
  if (existing.length) return; // already registered
  // Cap at 10 per user
  const [count] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM push_subscriptions WHERE username = ?`, [username]
  );
  if ((count[0]?.cnt || 0) >= 10) {
    await pool.execute(
      `DELETE FROM push_subscriptions WHERE username = ? ORDER BY id ASC LIMIT 1`, [username]
    );
  }
  await pool.execute(
    `INSERT INTO push_subscriptions (username, endpoint, p256dh, auth_key) VALUES (?, ?, ?, ?)`,
    [username, sub.endpoint || '', sub.keys?.p256dh || '', sub.keys?.auth || '']
  );
}

/** Remove an expired push subscription */
async function removePushSub(username, endpoint) {
  await pool.execute(
    `DELETE FROM push_subscriptions WHERE username = ? AND endpoint = ?`,
    [username, endpoint]
  );
}

/** Reset all data (admin action) — keeps testPasswords */
async function resetAll() {
  await pool.execute(`DELETE FROM users WHERE role != 'admin'`);
  await pool.execute(`DELETE FROM halls`);
  await pool.execute(`DELETE FROM matches`);
  await pool.execute(`DELETE FROM tournaments`);
  await pool.execute(`DELETE FROM notifications`);
  await pool.execute(`DELETE FROM push_subscriptions`);
  await pool.execute(
    `DELETE FROM pp_store WHERE \`key\` != 'pp_testPasswords'`
  );
}

module.exports = { ALLOWED_KEYS, init, getAll, set, query, updateUser, getPushSubs, addPushSub, removePushSub, resetAll };
