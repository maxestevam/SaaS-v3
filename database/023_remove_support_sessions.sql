-- Exclusão definitiva autorizada explicitamente pelo usuário em 27/08/2026.
-- Preserva-se ld_user_activity_log e ld_user_presence, utilizados por métricas
-- e atividades operacionais gerais do painel.
DROP TABLE IF EXISTS ld_support_sessions;
