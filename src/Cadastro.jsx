// src/Cadastro.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Para o botão "Voltar"

console.log("Cadastro.jsx (Admin): Script carregado.");

export default function Cadastro() {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState('funcionario'); // Papel padrão ao criar
  const [mensagem, setMensagem] = useState('');
  const navigate = useNavigate();

  const handleCreateUser = async () => {
    setMensagem('');
    console.log("Cadastro.jsx: Tentando criar usuário:", { username, role });

    if (!window.api || !window.api.createUser) {
      const errorMsg = 'Erro: API de criação de usuário não está disponível. Verifique o preload.js.';
      console.error(errorMsg);
      setMensagem(errorMsg);
      return;
    }

    if (!username.trim() || !senha.trim()) {
        setMensagem('Erro: Nome de usuário e senha são obrigatórios.');
        return;
    }

    try {
      const novoUsuario = await window.api.createUser({ username, password: senha, role });
      
      if (novoUsuario && novoUsuario.id) {
        console.log("Cadastro.jsx: Usuário criado:", novoUsuario);
        setMensagem(`Usuário '${novoUsuario.username}' criado com sucesso com o papel '${novoUsuario.role}'!`);
        setUsername('');
        setSenha('');
        setRole('funcionario');
      } else {
        setMensagem('Falha ao criar usuário. Resposta inesperada do backend.');
      }
    } catch (error) {
      console.error('Cadastro.jsx: Erro ao criar usuário:', error);
      setMensagem('Erro: ' + (error.message || 'Não foi possível criar o usuário.'));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleCreateUser();
  };

  // A proteção de rota para admin deve ser feita no main.jsx (ApplicationLayout)
  // Aqui apenas renderizamos o formulário.

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <h1 style={styles.title}>Criar Novo Usuário (Admin)</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Nome de Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Senha Provisória"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <select
            style={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="funcionario">Funcionário</option>
            <option value="gerente">Gerente</option>
            <option value="administrador">Administrador</option>
          </select>
          <button style={styles.button} type="submit">Criar Usuário</button>
        </form>
        <button style={styles.link} onClick={() => navigate('/')}>
          Voltar ao Dashboard
        </button>
        {mensagem && (
          <p style={{
            ...styles.mensagem, // Usa o estilo base de mensagem
            color: mensagem.toLowerCase().startsWith('erro') || mensagem.toLowerCase().startsWith('falha') ? 'darkred' : 'darkgreen',
            backgroundColor: mensagem.toLowerCase().startsWith('erro') || mensagem.toLowerCase().startsWith('falha') ? '#ffdddd' : '#ddffdd',
            padding: '0.5rem',
            borderRadius: '4px',
            border: `1px solid ${mensagem.toLowerCase().startsWith('erro') || mensagem.toLowerCase().startsWith('falha') ? 'darkred' : 'darkgreen'}`
          }}>
            {mensagem}
          </p>
        )}
      </div>
    </div>
  );
}

const styles = { /* ... (seus estilos do Cadastro.jsx, como na resposta anterior) ... */ };
// Cole os estilos do Cadastro.jsx da resposta anterior aqui.
// Para resumir, vou omitir a repetição dos estilos aqui, mas eles devem estar presentes.
// Vou colocar um exemplo simples.
const defaultCadastroStyles = {
  bg: {
    minHeight: 'calc(100vh - 5rem)', paddingTop: '5rem', display: 'flex',
    justifyContent: 'center', alignItems: 'flex-start', background: '#121212', color: '#fff',
  },
  container: {
    width: 450, padding: '2rem', borderRadius: 10, background: '#1e1e1e',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)', textAlign: 'center', fontFamily: 'Arial, sans-serif',
  },
  title: { marginBottom: '1.5rem', color: '#00bcd4', fontSize: '1.8rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  input: { padding: '0.75rem', fontSize: '1rem', background: '#2c2c2c', color: '#fff', border: '1px solid #444', borderRadius: 5 },
  button: { padding: '0.75rem', backgroundColor: '#00bcd4', color: '#121212', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: 5, transition: 'background-color 0.2s ease' },
  link: { marginTop: '1.5rem', background: 'none', color: '#00bcd4', border: 'none', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' },
  mensagem: { marginTop: '1rem', fontSize: '0.9rem', textAlign: 'center' },
};
// No JSX do Cadastro.jsx acima, use styles.bg, styles.container etc. ou mantenha os estilos inline que já estavam lá.
// A versão que forneci tem os estilos aplicados inline para ser mais autocontida.