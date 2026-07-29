export const AUTH_MESSAGES = {
  credentialsInvalid: 'Credenciales invalidas. Verifica tu email y contrasena.',
  registrationFailed: 'No se pudo crear la cuenta.',
  registrationSucceeded:
    'Cuenta creada. Revisá tu correo para verificarla antes de ingresar.',
  verificationSucceeded: 'Tu correo fue verificado. Ya podés ingresar.',
  verificationLinkInvalid:
    'El enlace de verificación no es válido o venció. Podés solicitar uno nuevo.',
  resendGeneric:
    'Si corresponde, te enviaremos un nuevo correo de verificación.',
  resendFailed: 'No pudimos procesar el reenvío. Intentá nuevamente más tarde.',
  resendRateLimited:
    'Alcanzaste el límite de reenvíos. Intentá nuevamente más tarde.',
} as const;

export function authenticationErrorMessage(): string {
  return AUTH_MESSAGES.credentialsInvalid;
}

export function registrationErrorMessage(): string {
  return AUTH_MESSAGES.registrationFailed;
}
