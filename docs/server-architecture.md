# Arquitetura do servidor

## Objetivo e convenções

O servidor foi organizado por **domínio de negócio**, preservando os endpoints REST já consumidos pelo cliente. A raiz `server/api.js` atua como compositor; o comportamento de cada recurso está em `server/modules/<domínio>`. A organização é deliberadamente proporcional: módulos de CRUD e mídia ganharam camadas explícitas de controller, serviço, repositório, validação e apresentadores; módulos muito pequenos não recebem arquivos vazios apenas para completar uma árvore.

> A regra prática é: HTTP adapta a requisição; validação transforma a entrada; serviço aplica regras e autorização de domínio; repositório persiste; apresentador estabiliza o contrato de saída.

## Árvore relevante

```text
server/
├── api.js                         # composição e montagem dos routers
├── index.ts                       # bootstrap Express, JSON limit e tratamento global
├── modules/
│   ├── auth/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   ├── service.js
│   │   ├── repository.js
│   │   ├── validation.js
│   │   ├── middleware.js
│   │   └── email.js
│   ├── account/
│   ├── stores/
│   ├── dashboard/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   └── service.js
│   ├── products/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   ├── service.js
│   │   ├── repository.js
│   │   ├── validation.js
│   │   └── presenters.js
│   ├── customers/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   ├── service.js
│   │   ├── repository.js
│   │   ├── validation.js
│   │   └── presenters.js
│   ├── coupons/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   ├── repository.js
│   │   └── validation.js
│   ├── banners/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   ├── service.js
│   │   ├── repository.js
│   │   ├── validation.js
│   │   └── presenters.js
│   ├── billing/
│   ├── integrations/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   ├── service.js
│   │   ├── repository.js
│   │   ├── validation.js
│   │   └── providers.js
│   ├── webhooks/
│   ├── storage/
│   │   └── media-storage.js
│   └── shared/
│       ├── http.js
│       ├── repository.js
│       ├── validation.js
│       ├── presenters.js
│       └── response.js
└── index.ts                        # bootstrap alternativo de desenvolvimento
```

## Domínios e responsabilidades

| Módulo | Responsabilidade pública | Fronteira principal |
|---|---|---|
| `auth` | Cadastro, sessão e recuperação de senha | A autenticação apenas identifica a conta; autorização de loja fica em cada domínio. |
| `account` | Perfil, senha e exclusão de conta | Dados pertencentes ao usuário, não a uma loja. |
| `stores` | Ciclo de vida e perfil institucional das lojas | API pública utilizada por dashboard e cobrança. |
| `dashboard` | Visão consolidada de lojas e alertas | Coordena APIs públicas de `stores` e `billing`. |
| `products` | Categorias, catálogo, mídia temporária e produtos | Categoria e mídia são validadas no contexto da loja do recurso. |
| `customers` | CRM, endereços, telefones, favoritos e compras | Operações transacionais mantêm os indicadores agregados do cliente consistentes. |
| `coupons` | Regras de cupom por loja | Mantém validações comerciais no próprio domínio. |
| `banners` | Banners, segmentação, recorte, upload e mídia | Persistência, regra de segmentação e armazenamento são separados. |
| `billing` | Trial, assinaturas, ordens e pagamentos | Sempre opera com `storeId` autorizado. |
| `integrations` | OAuth Mercado Pago, Melhor Envio, SMTP e Resend | Credenciais criptografadas e adaptadores externos não retornam segredos. |
| `webhooks` | Eventos idempotentes do Mercado Pago | Delega a sincronização à API pública de cobrança. |

## Camadas internas

Os arquivos `routes.js` mantêm a superfície de montagem do módulo. Controllers possuem apenas leitura de `params`, `query`, `body` e identidade autenticada, mapeamento de resultado e conversão de erros de domínio para HTTP. Serviços recebem valores explícitos e concentram regras comerciais, ownership e orquestração de transações. Repositórios concentram SQL e recebem somente os valores necessários para a consulta. Validações impõem formatos, enums, campos obrigatórios e limites por domínio. Apresentadores convertem colunas de banco em contratos camelCase estáveis.

No domínio de **integrações**, o controller declara os routers protegido e público, adapta as entradas dos endpoints de OAuth, Melhor Envio, Resend, SMTP e e-mail transacional e transforma apenas erros conhecidos em respostas HTTP. O serviço não importa Express nem cria routers: ele recebe `storeId`, `userId`, dados já validados e informações de contato explicitamente, preservando a verificação de posse, a criptografia e as transações do callback OAuth.

Nos módulos de **produtos**, **clientes** e **banners**, o controller não executa SQL. Em particular, os fluxos de anexação de mídia, exclusão, recorte, favoritos, compras e atualização de métricas passam pelo serviço, enquanto o repositório contém as consultas e mutações. Isso mantém a regra de negócio próxima do domínio sem transformar `shared/` em um depósito genérico.

## Código compartilhado e utilitários

`shared/http.js` contém somente preocupações transversais: erro de entrada, limites de campos/profundidade/listas/texto, limites de query/params, paginação limitada e rate limiting best-effort por IP. `shared/repository.js` oferece primitivas de infraestrutura para consultas e transações, e não contém regra comercial. `shared/validation.js` se limita a normalizações genéricas simples. `shared/presenters.js` contém mapeadores que são realmente utilizados por mais de um domínio.

Utilitários específicos permanecem no módulo que os utiliza. Exemplos são validação de mídia de produto, recorte de banner, parsing de cliente, regras de limite de mídia, templates de e-mail e adaptadores de fornecedores. Assim, cálculo comercial, regras de cupom, recorte ou mídia não são classificados artificialmente como `utils` globais.

## Dependências entre módulos

Os módulos dependem de APIs exportadas, não de arquivos de persistência internos de outro domínio. O dashboard usa `getStoresForUser` e `reconcileStoresForUser`; como não executa SQL próprio, mantém controller e serviço, sem um repositório artificial. O webhook usa as operações de sincronização da cobrança; banners usam armazenamento de mídia; produtos e clientes não acessam repositórios internos um do outro. Esta direção reduz a chance de ciclos e deixa as consultas de cada domínio encapsuladas.

```text
HTTP → controller → serviço → repositório
                      │
                      ├── adaptador externo do próprio domínio
                      └── API pública de outro módulo, quando necessária
```

## Multi-tenancy e autorização

Todos os recursos comerciais são alcançados por uma loja e a posse é verificada no servidor, por meio de consultas que associam `storeId` ao `userId` autenticado. Produtos, categorias, clientes, favoritos, compras, cupons, banners, pedidos, assinaturas e integrações não confiam apenas no identificador enviado pelo cliente. Antes de mutar ou expor dados, o serviço confirma que a loja pertence ao usuário e que o recurso pertence à mesma loja.

Quando uma operação envolve listas de IDs, como categorias de banner, favoritos de cliente ou uploads de produto, o servidor verifica que todos os registros pertencem ao tenant antes da persistência. As operações que precisam manter dados derivados consistentes, como compras de clientes e anexação de mídia de produto, são executadas dentro de transações.

## Mercado Pago e demais fornecedores

O OAuth do Mercado Pago permanece no módulo de integrações, separado das regras de catálogo e CRM. O estado OAuth tem prazo e consumo único; tokens de acesso e atualização são criptografados em repouso e nunca fazem parte do contrato público de configurações. Webhooks não manipulam o banco diretamente: entram pelo domínio de webhook e chamam a sincronização idempotente de cobrança.

O módulo de integrações passou a usar `providers.js` para comunicação direta com Melhor Envio, Resend e SMTP. A camada de domínio decide se uma integração está conectada e quais dados podem ser enviados; o adaptador realiza a chamada HTTP ou SMTP. Essa separação evita que detalhes de transporte e credenciais se espalhem por controladores ou por módulos comerciais.

## Limites e estratégia de erros

A API impõe limite de JSON no bootstrap e devolve `413` para payload excedente ou `422` para JSON inválido. Antes de as rotas protegidas serem executadas, a fronteira HTTP limita quantidade e tamanho de query strings, tamanho de params, profundidade de objetos, número de campos, listas e strings. Paginação aceita apenas faixas controladas, e os domínios validam enums e filtros próprios. O rate limiter em memória distingue autenticação de chamadas gerais; por ser por instância, é uma proteção best-effort, não um contador distribuído.

Erros de validação e de domínio carregam status HTTP explícito e são transformados uma única vez no controller ou na fronteira da API. Erros imprevistos seguem para o handler global, evitando respostas diferentes para o mesmo tipo de falha.

## Defaults de entrada preservados por contrato

Os defaults de entrada são restritos a **campos omitidos**; eles não substituem valores vazios, `null` ou enums inválidos enviados pelo cliente. No checkout de cartão, `installments` recebe `1` somente quando o campo não existe no payload. Em lojas, `color` e `addressMode` usam os valores padrão apenas quando ausentes, e a criação deriva o `slug` do nome somente se `slug` não foi enviado. Na atualização de identidade da loja, `name` e `slug` omitidos preservam o registro existente; valores explicitamente inválidos são rejeitados com `422`.

Os identificadores de loja, plano, assinatura, ordem e query de cobrança são opacos e obrigatórios quando o endpoint exige o respectivo recurso. Por isso, checkout, trial, consulta de status, listagem de assinaturas e ordens, troca de plano, Pix e cartão não executam consultas ou chamadas ao provedor quando esses identificadores falham na validação.

## Evidências da auditoria de entradas

| Domínio | Validação auditada | Evidência automatizada |
|---|---|---|
| `auth` | Cadastro inválido é rejeitado antes do serviço de conta. O pedido de recuperação preserva resposta neutra para não revelar cadastros. | `domain-validation.http.test.js` |
| `account`, `stores`, `billing` | Perfil, cor, slug, loja, plano, assinatura, Pix e cartão falham antes de SQL ou Mercado Pago quando inválidos. | `module-input-validation.http.test.js` e `billing-validation.test.js` |
| `products` | Categoria, status, mídias e filtros de catálogo não descartam valores inválidos silenciosamente. | `domain-validation.http.test.js` e `product-routes.contract.test.js` |
| `customers` | Telefones, endereços, favoritos, datas de compra, filtros e paginação são validados antes do serviço CRM. | `domain-validation.http.test.js` e `customer-routes.test.js` |
| `coupons`, `banners` | Estados, flags booleanas, páginas, categorias, recorte, enums e filtros preservam apenas defaults de campo omitido. | `coupon-routes.test.js`, `coupon-routes.http.test.js`, `banner-routes.test.js` e `banner-routes.http.test.js` |
| `integrations` | Credenciais, templates, destinatários, OAuth e cotação rejeitam payloads inválidos sem persistir ou chamar provedor. | `integration-routes.http.test.js` |
| `dashboard`, `webhooks`, `storage` | Dashboard não recebe payload comercial; webhook exige assinatura antes de persistir; storage aceita somente chaves de mídia permitidas. | `webhook-signature.test.js` e validação de rota compartilhada |

## Arquivos criados e modificados nesta etapa

| Tipo | Arquivos principais |
|---|---|
| Criados | `products/validation.js`, `products/presenters.js`, `customers/validation.js`, `customers/presenters.js`, `banners/validation.js`, `banners/presenters.js`, `integrations/providers.js`, `integrations/validation.js`, `auth/validation.js`, `auth/service.js`, `modules/README.md` e este documento. |
| Reorganizados | Repositórios, serviços e controllers de `auth`, `dashboard`, `products`, `customers` e `banners`. |
| Compatibilidade | Imports internos usam os módulos canônicos; as pontes curtas na raiz de `server/` foram removidas sem alterar endpoints REST públicos. |
| Removidos | Nenhum endpoint, contrato público ou credencial foi removido. |

## Próximas evoluções recomendadas

Os domínios de cobrança, conta e lojas ainda devem receber auditorias incrementais de fallbacks e filtros de entrada quando ganharem regras de negócio. Para produção distribuída com várias instâncias, o rate limiter em memória pode ser substituído por um contador compartilhado. Por fim, a divisão do bundle do cliente pode reduzir o aviso não bloqueante de chunk acima de 500 kB observado no build.
