export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

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
  if (!PASSWORD_PATTERN.test(password)) {
    return "Usa 8 caracteres, mayúscula, minúscula, número y símbolo.";
  }
  return "";
};

export const passwordStatus = (password) => {
  const missing = [];
  if (password.length < 8) missing.push("8 caracteres");
  if (!/[A-Z]/.test(password)) missing.push("mayúscula");
  if (!/[a-z]/.test(password)) missing.push("minúscula");
  if (!/\d/.test(password)) missing.push("número");
  if (!/[^A-Za-z\d]/.test(password)) missing.push("símbolo");
  return missing;
};
