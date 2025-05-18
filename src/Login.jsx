import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

export default function Login({ setUsuario }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [modo, setModo] = useState('login');
  const [mensagem, setMensagem] = useState('');
  const navigate = useNavigate();

  async function login() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setMensagem('Erro ao fazer login: ' + error.message);
    else {
      setUsuario(data.user);
      setMensagem('');
    }
  }

  async function registrar() {
    const { error } = await supabase.auth.signUp({ email, password: senha });
    if (error) setMensagem('Erro ao registrar: ' + error.message);
    else setMensagem('Usuário registrado! Verifique seu e-mail.');
  }

  async function recuperarSenha() {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setMensagem('Erro ao recuperar senha: ' + error.message);
    else setMensagem('Email de recuperação enviado!');
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modo === 'login') login();
    else if (modo === 'registro') registrar();
    else if (modo === 'recuperar') recuperarSenha();
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#121212',
      color: '#fff',
    }}>
      <div style={{
        width: 400,
        padding: 20,
        borderRadius: 10,
        background: '#1e1e1e',
        boxShadow: '0 0 15px #000',
        textAlign: 'center',
      }}>
        <h1 style={{ marginBottom: 20, color: '#00bcd4' }}>Almoxerifado ERP</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            style={{ padding: 10, background: '#2c2c2c', color: '#fff', border: '1px solid #444', borderRadius: 5 }} />
          {modo !== 'recuperar' && (
            <input type="password" placeholder="Senha" value={senha}
              onChange={(e) => setSenha(e.target.value)} required
              style={{ padding: 10, background: '#2c2c2c', color: '#fff', border: '1px solid #444', borderRadius: 5 }} />
          )}
          <button type="submit"
            style={{ padding: 10, backgroundColor: '#00bcd4', color: '#fff', border: 'none', borderRadius: 5 }}>
            {modo === 'login' ? 'Entrar' : modo === 'registro' ? 'Registrar' : 'Recuperar Senha'}
          </button>
        </form>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {modo !== 'login' && (
            <button onClick={() => setModo('login')} style={linkBtn}>Já tem conta? Entrar</button>
          )}
          {modo !== 'registro' && (
            <button onClick={() => navigate('/cadastro')} style={linkBtn}>Criar nova conta</button>
          )}
          {modo !== 'recuperar' && (
            <button onClick={() => setModo('recuperar')} style={linkBtn}>Esqueceu a senha?</button>
          )}
        </div>

        {mensagem && <p style={{ marginTop: 15, color: '#00e676' }}>{mensagem}</p>}
      </div>
    </div>
  );
}

const linkBtn = {
  background: 'none',
  color: '#00bcd4',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  textDecoration: 'underline',
};
