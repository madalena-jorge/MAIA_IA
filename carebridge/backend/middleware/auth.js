/**
 * CareBridge - Middleware de Autenticação (JWT)
 * --------------------------------------------------
 * NOTA ACADÉMICA:
 * A autenticação baseada em JWT (JSON Web Tokens) garante que a API
 * seja stateless (sem estado), ou seja, o servidor não precisa de guardar
 * a sessão na memória. Isto protege a privacidade do Cuidador e Paciente,
 * validando cada pedido isoladamente (Princípio de Zero Trust).
 */
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
