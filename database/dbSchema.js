// database/dbSchema.js
import { executeQuery } from './dbUtils.js';

console.log("[dbSchema.js] Script carregado (vAposSetupSQL_SimplificadoCorreto).");

export async function initializeDatabaseSchema() {
  console.log("[dbSchema.js] Verificando existência das tabelas (APENAS TABELAS)...");
  // A conexão é pega pela executeQuery.
  try {
    // Tabela Users
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, nome_completo TEXT, password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('administrador', 'gerente', 'funcionario')),
        can_approve_purchase_orders BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMPTZ,
        deleted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      );`);
    console.log("[dbSchema.js] Tabela 'users' verificada/criada (se não existia).");

    // Tabela Funcionarios
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id_funcionario SERIAL PRIMARY KEY, matricula TEXT UNIQUE NOT NULL, nome_completo_funcionario TEXT NOT NULL,
        cargo TEXT, setor TEXT, status BOOLEAN DEFAULT TRUE NOT NULL, 
        user_id INTEGER REFERENCES users(id) UNIQUE NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log("[dbSchema.js] Tabela 'funcionarios' verificada/criada (se não existia).");

    // Tabela Estoque
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS estoque (
        codigo_fixo TEXT PRIMARY KEY NOT NULL, id_sync UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
        codigo_peca TEXT, classificacao TEXT, descricao TEXT NOT NULL, aplicacao TEXT, fabricante TEXT,
        estoque_atual INTEGER DEFAULT 0 NOT NULL, estoque_minimo INTEGER DEFAULT 0 NOT NULL,
        estoque_inicial INTEGER DEFAULT 0, data_lancamento DATE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL, created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
        deleted_at TIMESTAMPTZ, deleted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT uq_peca_identificacao UNIQUE (codigo_peca, descricao, fabricante)
      );`);
    console.log("[dbSchema.js] Tabela 'estoque' verificada/criada (se não existia).");

    // Tabela Movimentacoes_Estoque
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id_movimentacao SERIAL PRIMARY KEY, id_item_estoque_sync UUID NOT NULL REFERENCES estoque(id_sync) ON DELETE RESTRICT,
        tipo_movimentacao TEXT NOT NULL CHECK(tipo_movimentacao IN ('entrada_compra', 'saida_requisicao', 'saida_os', 'ajuste_entrada', 'ajuste_saida', 'saldo_inicial')),
        quantidade INTEGER NOT NULL, data_movimentacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        usuario_id INTEGER REFERENCES users(id) ON DELETE SET NULL, observacao TEXT, documento_referencia TEXT, 
        custo_unitario_movimentacao NUMERIC(12, 4) DEFAULT 0.0000, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );`);
    console.log("[dbSchema.js] Tabela 'movimentacoes_estoque' verificada/criada (se não existia).");

    // Tabela tipos_caracteristica_manutencao
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS tipos_caracteristica_manutencao (
        id_tipo_caracteristica SERIAL PRIMARY KEY, nome_caracteristica TEXT NOT NULL UNIQUE,
        descricao TEXT NULL, ativo BOOLEAN DEFAULT TRUE NOT NULL
      );
    `);
    console.log("[dbSchema.js] Tabela 'tipos_caracteristica_manutencao' verificada/criada (se não existia).");
    // O INSERT dos dados iniciais para tipos_caracteristica_manutencao está no setup_xerife_db.sql

    // Tabela ordens_servico
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ordens_servico (
        id_os SERIAL PRIMARY KEY, numero_os_manual INTEGER UNIQUE NOT NULL, prefixo_veiculo TEXT,
        placa_veiculo VARCHAR(10) NULL, km_veiculo INTEGER NULL, horimetro_veiculo NUMERIC(10,2) NULL,
        local_servico TEXT NULL, data_abertura TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        data_fechamento TIMESTAMPTZ NULL, 
        responsavel_abertura_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        motivos_entrada TEXT[] NULL, 
        solicitante_servico_id INTEGER REFERENCES funcionarios(id_funcionario) ON DELETE SET NULL,
        descricao_problema TEXT NOT NULL, servicos_realizados_sumario TEXT NULL,
        status_os TEXT NOT NULL DEFAULT 'aberta' CHECK(status_os IN ('aberta', 'em_andamento', 'aguardando_pecas', 'pendente_aprovacao_final', 'concluida', 'cancelada')),
        supervisor_manutencao_aprov_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        data_aprov_supervisor TIMESTAMPTZ NULL,
        lider_manutencao_aprov_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        data_aprov_lider TIMESTAMPTZ NULL, observacoes_gerais TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      );`);
    console.log("[dbSchema.js] Tabela 'ordens_servico' verificada/criada (se não existia).");

    // Tabela os_caracteristicas_selecionadas
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS os_caracteristicas_selecionadas (
        id_os_caracteristica SERIAL PRIMARY KEY,
        id_os INTEGER NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
        id_tipo_caracteristica INTEGER NOT NULL REFERENCES tipos_caracteristica_manutencao(id_tipo_caracteristica) ON DELETE RESTRICT,
        UNIQUE (id_os, id_tipo_caracteristica)
      );`);
    console.log("[dbSchema.js] Tabela 'os_caracteristicas_selecionadas' verificada/criada (se não existia).");

    // Tabela os_mao_de_obra
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS os_mao_de_obra (
        id_apontamento_mo SERIAL PRIMARY KEY,
        id_os INTEGER NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
        data_apontamento DATE NOT NULL DEFAULT CURRENT_DATE,
        funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id_funcionario) ON DELETE RESTRICT,
        hora_inicio TIME NOT NULL, hora_fim TIME NULL, motivo_parada TEXT NULL, observacoes TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      );`);
    console.log("[dbSchema.js] Tabela 'os_mao_de_obra' verificada/criada (se não existia).");

    // Tabela os_materiais
    await executeQuery(`
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
      );`);
    console.log("[dbSchema.js] Tabela 'os_materiais' verificada/criada (se não existia).");
    
    console.log("[dbSchema.js] Verificação de todas as tabelas (APENAS TABELAS) concluída com sucesso.");
    return true;

  } catch (error) {
    console.error('[dbSchema.js] ERRO FATAL durante a verificação/criação de tabelas:', error);
    return Promise.reject(error);
  }
}

console.log("[dbSchema.js] Função initializeDatabaseSchema exportada.");