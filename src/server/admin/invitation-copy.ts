import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

import { getServerEnvironment } from '@/lib/validation/environment';

export type InvitationCopyContext = Readonly<{
  administratorDisplayName: string;
  inmobiliariaName: string;
  role: 'INMOBILIARIA' | 'AGENTE';
}>;

export type InvitationCopy = Readonly<{
  subject: string;
  greeting: string;
  intro: string;
  roleSummary: string;
  closing: string;
}>;

export type InvitationCopyProvider = {
  generate(context: InvitationCopyContext): Promise<unknown>;
};

const unsafeCopy = /(?:https?:\/\/|www\.|<[^>]*>|\[[^\]]*\]\([^)]*\)|[`*_#]|[\u0000-\u001f\u007f])/iu;
const plainCopyField = (maximum: number) => z.string().trim().min(1).max(maximum).refine((value) => !unsafeCopy.test(value));

export const invitationCopySchema = z.object({
  subject: plainCopyField(96),
  greeting: plainCopyField(100),
  intro: plainCopyField(280),
  roleSummary: plainCopyField(320),
  closing: plainCopyField(220),
}).strict();

export function fallbackInvitationCopy(context: InvitationCopyContext): InvitationCopy {
  const firstName = context.administratorDisplayName.trim().split(/\s+/u)[0] || 'Hola';
  const isAgent = context.role === 'AGENTE';
  return {
    subject: isAgent ? `Invitación para integrar ${context.inmobiliariaName}` : `Invitación para administrar ${context.inmobiliariaName}`,
    greeting: `Hola, ${firstName}.`,
    intro: `Propea Group te invitó a ${isAgent ? 'integrar el equipo de' : 'administrar'} ${context.inmobiliariaName}.`,
    roleSummary: isAgent
      ? 'Desde tu cuenta vas a poder trabajar con las publicaciones que te asigne la inmobiliaria y mantener su información actualizada.'
      : 'Desde tu cuenta vas a poder gestionar publicaciones, administrar agentes y mantener actualizada la información de tu inmobiliaria.',
    closing: 'Para comenzar, configurá tu contraseña y activá tu cuenta mediante el enlace personal.',
  };
}

export async function resolveInvitationCopy(
  context: InvitationCopyContext,
  provider?: InvitationCopyProvider,
): Promise<{ copy: InvitationCopy; source: 'provider' | 'fallback' }> {
  if (!provider) return { copy: fallbackInvitationCopy(context), source: 'fallback' };
  try {
    const parsed = invitationCopySchema.safeParse(await provider.generate(context));
    return parsed.success
      ? { copy: parsed.data, source: 'provider' }
      : { copy: fallbackInvitationCopy(context), source: 'fallback' };
  } catch {
    return { copy: fallbackInvitationCopy(context), source: 'fallback' };
  }
}

const EDITORIAL_INSTRUCTION = `Sos el asistente editorial de Propea Group.
Redactá una invitación breve para una persona designada para administrar o integrar una inmobiliaria en Propea Group.
Idioma: español de Argentina. Tono: formal, profesional, premium, claro y cordial.
No uses lenguaje exageradamente comercial. No inventes servicios. No incluyas enlaces.
No solicites datos personales. No menciones contraseñas generadas. No escribas HTML ni Markdown.
Respondé únicamente JSON con subject, greeting, intro, roleSummary y closing.`;

export class GeminiInvitationCopyProvider implements InvitationCopyProvider {
  constructor(private readonly apiKey: string, private readonly modelName: string) {}

  async generate(context: InvitationCopyContext): Promise<unknown> {
    const model = new GoogleGenerativeAI(this.apiKey).getGenerativeModel({
      model: this.modelName,
      systemInstruction: EDITORIAL_INSTRUCTION,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.25, maxOutputTokens: 420 },
    }, { timeout: 8_000 });
    const safeContext = JSON.stringify({
      brand: 'Propea Group',
      administratorDisplayName: context.administratorDisplayName,
      inmobiliariaPublicName: context.inmobiliariaName,
      role: context.role,
      language: 'es-AR',
      tone: 'formal, profesional, premium y conciso',
    });
    const result = await model.generateContent(`Contexto comercial seguro: ${safeContext}`);
    return JSON.parse(result.response.text());
  }
}

export function configuredInvitationCopyProvider(): InvitationCopyProvider | undefined {
  const environment = getServerEnvironment();
  if (environment.INVITATION_GEMINI_ENABLED !== 'true' || !environment.GEMINI_API_KEY) return undefined;
  return new GeminiInvitationCopyProvider(environment.GEMINI_API_KEY, environment.GEMINI_MODEL ?? 'gemini-2.5-flash');
}
