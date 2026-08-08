export const PASSWORD_PATTERN = /^.{6,72}$/s;

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
