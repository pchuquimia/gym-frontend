export const PASSWORD_PATTERN = /^.{6,72}$/s;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export const normalizeUsername = (username) =>
  String(username || "")
    .trim()
    .toLowerCase();

export const validateUsername = (username) => {
  const value = normalizeUsername(username);
  if (!value) return "Elige un nombre de usuario.";
  if (!USERNAME_PATTERN.test(value)) {
    return "Usa de 3 a 20 letras, números o guion bajo.";
  }
  return "";
};

export const validateEmail = (email) => {
  const value = email.trim();
  if (!value) return "Ingresa tu correo electrónico.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Ingresa un correo electrónico válido.";
  }
  return "";
};

export const validatePassword = (password) => {
  if (!password) return "Ingresa una contraseña.";
  if (!PASSWORD_PATTERN.test(password)) return "Usa entre 6 y 72 caracteres.";
  return "";
};

export const passwordStatus = (password) => {
  const missing = [];
  if (password.length < 6) missing.push("6 caracteres");
  return missing;
};
