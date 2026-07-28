import assert from 'node:assert/strict';
import test from 'node:test';
import { EstadoPropiedad, RolUsuario } from '@prisma/client';

import {
  isPublicPropertyState,
  PUBLIC_PROPERTY_STATES,
} from '../../src/lib/public-property-state';
import {
  toPublicPropertyDetailDto,
  type PublicPropertyDetailPayload,
} from '../../src/lib/public-property-dto';
import { userCanModifyPropiedad } from '../../src/lib/panel-propiedad-access';

test('public property states allow DISPONIBLE and RESERVADA only', () => {
  assert.deepEqual(PUBLIC_PROPERTY_STATES, [
    EstadoPropiedad.DISPONIBLE,
    EstadoPropiedad.RESERVADA,
  ]);
  assert.equal(isPublicPropertyState(EstadoPropiedad.DISPONIBLE), true);
  assert.equal(isPublicPropertyState(EstadoPropiedad.RESERVADA), true);
  assert.equal(isPublicPropertyState(EstadoPropiedad.PAUSADA), false);
  assert.equal(isPublicPropertyState(EstadoPropiedad.VENDIDA), false);
});

test('public detail DTO returns only approved fields and a narrow inmobiliaria summary', () => {
  const payload: PublicPropertyDetailPayload = {
    id: 'property-a',
    titulo: 'Casa',
    descripcion: 'Descripción',
    operacion: 'VENTA',
    tipo: 'Casa',
    precio: 100,
    moneda: 'USD',
    direccion: 'Dirección',
    barrio: 'Centro',
    latitud: -37,
    longitud: -59,
    m2Total: 100,
    ambientes: 3,
    dormitorios: 2,
    banos: 1,
    cocheras: 1,
    caracteristicas: ['Patio'],
    imagenes: [],
    inmobiliaria: {
      nombreAgencia: 'Agencia',
      logoUrl: 'https://example.com/logo.png',
      logoAgencia: null,
      userId: 'profile-a',
    },
    agente: {
      id: 'agent-a',
      nombre: 'Agente',
      avatarUrl: null,
    },
  };

  const dto = toPublicPropertyDetailDto(payload);
  assert.deepEqual(Object.keys(dto).sort(), [
    'agente', 'ambientes', 'banos', 'barrio', 'caracteristicas', 'cocheras',
    'descripcion', 'direccion', 'dormitorios', 'id', 'imagenes', 'inmobiliaria',
    'latitud', 'longitud', 'm2Total', 'moneda', 'operacion', 'precio', 'tipo', 'titulo',
  ]);
  assert.deepEqual(dto.inmobiliaria, {
    nombreAgencia: 'Agencia',
    logoUrl: 'https://example.com/logo.png',
    publicProfileUserId: 'profile-a',
  });
  assert.equal('cuit' in dto.inmobiliaria, false);
  assert.equal('inmobiliariaId' in dto, false);
  assert.equal('visitas' in dto, false);
  assert.equal('consultas' in dto, false);
});

test('tenant property policy enforces agent assignment and gives ADMIN no implicit tenant', () => {
  const property = { inmobiliariaId: 'tenant-a', agenteId: 'agent-a' };
  assert.equal(userCanModifyPropiedad({
    id: 'owner-a',
    rol: RolUsuario.INMOBILIARIA,
    agenciaId: null,
    inmobiliariaPerfil: { id: 'tenant-a' },
  }, property), true);
  assert.equal(userCanModifyPropiedad({
    id: 'agent-b',
    rol: RolUsuario.AGENTE,
    agenciaId: 'tenant-a',
    inmobiliariaPerfil: null,
  }, property), false);
  assert.equal(userCanModifyPropiedad({
    id: 'admin',
    rol: RolUsuario.ADMIN,
    agenciaId: null,
    inmobiliariaPerfil: { id: 'tenant-a' },
  }, property), false);
  assert.equal(userCanModifyPropiedad({
    id: 'normal',
    rol: RolUsuario.USUARIO_NORMAL,
    agenciaId: null,
    inmobiliariaPerfil: null,
  }, property), false);
});
