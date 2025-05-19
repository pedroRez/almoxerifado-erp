// src/AlterarSenha.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Para pegar o usuário logado, se necessário, ou para logout pós-mudança
import { Button } from './components/ui/button'; // Assumindo que você tem
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import styles from './CadastroUsuario.module.css'; // Reutilizando estilos do CadastroUsuario

console.log("AlterarSenha.jsx: Script carregado.");

export default function AlterarSenha() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();
  const { logout } = useAuth(); // Pegar a função de logout para usar após alteração bem sucedida

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMensagem({ texto: "", tipo: "" });

    if (newPassword !== confirmNewPassword) {
      setMensagem({ texto: "A nova senha e a confirmação não coincidem.", tipo: "erro" });
      return;
    }
    if (newPassword.length < 6) {
      setMensagem({ texto: "A nova senha deve ter pelo menos 6 caracteres.", tipo: "erro" });
      return;
    }

    if (!window.api || !window.api.changePassword) {
      setMensagem({ texto: "Erro: Funcionalidade de alterar senha não disponível.", tipo: "erro" });
      console.error("AlterarSenha.jsx: window.api.changePassword não encontrado.");
      return;
    }

    try {
      console.log("AlterarSenha.jsx: Tentando alterar senha...");
      const resultado = await window.api.changePassword({ currentPassword, newPassword });
      
      if (resultado && resultado.success) {
        setMensagem({ texto: resultado.message || "Senha alterada com sucesso! Faça login novamente.", tipo: "sucesso" });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        // Forçar logout para o usuário logar com a nova senha
        setTimeout(async () => {
            await logout(); // Usa a função logout do AuthContext
            // O navigate para /login já é feito pelo logout do AuthContext
        }, 2000);
      } else {
        // Isso aconteceria se o backend resolvesse sem 'success:true' mas sem lançar erro
        setMensagem({ texto: resultado.message || "Falha ao alterar senha.", tipo: "erro" });
      }
    } catch (error) {
      console.error("AlterarSenha.jsx: Erro ao alterar senha:", error);
      setMensagem({ texto: error.message || "Não foi possível alterar a senha.", tipo: "erro" });
    }
  };

  return (
    <div className={styles.container}> {/* Reutilizando container do CadastroUsuario.module.css */}
      <div className={styles.contentCard} style={{ maxWidth: '500px', margin: '2rem auto' }}> {/* Card centralizado e com largura máxima */}
        <h1 className={styles.formTitle} style={{ textAlign: 'center', fontSize: '1.5rem' }}>Alterar Minha Senha</h1>
        
        {mensagem.texto && (
          <p className={`${styles.statusMessage} ${mensagem.tipo === "erro" ? styles.errorMessage : styles.successMessage}`}>
            {mensagem.texto}
          </p>
        )}

        <form onSubmit={handleChangePassword} className={styles.form}>
          <div className={styles.formGroup}>
            <Label htmlFor="currentPassword" className={styles.label}>Senha Atual</Label>
            <Input
              id="currentPassword"
              className={styles.input}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <Label htmlFor="newPassword" className={styles.label}>Nova Senha</Label>
            <Input
              id="newPassword"
              className={styles.input}
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <Label htmlFor="confirmNewPassword" className={styles.label}>Confirmar Nova Senha</Label>
            <Input
              id="confirmNewPassword"
              className={styles.input}
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.submitButtonContainer} style={{marginTop: '1.5rem'}}>
            <Button type="submit" className={styles.submitButton}>
              Alterar Senha
            </Button>
          </div>
        </form>
        <button 
            style={{...styles.link, marginTop: '2rem', display: 'block', marginLeft: 'auto', marginRight: 'auto'}} 
            onClick={() => navigate('/')} // Navega para o Dashboard
        >
             Cancelar e Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
}