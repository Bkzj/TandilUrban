export const AUTH_MESSAGES = {
  credentialsInvalid: 'No pudimos iniciar sesión con esos datos.',
  registrationFailed: 'No se pudo crear la cuenta.',
  registrationSucceeded:
    'Si los datos son válidos, recibirás un correo para continuar.',
  verificationSucceeded: 'Tu correo fue verificado. Ya podés ingresar.',
  verificationLinkInvalid:
    'El enlace de verificación no es válido o venció. Podés solicitar uno nuevo.',
  resendGeneric:
    'Si corresponde, te enviaremos un nuevo correo de verificación.',
  resendFailed: 'No pudimos procesar el reenvío. Intentá nuevamente más tarde.',
  resendRateLimited:
    'Alcanzaste el límite de reenvíos. Intentá nuevamente más tarde.',
  passwordChanged:
    'Contraseña actualizada. Volvé a iniciar sesión.',
  passwordResetRequested:
    'Si existe una cuenta asociada a ese correo, te enviaremos un enlace para restablecer la contraseña.',
} as const;

export function authenticationErrorMessage(): string {
  return AUTH_MESSAGES.credentialsInvalid;
}

export function registrationErrorMessage(): string {
  return AUTH_MESSAGES.registrationFailed;
}
