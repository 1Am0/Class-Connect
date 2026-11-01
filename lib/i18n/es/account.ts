import type en from "../en/account";
import type { Translation } from "../translate";

export default {
  retry: "Inténtalo de nuevo.",
  title: "Cuenta",
  usernameUpdated: "Nombre de usuario actualizado.",
  usernameFailed: "No se pudo actualizar tu nombre de usuario.",
  username: "Nombre de usuario",
  email: "Correo electrónico",
  saving: "Guardando…",
  saveUsername: "Guardar nombre de usuario",
  demoPassword:
    "Las opciones de contraseña están disponibles en cuentas reales de maestro. La demostración local no usa contraseña.",
  passwordUpdated: "Contraseña actualizada.",
  passwordFailed: "No se pudo actualizar tu contraseña.",
  changePassword: "Cambiar contraseña",
  currentPassword: "Contraseña actual",
  newPassword: "Contraseña nueva",
  updating: "Actualizando…",
  resetSent:
    "Si tu cuenta puede recibir correo, te enviamos un enlace para restablecer la contraseña.",
  resetFailed: "No se pudo pedir el enlace para restablecer.",
  emailReset: "Enviarme un enlace para restablecer la contraseña",
} satisfies Translation<typeof en>;
