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

  toPublicUser(user) {
    const { password, ...publicUser } = user;
    return publicUser;
  },
};
