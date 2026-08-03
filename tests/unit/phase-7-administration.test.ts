import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RolUsuario } from '@/generated/prisma';
import { inviteAgentSchema } from '@/lib/validation/admin';
import { allowedAdministrativeRoleTransition, canAccessGlobalAdministration, canInviteAgent, canManageAccountStatus } from '@/server/admin/admin-policy';

const admin = { id: 'admin', rol: RolUsuario.ADMIN, activo: true, tenantId: null };
const tenantAdmin = { id: 'tenant-admin', rol: RolUsuario.INMOBILIARIA, activo: true, tenantId: 'tenant-a' };
const agent = { id: 'agent-a', rol: RolUsuario.AGENTE, activo: true, tenantId: 'tenant-a' };
const normal = { id: 'normal', rol: RolUsuario.USUARIO_NORMAL, activo: true, tenantId: null };

test('Phase 7 role hierarchy keeps global and tenant authority explicit', () => {
  assert.equal(canAccessGlobalAdministration(admin), true);
  assert.equal(canAccessGlobalAdministration(tenantAdmin), false);
  assert.equal(canAccessGlobalAdministration(agent), false);
  assert.equal(canAccessGlobalAdministration(normal), false);
  assert.equal(canInviteAgent(admin, 'tenant-b'), true);
  assert.equal(canInviteAgent(tenantAdmin, 'tenant-a'), true);
  assert.equal(canInviteAgent(tenantAdmin, 'tenant-b'), false);
  assert.equal(canInviteAgent(agent, 'tenant-a'), false);
});

test('Phase 7 account status ownership prevents cross-tenant and ADMIN mutations', () => {
  assert.equal(canManageAccountStatus(admin, { id: 'agent-b', rol: RolUsuario.AGENTE, tenantId: 'tenant-b' }), true);
  assert.equal(canManageAccountStatus(tenantAdmin, { id: 'agent-a', rol: RolUsuario.AGENTE, tenantId: 'tenant-a' }), true);
  assert.equal(canManageAccountStatus(tenantAdmin, { id: 'agent-b', rol: RolUsuario.AGENTE, tenantId: 'tenant-b' }), false);
  assert.equal(canManageAccountStatus(agent, { id: 'agent-b', rol: RolUsuario.AGENTE, tenantId: 'tenant-a' }), false);
  assert.equal(canManageAccountStatus(admin, { id: 'other-admin', rol: RolUsuario.ADMIN, tenantId: null }), false);
});

test('Phase 7 role transitions never expose global ADMIN promotion to panel policy', () => {
  assert.equal(allowedAdministrativeRoleTransition(RolUsuario.ADMIN, RolUsuario.USUARIO_NORMAL, RolUsuario.AGENTE), true);
  assert.equal(allowedAdministrativeRoleTransition(RolUsuario.ADMIN, RolUsuario.AGENTE, RolUsuario.USUARIO_NORMAL), true);
  assert.equal(allowedAdministrativeRoleTransition(RolUsuario.ADMIN, RolUsuario.USUARIO_NORMAL, RolUsuario.ADMIN), false);
  assert.equal(allowedAdministrativeRoleTransition(RolUsuario.INMOBILIARIA, RolUsuario.AGENTE, RolUsuario.ADMIN), false);
});

test('Phase 7 manipulated agent payload cannot change server-forced role or tenant authority', () => {
  const parsed = inviteAgentSchema.safeParse({ nombre: 'Agente Sintético', email: 'agent@example.invalid', inmobiliariaId: 'tenant-b', rol: 'ADMIN' });
  assert.equal(parsed.success, false);
  assert.equal(canInviteAgent(tenantAdmin, 'tenant-b'), false);
});
