const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const TOKEN_EXPIRY = "7d";

module.exports = {
  hashPassword(password) {
    return bcrypt.hash(password, 10);
  },

  comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  signToken(user) {
    return jwt.sign(
      { sub: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
  },

  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  },

  // Reads and verifies the Bearer token from an API Gateway event, returning
  // the authenticated user's id, or null if missing/invalid.
  getUserIdFromEvent(event) {
    const header = event.headers?.Authorization || event.headers?.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return null;
    }

    try {
      return jwt.verify(header.slice("Bearer ".length), process.env.JWT_SECRET).sub;
    } catch (err) {
      return null;
    }
  },

  toPublicUser(user) {
    const { password, ...publicUser } = user;
    return publicUser;
  },
};
