-- setup_xerife_db.sql
--------------------------------------------------------------------------------
-- Script para configurar o banco de dados "Xerife" e o usuário "xerife_user".
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Conecte-se ao seu servidor PostgreSQL como um superusuário (ex: 'postgres').
-- 2. CRIE O BANCO DE DADOS "Xerife" MANUALMENTE PRIMEIRO, SE ELE NÃO EXISTIR.
--    Ex: No pgAdmin, clique direito em Databases > Create > Database... Nome: Xerife, Dono: postgres
-- 3. DEPOIS, CONECTE-SE AO BANCO DE DADOS "Xerife" como superusuário ('postgres').
-- 4. Execute este script INTEIRO na Query Tool do pgAdmin.
--------------------------------------------------------------------------------

-- Etapa 1: Criar o Usuário da Aplicação (se ainda não existir)
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'xerife_user') THEN
      CREATE ROLE xerife_user WITH LOGIN PASSWORD 'root'; -- ATENÇÃO: Senha para DESENVOLVIMENTO.
      RAISE NOTICE 'Usuário "xerife_user" criado com senha "root".';
   ELSE
      RAISE NOTICE 'Usuário "xerife_user" já existe.';
   END IF;
END
$$;

-- Etapa 2: Permissões Iniciais (Conceda CONNECT ao banco "Xerife")
GRANT CONNECT ON DATABASE "Xerife" TO xerife_user;

-- Etapa 3: Permissões no Schema 'public' para 'xerife_user'
-- (Certifique-se de estar conectado ao banco "Xerife" para executar o restante)
GRANT USAGE, CREATE ON SCHEMA public TO xerife_user;

ALTER DEFAULT PRIVILEGES FOR ROLE xerife_user IN SCHEMA public
   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO xerife_user;
ALTER DEFAULT PRIVILEGES FOR ROLE xerife_user IN SCHEMA public
   GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO xerife_user;
ALTER DEFAULT PRIVILEGES FOR ROLE xerife_user IN SCHEMA public
   GRANT EXECUTE ON FUNCTIONS TO xerife_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO xerife_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
   GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO xerife_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
   GRANT EXECUTE ON FUNCTIONS TO xerife_user;

-- Etapa 4: Criar Extensões, Tabelas, Funções de Trigger e Triggers

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION trigger_set_timestamp_geral()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('administrador', 'gerente', 'funcionario')),
    can_approve_purchase_orders BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO xerife_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE users_id_seq TO xerife_user;

DROP TRIGGER IF EXISTS set_timestamp_users_trigger ON users; 
CREATE TRIGGER set_timestamp_users_trigger
BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp_geral();

CREATE TABLE IF NOT EXISTS estoque (
    codigo_fixo TEXT PRIMARY KEY NOT NULL, 
    id_sync UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    codigo_peca TEXT,
    classificacao TEXT,
    descricao TEXT NOT NULL,
    aplicacao TEXT,
    fabricante TEXT,
    estoque_atual INTEGER DEFAULT 0 NOT NULL,
    estoque_minimo INTEGER DEFAULT 0 NOT NULL,
    estoque_inicial INTEGER DEFAULT 0,
    data_lancamento DATE, -- <<< NOVA COLUNA ADICIONADA AQUI
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_peca_identificacao UNIQUE (codigo_peca, descricao, fabricante)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.estoque TO xerife_user;

DROP TRIGGER IF EXISTS set_timestamp_estoque_trigger ON estoque;
CREATE TRIGGER set_timestamp_estoque_trigger
BEFORE UPDATE ON estoque FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp_geral();

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id_movimentacao SERIAL PRIMARY KEY,
    id_item_estoque_sync UUID NOT NULL REFERENCES estoque(id_sync) ON DELETE RESTRICT,
    tipo_movimentacao TEXT NOT NULL CHECK(tipo_movimentacao IN ('entrada_compra', 'saida_requisicao', 'ajuste_entrada', 'ajuste_saida', 'saldo_inicial')),
    quantidade INTEGER NOT NULL,
    data_movimentacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    usuario_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    observacao TEXT,
    documento_referencia TEXT, 
    custo_unitario_movimentacao NUMERIC(12, 4) DEFAULT 0.0000,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.movimentacoes_estoque TO xerife_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE movimentacoes_estoque_id_movimentacao_seq TO xerife_user;

CREATE OR REPLACE FUNCTION trigger_update_estoque_atual_mov_func()
RETURNS TRIGGER AS $$
DECLARE
    item_id_sync_val UUID;
    qtd_change INTEGER;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        item_id_sync_val := NEW.id_item_estoque_sync;
        qtd_change := NEW.quantidade;
        IF NEW.tipo_movimentacao IN ('entrada_compra', 'ajuste_entrada', 'saldo_inicial') THEN
            UPDATE estoque SET estoque_atual = estoque_atual + qtd_change WHERE id_sync = item_id_sync_val;
        ELSIF NEW.tipo_movimentacao IN ('saida_requisicao', 'ajuste_saida') THEN
            UPDATE estoque SET estoque_atual = estoque_atual - qtd_change WHERE id_sync = item_id_sync_val;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        item_id_sync_val := OLD.id_item_estoque_sync;
        qtd_change := OLD.quantidade;
        IF OLD.tipo_movimentacao IN ('entrada_compra', 'ajuste_entrada', 'saldo_inicial') THEN
            UPDATE estoque SET estoque_atual = estoque_atual - qtd_change WHERE id_sync = item_id_sync_val;
        ELSIF OLD.tipo_movimentacao IN ('saida_requisicao', 'ajuste_saida') THEN
            UPDATE estoque SET estoque_atual = estoque_atual + qtd_change WHERE id_sync = item_id_sync_val;
        END IF;
    END IF;
    RETURN NULL; 
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_movimentacao_estoque_trigger ON movimentacoes_estoque;
CREATE TRIGGER after_movimentacao_estoque_trigger
AFTER INSERT OR DELETE ON movimentacoes_estoque
FOR EACH ROW EXECUTE FUNCTION trigger_update_estoque_atual_mov_func();

-- Etapa 5: Criar a Sequência para codigo_fixo da tabela estoque
CREATE SEQUENCE IF NOT EXISTS codigo_fixo_estoque_seq 
    START WITH 1 
    INCREMENT BY 1 
    NO MINVALUE 
    NO MAXVALUE 
    CACHE 1;
GRANT USAGE, SELECT ON SEQUENCE codigo_fixo_estoque_seq TO xerife_user;

DO $$
BEGIN
   RAISE NOTICE 'Script de setup do banco de dados "Xerife" concluído com sucesso (vComDataLancamento)!';
END
$$;