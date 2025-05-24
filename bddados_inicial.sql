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
      CREATE ROLE xerife_user WITH LOGIN PASSWORD 'root'; -- ATENÇÃO: Senha para DESENVOLVIMENTO. MUDE PARA PRODUÇÃO!
      RAISE NOTICE 'Usuário "xerife_user" criado com senha "root".';
   ELSE
      RAISE NOTICE 'Usuário "xerife_user" já existe.';
   END IF;
END
$$;

-- Etapa 2: Permissões Iniciais
GRANT CONNECT ON DATABASE "Xerife" TO xerife_user;

-- Etapa 3: Permissões no Schema 'public' para 'xerife_user'
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

-- Tabela users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    nome_completo TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('administrador', 'gerente', 'funcionario')),
    can_approve_purchase_orders BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by_user_id INTEGER,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER 
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO xerife_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE users_id_seq TO xerife_user;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS fk_users_deleted_by,
    ADD CONSTRAINT fk_users_deleted_by FOREIGN KEY (deleted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    DROP CONSTRAINT IF EXISTS fk_users_created_by,
    ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    DROP CONSTRAINT IF EXISTS fk_users_updated_by,
    ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS set_timestamp_users_trigger ON users; 
CREATE TRIGGER set_timestamp_users_trigger
BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp_geral();

-- Tabela funcionarios
CREATE TABLE IF NOT EXISTS funcionarios (
    id_funcionario SERIAL PRIMARY KEY,
    matricula TEXT UNIQUE NOT NULL,
    nome_completo_funcionario TEXT NOT NULL,
    cargo TEXT,
    setor TEXT,
    status BOOLEAN DEFAULT TRUE NOT NULL,
    user_id INTEGER REFERENCES users(id) UNIQUE NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.funcionarios TO xerife_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE funcionarios_id_funcionario_seq TO xerife_user;

DROP TRIGGER IF EXISTS set_timestamp_funcionarios_trigger ON funcionarios;
CREATE TRIGGER set_timestamp_funcionarios_trigger
BEFORE UPDATE ON funcionarios FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp_geral();

-- Tabela estoque
CREATE TABLE IF NOT EXISTS estoque (
    codigo_fixo TEXT PRIMARY KEY NOT NULL, 
    id_sync UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    codigo_peca TEXT, classificacao TEXT, descricao TEXT NOT NULL, aplicacao TEXT, fabricante TEXT,
    estoque_atual INTEGER DEFAULT 0 NOT NULL, estoque_minimo INTEGER DEFAULT 0 NOT NULL,
    estoque_inicial INTEGER DEFAULT 0, data_lancamento DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL, created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ, deleted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_peca_identificacao UNIQUE (codigo_peca, descricao, fabricante)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.estoque TO xerife_user;

DROP TRIGGER IF EXISTS set_timestamp_estoque_trigger ON estoque;
CREATE TRIGGER set_timestamp_estoque_trigger
BEFORE UPDATE ON estoque FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp_geral();

-- Tabela movimentacoes_estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id_movimentacao SERIAL PRIMARY KEY,
    id_item_estoque_sync UUID NOT NULL REFERENCES estoque(id_sync) ON DELETE RESTRICT,
    tipo_movimentacao TEXT NOT NULL CHECK(tipo_movimentacao IN ('entrada_compra', 'saida_requisicao', 'saida_os', 'ajuste_entrada', 'ajuste_saida', 'saldo_inicial')),
    quantidade INTEGER NOT NULL, data_movimentacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    usuario_id INTEGER REFERENCES users(id) ON DELETE SET NULL, observacao TEXT, documento_referencia TEXT, 
    custo_unitario_movimentacao NUMERIC(12, 4) DEFAULT 0.0000, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.movimentacoes_estoque TO xerife_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE movimentacoes_estoque_id_movimentacao_seq TO xerife_user;

-- Função de Trigger para 'movimentacoes_estoque'
CREATE OR REPLACE FUNCTION trigger_update_estoque_atual_mov_func()
RETURNS TRIGGER AS $$
DECLARE item_id_sync_val UUID; qtd_change INTEGER;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        item_id_sync_val := NEW.id_item_estoque_sync; qtd_change := NEW.quantidade;
        IF NEW.tipo_movimentacao IN ('entrada_compra', 'ajuste_entrada', 'saldo_inicial') THEN
            UPDATE estoque SET estoque_atual = estoque_atual + qtd_change WHERE id_sync = item_id_sync_val;
        ELSIF NEW.tipo_movimentacao IN ('saida_requisicao', 'saida_os', 'ajuste_saida') THEN
            UPDATE estoque SET estoque_atual = estoque_atual - qtd_change WHERE id_sync = item_id_sync_val;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        item_id_sync_val := OLD.id_item_estoque_sync; qtd_change := OLD.quantidade;
        IF OLD.tipo_movimentacao IN ('entrada_compra', 'ajuste_entrada', 'saldo_inicial') THEN
            UPDATE estoque SET estoque_atual = estoque_atual - qtd_change WHERE id_sync = item_id_sync_val;
        ELSIF OLD.tipo_movimentacao IN ('saida_requisicao', 'saida_os', 'ajuste_saida') THEN
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

-- Sequência para codigo_fixo da tabela estoque
CREATE SEQUENCE IF NOT EXISTS codigo_fixo_estoque_seq 
    START WITH 1 
    INCREMENT BY 1 
    NO MINVALUE 
    NO MAXVALUE 
    CACHE 1;
GRANT USAGE, SELECT ON SEQUENCE codigo_fixo_estoque_seq TO xerife_user;

-- Tabela tipos_caracteristica_manutencao
CREATE TABLE IF NOT EXISTS tipos_caracteristica_manutencao (
    id_tipo_caracteristica SERIAL PRIMARY KEY,
    nome_caracteristica TEXT NOT NULL UNIQUE,
    descricao TEXT NULL,
    ativo BOOLEAN DEFAULT TRUE NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tipos_caracteristica_manutencao TO xerife_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE tipos_caracteristica_manutencao_id_tipo_caracteristica_seq TO xerife_user;

-- CORREÇÃO: Valores inseridos diretamente, placeholder removido
INSERT INTO tipos_caracteristica_manutencao (nome_caracteristica) VALUES
('Acabamento/Funilaria'), ('Ar condicionado'), ('Arrefecimento'), ('Caixa de marcha'), ('Freio'),
('Hidráulico'), ('Implemento'), ('Inspeção'), ('Lubrificação e Óleo'), ('Motor'),
('Parte Elétrica'), ('Pneu borracharia'), ('Serviços Externos'), ('Sistema de Direção'),
('Suspensão Chassi'), ('Outros')
ON CONFLICT (nome_caracteristica) DO NOTHING;

-- Tabela ordens_servico
CREATE TABLE IF NOT EXISTS ordens_servico (
    id_os SERIAL PRIMARY KEY,
    numero_os_manual INTEGER UNIQUE NOT NULL,
    prefixo_veiculo TEXT,
    placa_veiculo VARCHAR(10) NULL,
    km_veiculo INTEGER NULL,
    horimetro_veiculo NUMERIC(10,2) NULL,
    local_servico TEXT NULL,
    data_abertura TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_fechamento TIMESTAMPTZ NULL,
    responsavel_abertura_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    motivos_entrada TEXT[] NULL, 
    solicitante_servico_id INTEGER REFERENCES funcionarios(id_funcionario) ON DELETE SET NULL,
    descricao_problema TEXT NOT NULL,
    servicos_realizados_sumario TEXT NULL,
    status_os TEXT NOT NULL DEFAULT 'aberta' CHECK(status_os IN ('aberta', 'em_andamento', 'aguardando_pecas', 'pendente_aprovacao_final', 'concluida', 'cancelada')),
    supervisor_manutencao_aprov_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    data_aprov_supervisor TIMESTAMPTZ NULL,
    lider_manutencao_aprov_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    data_aprov_lider TIMESTAMPTZ NULL,
    observacoes_gerais TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ordens_servico TO xerife_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE ordens_servico_id_os_seq TO xerife_user;

DROP TRIGGER IF EXISTS set_timestamp_ordens_servico_trigger ON ordens_servico; 
CREATE TRIGGER set_timestamp_ordens_servico_trigger
BEFORE UPDATE ON ordens_servico FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp_geral();

-- Tabela os_caracteristicas_selecionadas
CREATE TABLE IF NOT EXISTS os_caracteristicas_selecionadas (
    id_os_caracteristica SERIAL PRIMARY KEY,
    id_os INTEGER NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
    id_tipo_caracteristica INTEGER NOT NULL REFERENCES tipos_caracteristica_manutencao(id_tipo_caracteristica) ON DELETE RESTRICT,
    UNIQUE (id_os, id_tipo_caracteristica)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.os_caracteristicas_selecionadas TO xerife_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE os_caracteristicas_selecionadas_id_os_caracteristica_seq TO xerife_user;

-- Tabela os_mao_de_obra
CREATE TABLE IF NOT EXISTS os_mao_de_obra (
    id_apontamento_mo SERIAL PRIMARY KEY,
    id_os INTEGER NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
    data_apontamento DATE NOT NULL DEFAULT CURRENT_DATE,
    funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id_funcionario) ON DELETE RESTRICT,
    hora_inicio TIME NOT NULL, hora_fim TIME NULL, motivo_parada TEXT NULL, observacoes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.os_mao_de_obra TO xerife_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE os_mao_de_obra_id_apontamento_mo_seq TO xerife_user;

-- Tabela os_materiais
CREATE TABLE IF NOT EXISTS os_materiais (
    id_os_material SERIAL PRIMARY KEY,
    id_os INTEGER NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
    id_item_estoque_sync UUID NOT NULL REFERENCES estoque(id_sync) ON DELETE RESTRICT,
    quantidade_solicitada INTEGER NOT NULL,
    quantidade_fornecida INTEGER DEFAULT 0,
    status_material TEXT NOT NULL DEFAULT 'solicitado' CHECK(status_material IN ('solicitado', 'aprovado_retirada', 'retirado_do_estoque', 'compra_necessaria', 'item_cancelado', 'atendido_parcialmente')),
    data_solicitacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    solicitante_material_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    aprovador_retirada_id INTEGER REFERENCES users(id) ON DELETE SET NULL, 
    data_aprovacao_retirada TIMESTAMPTZ NULL,
    observacao_material TEXT NULL,
    id_movimentacao_saida INTEGER REFERENCES movimentacoes_estoque(id_movimentacao) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.os_materiais TO xerife_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE os_materiais_id_os_material_seq TO xerife_user;

DROP TRIGGER IF EXISTS set_timestamp_os_materiais_trigger ON os_materiais; 
CREATE TRIGGER set_timestamp_os_materiais_trigger
BEFORE UPDATE ON os_materiais FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp_geral();

DO $$
BEGIN
   RAISE NOTICE 'Script de setup do banco de dados "Xerife" (com Ordens de Serviço e Funcionários - vFinal) concluído com sucesso!';
END
$$;