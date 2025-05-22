// src/AlterarSenha.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
// Verifique os caminhos para seus componentes de UI
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import styles from '../styles/UserAdminPage.module.css'; // Reutilizando estilos

console.log("AlterarSenha.jsx: Script carregado (vSemAlertBloqueante).");

export default function AlterarSenha() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();
  const { logout, usuario } = useAuth();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMensagem({ texto: "", tipo: "" });

    if (!newPassword || !confirmNewPassword) {
      setMensagem({ texto: "Nova senha e confirmação são obrigatórias.", tipo: "erro"});
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMensagem({ texto: "A nova senha e a confirmação não coincidem.", tipo: "erro" });
      return;
    }
    if (newPassword.length < 6) { 
      setMensagem({ texto: "A nova senha deve ter pelo menos 6 caracteres.", tipo: "erro" });
      return;
    }
    if (!currentPassword) { 
        setMensagem({ texto: "Senha atual é obrigatória.", tipo: "erro"});
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
        // A mensagem de sucesso será mostrada brevemente antes do logout
        setMensagem({ texto: resultado.message || "Senha alterada com sucesso! Você será desconectado.", tipo: "sucesso" });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        
        // REMOVIDO o alert("Senha alterada com sucesso! ...")
        
        // Aguarda um pouco para o usuário ver a mensagem de sucesso, depois faz logout
        setTimeout(async () => {
            if (logout) { // Verifica se logout está definido
                await logout(); 
            } else {
                console.error("Função logout não disponível no AuthContext");
                navigate('/login'); // Fallback para navegação se logout falhar
            }
        }, 2500); // 2.5 segundos para ler a mensagem

      } else {
        setMensagem({ texto: resultado.message || "Falha ao alterar senha.", tipo: "erro" });
      }
    } catch (error) {
      console.error("AlterarSenha.jsx: Erro ao alterar senha:", error);
      setMensagem({ texto: error.message || "Não foi possível alterar a senha.", tipo: "erro" });
    }
  };

  return (
    <div className={styles.container}> 
      <div className={styles.contentCard} style={{ maxWidth: '500px', margin: '2rem auto' }}> 
        <h1 className={styles.formTitle} style={{ textAlign: 'center', fontSize: '1.5rem' }}>Alterar Minha Senha</h1>
        
        {mensagem.texto && (
          <p 
            className={`${styles.statusMessage} ${mensagem.tipo === "erro" ? styles.errorMessage : styles.successMessage}`}
            // Adicionando role="alert" para acessibilidade
            role="alert" 
          >
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
              autoFocus // Pode tentar reabilitar o autoFocus aqui, agora que o alert bloqueante se foi
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
            className={styles.link}
            style={{ marginTop: '2rem', display: 'block', marginLeft: 'auto', marginRight: 'auto'}} 
            onClick={() => navigate('/')}
        >
             Cancelar
        </button>
      </div>
    </div>
  );
}