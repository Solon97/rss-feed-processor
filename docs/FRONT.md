O projeto é uma aplicação web que permite aos usuários agregar e gerenciar conteúdo de diversas fontes, como feeds RSS, blogs e canais do YouTube, em um único local.

As principais funcionalidades e telas incluem:

Tela de Autenticação:

Permite que os usuários façam login ou criem uma nova conta.
Inclui campos para e-mail e senha, com confirmação de senha para o registro.
Possui um botão para alternar entre os modos de login e cadastro.
Exibe mensagens de erro para falhas de autenticação ou senhas que não correspondem.
Mostra um spinner de carregamento durante o processo de autenticação.


Tela Inicial:

Exibe uma lista agregada dos itens mais recentes de todos os feeds inscritos pelo usuário.
Para cada item, mostra o título, uma prévia truncada do conteúdo, o nome do feed de origem e a data de publicação.
Permite que o usuário atualize a lista de itens.
Cada item na lista é clicável e leva à uma página de detlhe do conteúdo para visualização completa.
Apresenta um estado vazio com uma mensagem convidando o usuário a adicionar feeds, caso não haja nenhum.


Tela de Feeds:

Permite aos usuários gerenciar seus feeds inscritos.
Exibe uma lista de feeds com seu nome, URL, status (ativo/erro), data da última atualização.
Funcionalidade para adicionar novos feeds, incluindo validação de URL em tempo real (com debounce) e extração automática do título do feed.
Opções para ativar/desativar feeds e cancelar a inscrição de feeds existentes.
Exibe mensagens de sucesso e erro para as operações de gerenciamento de feeds.

Tela de Detalhe do Conteúdo:

Exibe o conteúdo completo de um item de feed selecionado.
Para vídeos do YouTube: Incorpora um player de vídeo responsivo que permite assistir ao vídeo diretamente na plataforma. Exibe o título do vídeo e a descrição. Inclui tratamento de erro para vídeos que não podem ser incorporados, oferecendo um link para assistir no YouTube.
Para posts de blog: Renderiza o conteúdo HTML completo do post, preservando a formatação original para elementos como títulos (h1-h6), parágrafos, listas, imagens, links, tabelas e blocos de código. Exibe uma imagem em miniatura se disponível.
Exibe metadados do item, como a fonte do feed e a data de publicação formatada.
Inclui um botão para retornar à tela inicial.
Gerencia estados de carregamento e exibe mensagens de erro se o conteúdo não puder ser carregado.
A aplicação se integra com a API Feed Processor para autenticação, validação, inscrição e recuperação de conteúdo de feeds.