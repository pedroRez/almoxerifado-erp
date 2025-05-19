# Projeto ERP para Terceirização de Máquinas (Piloto - Almoxarifado)

Este README fornece os passos para configurar e rodar este projeto piloto de ERP para uma empresa de terceirização de máquinas (escavadeiras e caminhões) com foco no módulo de almoxarifado.

## Pré-requisitos

Certifique-se de ter o seguinte instalado no seu ambiente de desenvolvimento:

* **Node.js:** (Versão LTS recomendada) - Necessário para executar o Vite, o npm e o Electron. Você pode baixá-lo em [https://nodejs.org/](https://nodejs.org/).
* **npm (Node Package Manager):** Instalado automaticamente com o Node.js.
* **Electron:** Instalado como uma dependência do projeto.

## Configuração do Projeto

Siga estes passos para configurar o projeto em um novo ambiente:

1.  **Clonar o Repositório (se aplicável):**
    ```bash
    git clone <URL_DO_SEU_REPOSITÓRIO>
    cd almoxerifado-erp
    ```

2.  **Instalar as Dependências:**
    Execute o seguinte comando na raiz do projeto para instalar todas as dependências listadas no `package.json`, incluindo React, Vite, Electron, e outras bibliotecas:
    ```bash
    npm install
    ```

3.  **Configurar o Banco de Dados Local (SQLite):**
    O projeto utiliza um banco de dados local SQLite para o almoxarifado.
    * O arquivo `localDatabase.js` contém a lógica para conectar e criar as tabelas no arquivo `almoxerifado.db`.
    * Certifique-se de que este arquivo esteja na raiz do seu projeto.

4.  **Configurar o Arquivo Principal do Electron (`main.js`):**
    * Crie um arquivo `main.js` na raiz do projeto com a lógica para iniciar o Electron e carregar a aplicação React. O conteúdo deste arquivo deve ser semelhante ao que foi compartilhado durante a conversa.
    * Certifique-se de que a função `createWindow` carrega a URL do Vite (`http://localhost:5173/`) durante o desenvolvimento.

5.  **Configurar o Arquivo de Pré-Carregamento (`preload.js`):**
    * Crie um arquivo `preload.js` na raiz do projeto para expor a `electronAPI` para comunicação segura entre o React e o processo principal. O conteúdo deste arquivo deve ser semelhante ao que foi compartilhado durante a conversa.

6.  **Modificar o Script `dev` no `package.json`:**
    Edite a seção `"scripts"` no `package.json` para iniciar o Vite e o Electron simultaneamente:
    ```json
    "scripts": {
      "dev": "concurrently \"vite\" \"electron .\"",
      "build": "vite build",
      "lint": "eslint .",
      "preview": "vite preview"
    }
    ```
    Certifique-se de ter `concurrently` instalado (`npm install concurrently --save-dev`).

## Executando o Projeto

Para rodar o projeto em seu ambiente local:

1.  **Abra um terminal na raiz do projeto (`almoxerifado-erp`).**
2.  **Execute o seguinte comando para iniciar o servidor de desenvolvimento do Vite e a aplicação Electron:**
    ```bash
    npm run dev
    ```

    Isso iniciará o Vite servindo sua aplicação React em `http://localhost:5173/` e abrirá uma janela do Electron carregando essa URL.

3.  **Navegue pela aplicação:**
    * A tela principal (`/`) é o dashboard.
    * `/cadastro` é a tela de cadastro de usuários (ainda usando Supabase).
    * `/pecas` é a tela de gerenciamento de peças (usando o banco de dados local SQLite).

## Notas Adicionais
 Para gerar build execute prompt como administrador
* **Banco de Dados Local:** Os dados do almoxarifado (peças) são armazenados localmente no arquivo `almoxerifado.db` criado na raiz do projeto (no processo principal do Electron).
* **Comunicação Electron:** A comunicação entre o React (interface) e o banco de dados local é feita através do sistema de IPC do Electron, utilizando `preload.js` para expor a API.
* **Autenticação de Usuários:** O cadastro e login de usuários (`/cadastro` e a lógica no `Login.jsx`) ainda utilizam o Supabase para autenticação online.
* **Gráfico no Dashboard:** O gráfico de peças mais requisitadas no dashboard (`App.jsx`) busca dados simulados ou (se implementado no `localDatabase.js` e `main.js`) dados reais do banco de dados local.

Este guia deve fornecer os passos necessários para configurar e rodar o projeto piloto no seu ambiente. Se encontrar algum problema, revise os passos e as configurações dos arquivos mencionados.