# Expansão administrativa de catálogo

## Validação autenticada

Na validação em navegador realizada em 26 de agosto de 2026, o dashboard da loja ativa **Loja HQ** exibiu dados agregados persistidos do catálogo. Foram observados **1 produto**, **1 categoria usada**, **0 unidades em estoque**, **1 produto sem estoque** e **1 produto criado nos últimos 30 dias**. A interface explica que “novo” é um indicador derivado de criação recente e que “mais vendido” e “destaque” não são mostrados enquanto não houver pedidos de consumidor confiáveis.

Na listagem autenticada, o produto existente foi exibido com categoria, preço, status e ação de edição. O fluxo de novo produto abriu como página administrativa normal e preservou a primeira etapa de categoria e mídias, com a seleção de categoria dentro do próprio fluxo e sem modal adicional.

O seletor pesquisável localizou e aplicou a categoria existente **Camisas** no cadastro, mantendo o fluxo na mesma página.

Ao tentar avançar sem mídia, o fluxo bloqueou a continuidade e informou que é necessário adicionar ao menos uma imagem para a vitrine. Nenhum produto foi criado ou alterado durante essa validação.

Na edição do produto existente, a categoria e a mídia persistida foram carregadas corretamente, liberando a continuação para a etapa de informações sem necessidade de novo upload.

Durante a inspeção inicial, foi identificado que a ação de avançar no editor podia executar uma atualização sem alteração de conteúdo. A ação agora cancela explicitamente o comportamento padrão do formulário, e uma regressão automatizada assegura que avançar de etapa não faz `PATCH`.

Após reiniciar o serviço de desenvolvimento, a sessão autenticada e a edição do produto com mídia existente foram recarregadas corretamente para a confirmação final do comportamento ajustado.

Na transição final para a segunda etapa, foram exibidos SKU, marca, descrição curta, tags, preço de origem, preço de custo, estoque, status, peso, dimensões e a área de variações. Os controles de atributos, SEO, destaque, novidade e mais vendidos não foram incluídos.

## Escopo da expansão

Foram incluídos no fluxo administrativo de produto SKU, descrição curta, preço de origem, preço de custo, marca, tags, estoque, peso, dimensões e variações. Atributos e SEO permanecem fora do escopo por solicitação explícita. Nenhuma flag persistida de destaque, novidade ou mais vendidos foi adicionada.

## Mapeamento administrativo concluído

| Domínio do JSON | Estado atual | Próxima ação administrativa |
|---|---|---|
| Loja: moeda, locale, fuso, manutenção, favicon, template e tema completo | Implementado no perfil da loja, API administrativa e contrato canônico. | Configurável na aba **Vitrine**, sem alterar integrações. |
| Loja: regras comerciais, formas de pagamento e frete | Implementado como configuração declarativa persistida. | O painel deixa explícito que não cria pedidos, cobranças ou cotações. |
| Banners principais | Implementado com subtítulo, destino, CTA e ordenação. | Campos visíveis no editor e na listagem. |
| Mini-banners | Implementado como tipo persistido de banner. | Compartilha regras de mídia e isolamento por loja. |
| Categorias | Implementado com URL HTTPS de imagem de card e capa. | Campos disponíveis no gerenciador de categorias e no contrato público. |

> O painel não criará campos para **atributos** ou **SEO**. “Novo” continua derivado por data de criação; “destaque” e “mais vendido” somente poderão aparecer quando houver fonte real de métrica de consumidor.

## Validação final complementar

Na sessão autenticada, a aba **Vitrine** da edição de loja exibiu moeda, locale, fuso horário, template, favicon, modo de manutenção, cores complementares, regras comerciais de exibição e listas declarativas de pagamento e frete. A explicação contextual do painel diferencia esses dados das integrações operacionais, evitando a impressão de que o cadastro habilita checkout, cobrança ou cotação de frete.

O estado final foi confirmado por **85 arquivos de teste aprovados**, **255 testes aprovados**, **2 ignorados** e build de produção concluído. O build mantém apenas o aviso não bloqueante de chunk principal acima de 500 kB.

O editor autenticado de banners exibiu os controles de **tipo principal ou mini-banner**, subtítulo, destino do clique, texto de botão e ordem na vitrine. A criação autenticada de categoria exibiu os campos de URL HTTPS para a imagem de card e para a capa, além do recorte padrão já existente. Nenhum registro de banner, categoria ou produto foi salvo durante a inspeção visual.
