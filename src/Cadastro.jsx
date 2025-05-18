// src/Cadastro.jsx
import React, { useState } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

export default function Cadastro() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const navigate = useNavigate();

  const registrar = async () => {
    const { error } = await supabase.auth.signUp({ email, password: senha });
    if (error) {
      setMensagem('Erro: ' + error.message);
    } else {
      setMensagem('Cadastro realizado! Verifique seu email.');
      setTimeout(() => navigate('/'), 2000); // Redireciona para login após 2s
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    registrar();
  };

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <h1 style={styles.title}>Criar Conta</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <button style={styles.button} type="submit">Registrar</button>
        </form>
        <button style={styles.link} onClick={() => navigate('/')}>
          Voltar ao login
        </button>
        {mensagem && <p style={styles.mensagem}>{mensagem}</p>}
      </div>
    </div>
  );
}

const styles = {
  bg: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#e0f7fa',
  },
  container: {
    width: 400,
    padding: 20,
    borderRadius: 10,
    background: '#a9a9a9',
    boxShadow: '0 0 15px #ccc',
    textAlign: 'center',
    fontFamily: 'Arial',
  },
  title: {
    marginBottom: 20,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  input: {
    padding: 10,
    fontSize: 16,
  },
  button: {
    padding: 10,
    backgroundColor: '#00008b',
    color: 'white',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    borderRadius: 5,
  },
  link: {
    marginTop: 10,
    background: 'none',
    color: '#007bff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    textDecoration: 'underline',
  },
  mensagem: {
    marginTop: 15,
    fontSize: 14,
    color: 'green',
  },
};
