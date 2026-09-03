# Mapa DATABASE → DOMAIN → STORE CONTRACT

## Escopo público e visibilidade

O contrato produzido por este módulo é uma DTO pública, multi-tenant e derivada. Ele nunca expõe `user_id`, credenciais, `config_encrypted`, tokens OAuth, dados de clientes, pedidos de cobrança do SaaS, custos de produto ou outros dados administrativos. A rota pública só atende lojas em status operacional ativo; a rota administrativa exige a propriedade da loja.

| Campo do contrato | Origem atual | Classe | Visibilidade | Transformação |
|---|---|---|---|---|
| `store.id`, `name`, `slug`, `description`, `logo` | `ld_stores` | A — direto | PUBLIC | Nenhuma, exceto normalização de texto. |
| `store.status` | `ld_stores.status` | B — outro nome | PUBLIC | Código de lifecycle → `active`, `pending` ou `inactive`. |
| `store.contact` e `social` | `ld_store_profiles` | B — outro nome | PUBLIC | Colunas achatadas → objetos do contrato. |
| `store.contact.address.zipCode/neighborhood` | `address_postal_code`/`address_district` | B — outro nome | PUBLIC | Renomeação explícita. |
| `store.seo.title/description/ogImage` | identidade, descrição e logo da loja | C — derivado | PUBLIC | Sem conteúdo inventado; keywords permanece lista vazia. |
| `store.theme.primaryColor/fontFamily` | `ld_stores.color`, `ld_store_profiles.font_family` | B — outro nome | PUBLIC | Renomeação explícita. |
| moeda, locale, timezone, favicon, maintenance, template, settings comerciais | Sem origem atual | D — GAP | PUBLIC quando configurados | O builder emite `null` ou lista vazia; não inventa defaults. |
| `banners[].title`, imagens, ativo | `ld_banners`, `ld_banner_images` | A/B | PUBLIC | Imagens desktop/mobile por breakpoint; posição ordinal derivada da posição interna. |
| subtítulo, link, CTA e `miniBanners` | Sem origem atual | D — GAP | PUBLIC | `null`/lista vazia. |
| categorias, hierarquia, ativo | `ld_product_categories` | A/B/F | PUBLIC | `parent_category_id` → `parentId`; árvore construída no mapper. |
| `category.slug`, posição, contagem | categoria + produtos ativos | C — derivado | PUBLIC | Slug normalizado, ordenação determinística e `COUNT` de produtos ativos. |
| imagem/banner de categoria | Sem origem atual | D — GAP | PUBLIC | `null`. |
| produto, descrição, preço, status | `ld_products` | A/B | PUBLIC | centavos → número monetário; `status=active` → booleano. |
| imagem/thumbnail | `ld_product_media` | F — relacionamento | PUBLIC | URLs de mídia de imagem; principal como thumbnail. |
| categoria/subcategoria do produto | `ld_products.category_id` + categoria | F/C | PUBLIC | Categoria raiz e subcategoria resolvidas da árvore. |
| slug, shortDescription, SEO básico | nome/descrição do produto | C — derivado | PUBLIC | Slug seguro, resumo truncado e metadados básicos. |
| custo, SKU, marca, tags, flags, estoque, peso, dimensões, variantes, atributos | Sem origem atual | D — GAP | `costPrice` é PRIVATE; demais são PUBLIC quando existirem | Custo não entra no DTO público; campos públicos pendentes ficam `null`, `{}` ou `[]`. |
| cupons básicos | `ld_coupons` | A/B | PUBLIC | percentuais/centavos normalizados; somente ativos e não expirados. |
| descrição, desconto máximo, limite por usuário, início, categorias/produtos de cupom | Sem origem atual | D — GAP | PUBLIC quando configurados | O contrato não cria regras artificiais. |
| páginas institucionais | Sem entidade atual | D — GAP | PUBLIC | Lista vazia. |
| pedidos, itens, endereço e rastreamento | Sem domínio de pedido de consumidor | D — GAP | ADMIN/PRIVATE por padrão | Lista vazia. `ld_billing_orders` é exclusivamente cobrança do SaaS e é proibido no contrato público. |

## Campos sensíveis excluídos

| Campo interno | Classificação | Motivo |
|---|---|---|
| `ld_store_integrations.config_encrypted`, chaves de API, OAuth e tokens | SENSITIVE | Credenciais operacionais. |
| Dados de conta, JWT, senha e recuperação | SENSITIVE | Autenticação/plataforma. |
| Dados pessoais de `ld_customers` | PRIVATE | Não pertencem à vitrine pública. |
| `ld_billing_orders`, assinaturas e pagamento do SaaS | ADMIN/PRIVATE | Cobrança da plataforma, não venda da loja. |
| `costPrice` | PRIVATE | Informação financeira interna. |

## Endpoints

| Endpoint | Público | Isolamento |
|---|---:|---|
| `GET /v1/public/stores/:slug/contract` | Sim | Busca por slug e exige loja em status ativo. |
| `GET /v1/stores/:storeId/contract` | Não | Requer JWT e confirma `store.user_id = req.user.id`. |

O contrato usa `contractVersion: "1.0"`. A interface futura deve consumir somente esta resposta, nunca tabelas ou modelos internos.
