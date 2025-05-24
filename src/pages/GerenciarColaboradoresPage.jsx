// src/pages/GerenciarColaboradoresPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Edit3, Trash2, ListChecks, CheckSquare, XSquare, Search as SearchIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import styles from '../styles/GerenciarColaboradoresPage.module.css'; // Renomeado para usar o novo CSS

console.log("GerenciarColaboradoresPage.jsx: Script carregado (vLayoutEstoqueFinalissimo_SemErroRef)");

function classNames(...classes) { return classes.filter(Boolean).join(' '); }

export default function GerenciarColaboradoresPage() {
  const { usuario: currentUser } = useAuth();
  const navigate = useNavigate();

  const initialFuncionarioFormState = { matricula: '', nome_completo_funcionario: '', cargo: '', setor: '', status: true };
  const initialUserFormState = { user_id: null, username: '', password: '', role: 'funcionario', can_approve_purchase_orders: false };

  const [formFuncionario, setFormFuncionario] = useState(initialFuncionarioFormState);
  const [formUser, setFormUser] = useState(initialUserFormState);
  const [editingFuncionario, setEditingFuncionario] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [activeTab, setActiveTab] = useState('listagem');
  const [funcionariosList, setFuncionariosList] = useState([]);
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");

  const isAdmin = currentUser?.role === 'administrador';
  const isManager = currentUser?.role === 'gerente';
  const isFuncionarioDoSistema = currentUser?.role === 'funcionario';
  
  const canViewPage = isAdmin || isManager || isFuncionarioDoSistema;
  const canCreateNewFuncionarioRecord = isAdmin || isManager || isFuncionarioDoSistema;
  const canManageLogins = isAdmin || isManager; 
  const canEditFuncionarioDetails = isAdmin || isManager; 
  const canInactivateFuncionario = isAdmin; 
  const showActionButtonsInList = isAdmin || isManager; // Corrigido

  const resetAllForms = useCallback(() => {
    setFormFuncionario(initialFuncionarioFormState);
    setFormUser(initialUserFormState);
    setEditingFuncionario(null);
    setShowUserForm(false);
  }, []); 

  const fetchFuncionarios = useCallback(async () => {
    if (!window.api?.getAllFuncionarios) {
      setMensagem({ texto: "API de listagem não disponível.", tipo: "erro" }); return;
    }
    setLoadingFuncionarios(true); 
    try {
      const data = await window.api.getAllFuncionarios();
      setFuncionariosList(data || []);
    } catch (error) {
      setMensagem({ texto: "Erro ao buscar funcionários: " + error.message, tipo: "erro" });
      setFuncionariosList([]);
    } finally { setLoadingFuncionarios(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'listagem' && canViewPage) {
      fetchFuncionarios();
    }
  }, [activeTab, canViewPage, fetchFuncionarios]);

  const handleFuncionarioInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormFuncionario(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'matricula' && !editingFuncionario && !formUser.username && !showUserForm) {
        setFormUser(prev => ({...prev, username: value}));
    }
  };
  
  const handleUserInputFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormUser(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setMensagem({ texto: "", tipo: "" });
    if (!formFuncionario.matricula.trim() || !formFuncionario.nome_completo_funcionario.trim()) {
      setMensagem({ texto: 'Matrícula e Nome Completo são obrigatórios.', tipo: "erro" }); return;
    }
    const payload = {
      matricula: formFuncionario.matricula,
      nome_completo_funcionario: formFuncionario.nome_completo_funcionario,
      cargo: formFuncionario.cargo, setor: formFuncionario.setor, status: formFuncionario.status,
      user_id: editingFuncionario ? editingFuncionario.user_id : null,
      createOrUpdateUser: showUserForm && canManageLogins,
      username: (showUserForm && canManageLogins) ? formUser.username.trim() : undefined,
      password: (showUserForm && canManageLogins) ? formUser.password.trim() : undefined,
      role: (showUserForm && canManageLogins) ? formUser.role : undefined,
      can_approve_purchase_orders: (showUserForm && isAdmin) ? formUser.can_approve_purchase_orders : undefined,
    };
    if (payload.createOrUpdateUser) {
        if (!payload.username) { setMensagem({ texto: 'Login é obrigatório para criar/editar acesso.', tipo: "erro" }); return; }
        const isCreatingNewLogin = !editingFuncionario?.user_id && payload.username;
        const isPasswordProvided = payload.password && payload.password.length > 0;
        const isResettingPasswordByAdmin = editingFuncionario?.user_id && isPasswordProvided && isAdmin;
        if (isCreatingNewLogin && (!payload.password || payload.password.length < 6) ) { setMensagem({ texto: 'Senha (mín. 6 caracteres) é obrigatória para novo acesso.', tipo: "erro" }); return; }
        if (isResettingPasswordByAdmin && payload.password.length < 6) { setMensagem({ texto: 'Nova senha para reset deve ter no mínimo 6 caracteres.', tipo: "erro" }); return; }
    }
    try {
      if (editingFuncionario && editingFuncionario.id_funcionario) { 
        const funcPayloadForUpdate = { matricula: payload.matricula, nome_completo_funcionario: payload.nome_completo_funcionario, cargo: payload.cargo, setor: payload.setor, status: payload.status };
        await window.api.updateFuncionario(editingFuncionario.id_funcionario, funcPayloadForUpdate);
        let msgSucesso = "Dados do colaborador atualizados!";
        if (payload.createOrUpdateUser && editingFuncionario.user_id && canManageLogins) {
            await window.api.updateUserDetails({ userId: editingFuncionario.user_id, username: payload.username, nome_completo: payload.nome_completo_funcionario, role: payload.role, can_approve_purchase_orders: payload.can_approve_purchase_orders });
            msgSucesso = "Dados do colaborador e do acesso ao sistema atualizados!";
            if (payload.password && isAdmin) {
                await window.api.adminResetPassword({userId: editingFuncionario.user_id, newPassword: payload.password});
                msgSucesso = "Dados do colaborador atualizados e senha resetada!";
            }
        } else if (payload.createOrUpdateUser && !editingFuncionario.user_id && payload.username && payload.password && canManageLogins) {
             const novoUsuario = await window.api.createUserAccount({ username: payload.username, nome_completo: payload.nome_completo_funcionario, password: payload.password, role: payload.role, can_approve_purchase_orders: payload.can_approve_purchase_orders });
             await window.api.updateFuncionario(editingFuncionario.id_funcionario, { ...funcPayloadForUpdate, user_id: novoUsuario.id });
             msgSucesso = "Dados do colaborador atualizados e acesso ao sistema criado!";
        }
        setMensagem({ texto: msgSucesso, tipo: "sucesso" });
      } else { 
        const resultado = await window.api.createFuncionarioAndOrUser(payload);
        let msgSucesso = `Colaborador '${resultado.nome_completo_funcionario}' (Matrícula: ${resultado.matricula}) cadastrado!`;
        if (resultado.usuario_associado) msgSucesso += ` Acesso ao sistema criado com login '${resultado.usuario_associado.username}'.`;
        setMensagem({ texto: msgSucesso, tipo: "sucesso" });
      }
      resetAllForms(); setActiveTab('listagem');
    } catch (error) { setMensagem({ texto: 'Erro: ' + (error.message || 'Não foi possível salvar.'), tipo: "erro" }); }
  };

  const switchToEditMode = (func) => {
    setMensagem({ texto: "", tipo: "" }); setEditingFuncionario(func);
    setFormFuncionario({ matricula: func.matricula || '', nome_completo_funcionario: func.nome_completo_funcionario || '', cargo: func.cargo || '', setor: func.setor || '', status: func.status !== undefined ? func.status : true });
    if (func.user_id) {
        setFormUser({ user_id: func.user_id, username: func.login_associado || '', password: '', role: func.user_role || 'funcionario', can_approve_purchase_orders: func.user_can_approve_orders === true });
        setShowUserForm(true); 
    } else { setFormUser(prev => ({...initialUserFormState, username: func.matricula})); setShowUserForm(false); }
    setActiveTab('cadastro');
  };

  const handleDeleteFuncionario = async (id_funcionario, nome) => {
    if (!window.api?.deleteFuncionario) { setMensagem({ texto: "API para inativar não disponível.", tipo: "erro" }); return; }
    if (window.confirm(`Tem certeza que deseja INATIVAR '${nome}'?`)) {
      try { await window.api.deleteFuncionario(id_funcionario); setMensagem({ texto: `'${nome}' inativado.`, tipo: "sucesso" }); fetchFuncionarios(); } 
      catch (error) { setMensagem({ texto: "Erro ao inativar: " + error.message, tipo: "erro" }); }
    }
  };

  const funcionariosFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return funcionariosList;
    return funcionariosList.filter(f =>
      (f.nome_completo_funcionario?.toLowerCase().includes(termoBusca.toLowerCase())) ||
      (String(f.matricula)?.toLowerCase().includes(termoBusca.toLowerCase()))
    );
  }, [funcionariosList, termoBusca]);

  if (!canViewPage) return <Navigate to="/" replace />; 

  return (
    <div className={styles.container}>
      <nav>
        <div className={styles.navTitleContainer}> {/* Renomeado para consistência com Estoque.jsx */}
          <Users size={28} className={styles.pageIcon} /> {/* Usando .pageIcon para o ícone */}
          <h2 className={styles.pageTitleActual}>Gerenciamento de Colaboradores</h2> {/* Usando .pageTitleActual para o texto */}
        </div>
      </nav>

      {mensagem.texto && (
        <p className={`${styles.statusMessage} ${mensagem.tipo === "erro" ? styles.errorMessage : styles.successMessage}`}>
          {mensagem.texto}
        </p>
      )}

      <div className={styles.tabsList}>
          <button
            className={`${styles.tabTrigger} ${activeTab === 'listagem' ? styles.tabTriggerActive : ''}`}
            onClick={() => { resetAllForms(); setActiveTab('listagem'); }}
          > <ListChecks size={18} style={{marginRight: '0.3rem'}} /> Listar </button>
          {canCreateNewFuncionarioRecord && (
            <button
                className={`${styles.tabTrigger} ${activeTab === 'cadastro' ? styles.tabTriggerActive : ''}`}
                onClick={() => { resetAllForms(); setActiveTab('cadastro'); setMensagem({texto: "", tipo: ""}); }}
            > <UserPlus size={18} style={{marginRight: '0.3rem'}} /> {editingFuncionario ? 'Editar' : 'Novo'} </button>
          )}
      </div>

      {activeTab === 'listagem' && (
        <div className={styles.tabsContent}>
          <Card className={styles.contentCardForTab}> {/* Card para a listagem */}
            <CardContent className={styles.cardContentTableWrapper}> {/* Remove padding padrão do CardContent */}
              <div className={styles.searchContainer}> {/* Busca dentro do CardContent */}
                  <Label htmlFor="buscaFunc" className={styles.searchLabel}>Buscar por Matrícula ou Nome:</Label>
                  <div className={styles.searchInputWrapper}>
                      <SearchIcon size={18} className={styles.searchIcon} />
                      <Input type="text" id="buscaFunc" placeholder="Digite matrícula ou nome..."
                          value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                          className={styles.searchInput}/>
                  </div>
              </div>
              {loadingFuncionarios ? <p>Carregando...</p> : (
                funcionariosFiltrados.length === 0 ? <p className={styles.emptyTableCell}>{termoBusca ? "Nenhum colaborador para a busca." : "Nenhum colaborador cadastrado."}</p> : (
                  <div className={styles.tableContainerDefaultFromUi}>
                      <Table tableClassName={styles.table}>
                        <TableHeader className={styles.thead}>
                            <TableRow className={styles.tableRow}>
                              <TableHead className={styles.th}>ID</TableHead>
                              <TableHead className={styles.th}>Matrícula</TableHead>
                              <TableHead className={styles.th}>Nome Completo</TableHead>
                              <TableHead className={styles.th}>Cargo</TableHead>
                              <TableHead className={styles.th}>Setor</TableHead>
                              <TableHead className={styles.th}>Status</TableHead>
                              <TableHead className={styles.th}>Login</TableHead>
                              {showActionButtonsInList && <TableHead className={classNames(styles.th, styles.actionsHeader)}>Ações</TableHead>}
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
                                <TableCell className={styles.td}>{func.user_id ? `Sim (${func.login_associado || 'ID: '+func.user_id})` : "Não"}</TableCell>
                                {showActionButtonsInList && (
                                <TableCell className={classNames(styles.td, styles.actions)}>
                                    {canEditFuncionarioDetails && (
                                        <Button variant="outline" size="sm" onClick={() => switchToEditMode(func)} className={styles.actionButton} title="Editar Colaborador">
                                        <Edit3 size={14} />
                                        </Button>
                                    )}
                                    {canInactivateFuncionario && func.status && (!func.user_id || func.user_id !== 1) && ( 
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteFuncionario(func.id_funcionario, func.nome_completo_funcionario)} className={styles.actionButton} title="Inativar Colaborador">
                                        <Trash2 size={14} />
                                    </Button>
                                    )}
                                </TableCell>
                                )}
                            </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'cadastro' && canCreateNewFuncionarioRecord && (
        <div className={styles.tabsContent}>
          <Card className={styles.contentCardForTab}> {/* Card para o formulário */}
            <CardContent className={styles.cardContentWithSearchAndTable}> {/* Reutilizando classe para padding, ou crie .cardContentForm */}
                <h2 className={styles.formTitle}>{editingFuncionario ? `Editando: ${editingFuncionario.nome_completo_funcionario || editingFuncionario.matricula}` : 'Cadastrar Novo Colaborador'}</h2>
                <form onSubmit={handleSubmitForm} className={styles.form}>
                  <h3 className={styles.formSectionTitle}>Dados do Colaborador</h3>
                  <div className={styles.formGroup}>
                    <Label htmlFor="matricula" className={styles.label}>Matrícula</Label>
                    <Input id="matricula" name="matricula" className={styles.input} type="text"
                      value={formFuncionario.matricula} onChange={handleFuncionarioInputChange} required 
                      disabled={!!editingFuncionario}
                      placeholder={editingFuncionario ? "(Não editável)" : "Matrícula única"}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <Label htmlFor="nome_completo_funcionario" className={styles.label}>Nome Completo</Label>
                    <Input id="nome_completo_funcionario" name="nome_completo_funcionario" className={styles.input} type="text"
                      value={formFuncionario.nome_completo_funcionario} onChange={handleFuncionarioInputChange} required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <Label htmlFor="cargo" className={styles.label}>Cargo</Label>
                      <Input id="cargo" name="cargo" className={styles.input} type="text"
                        value={formFuncionario.cargo} onChange={handleFuncionarioInputChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <Label htmlFor="setor" className={styles.label}>Setor</Label>
                      <Input id="setor" name="setor" className={styles.input} type="text"
                        value={formFuncionario.setor} onChange={handleFuncionarioInputChange} />
                    </div>
                  </div>
                  {editingFuncionario && canEditFuncionarioDetails && (
                    <div className={styles.formGroupRow}>
                      <input type="checkbox" id="status" name="status"
                            className={styles.checkbox} checked={formFuncionario.status}
                            onChange={handleFuncionarioInputChange} />
                      <Label htmlFor="status" className={styles.checkboxLabel}>Colaborador Ativo</Label>
                    </div>
                  )}

                  {canManageLogins && (
                    <>
                      <h3 className={styles.formSectionTitle}>Acesso ao Sistema</h3>
                      {(!editingFuncionario || (editingFuncionario && !editingFuncionario.user_id)) && (
                         <div className={styles.formGroupRow}>
                            <input type="checkbox" id="controlShowUserForm" name="controlShowUserForm"
                                    className={styles.checkbox} checked={showUserForm}
                                    onChange={(e) => {
                                        setShowUserForm(e.target.checked);
                                        if(e.target.checked && !formUser.username && formFuncionario.matricula && !editingFuncionario?.user_id) {
                                            setFormUser(prev => ({...prev, username: formFuncionario.matricula}));
                                        } else if (!e.target.checked && !editingFuncionario?.user_id) {
                                            setFormUser(initialUserFormState);
                                        }
                                    }} />
                            <Label htmlFor="controlShowUserForm" className={styles.checkboxLabel}>
                              {editingFuncionario && !editingFuncionario.user_id ? "Criar acesso para este colaborador?" : "Conceder/Gerenciar acesso?"}
                            </Label>
                        </div>
                      )}
                      {(editingFuncionario && editingFuncionario.user_id) && (
                         <p style={{fontSize: '0.9em', color: '#ccc'}}>Este colaborador já possui acesso (Login: {editingFuncionario.login_associado || `User ID ${editingFuncionario.user_id}`}). Edite os detalhes abaixo se necessário.</p>
                      )}
                      {showUserForm && (
                        <>
                          <div className={styles.formGroup}>
                            <Label htmlFor="username" className={styles.label}>Login (Usuário do Sistema)</Label>
                            <Input id="username" name="username" className={styles.input} type="text"
                              value={formUser.username} onChange={handleUserInputFormChange} 
                              placeholder="Login para o sistema" required={showUserForm}
                              disabled={!!editingFuncionario?.user_id && !isAdmin} 
                            />
                          </div>
                          {(!editingFuncionario?.user_id || isAdmin) && (
                            <div className={styles.formGroup}>
                                <Label htmlFor="password" className={styles.label}>
                                    {editingFuncionario?.user_id && isAdmin ? "Nova Senha (Reset - opcional)" : "Senha Provisória"}
                                </Label>
                                <Input id="password" name="password" className={styles.input} type="password"
                                    value={formUser.password} onChange={handleUserInputFormChange}
                                    placeholder={editingFuncionario?.user_id && isAdmin ? "Deixe em branco para não alterar" : "Mínimo 6 caracteres"}
                                    required={!editingFuncionario?.user_id && showUserForm}
                                />
                            </div>
                          )}
                          <div className={styles.formGroup}>
                            <Label htmlFor="role" className={styles.label}>Papel no Sistema</Label>
                            <select id="role" name="role" className={styles.select} 
                                    value={formUser.role} onChange={handleUserInputFormChange} 
                                    required={showUserForm} disabled={isManager && !isAdmin && (!editingFuncionario?.user_id || formUser.role !== 'funcionario')} >
                              {isAdmin && <option value="administrador">Administrador</option>}
                              {isAdmin && <option value="gerente">Gerente</option>}
                              <option value="funcionario">Funcionário</option>
                            </select>
                          </div>
                          {isAdmin && (
                            <div className={styles.formGroupRow}>
                              <input type="checkbox" id="can_approve_purchase_orders" name="can_approve_purchase_orders"
                                    className={styles.checkbox} checked={!!formUser.can_approve_purchase_orders}
                                    onChange={handleUserInputFormChange}
                                    disabled={editingFuncionario?.user_id === 1 && formUser.role === 'administrador'} />
                              <Label htmlFor="can_approve_purchase_orders" className={styles.checkboxLabel}>
                                Pode aprovar pedidos de compra?
                              </Label>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                  <div className={styles.submitButtonContainer}>
                    <Button type="submit" className={styles.submitButton}>
                      {editingFuncionario ? <><Edit3 size={18}/> Salvar</> : <><UserPlus size={18}/> Cadastrar</>}
                    </Button>
                  </div>
                </form>
            </CardContent>
          </Card>
        </div>
      )}

      <button className={styles.link}
          style={{ marginTop: '2rem', display: 'block', marginLeft: 'auto', marginRight: 'auto', width: 'fit-content' }} 
          onClick={() => navigate('/')}
      >
           <ArrowLeft size={16} style={{marginRight: '0.3rem'}} /> Voltar ao Dashboard
      </button>
    </div>
  );
}