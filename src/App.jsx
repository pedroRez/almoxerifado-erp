import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function App() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [modo, setModo] = useState('login');
  const [mensagem, setMensagem] = useState('');
  const [usuario, setUsuario] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUsuario(user);
    });
  }, []);

  async function login() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) {
      setMensagem('Erro ao fazer login: ' + error.message);
    } else {
      setUsuario(data.user);
      setMensagem('');
    }
  }

  async function registrar() {
    const { error } = await supabase.auth.signUp({ email, password: senha });
    if (error) {
      setMensagem('Erro ao registrar: ' + error.message);
    } else {
      setMensagem('Usuário registrado! Verifique seu e-mail.');
    }
  }

  async function recuperarSenha() {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setMensagem('Erro ao recuperar senha: ' + error.message);
    } else {
      setMensagem('Email de recuperação enviado!');
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modo === 'login') login();
    else if (modo === 'registro') registrar();
    else if (modo === 'recuperar') recuperarSenha();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setEmail('');
    setSenha('');
    setMensagem('');
    setModo('login');
  };

  if (!usuario) {
    return (
      <div style={styles.bg}>
        <div style={styles.container}>
          <h1 style={styles.title}>Almoxerifado ERP</h1>
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              style={styles.input}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {modo !== 'recuperar' && (
              <input
                style={styles.input}
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            )}
            <button style={styles.button} type="submit">
              {modo === 'login' && 'Entrar'}
              {modo === 'registro' && 'Registrar'}
              {modo === 'recuperar' && 'Recuperar Senha'}
            </button>
          </form>
          <div style={styles.links}>
            {modo !== 'login' && (
              <button style={styles.link} onClick={() => setModo('login')}>
                Já tem conta? Entrar
              </button>
            )}
            {modo !== 'registro' && (
              <div style={styles.links}>
                <button style={styles.link} onClick={() => navigate('/cadastro')}>
                  Criar nova conta
                </button>
              </div>
            )}
            {modo !== 'recuperar' && (
              <button style={styles.link} onClick={() => setModo('recuperar')}>
                Esqueceu a senha?
              </button>
            )}
          </div>
          {mensagem && <p style={styles.mensagem}>{mensagem}</p>}
        </div>
      </div>
    );
  }

  // Simulação de dados para dashboard
  const estatisticas = {
    pecasTrocadas: 58,
    manutencoes: 23,
    maquinaTop: 'Escavadeira #12',
    picoMovimento: '14h - 15h',
  };

  const dadosGrafico = [
    { nome: 'Seg', pecas: 10 },
    { nome: 'Ter', pecas: 20 },
    { nome: 'Qua', pecas: 5 },
    { nome: 'Qui', pecas: 15 },
    { nome: 'Sex', pecas: 8 },
  ];

  return (
    <div style={styles.bg}>

      <div style={styles.dashboardContainer}>
        <h2>Bem-vindo, {usuario.email}</h2>
        <button style={styles.logout} onClick={logout}>
          Sair
        </button>

        <div style={styles.cardContainer}>
          <div style={styles.card}>
            <h3>Total de Peças Trocadas</h3>
            <p>{estatisticas.pecasTrocadas}</p>
          </div>
          <div style={styles.card}>
            <h3>Manutenções Realizadas</h3>
            <p>{estatisticas.manutencoes}</p>
          </div>
          <div style={styles.card}>
            <h3>Máquina com mais manutenção</h3>
            <p>{estatisticas.maquinaTop}</p>
          </div>
          <div style={styles.card}>
            <h3>Horário de Pico</h3>
            <p>{estatisticas.picoMovimento}</p>
          </div>
        </div>

        <h3>Peças trocadas por dia</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dadosGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nome" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="pecas" fill="#00bcd4" />
          </BarChart>
        </ResponsiveContainer>
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
    background: '#121212', // fundo escuro
    color: '#ffffff', // cor de texto global
  },
  container: {
    width: 400,
    padding: 20,
    borderRadius: 10,
    background: '#1e1e1e', // caixa escura
    boxShadow: '0 0 15px #000', // sombra escura
    textAlign: 'center',
    fontFamily: 'Arial',
    color: '#ffffff', // texto claro
  },
  title: {
    marginBottom: 20,
    color: '#00bcd4', // azul turquesa
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  input: {
    padding: 10,
    fontSize: 16,
    backgroundColor: '#2c2c2c',
    color: '#ffffff',
    border: '1px solid #444',
    borderRadius: 5,
  },
  button: {
    padding: 10,
    backgroundColor: '#00bcd4', // azul turquesa
    color: 'white',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    borderRadius: 5,
  },
  links: {
    marginTop: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  link: {
    background: 'none',
    color: '#00bcd4', // link azul turquesa
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    textDecoration: 'underline',
  },
  mensagem: {
    marginTop: 15,
    fontSize: 14,
    color: '#00e676', // verde neon
  },
  dashboardContainer: {
    padding: 30,
    fontFamily: 'Arial',
    backgroundColor: '#121212',
    color: '#ffffff',
    minHeight: '100vh',
  },
  logout: {
    backgroundColor: '#f44336', // vermelho
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    float: 'right',
    borderRadius: 5,
  },
  cardContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 20,
    marginTop: 30,
    marginBottom: 30,
  },
  card: {
    padding: 20,
    backgroundColor: '#1e1e1e', // fundo escuro do card
    borderRadius: 10,
    textAlign: 'center',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
    color: '#ffffff',
    border: '1px solid #00bcd4', // borda azul
  },
};
