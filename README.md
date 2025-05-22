# Almoxarifado ERP Desktop

## Visão Geral

O Almoxarifado ERP Desktop é uma aplicação de desktop desenvolvida para modernizar e otimizar o gerenciamento de almoxarifados, substituindo processos baseados em planilhas por um sistema integrado e eficiente. A aplicação permite o controle de peças, gerenciamento de estoque, cadastro e autenticação de usuários com diferentes níveis de acesso (Administrador, Gerente, Funcionário), e funcionalidades financeiras (como aprovação de pedidos de compra, a ser implementada).

Este sistema é construído utilizando Electron para a estrutura da aplicação desktop, React para a interface do usuário (frontend), e PostgreSQL como banco de dados para persistência de dados.

## Funcionalidades Principais (Implementadas e Planejadas)

* **Autenticação de Usuários:**
    * Sistema de login seguro.
    * Níveis de acesso: Administrador, Gerente, Funcionário.
    * Usuário pode alterar a própria senha.
* **Gerenciamento de Usuários (por Administradores/Gerentes):**
    * Criação de novos usuários com atribuição de papéis.
    * Listagem de usuários.
    * (Planejado) Edição e exclusão de usuários.
    * (Planejado) Atribuição de permissões específicas (ex: aprovação financeira).
* **Gerenciamento de Peças (Estoque):**
    * Cadastro, edição, exclusão e listagem de peças.
    * Controle de estoque atual e mínimo.
    * (Planejado) Busca e filtros avançados na listagem de peças.
    * Visualização gráfica de dados do estoque.
* **Módulo Financeiro (Planejado):**
    * Gerenciamento e aprovação de pedidos de compra.
* **Sincronização Online (Planejado):**
    * Capacidade futura de sincronizar dados com um banco de dados PostgreSQL online (ex: Supabase) para acesso remoto ou backup.

## Tecnologias Utilizadas

* **Electron:** Para construir a aplicação desktop multiplataforma.
* **React:** Para a construção da interface do usuário.
* **Vite:** Como ferramenta de build e servidor de desenvolvimento para o frontend React.
* **Node.js:** Ambiente de execução para o processo principal do Electron e scripts.
* **PostgreSQL:** Sistema de gerenciamento de banco de dados relacional.
* **`pg` (Node.js Driver):** Para comunicação entre a aplicação Node.js (processo principal do Electron) e o banco de dados PostgreSQL.
* **React Router (HashRouter):** Para navegação no frontend.
* **Lucide-React:** Para ícones.
* **Recharts:** Para gráficos.
* **CSS Modules / CSS Global:** Para estilização.

## Configuração do Ambiente de Desenvolvimento

Siga os passos abaixo para configurar e executar o projeto em um novo ambiente.

### Pré-requisitos

1.  **Node.js e npm:** Certifique-se de ter o Node.js (versão 18.x ou superior recomendada) e o npm instalados. Você pode baixá-los em [nodejs.org](https://nodejs.org/).
2.  **PostgreSQL:**
    * Instale o PostgreSQL (versão 14 ou superior recomendada) em sua máquina ou tenha acesso a um servidor PostgreSQL. Download em [postgresql.org/download/](https://www.postgresql.org/download/).
    * Durante a instalação, você definirá uma senha para o superusuário `postgres`. Anote-a.
    * Recomenda-se ter uma ferramenta de administração gráfica como o **pgAdmin 4** (geralmente incluído no instalador do PostgreSQL) para facilitar a criação do banco e do usuário.
3.  **Git (Opcional, mas recomendado):** Para clonar o repositório.

### Passos de Configuração

1.  **Clonar o Repositório (se aplicável):**
    ```bash
    git clone <url_do_repositorio>
    cd almoxarifado-erp 
    ```
    Se você não estiver usando Git, simplesmente copie a pasta do projeto para o seu ambiente.

2.  **Instalar Dependências do Projeto:**
    Navegue até a pasta raiz do projeto no seu terminal e execute:
    ```bash
    npm install
    ```
    Isso instalará todas as dependências listadas no `package.json`.

3.  **Configurar o Banco de Dados PostgreSQL:**
    * **Criar o Banco de Dados:**
        * Usando o pgAdmin ou `psql`, crie um novo banco de dados. Sugestão de nome: `Xerife`.
        * Exemplo com `psql` (conectado como superusuário `postgres`):
            ```sql
            CREATE DATABASE "Xerife";
            ```
    * **Criar um Usuário Dedicado para a Aplicação:**
        * É uma boa prática não usar o superusuário `postgres` para a aplicação. Crie um novo usuário (role) com uma senha forte. Sugestão de nome: `xerife_user`.
        * Exemplo com `psql`:
            ```sql
            CREATE USER xerife_user WITH PASSWORD 'sua_senha_forte_aqui';
            ```
    * **Conceder Permissões ao Usuário no Banco de Dados:**
        * Conecte-se ao banco de dados `Xerife` (como `postgres`) e execute os seguintes comandos SQL para dar as permissões necessárias ao `xerife_user`:
            ```sql
            GRANT CONNECT ON DATABASE "Xerife" TO xerife_user;
            -- Conecte-se ao banco "Xerife" antes de rodar os próximos
            \c "Xerife" 
            GRANT USAGE, CREATE ON SCHEMA public TO xerife_user;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO xerife_user;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO xerife_user;
            -- Se você criar tabelas como 'postgres', precisará conceder explicitamente ou ajustar os default privileges:
            -- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO xerife_user; 
            -- GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO xerife_user;
            ```
    * **Configurar `pg_hba.conf` (se necessário):**
        * Certifique-se de que o arquivo `pg_hba.conf` do seu PostgreSQL permite conexões locais para o `xerife_user` usando um método que exige senha (como `scram-sha-256` ou `md5`). A configuração padrão geralmente já é segura.
        * Exemplo de linha para conexões locais IPv4:
            `host    all             xerife_user     127.0.0.1/32            scram-sha-256`
        * Lembre-se de reiniciar o serviço do PostgreSQL se você alterar este arquivo.

4.  **Configurar a Conexão do Banco de Dados na Aplicação:**
    * Abra o arquivo `postgresService.js` na raiz do projeto.
    * Localize o objeto `dbConfig` e atualize os valores com os dados do seu servidor PostgreSQL local:
        ```javascript
        const dbConfig = {
          user: 'xerife_user',        // O usuário que você criou
          host: 'localhost',          // Ou o IP do servidor na rede da empresa
          database: 'Xerife',         // O nome do banco de dados
          password: 'sua_senha_forte_aqui', // A senha que você definiu para xerife_user
          port: 5432,                 // Porta padrão do PostgreSQL
        };
        ```
    * Salve o arquivo.

5.  **Executar a Aplicação em Modo de Desenvolvimento:**
    Na pasta raiz do projeto, execute:
    ```bash
    npm run dev
    ```
    Isso iniciará o servidor de desenvolvimento do Vite para o frontend e o processo principal do Electron.
    * Na primeira execução com um banco de dados `Xerife` vazio, o `main.js` (Electron) tentará criar as tabelas (`users`, `pecas`) e o usuário `admin` padrão (senha: `admin`). Verifique os logs no terminal para confirmar.

### Estrutura de Arquivos Principal

* `main.js`: Ponto de entrada do processo principal do Electron (backend).
* `preload.js`: Script de pré-carregamento do Electron, expõe APIs do backend para o frontend.
* `postgresService.js`: Módulo responsável pela comunicação com o banco de dados PostgreSQL.
* `src/`: Contém todo o código do frontend React.
    * `src/main.jsx`: Ponto de entrada da aplicação React.
    * `src/App.jsx`: Componente principal do Dashboard.
    * `src/Login.jsx`: Componente da tela de login.
    * `src/Cadastro.jsx`: Componente para gerenciamento de usuários.
    * `src/Estoque.jsx`: Componente para gerenciamento de peças.
    * `src/AlterarSenha.jsx`: Componente para usuários alterarem suas senhas.
    * `src/AuthContext.jsx`: Contexto React para gerenciamento de autenticação.
    * `src/components/ui/`: Pasta para componentes de UI reutilizáveis (ex: Table, Button, Card).
    * `*.module.css`: Arquivos CSS Modules para estilização específica de componentes.
    * `App.css` ou `index.css`: Arquivo CSS global.
* `public/`: Contém assets estáticos.

## Scripts Disponíveis

No `package.json`, os seguintes scripts são relevantes:

* `npm run dev`: Inicia a aplicação em modo de desenvolvimento com Vite e Electron.
* `npm run build`: Compila o frontend React para produção (gera a pasta `dist/`).
* `npm run electron-build`: Empacota a aplicação Electron para distribuição (gera um instalador na pasta `dist_electron/`).
* `npm run lint`: Executa o ESLint para verificar o código.
* `npm run preview`: Inicia um servidor local para pré-visualizar o build de produção do frontend.

## Próximos Passos de Desenvolvimento (Roadmap)

* Implementação completa das funcionalidades de Edição e Exclusão de Usuários pelo Administrador.
* Refinamento das permissões de Gerente (ex: quais usuários ele pode editar).
* Busca por nome/código na tela de listagem de peças.
* Implementação do Módulo Financeiro:
    * Modelagem das tabelas de Pedidos de Compra, Itens de Pedido, etc.
    * Interface para criação e listagem de Pedidos de Compra.
    * Fluxo de aprovação de Pedidos de Compra (envolvendo usuários com permissão `can_approve_purchase_orders`).
* Reestruturação do banco de dados com base em planilhas detalhadas do almoxarifado (importação de dados existentes, novas tabelas e relacionamentos).
* Criação de telas de listagem, cadastro, edição e exclusão para todas as novas entidades do banco de dados.
* Implementação de um sistema de log de auditoria mais robusto.
* Considerar a sincronização online com um banco de dados PostgreSQL na nuvem (ex: Supabase) como uma fase futura.

---
Este README deve dar um bom ponto de partida! Você pode adicionar seções sobre como contribuir, licença, etc., conforme o projeto evolui.