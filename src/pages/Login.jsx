// src/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

console.log("Login.jsx: Script carregado (vSemAutoFocus).");

export default function Login() {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" }); // Permitir tipo para estilização de erro/sucesso
  const { login } = useAuth();

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setMensagem({ texto: "", tipo: "" }); // Limpa mensagem ao tentar de novo
    console.log("Login.jsx: Tentando login com usuário:", username);

    try {
      await login({ username: username, password: senha });
      // A navegação é feita pelo AuthContext
    } catch (error) {
      console.error('Login.jsx: Erro durante a tentativa de login:', error);
      setMensagem({ texto: error.message || 'Erro ao fazer login. Verifique suas credenciais.', tipo: "erro"});
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: '#121212', color: '#fff',
    }}>
      <div style={{
        width: 400, padding: '2rem', borderRadius: 10, background: '#1e1e1e',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)', textAlign: 'center',
      }}>
        <h1 style={{ marginBottom: '1.5rem', color: '#00bcd4', fontSize: '2rem' }}>Almoxarifado ERP</h1>
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            // autoFocus // REMOVIDO TEMPORARIAMENTE PARA TESTE
            style={{ padding: '0.75rem', background: '#2c2c2c', color: '#fff', border: '1px solid #444', borderRadius: 5, fontSize: '1rem' }}
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            style={{ padding: '0.75rem', background: '#2c2c2c', color: '#fff', border: '1px solid #444', borderRadius: 5, fontSize: '1rem' }}
          />
          <button
            type="submit"
            style={{ padding: '0.75rem', backgroundColor: '#00bcd4', color: '#121212', border: 'none', borderRadius: 5, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Entrar
          </button>
        </form>
        {mensagem.texto && (
          <p style={{
            marginTop: '1rem', padding: '0.5rem', borderRadius: '4px',
            backgroundColor: mensagem.tipo === "erro" ? '#ff6b6b' : '#ddffdd',
            color: mensagem.tipo === "erro" ? '#fff' : '#121212',
          }}>
            {mensagem.texto}
          </p>
        )}
      </div>
    </div>
  );
}