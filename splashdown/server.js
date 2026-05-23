const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Issuer, generators } = require('openid-client');
const s3 = require('./lib/s3');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-portal-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: BASE_URL.startsWith('https'),
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  },
}));

const upload = multer({
  dest: '/tmp/portal-uploads',
  limits: { fileSize: 100 * 1024 * 1024 },
});

let oidcClient;
async function getClient() {
  if (oidcClient) return oidcClient;
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL);
  oidcClient = new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID,
    client_secret: process.env.OIDC_CLIENT_SECRET,
    redirect_uris: [`${BASE_URL}/portal/auth/callback`],
    response_types: ['code'],
  });
  return oidcClient;
}

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/portal/login');
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function buildBreadcrumb(prefix) {
  const parts = prefix.split('/').filter(Boolean);
  const crumbs = [{ name: 'Home', prefix: '' }];
  let accumulated = '';
  for (const part of parts) {
    accumulated += part + '/';
    crumbs.push({ name: part, prefix: accumulated });
  }
  return crumbs;
}

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/portal');
  res.render('login');
});

router.get('/auth/start', async (req, res) => {
  try {
    const client = await getClient();
    const state = generators.state();
    const nonce = generators.nonce();
    req.session.oidcState = { state, nonce };
    res.redirect(client.authorizationUrl({
      scope: 'openid profile email',
      state,
      nonce,
    }));
  } catch (err) {
    console.error('OIDC start error:', err.message);
    res.render('error', { message: 'Authentication service unavailable.' });
  }
});

router.get('/auth/callback', async (req, res) => {
  try {
    const client = await getClient();
    const params = client.callbackParams(req);
    const { state, nonce } = req.session.oidcState || {};
    const tokenSet = await client.callback(
      `${BASE_URL}/portal/auth/callback`,
      params,
      { state, nonce }
    );
    const claims = tokenSet.claims();
    req.session.user = {
      id: claims.sub,
      name: claims.name || claims.preferred_username || 'User',
      email: claims.email || claims.preferred_username,
    };
    delete req.session.oidcState;
    const returnTo = req.session.returnTo || '/portal';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (err) {
    console.error('OIDC callback error:', err.message);
    res.render('error', { message: 'Sign-in failed. Please try again.' });
  }
});

router.get('/auth/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/portal/login'));
});

router.get('/', requireAuth, async (req, res) => {
  const prefix = req.query.prefix || '';
  try {
    const { folders, files } = await s3.listObjects(prefix);
    res.render('files', {
      user: req.session.user,
      prefix,
      folders,
      files,
      breadcrumb: buildBreadcrumb(prefix),
      formatBytes,
      formatDate,
    });
  } catch (err) {
    console.error('List error:', err.message);
    res.render('error', { message: 'Could not load files.' });
  }
});

router.post('/upload', requireAuth, upload.array('files', 20), async (req, res) => {
  const prefix = req.body.prefix || '';
  try {
    for (const file of req.files || []) {
      const key = prefix + file.originalname;
      await s3.uploadFile(key, file.path, file.mimetype);
      try { fs.unlinkSync(file.path); } catch (_) {}
    }
  } catch (err) {
    console.error('Upload error:', err.message);
  }
  res.redirect(`/portal?prefix=${encodeURIComponent(prefix)}`);
});

router.get('/download', requireAuth, async (req, res) => {
  const key = req.query.key;
  if (!key || key.includes('..')) return res.status(400).send('Invalid file');
  try {
    const url = await s3.getDownloadUrl(key);
    res.redirect(url);
  } catch (err) {
    console.error('Download error:', err.message);
    res.render('error', { message: 'Download failed.' });
  }
});

router.post('/folder', requireAuth, (req, res) => {
  const prefix = req.body.prefix || '';
  const name = (req.body.name || '').trim().replace(/[^a-zA-Z0-9 _\-().]/g, '');
  if (!name) return res.redirect(`/portal?prefix=${encodeURIComponent(prefix)}`);
  s3.createFolder(`${prefix}${name}/`)
    .then(() => res.redirect(`/portal?prefix=${encodeURIComponent(prefix)}`))
    .catch((err) => {
      console.error('Folder error:', err.message);
      res.redirect(`/portal?prefix=${encodeURIComponent(prefix)}`);
    });
});

router.post('/delete', requireAuth, (req, res) => {
  const key = req.body.key;
  const prefix = req.body.prefix || '';
  if (!key || key.includes('..')) return res.redirect(`/portal?prefix=${encodeURIComponent(prefix)}`);
  s3.deleteObject(key)
    .then(() => res.redirect(`/portal?prefix=${encodeURIComponent(prefix)}`))
    .catch((err) => {
      console.error('Delete error:', err.message);
      res.redirect(`/portal?prefix=${encodeURIComponent(prefix)}`);
    });
});

app.use('/portal', router);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SplashDown running on port ${PORT}`);
});
