// src/Cadastro.jsx (Gerenciamento de Usuários - Admin/Gerente)
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Edit3, Trash, ListChecks, KeyRound, CheckSquare, XSquare } from 'lucide-react';
import { useAuth } from './AuthContext.jsx'; // Para obter o papel do usuário logado

// Importando componentes de UI - VERIFIQUE SE OS CAMINHOS ESTÃO CORRETOS
import { Button } from './components/ui/button.jsx';
import { Input } from './components/ui/input.jsx';
import { Label } from './components/ui/label.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.jsx';
import { Card, CardContent } from './components/ui/card.jsx';

import styles from './CadastroUsuario.module.css';

console.log("Cadastro.jsx (Admin User Management vComEdicaoExclusao): Script carregado.");

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Cadastro() {
  const { usuario: currentUser } = useAuth(); // Usuário logado atualmente
  const navigate = useNavigate();

  // Estados do formulário (usado para criar e editar)
  const [formData, setFormData] = useState({
    id: null, // Usado para saber se estamos editando
    username: '',
    password: '', // Para nova senha na criação ou reset pelo admin
    role: 'funcionario',
    can_approve_purchase_orders: false,
  });
  const [newPasswordForReset, setNewPasswordForReset] = useState(''); // Campo separado para reset de senha na edição

  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [activeTab, setActiveTab] = useState('listar'); // Começar com listagem pode ser melhor
  
  const [usuariosList, setUsuariosList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isAdmin = currentUser?.role === 'administrador';
  const isManager = currentUser?.role === 'gerente';

  const resetForm = () => {
    setFormData({ id: null, username: '', password: '', role: 'funcionario', can_approve_purchase_orders: false });
    setNewPasswordForReset('');
  };

  const fetchUsers = useCallback(async () => {
    if (!window.api || !window.api.getAllUsers) {
      setMensagem({ texto: "Erro: API de listagem não disponível.", tipo: "erro" });
      return;
    }
    setLoadingUsers(true);
    console.log("Cadastro.jsx: Buscando lista de usuários...");
    try {
      const users = await window.api.getAllUsers();
      setUsuariosList(users || []);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      setMensagem({ texto: "Erro ao buscar usuários: " + error.message, tipo: "erro" });
      setUsuariosList([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []); // useCallback para estabilizar a função

  useEffect(() => {
    // Buscar usuários ao montar o componente se a aba inicial for 'listar'
    // ou se o usuário logado mudar (ex: de gerente para admin, se possível em um app complexo)
    if (currentUser && (isAdmin || isManager)) { // Apenas admin/gerente devem estar nesta tela
        fetchUsers();
    }
  }, [fetchUsers, currentUser, isAdmin, isManager]); // Adicionado currentUser e papéis para refetch se mudar

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setMensagem({ texto: "", tipo: "" });

    if (!formData.username.trim() || (!formData.id && !formData.password.trim())) {
      setMensagem({ texto: 'Nome de usuário e senha (para novos usuários) são obrigatórios.', tipo: "erro" });
      return;
    }
    if (!formData.id && formData.password.length < 6) {
      setMensagem({ texto: 'A senha para novos usuários deve ter pelo menos 6 caracteres.', tipo: "erro" });
      return;
    }

    try {
      if (formData.id) { // Modo Edição
        if (!window.api || !window.api.updateUserDetails) {
          setMensagem({ texto: 'API de atualização não disponível.', tipo: "erro" }); return;
        }
        console.log("Cadastro.jsx: Atualizando usuário:", formData);
        await window.api.updateUserDetails({
          userId: formData.id,
          username: formData.username,
          role: formData.role,
          can_approve_purchase_orders: isAdmin ? formData.can_approve_purchase_orders : undefined, // Só admin envia este campo
        });
        setMensagem({ texto: "Usuário atualizado com sucesso!", tipo: "sucesso" });

        // Se uma nova senha foi fornecida para reset pelo admin
        if (newPasswordForReset.trim()) {
          if (newPasswordForReset.length < 6) {
            setMensagem({ texto: "Nova senha para reset é muito curta (mín. 6 caracteres). Detalhes do usuário salvos.", tipo: "aviso" });
          } else if (window.api && window.api.adminResetPassword) {
            await window.api.adminResetPassword({ userId: formData.id, newPassword: newPasswordForReset });
            setMensagem({ texto: "Usuário atualizado e senha resetada com sucesso!", tipo: "sucesso" });
          } else {
             setMensagem({ texto: "API de reset de senha não disponível. Detalhes do usuário salvos.", tipo: "aviso" });
          }
        }
        
      } else { // Modo Criação
        if (!window.api || !window.api.createUser) {
          setMensagem({ texto: 'API de criação não disponível.', tipo: "erro" }); return;
        }
        console.log("Cadastro.jsx: Criando usuário:", formData);
        const payload = {
            username: formData.username,
            password: formData.password,
            role: formData.role,
        };
        if (isAdmin) { // Apenas admin pode setar can_approve_purchase_orders na criação
            payload.can_approve_purchase_orders = formData.can_approve_purchase_orders;
        }
        // O backend já força can_approve_purchase_orders para false se um gerente cria.

        const novoUsuario = await window.api.createUser(payload);
        setMensagem({ texto: `Usuário '${novoUsuario.username}' criado como '${novoUsuario.role}'!`, tipo: "sucesso" });
      }
      resetForm();
      fetchUsers(); // Atualiza a lista
      setActiveTab('listar');
    } catch (error) {
      console.error('Cadastro.jsx: Erro ao salvar usuário:', error);
      setMensagem({ texto: 'Erro: ' + (error.message || 'Não foi possível salvar o usuário.'), tipo: "erro" });
    }
  };

  const switchToEditMode = (user) => {
    setMensagem({ texto: "", tipo: "" });
    setFormData({
      id: user.id,
      username: user.username,
      password: '', // Senha não é pré-preenchida para edição, apenas para reset
      role: user.role,
      can_approve_purchase_orders: Boolean(user.can_approve_purchase_orders),
    });
    setNewPasswordForReset(''); // Limpa campo de reset de senha
    setActiveTab('criar'); // Reutiliza a aba 'criar' como 'editar'
  };

  const handleDeleteUser = async (userId, username) => {
    setMensagem({ texto: "", tipo: "" });
    if (!window.api || !window.api.deleteUser) {
      setMensagem({ texto: "Erro: API de exclusão não disponível.", tipo: "erro" }); return;
    }
    if (window.confirm(`Tem certeza que deseja excluir o usuário '${username}' (ID: ${userId})? Esta ação não pode ser desfeita.`)) {
      try {
        await window.api.deleteUser(userId);
        setMensagem({ texto: `Usuário '${username}' excluído com sucesso.`, tipo: "sucesso" });
        fetchUsers(); // Atualiza a lista
      } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        setMensagem({ texto: "Erro ao excluir usuário: " + error.message, tipo: "erro" });
      }
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Gerenciamento de Usuários</h1>

      <div className={styles.contentCard}>
        <div className={styles.tabsList}>
          <button
            className={`${styles.tabTrigger} ${activeTab === 'criar' ? styles.tabTriggerActive : ''}`}
            onClick={() => { resetForm(); setActiveTab('criar'); }}
          >
            <UserPlus size={18} style={{ marginRight: '0.5rem' }} /> {formData.id ? 'Editar Usuário' : 'Criar Novo Usuário'}
          </button>
          <button
            className={`${styles.tabTrigger} ${activeTab === 'listar' ? styles.tabTriggerActive : ''}`}
            onClick={() => { resetForm(); setActiveTab('listar'); fetchUsers(); /* Garante que a lista é atual */}}
          >
            <ListChecks size={18} style={{ marginRight: '0.5rem' }} /> Listar Usuários
          </button>
        </div>

        {mensagem.texto && (
          <p className={`${styles.statusMessage} ${mensagem.tipo === "erro" ? styles.errorMessage : styles.successMessage}`}>
            {mensagem.texto}
          </p>
        )}

        {activeTab === 'criar' && ( // Usado para Criar OU Editar
          <div className={styles.tabsContent}>
            <h2 className={styles.formTitle}>{formData.id ? `Editando Usuário: ${formData.username}` : 'Detalhes do Novo Usuário'}</h2>
            <form onSubmit={handleSubmitForm} className={styles.form}>
              <div className={styles.formGroup}>
                <Label htmlFor="username" className={styles.label}>Nome de Usuário</Label>
                <Input
                  id="username"
                  className={styles.input}
                  type="text"
                  placeholder="Login do usuário"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  disabled={formData.id === 1} // Não pode editar username do admin master
                />
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="password" className={styles.label}>
                  {formData.id ? "Nova Senha (deixe em branco para não alterar)" : "Senha Provisória"}
                </Label>
                <Input
                  id="password"
                  className={styles.input}
                  type="password"
                  placeholder={formData.id ? "Nova senha para reset" : "Mínimo 6 caracteres"}
                  name="password" // Para criação
                  value={formData.id ? newPasswordForReset : formData.password} // Usa state diferente para reset
                  onChange={(e) => formData.id ? setNewPasswordForReset(e.target.value) : handleInputChange(e)}
                  required={!formData.id} // Senha é obrigatória apenas na criação
                />
              </div>

              <div className={styles.formGroup}>
                <Label htmlFor="role" className={styles.label}>Papel (Role)</Label>
                <select 
                    id="role"
                    name="role"
                    className={styles.select} 
                    value={formData.role} 
                    onChange={handleInputChange} 
                    required
                    disabled={formData.id === 1 && !isAdmin} // Admin não pode rebaixar a si mesmo (lógica mais forte no backend)
                                                            // Gerente não pode mudar papel de ninguém (se a edição fosse permitida para gerente)
                >
                    {/* Admin pode ver/setar todos os papéis */}
                    {isAdmin && <option value="administrador">Administrador</option>}
                    {isAdmin && <option value="gerente">Gerente</option>}
                    {/* Gerente só pode criar/ver funcionários no select (backend já restringe) */}
                    {(isAdmin || isManager) && <option value="funcionario">Funcionário</option>}
                </select>
              </div>

              {/* Checkbox "Pode aprovar pedidos?" visível apenas para admin */}
              {isAdmin && (
                <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="can_approve_purchase_orders"
                    name="can_approve_purchase_orders"
                    className={styles.checkbox} // Você precisará estilizar .checkbox
                    checked={formData.can_approve_purchase_orders}
                    onChange={handleInputChange}
                    disabled={formData.id === 1} // Admin master sempre aprova
                  />
                  <Label htmlFor="can_approve_purchase_orders" className={styles.label} style={{ marginBottom: 0 }}>
                    Pode aprovar pedidos de compra?
                  </Label>
                </div>
              )}

              <div className={styles.submitButtonContainer}>
                <Button type="submit" className={styles.submitButton}>
                  {formData.id ? <><Edit3 size={18}/> Salvar Alterações</> : <><UserPlus size={18}/> Criar Usuário</>}
                </Button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'listar' && (
          <div className={styles.tabsContent}>
            <h2 className={styles.formTitle}>Usuários Cadastrados</h2>
            {loadingUsers ? <p>Carregando usuários...</p> : (
              usuariosList.length === 0 ? (
                <p className={styles.emptyTableCell}>Nenhum usuário.</p>
              ) : (
                <Card className={styles.cardContentTableWrapper}>
                  <Table tableClassName={styles.table}>
                    <TableHeader className={styles.thead}>
                      <TableRow className={styles.tableRow}>
                        <TableHead className={styles.th}>ID</TableHead>
                        <TableHead className={styles.th}>Nome de Usuário</TableHead>
                        <TableHead className={styles.th}>Papel</TableHead>
                        {isAdmin && <TableHead className={styles.th}>Aprova Pedidos?</TableHead>}
                        {isAdmin && <TableHead className={classNames(styles.th, styles.actionsHeader)}>Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuariosList.map((user) => (
                        <TableRow key={user.id} className={styles.tableRow}>
                          <TableCell className={styles.td}>{user.id}</TableCell>
                          <TableCell className={styles.td}>{user.username}</TableCell>
                          <TableCell className={styles.td}>{user.role}</TableCell>
                          {isAdmin && <TableCell className={styles.td}>{user.can_approve_purchase_orders ? <CheckSquare color="green"/> : <XSquare color="red"/>}</TableCell>}
                          {isAdmin && (
                            <TableCell className={classNames(styles.td, styles.actions)}>
                              <Button variant="outline" size="sm" onClick={() => switchToEditMode(user)} className={styles.actionButton} title="Editar Usuário">
                                <Edit3 size={14} />
                              </Button>
                              {/* Não permitir que o admin se auto-exclua ou exclua o ID 1 */}
                              {(user.id !== 1 && currentUser?.id !== user.id) && (
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id, user.username)} className={styles.actionButton} title="Excluir Usuário">
                                  <Trash size={14} />
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
        <button 
            className={styles.link}
            style={{ marginTop: '2rem', display: 'block', marginLeft: 'auto', marginRight: 'auto'}} 
            onClick={() => navigate('/')}
        >
             Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
}