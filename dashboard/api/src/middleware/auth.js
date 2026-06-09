const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' });
  }
}

function commanderOnly(req, res, next) {
  if (req.user.role !== 'commander') {
    return res.status(403).json({ error: 'هذه الميزة متاحة فقط للقائد' });
  }
  next();
}

module.exports.auth = auth;
module.exports.commanderOnly = commanderOnly;
