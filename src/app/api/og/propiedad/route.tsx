import { ImageResponse } from 'next/og';
import { identifierSchema } from '@/lib/validation/common';

import { getPropiedadOgData } from '@/lib/propiedad-og';

export const runtime = 'nodejs';

const OG_SIZE = { width: 1200, height: 630 } as const;

function buildOgElement(propiedad: NonNullable<Awaited<ReturnType<typeof getPropiedadOgData>>>) {
  const titulo =
    propiedad.titulo.length > 72 ? `${propiedad.titulo.slice(0, 72)}…` : propiedad.titulo;

  const detalles: string[] = [];
  if (propiedad.dormitorios > 0) {
    detalles.push(
      `${propiedad.dormitorios} ${propiedad.dormitorios === 1 ? 'dormitorio' : 'dormitorios'}`,
    );
  }
  if (propiedad.banos > 0) {
    detalles.push(`${propiedad.banos} ${propiedad.banos === 1 ? 'baño' : 'baños'}`);
  }
  const detallesTexto = detalles.length > 0 ? detalles.join(' · ') : 'Consultá detalles';

  const fotoUrl = propiedad.imagenes[0]?.url ?? propiedad.imagenUrl;

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#1C5E3C',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* ImageResponse renders this element directly; next/image cannot run its optimizer here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fotoUrl}
        alt="Propiedad"
        style={{
          width: '60%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '40%',
          height: '100%',
          padding: '40px',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
        }}
      >
        <span
          style={{
            display: 'flex',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#F6EEDB',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          {propiedad.operacionLabel}
        </span>
        <p
          style={{
            display: 'flex',
            margin: 0,
            fontSize: 34,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.2,
            marginBottom: 24,
          }}
        >
          {titulo}
        </p>
        <p
          style={{
            display: 'flex',
            margin: 0,
            fontSize: 48,
            fontWeight: 800,
            color: '#E8F2EC',
            marginBottom: 28,
            lineHeight: 1.1,
          }}
        >
          {propiedad.precioFmt}
        </p>
        <p
          style={{
            display: 'flex',
            margin: 0,
            fontSize: 22,
            color: 'rgba(255,255,255,0.88)',
          }}
        >
          {detallesTexto}
        </p>
        <span
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 36,
            left: 40,
            fontSize: 18,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.06em',
          }}
        >
          Propea Group
        </span>
      </div>
    </div>
  );
}

function buildFallbackOgElement(propiedad: NonNullable<Awaited<ReturnType<typeof getPropiedadOgData>>>) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#1C5E3C',
        fontFamily: 'system-ui, sans-serif',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        color: 'white',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <p style={{ display: 'flex', margin: 0, fontSize: 28, fontWeight: 700 }}>{propiedad.titulo}</p>
        <p
          style={{
            display: 'flex',
            margin: 0,
            fontSize: 40,
            fontWeight: 800,
            color: '#E8F2EC',
            marginTop: 16,
          }}
        >
          {propiedad.precioFmt}
        </p>
        <span style={{ display: 'flex', fontSize: 18, marginTop: 24, opacity: 0.7 }}>Propea Group</span>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedId = identifierSchema.safeParse(searchParams.get('id') ?? searchParams.get('slug'));

  if (!parsedId.success) {
    return new Response('Missing id', { status: 400 });
  }

  const propiedad = await getPropiedadOgData(parsedId.data);
  if (!propiedad) {
    return new Response('Not found', { status: 404 });
  }

  try {
    return new ImageResponse(buildOgElement(propiedad), OG_SIZE);
  } catch (error) {
    console.error('[og/propiedad] ImageResponse failed:', error);
    return new ImageResponse(buildFallbackOgElement(propiedad), OG_SIZE);
  }
}
