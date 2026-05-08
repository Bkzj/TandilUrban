import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';

type RegisterPayload = {
  nombre: string;
  email: string;
  password: string;
};

function validarPayload(body: unknown): { ok: true; data: RegisterPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'El cuerpo de la solicitud es invalido.' };
  }

  const { nombre, email, password } = body as Record<string, unknown>;

  if (typeof nombre !== 'string' || nombre.trim().length < 2) {
    return { ok: false, error: 'El nombre debe tener al menos 2 caracteres.' };
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'El email no es valido.' };
  }

  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, error: 'La contrasena debe tener al menos 8 caracteres.' };
  }

  return {
    ok: true,
    data: {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      password,
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = validarPayload(body);

    if (!payload.ok) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const existe = await prisma.user.findUnique({
      where: { email: payload.data.email },
      select: { id: true },
    });

    if (existe) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email.' }, { status: 409 });
    }

    const passwordHash = await hash(payload.data.password, 12);
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 horas

    const user = await prisma.user.create({
      data: {
        nombre: payload.data.nombre,
        email: payload.data.email,
        passwordHash,
        emailVerifiedAt: null,
        verificationTokens: {
          create: {
            email: payload.data.email,
            token: verificationToken,
            expiresAt: verificationExpiresAt,
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
      },
    });

    const verifyUrl = `${new URL(request.url).origin}/verify?token=${verificationToken}`;

    // TODO: reemplazar por integración real (Resend o Nodemailer).
    // Ejemplo:
    // await resend.emails.send({
    //   from: 'no-reply@tandilurban.com',
    //   to: payload.data.email,
    //   subject: 'Verificá tu cuenta',
    //   html: `<p>Activá tu cuenta desde <a href="${verifyUrl}">este link</a>.</p>`,
    // });
    console.log(`[register] Email de verificacion pendiente para ${payload.data.email}: ${verifyUrl}`);

    return NextResponse.json(
      {
        message:
          'Usuario registrado. Te enviamos un email de verificacion para activar tu cuenta.',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json({ error: 'No se pudo registrar el usuario.' }, { status: 500 });
  }
}

