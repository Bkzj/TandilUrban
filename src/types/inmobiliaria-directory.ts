/** Item del directorio público `/inmobiliarias` (sin listado de propiedades). */
export type InmobiliariaDirectoryItem = {
  userId: string;
  nombreAgencia: string;
  bio: string | null;
  direccion: string;
  avatarUrl: string | null;
  contactoNombre: string;
  email: string;
  telefono: string | null;
  destacada: boolean;
  agentesCount: number;
  propiedadesDisponibles: number;
};
