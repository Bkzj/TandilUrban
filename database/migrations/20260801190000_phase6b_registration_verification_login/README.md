# Fase 6B: registro, verificación y login

Ejecutar `preflight.sql` sobre una copia descartable antes de aplicar `migration.sql`. El preflight cuenta tokens hash/legacy/expirados, duplicados de email normalizado y huérfanos, sin imprimir tokens ni passwords; aborta si detecta una expiración anterior o igual a la creación.

La migración es aditiva: preserva tokens raw legacy para compatibilidad controlada y agrega timestamps explícitos de consumo/invalidez, un check que impide ambos estados terminales simultáneos y un índice de consulta de pendientes. Los tokens nuevos permanecen exclusivamente como SHA-256.

`rollback.sql` elimina columnas, constraint e índice. Se pierde el historial de consumo/invalidez; un backup es la única restauración de datos autoritativa.
