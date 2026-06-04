import jwt from 'jsonwebtoken';

// Verify if the user is logged in
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Decode the token using our SECRET_KEY
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //Attach the decoded payload {id, role} to the request object
    req.user = decoded;

    // Pass control to the next middleware or controller
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// Verify if the user is an ADMIN
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};
