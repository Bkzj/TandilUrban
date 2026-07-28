import type { RegisterInput, CreateAgentInput } from '@/lib/validation/auth';
import type { PublicContactInput } from '@/lib/validation/contact';
import type { CreatePropertyInput } from '@/lib/validation/property';

export type RegisterPayload = RegisterInput;
export type ContactoPayload = PublicContactInput;
export type CreateAgentePayload = CreateAgentInput;
export type CreatePropiedadPayload = CreatePropertyInput;
