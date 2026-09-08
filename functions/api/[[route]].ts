import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { sign, verify } from 'hono/jwt'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

// Generate a random UUID
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Simple password hashing using PBKDF2 via Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
  );
  const salt = enc.encode("StrayAnimalSOS_Salt_MakeItSecure");
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("raw", key);
  const hashBuffer = new Uint8Array(exported);
  const hashArray = Array.from(hashBuffer);
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = await verify(token, c.env.JWT_SECRET || 'fallback-secret-12345');
    c.set('user', decoded);
    await next();
  } catch (e) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

// --- AUTH ---
app.post('/auth/signup', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  const hash = await hashPassword(password);
  const id = uuidv4();
  
  try {
    await c.env.DB.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
      .bind(id, email, hash).run();
    
    const token = await sign({ id, email }, c.env.JWT_SECRET || 'fallback-secret-12345');
    return c.json({ token, user: { id, email } });
  } catch (e: any) {
    if (e.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Email already exists' }, 400);
    }
    return c.json({ error: e.message }, 500);
  }
});

app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const hash = await hashPassword(password);
  
  const user: any = await c.env.DB.prepare('SELECT id, email FROM users WHERE email = ? AND password_hash = ?')
    .bind(email, hash).first();
    
  if (!user) return c.json({ error: 'Invalid credentials' }, 401);
  
  const token = await sign({ id: user.id, email: user.email }, c.env.JWT_SECRET || 'fallback-secret-12345');
  return c.json({ token, user });
});

app.get('/auth/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const dbUser = await c.env.DB.prepare('SELECT id, email, created_at FROM users WHERE id = ?').bind(user.id).first();
  if (!dbUser) return c.json({ error: 'User not found' }, 404);
  return c.json({ user: dbUser });
});

// --- UPLOAD ---
app.post('/upload', authMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'] as File;
  if (!file) return c.json({ error: 'No file uploaded' }, 400);
  
  const ext = file.name.split('.').pop();
  const filename = `${uuidv4()}.${ext}`;
  
  await c.env.BUCKET.put(filename, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  });
  
  return c.json({ url: `/api/assets/${filename}` });
});

app.get('/assets/:filename', async (c) => {
  const filename = c.req.param('filename');
  const object = await c.env.BUCKET.get(filename);
  if (!object) return c.notFound();
  
  const headers = new Headers();
  object.writeHttpMetadata(headers as any);
  headers.set('etag', object.httpEtag);
  return new Response(object.body as any, { headers });
});

// --- SOS ---
app.get('/sos', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT a.*, u.email as user_email 
    FROM animal_sos a 
    JOIN users u ON a.user_id = u.id 
    ORDER BY a.created_at DESC
  `).all();
  
  const formatted = results.map((r: any) => ({
    ...r,
    profiles: { email: r.user_email }
  }));
  
  return c.json(formatted);
});

app.post('/sos', authMiddleware, async (c) => {
  const user = c.get('user');
  const { country, region, description, image_url } = await c.req.json();
  const id = uuidv4();
  
  await c.env.DB.prepare(`
    INSERT INTO animal_sos (id, user_id, image_url, country, region, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, user.id, image_url || null, country, region, description).run();
  
  return c.json({ id });
});

app.get('/sos/:id', async (c) => {
  const id = c.req.param('id');
  const sos = await c.env.DB.prepare('SELECT * FROM animal_sos WHERE id = ?').bind(id).first();
  if (!sos) return c.notFound();
  return c.json(sos);
});

// --- MESSAGES ---
app.get('/messages', authMiddleware, async (c) => {
  const sos_id = c.req.query('sos_id');
  if (!sos_id) return c.json({ error: 'Missing sos_id' }, 400);
  
  const { results } = await c.env.DB.prepare(`
    SELECT m.*, u.email as sender_email 
    FROM messages m 
    JOIN users u ON m.sender_id = u.id 
    WHERE m.sos_id = ? 
    ORDER BY m.created_at ASC
  `).bind(sos_id).all();
  
  const formatted = results.map((r: any) => ({
    ...r,
    sender: { email: r.sender_email }
  }));
  
  return c.json(formatted);
});

app.post('/messages', authMiddleware, async (c) => {
  const user = c.get('user');
  const { receiver_id, sos_id, content } = await c.req.json();
  if (!receiver_id || !sos_id || !content) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  const id = uuidv4();
  
  await c.env.DB.prepare(`
    INSERT INTO messages (id, sender_id, receiver_id, sos_id, content)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, user.id, receiver_id, sos_id, content).run();
  
  return c.json({ id });
});

app.get('/users/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const dbUser = await c.env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(id).first();
  if (!dbUser) return c.notFound();
  return c.json(dbUser);
});

export const onRequest = handle(app);
