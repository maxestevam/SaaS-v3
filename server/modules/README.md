# Convenções dos módulos do servidor

Cada domínio em `server/modules` mantém seus endpoints existentes, mas separa responsabilidades de acordo com a complexidade real. O arquivo `routes.js` declara somente a montagem pública do módulo. Controllers adaptam `req` e `res`, delegando dados explícitos para serviços. Serviços concentram regras de negócio e orquestração, sem acesso direto a Express. Repositórios são a única camada que executa SQL do domínio. Validações convertem e validam body, params e query antes de a regra de negócio ser executada.

Arquivos não são criados apenas para cumprir uma árvore. Módulos simples podem possuir menos camadas; módulos que persistem dados ou aplicam regras comerciais devem manter ao menos controller, serviço, repositório e validações reais. Um orquestrador sem consulta própria, como o dashboard, possui controller e serviço, mas não um repositório artificial. Cada módulo só importa a API pública exportada por outro módulo, nunca suas implementações internas.

Os auxiliares em `shared/` são exclusivamente infraestrutura transversal: HTTP, erros, paginação, validações sem regra comercial e primitivas de repositório. Lógica comercial, formatos específicos de mídia e integração de um provedor permanecem no domínio que os utiliza.
