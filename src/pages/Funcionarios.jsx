// src/pages/Funcionarios.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// Ícone ListChecks adicionado à importação
import { Users, UserPlus, Edit3, Trash2, Search as SearchIcon, CheckSquare, XSquare, ListChecks } from 'lucide-react'; 
import { useAuth } from '../contexts/AuthContext.jsx';
// Ajuste os caminhos para seus componentes UI se necessário (ex: ../components/ui/)
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import styles from '../styles/Funcionarios.module.css'; // Ajuste o caminho se necessário

console.log("Funcionarios.jsx: SCRIPT CARREGADO (vComListChecksImport).");

function classNames(...classes) { return classes.filter(Boolean).join(' '); }

export default function FuncionariosPage() {
  console.log("--- FUNCIONARIOSPACE.JSX: COMPONENTE RENDERIZANDO ---");

  const { usuario: currentUser } = useAuth();
  const navigate = useNavigate();

  const initialFormState = {
    id_funcionario: null,
    matricula: '',
    nome_completo_funcionario: '',
    cargo: '',
    setor: '',
    status: true,
    user_id: null 
  };
  const [formFuncionario, setFormFuncionario] = useState(initialFormState);
  const [editingFuncionarioId, setEditingFuncionarioId] = useState(null);
  
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [activeTab, setActiveTab] = useState('listagem');
  
  const [funcionariosList, setFuncionariosList] = useState([]);
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");

  const isAdmin = currentUser?.role === 'administrador';
  const isManager = currentUser?.role === 'gerente';
  const canCreateFuncionario = isAdmin || isManager || currentUser?.role === 'funcionario';

  const resetForm = () => {
    setFormFuncionario(initialFormState);
    setEditingFuncionarioId(null);
    console.log("FuncionariosPage.jsx: Formulário resetado.");
  };

  const fetchFuncionarios = useCallback(async () => {
    if (!window.api?.getAllFuncionarios) {
      setMensagem({ texto: "API de listagem de funcionários não disponível.", tipo: "erro" });
      console.error("FuncionariosPage.jsx: window.api.getAllFuncionarios não encontrado.");
      return;
    }
    setLoadingFuncionarios(true);
    setMensagem({ texto: "", tipo: "" });
    console.log("FuncionariosPage.jsx: Buscando lista de funcionários...");
    try {
      const data = await window.api.getAllFuncionarios();
      setFuncionariosList(data || []);
      console.log("FuncionariosPage.jsx: Funcionários recebidos:", data ? data.length : 0);
    } catch (error) {
      console.error("Erro ao buscar funcionários:", error);
      setMensagem({ texto: "Erro ao buscar funcionários: " + error.message, tipo: "erro" });
      setFuncionariosList([]);
    } finally {
      setLoadingFuncionarios(false);
    }
  }, []); 

  useEffect(() => {
    console.log("FuncionariosPage.jsx: useEffect [activeTab] disparado. Aba atual:", activeTab);
    if (activeTab === 'listagem') {
      fetchFuncionarios();
    }
  }, [activeTab, fetchFuncionarios]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormFuncionario(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setMensagem({ texto: "", tipo: "" });
    console.log("FuncionariosPage.jsx: Tentando salvar funcionário. Dados do form:", formFuncionario, "Editando ID:", editingFuncionarioId);

    if (!formFuncionario.matricula.trim() || !formFuncionario.nome_completo_funcionario.trim()) {
      setMensagem({ texto: 'Matrícula e Nome Completo são obrigatórios.', tipo: "erro" }); return;
    }

    const payload = {
      matricula: formFuncionario.matricula,
      nome_completo_funcionario: formFuncionario.nome_completo_funcionario,
      cargo: formFuncionario.cargo,
      setor: formFuncionario.setor,
      status: formFuncionario.status,
      // user_id não é definido neste formulário. A associação/criação de user é feita pelo admin em outra tela.
    };

    try {
      if (editingFuncionarioId) {
        if (!window.api?.updateFuncionario) { setMensagem({ texto: 'API de atualização de funcionário não disponível.', tipo: "erro" }); return; }
        console.log("FuncionariosPage.jsx: Chamando updateFuncionario para ID:", editingFuncionarioId, "Payload:", payload);
        // O preload espera (id, data), então passamos como um objeto
        await window.api.updateFuncionario({id_funcionario: editingFuncionarioId, funcionarioData: payload});
        setMensagem({ texto: "Funcionário atualizado com sucesso!", tipo: "sucesso" });
      } else {
        if (!window.api?.createFuncionario) { setMensagem({ texto: 'API de criação de funcionário não disponível.', tipo: "erro" }); return; }
        console.log("FuncionariosPage.jsx: Chamando createFuncionario. Payload:", payload);
        const novoFuncionario = await window.api.createFuncionario(payload);
        setMensagem({ texto: `Funcionário '${novoFuncionario.nome_completo_funcionario}' (Matrícula: ${novoFuncionario.matricula}) cadastrado!`, tipo: "sucesso" });
      }
      resetForm();
      // fetchFuncionarios(); // Já é chamado pelo useEffect ao mudar activeTab para 'listagem'
      setActiveTab('listagem'); // Volta para a listagem após salvar
    } catch (error) {
      console.error("FuncionariosPage.jsx: Erro ao salvar funcionário:", error);
      setMensagem({ texto: 'Erro: ' + (error.message || 'Não foi possível salvar o funcionário.'), tipo: "erro" });
    }
  };

  const switchToEditMode = (func) => {
    console.log("FuncionariosPage.jsx: Editando funcionário:", func);
    setMensagem({ texto: "", tipo: "" });
    setFormFuncionario({
      id_funcionario: func.id_funcionario,
      matricula: func.matricula || '',
      nome_completo_funcionario: func.nome_completo_funcionario || '',
      cargo: func.cargo || '',
      setor: func.setor || '',
      status: func.status !== undefined ? func.status : true,
      user_id: func.user_id || null
    });
    setEditingFuncionarioId(func.id_funcionario);
    setActiveTab('cadastro');
  };

  const handleDeleteFuncionario = async (id_funcionario, nome) => {
    console.log("FuncionariosPage.jsx: Tentando inativar funcionário ID:", id_funcionario, "Nome:", nome);
    if (!window.api?.deleteFuncionario) { 
        setMensagem({ texto: "API para inativar/deletar funcionário não disponível.", tipo: "erro" }); 
        console.error("FuncionariosPage.jsx: window.api.deleteFuncionario não encontrado.");
        return; 
    }
    if (window.confirm(`Tem certeza que deseja INATIVAR o funcionário '${nome}' (ID: ${id_funcionario})?`)) {
      try {
        await window.api.deleteFuncionario(id_funcionario); // O backend já recebe o ID do admin logado para auditoria, se necessário
        setMensagem({ texto: `Funcionário '${nome}' inativado.`, tipo: "sucesso" });
        fetchFuncionarios();
      } catch (error) {
        console.error("FuncionariosPage.jsx: Erro ao inativar funcionário:", error);
        setMensagem({ texto: "Erro ao inativar funcionário: " + error.message, tipo: "erro" });
      }
    }
  };

  const funcionariosFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return funcionariosList;
    return funcionariosList.filter(f =>
      (f.nome_completo_funcionario && f.nome_completo_funcionario.toLowerCase().includes(termoBusca.toLowerCase())) ||
      (f.matricula && String(f.matricula).toLowerCase().includes(termoBusca.toLowerCase())) // Garante que matrícula seja string
    );
  }, [funcionariosList, termoBusca]);

  if (!currentUser || !(isAdmin || isManager || currentUser.role === 'funcionario')) {
      console.warn("FuncionariosPage.jsx: Usuário sem permissão para esta página, renderizando Navigate para /.");
      return <Navigate to="/" replace />; 
  }

  return (
    <div className={styles.container}>
      {console.log("FuncionariosPage.jsx: RENDERIZANDO DIV CONTAINER. ActiveTab:", activeTab)}
      <h1 className={styles.pageTitle}>Gerenciamento de Funcionários</h1>
      <div className={styles.contentCard}>
        <div className={styles.tabsList}>
          <button
            className={`${styles.tabTrigger} ${activeTab === 'listagem' ? styles.tabTriggerActive : ''}`}
            onClick={() => { resetForm(); setActiveTab('listagem'); /* fetchFuncionarios é chamado pelo useEffect */ }}
          >
            <ListChecks size={18} style={{ marginRight: '0.5rem' }} /> Listar Funcionários
          </button>
          {canCreateFuncionario && (
            <button
                className={`${styles.tabTrigger} ${activeTab === 'cadastro' ? styles.tabTriggerActive : ''}`}
                onClick={() => { resetForm(); setActiveTab('cadastro'); }}
            >
                <UserPlus size={18} style={{ marginRight: '0.5rem' }} /> 
                {editingFuncionarioId ? 'Editar Funcionário' : 'Novo Funcionário'}
            </button>
          )}
        </div>

        {mensagem.texto && (
          <p className={`${styles.statusMessage} ${mensagem.tipo === "erro" ? styles.errorMessage : styles.successMessage}`}>
            {mensagem.texto}
          </p>
        )}

        {activeTab === 'cadastro' && canCreateFuncionario && (
          <div className={styles.tabsContent}>
            {console.log("FuncionariosPage.jsx: RENDERIZANDO ABA CADASTRO. Editing ID:", editingFuncionarioId)}
            <h2 className={styles.formTitle}>{editingFuncionarioId ? `Editando: ${formFuncionario.nome_completo_funcionario || formFuncionario.matricula}` : 'Cadastrar Novo Funcionário'}</h2>
            <form onSubmit={handleSubmitForm} className={styles.form}>
              <div className={styles.formGroup}>
                <Label htmlFor="matricula" className={styles.label}>Matrícula</Label>
                <Input id="matricula" name="matricula" className={styles.input} type="text"
                  value={formFuncionario.matricula} onChange={handleInputChange} required 
                  disabled={!!editingFuncionarioId}
                  placeholder={editingFuncionarioId ? "(Não editável)" : "Matrícula única do funcionário"}
                />
              </div>
              <div className={styles.formGroup}>
                <Label htmlFor="nome_completo_funcionario" className={styles.label}>Nome Completo</Label>
                <Input id="nome_completo_funcionario" name="nome_completo_funcionario" className={styles.input} type="text"
                  value={formFuncionario.nome_completo_funcionario} onChange={handleInputChange} required
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Label htmlFor="cargo" className={styles.label}>Cargo</Label>
                  <Input id="cargo" name="cargo" className={styles.input} type="text"
                    value={formFuncionario.cargo} onChange={handleInputChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <Label htmlFor="setor" className={styles.label}>Setor</Label>
                  <Input id="setor" name="setor" className={styles.input} type="text"
                    value={formFuncionario.setor} onChange={handleInputChange}
                  />
                </div>
              </div>
              {(editingFuncionarioId && (isAdmin || isManager) )&& ( 
                <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="status" name="status"
                         className={styles.checkbox} checked={formFuncionario.status}
                         onChange={handleInputChange}
                  />
                  <Label htmlFor="status" className={styles.label} style={{ marginBottom: 0 }}>
                    Funcionário Ativo?
                  </Label>
                </div>
              )}
               {editingFuncionarioId && formFuncionario.user_id && isAdmin && (
                 <div className={styles.formGroup}>
                    <Label className={styles.label}>Login Associado ao Sistema</Label>
                    <Input className={styles.input} value={`ID Usuário: ${formFuncionario.user_id} (Para desvincular ou alterar, use Gerenciar Contas de Usuário)`} disabled />
                 </div>
               )}
              <div className={styles.submitButtonContainer}>
                <Button type="submit" className={styles.submitButton}>
                  {editingFuncionarioId ? <><Edit3 size={18}/> Salvar Alterações</> : <><UserPlus size={18}/> Cadastrar Funcionário</>}
                </Button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'listagem' && (
          <div className={styles.tabsContent}>
            {console.log("FuncionariosPage.jsx: RENDERIZANDO ABA LISTAGEM. Loading:", loadingFuncionarios, "Filtrados:", funcionariosFiltrados.length)}
            <div className={styles.searchContainer}>
                <Label htmlFor="buscaFunc" className={styles.searchLabel}>Buscar por Matrícula ou Nome:</Label>
                <div className={styles.searchInputWrapper}>
                    <SearchIcon size={18} className={styles.searchIcon} />
                    <Input type="text" id="buscaFunc" placeholder="Digite matrícula ou nome..."
                        value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                        className={styles.searchInput}/>
                </div>
            </div>
            {loadingFuncionarios ? <p>Carregando funcionários...</p> : (
              funcionariosFiltrados.length === 0 ? <p className={styles.emptyTableCell}>{termoBusca ? "Nenhum funcionário para a busca." : "Nenhum funcionário cadastrado."}</p> : (
                <Card className={styles.cardContentTableWrapper}>
                    <Table tableClassName={styles.table} className={styles.tableContainerDefaultFromUi}>
                    <TableHeader className={styles.thead}>
                        <TableRow className={styles.tableRow}>
                        <TableHead className={styles.th}>ID</TableHead>
                        <TableHead className={styles.th}>Matrícula</TableHead>
                        <TableHead className={styles.th}>Nome Completo</TableHead>
                        <TableHead className={styles.th}>Cargo</TableHead>
                        <TableHead className={styles.th}>Setor</TableHead>
                        <TableHead className={styles.th}>Status</TableHead>
                        <TableHead className={styles.th}>Login (User ID)</TableHead>
                        {(isAdmin || isManager) && <TableHead className={classNames(styles.th, styles.actionsHeader)}>Ações</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {funcionariosFiltrados.map((func) => (
                        <TableRow key={func.id_funcionario} className={styles.tableRow}>
                            <TableCell className={styles.td}>{func.id_funcionario}</TableCell>
                            <TableCell className={styles.td}>{func.matricula}</TableCell>
                            <TableCell className={styles.td}>{func.nome_completo_funcionario}</TableCell>
                            <TableCell className={styles.td}>{func.cargo}</TableCell>
                            <TableCell className={styles.td}>{func.setor}</TableCell>
                            <TableCell className={styles.td}>{func.status ? <CheckSquare color="green" size={18}/> : <XSquare color="gray" size={18}/>}</TableCell>
                            <TableCell className={styles.td}>{func.user_id ? `Sim (${func.login_associado || func.user_id})` : "Não"}</TableCell>
                            {(isAdmin || isManager) && (
                            <TableCell className={classNames(styles.td, styles.actions)}>
                                <Button variant="outline" size="sm" onClick={() => switchToEditMode(func)} className={styles.actionButton} title="Editar Dados do Funcionário">
                                <Edit3 size={14} />
                                </Button>
                                {isAdmin && func.status && func.user_id !== currentUser?.id && ( // Admin pode inativar, exceto se o funcionário for o próprio admin logado (caso raro de admin ser também funcionário)
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteFuncionario(func.id_funcionario, func.nome_completo_funcionario)} className={styles.actionButton} title="Inativar Funcionário">
                                    <Trash2 size={14} />
                                </Button>
                                )}
                            </TableCell>
                            )}
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </Card>
              )
            )}
          </div>
        )}
        <button className={styles.link}
            style={{ marginTop: '2rem', display: 'block', marginLeft: 'auto', marginRight: 'auto'}} 
            onClick={() => navigate('/')}
        >
             Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
}