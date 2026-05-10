/** Cuerpo esperado por `POST /api/auth/register`. */
export type RegisterPayload = {
  nombre: string;
  email: string;
  password: string;
};

/** Cuerpo esperado por `POST /api/contacto`. */
export type ContactoPayload = {
  nombre: string;
  email: string;
  mensaje: string;
  propiedadId: string;
};

/** Cuerpo esperado por `POST /api/panel/equipo`. */
export type CreateAgentePayload = {
  nombre: string;
  email: string;
  password: string;
};
