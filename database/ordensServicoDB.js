// database/ordensServicoDB.js
import { executeQuery } from './dbUtils.js';
// import pool from './dbConfig.js'; // Descomente se precisar de transações explícitas aqui

console.log("[ordensServicoDB.js] Script carregado. vInicialCompleta");

export async function getAllOrdensServico() {
  const sql = `
    SELECT 
        os.*, 
        u_resp.username as username_responsavel_abertura,
        u_resp.nome_completo as nome_completo_responsavel_abertura,
        f_solic.nome_completo_funcionario as nome_solicitante_funcionario,
        u_sup_aprov.username as username_supervisor_aprov,
        u_lid_aprov.username as username_lider_aprov,
        TO_CHAR(os.data_abertura, 'DD/MM/YYYY HH24:MI') as data_abertura_formatada,
        TO_CHAR(os.data_fechamento, 'DD/MM/YYYY HH24:MI') as data_fechamento_formatada
    FROM ordens_servico os
    JOIN users u_resp ON os.responsavel_abertura_id = u_resp.id
    LEFT JOIN funcionarios f_solic ON os.solicitante_servico_id = f_solic.id_funcionario
    LEFT JOIN users u_sup_aprov ON os.supervisor_manutencao_aprov_id = u_sup_aprov.id
    LEFT JOIN users u_lid_aprov ON os.lider_manutencao_aprov_id = u_lid_aprov.id
    ORDER BY os.data_abertura DESC;
  `;
  const result = await executeQuery(sql);
  return (result.rows || []).map(row => ({
      ...row,
      data_abertura: row.data_abertura_formatada, 
      data_fechamento: row.data_fechamento_formatada,
      motivos_entrada: row.motivos_entrada || [] 
  }));
}

export async function insertOrdemServico(osData) {
  const { 
      numero_os_manual, prefixo_veiculo, placa_veiculo, km_veiculo, horimetro_veiculo,
      local_servico, responsavel_abertura_id, motivos_entrada, solicitante_servico_id,
      descricao_problema, created_by_user_id 
  } = osData;

  if (!numero_os_manual || !String(numero_os_manual).trim() || !descricao_problema || !responsavel_abertura_id) {
      throw new Error("Número da OS Manual, Descrição do Problema e Responsável pela Abertura são obrigatórios.");
  }

  const sql = `
    INSERT INTO ordens_servico (
        numero_os_manual, prefixo_veiculo, placa_veiculo, km_veiculo, horimetro_veiculo,
        local_servico, responsavel_abertura_id, motivos_entrada, solicitante_servico_id,
        descricao_problema, created_by_user_id, updated_by_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
    RETURNING *, TO_CHAR(data_abertura, 'YYYY-MM-DD HH24:MI:SS') as data_abertura_formatada; 
  `;
  const params = [
      parseInt(numero_os_manual), prefixo_veiculo || null, placa_veiculo || null, 
      Number.isFinite(parseInt(km_veiculo)) ? parseInt(km_veiculo) : null, 
      Number.isFinite(parseFloat(horimetro_veiculo)) ? parseFloat(horimetro_veiculo) : null,
      local_servico || null, responsavel_abertura_id, 
      motivos_entrada && Array.isArray(motivos_entrada) && motivos_entrada.length > 0 ? motivos_entrada : null,
      Number.isFinite(parseInt(solicitante_servico_id)) ? parseInt(solicitante_servico_id) : null,
      descricao_problema, created_by_user_id
  ];
  try {
      const result = await executeQuery(sql, params);
      // Formata a data de abertura para o objeto retornado, se necessário
      const newOSDb = result.rows[0];
      const newOS = {...newOSDb, data_abertura: newOSDb.data_abertura_formatada };
      return newOS;
  } catch (error) {
      if (error.code === '23505' && error.constraint === 'ordens_servico_numero_os_manual_key') {
          throw new Error(`Ordem de Serviço manual número '${numero_os_manual}' já existe.`);
      }
      throw error;
  }
}
// Adicionar aqui:
// getOrdemServicoById(id_os)
// updateOrdemServico(id_os, osData) (para status, fechamento, aprovações, etc.)
// Funções CRUD para os_caracteristicas_selecionadas
// Funções CRUD para os_mao_de_obra
// Funções CRUD para os_materiais (incluindo lógica de aprovação e baixa de estoque)

console.log("[ordensServicoDB.js] Funções CRUD de Ordens de Serviço exportadas (inicial).");