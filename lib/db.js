import { createClient } from '@libsql/client';
import { randomBytes } from 'crypto';

// Create Turso client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://ds-laphatize.aws-us-east-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize database schema
export async function initDatabase() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        policy_text TEXT NOT NULL,
        statements TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        statement_index INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        voter_id TEXT NOT NULL,
        voted_at INTEGER NOT NULL,
        UNIQUE(session_id, voter_id, statement_index)
      );
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_session_id ON votes(session_id);
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_voter_id ON votes(voter_id);
    `);
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize on module load
initDatabase().catch(console.error);

export function generateSessionId() {
  return randomBytes(16).toString('hex');
}

export function generateVoterId() {
  return randomBytes(8).toString('hex');
}

export async function createSession(policyText, statements) {
  const id = generateSessionId();
  await client.execute({
    sql: 'INSERT INTO sessions (id, policy_text, statements, created_at) VALUES (?, ?, ?, ?)',
    args: [id, policyText, JSON.stringify(statements), Date.now()]
  });
  return id;
}

export async function getSession(sessionId) {
  const result = await client.execute({
    sql: 'SELECT * FROM sessions WHERE id = ?',
    args: [sessionId]
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Convert row to plain object with proper values
  const session = {
    id: String(row.id),
    policy_text: String(row.policy_text),
    statements: JSON.parse(String(row.statements)),
    created_at: Number(row.created_at)
  };

  return session;
}

export async function submitVote(sessionId, voterId, statementIndex, rating) {
  await client.execute({
    sql: `
      INSERT INTO votes (session_id, statement_index, rating, voter_id, voted_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(session_id, voter_id, statement_index)
      DO UPDATE SET rating = excluded.rating, voted_at = excluded.voted_at
    `,
    args: [sessionId, statementIndex, rating, voterId, Date.now()]
  });
}

export async function getVotes(sessionId) {
  const result = await client.execute({
    sql: 'SELECT * FROM votes WHERE session_id = ?',
    args: [sessionId]
  });

  // Convert rows to plain objects
  return result.rows.map(row => ({
    id: Number(row.id),
    session_id: String(row.session_id),
    statement_index: Number(row.statement_index),
    rating: Number(row.rating),
    voter_id: String(row.voter_id),
    voted_at: Number(row.voted_at)
  }));
}

export async function getVoterVotes(sessionId, voterId) {
  const result = await client.execute({
    sql: 'SELECT statement_index, rating FROM votes WHERE session_id = ? AND voter_id = ?',
    args: [sessionId, voterId]
  });

  // Convert rows to plain objects
  return result.rows.map(row => ({
    statement_index: Number(row.statement_index),
    rating: Number(row.rating)
  }));
}

export async function getVoteStats(sessionId) {
  const votes = await getVotes(sessionId);

  // Calculate stats per statement
  const statementStats = {};
  const voterSet = new Set();

  votes.forEach(vote => {
    voterSet.add(vote.voter_id);

    if (!statementStats[vote.statement_index]) {
      statementStats[vote.statement_index] = {
        total: 0,
        count: 0,
        ratings: []
      };
    }
    statementStats[vote.statement_index].total += Number(vote.rating);
    statementStats[vote.statement_index].count += 1;
    statementStats[vote.statement_index].ratings.push(Number(vote.rating));
  });

  // Calculate averages
  Object.keys(statementStats).forEach(index => {
    const stats = statementStats[index];
    stats.average = stats.count > 0 ? (stats.total / stats.count).toFixed(2) : 0;
  });

  return {
    statementStats,
    voterCount: voterSet.size,
    totalVotes: votes.length
  };
}

export default client;
