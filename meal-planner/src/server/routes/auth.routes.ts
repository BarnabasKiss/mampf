import { Router, Request, Response } from 'express';
import { verifyPassword, getConfiguredUsername } from '../auth';

const router = Router();

// POST /api/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich.' });
    return;
  }

  const configuredUsername = getConfiguredUsername();

  if (username !== configuredUsername) {
    res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort.' });
    return;
  }

  if (!verifyPassword(password)) {
    res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort.' });
    return;
  }

  req.session.authenticated = true;
  req.session.username = username;

  res.json({ success: true, username });
});

// POST /api/logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Fehler beim Abmelden.' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// GET /api/session
router.get('/session', (req: Request, res: Response) => {
  if (req.session?.authenticated) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

export default router;