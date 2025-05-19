// src/Cadastro.jsx (Gerenciamento de Usuários - Admin/Gerente)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Edit3, Trash, ListChecks } from 'lucide-react';

// Importando componentes de UI - assumindo que estão em src/components/ui/
import { Button } from './components/ui/button.jsx'; 
import { Input } from './components/ui/input.jsx';
import { Label } from './components/ui/label.jsx';
// Usando select HTML padrão estilizado via CSS Module
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.jsx';
import { Card, CardContent } from './components/ui/card.jsx'; 

import styles from './CadastroUsuario.module.css';

console.log("Cadastro.jsx (Admin User Management vComEstiloBotaoSimplificado): Script carregado.");

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Cadastro() {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState('funcionario');
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('criar');
  const [usuariosList, setUsuariosList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUsers = async () => {
    setMensagem({ texto: "", tipo: "" });
    if (!window.api || !window.api.getAllUsers) {
      setMensagem({ texto: "Erro: API de listagem de usuários não disponível.", tipo: "erro" });
      console.error("Cadastro.jsx: window.api.getAllUsers não encontrado.");
      return;
    }
    setLoadingUsers(true);
    console.log("Cadastro.jsx: Buscando lista de usuários...");
    try {
      const users = await window.api.getAllUsers();
      setUsuariosList(users || []);
      console.log("Cadastro.jsx: Usuários recebidos:", users ? users.length : 0);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      setMensagem({ texto: "Erro ao buscar usuários: " + error.message, tipo: "erro" });
      setUsuariosList([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'listar') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleCreateUser = async () => {
    setMensagem({ texto: "", tipo: "" });
    console.log("Cadastro.jsx: Tentando criar usuário:", { username, role });

    if (!window.api || !window.api.createUser) {
      setMensagem({ texto: 'Erro: API de criação de usuário não está disponível.', tipo: "erro" });
      console.error("Cadastro.jsx: window.api.createUser não encontrado.");
      return;
    }
    if (!username.trim() || !senha.trim()) {
      setMensagem({ texto: 'Erro: Nome de usuário e senha são obrigatórios.', tipo: "erro" });
      return;
    }

    try {
      const novoUsuario = await window.api.createUser({ username, password: senha, role });
      if (novoUsuario && novoUsuario.id) {
        console.log("Cadastro.jsx: Usuário criado:", novoUsuario);
        setMensagem({ texto: `Usuário '${novoUsuario.username}' criado como '${novoUsuario.role}'!`, tipo: "sucesso" });
        setUsername('');
        setSenha('');
        setRole('funcionario');
        if (activeTab === 'listar') {
          fetchUsers();
        }
      } else {
        setMensagem({ texto: 'Falha ao criar usuário. Resposta inesperada do backend.', tipo: "erro" });
      }
    } catch (error) {
      console.error('Cadastro.jsx: Erro ao criar usuário:', error);
      setMensagem({ texto: 'Erro: ' + (error.message || 'Não foi possível criar o usuário.'), tipo: "erro" });
    }
  };

  const handleSubmitCreateForm = (e) => {
    e.preventDefault();
    handleCreateUser();
  };

  const handleEditUser = (userId) => {
    console.log("Ação: Editar usuário ID:", userId);
    setMensagem({texto: `Funcionalidade de editar usuário (ID: ${userId}) ainda não implementada.`, tipo: "info"});
  };

  const handleDeleteUser = async (userId) => {
    console.log("Ação: Excluir usuário ID:", userId);
    setMensagem({texto: `Funcionalidade de excluir usuário (ID: ${userId}) ainda não implementada.`, tipo: "info"});
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Gerenciamento de Usuários</h1>

      <div className={styles.contentCard}>
        <div className={styles.tabsList}>
          <button
            className={`${styles.tabTrigger} ${activeTab === 'criar' ? styles.tabTriggerActive : ''}`}
            onClick={() => setActiveTab('criar')}
          >
            <UserPlus size={18} style={{ marginRight: '0.5rem' }} /> Criar Usuário
          </button>
          <button
            className={`${styles.tabTrigger} ${activeTab === 'listar' ? styles.tabTriggerActive : ''}`}
            onClick={() => setActiveTab('listar')}
          >
            <ListChecks size={18} style={{ marginRight: '0.5rem' }} /> Listar Usuários
          </button>
        </div>

        {mensagem.texto && (
          <p className={`${styles.statusMessage} ${mensagem.tipo === "erro" ? styles.errorMessage : styles.successMessage}`}>
            {mensagem.texto}
          </p>
        )}

        {activeTab === 'criar' && (
          <div className={styles.tabsContent}>
            <h2 className={styles.formTitle}>Novo Usuário</h2>
            <form onSubmit={handleSubmitCreateForm} className={styles.form}>
              <div className={styles.formGroup}>
                <Label htmlFor="username" className={styles.label}>Nome de Usuário</Label>
                <Input
                  id="username"
                  className={styles.input}
                  type="text"
                  placeholder="ex: joao.silva ou joao@empresa.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <Label htmlFor="password" className={styles.label}>Senha Provisória</Label>
                <Input
                  id="password"
                  className={styles.input}
                  type="password"
                  placeholder="Senha para o novo usuário"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <Label htmlFor="role" className={styles.label}>Papel (Role)</Label>
                <select 
                    id="role"
                    className={styles.select} 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)} 
                    required
                >
                    <option value="funcionario">Funcionário</option>
                    <option value="gerente">Gerente</option>
                    <option value="administrador">Administrador</option>
                </select>
              </div>
              <div className={styles.submitButtonContainer}>
                <Button type="submit" className={styles.submitButton}>
                  <UserPlus size={18} /> Criar Usuário
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
                <p className={styles.emptyTableCell}>Nenhum usuário cadastrado.</p>
              ) : (
                <Card className={styles.cardContentTableWrapper}>
                  <Table tableClassName={styles.table}>
                    <TableHeader className={styles.thead}>
                      <TableRow className={styles.tableRow}>
                        <TableHead className={styles.th}>ID</TableHead>
                        <TableHead className={styles.th}>Nome de Usuário</TableHead>
                        <TableHead className={styles.th}>Papel</TableHead>
                        <TableHead className={classNames(styles.th, styles.actionsHeader)}>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuariosList.map((user) => (
                        <TableRow key={user.id} className={styles.tableRow}>
                          <TableCell className={styles.td}>{user.id}</TableCell>
                          <TableCell className={styles.td}>{user.username}</TableCell>
                          <TableCell className={styles.td}>{user.role}</TableCell>
                          <TableCell className={classNames(styles.td, styles.actions)}>
                            <Button variant="outline" size="sm" onClick={() => handleEditUser(user.id)} className={styles.actionButton}>
                              <Edit3 size={14} style={{marginRight: '0.25rem'}}/> Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)} className={styles.actionButton}>
                              <Trash size={14} style={{marginRight: '0.25rem'}}/> Excluir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )
            )}
          </div>
        )}
        {/* BOTÃO "VOLTAR AO DASHBOARD" MODIFICADO */}
        <button 
            className={styles.link} // Aplica a classe .link do CSS Module
            style={{ marginTop: '2rem', display: 'block', marginLeft: 'auto', marginRight: 'auto'}} 
            onClick={() => navigate('/')}
        >
             Voltar ao Dashboard
        </button>
      </div> {/* Fim do .contentCard */}
    </div> /* Fim do .container */
  );
}