# Validação visual — refinamento de Editar loja

Data: 26 de agosto de 2026.

Na rota autenticada da Loja HQ, a tela carregou corretamente com seis etapas explícitas: **Identidade**, **Template e aparência**, **Operação da loja**, **Vendas e entrega**, **Atendimento** e **Área avançada**. A etapa Identidade preservou nome, logo, categoria pesquisável, endereço público, cor e fonte. O cartão de salvar ficou fixo e, no desktop, não interferiu no conteúdo da seção.

Próximas verificações: cartões de template, seletor de moeda/fuso, catálogo de integrações e deslocamento do cartão de salvar no viewport móvel. Nenhuma alteração foi salva durante esta validação.

Os cartões de template foram exibidos corretamente: **Loja padrão** ativo e **Editorial**/**Minimal** como indisponíveis, sem fingir templates funcionais. A etapa **Operação da loja** manteve localização, moeda e idioma em seletores com busca e isolou o modo de manutenção em seu próprio cartão. Nenhuma alteração foi salva durante a validação.

A etapa **Vendas e entrega** exibiu máscara monetária em `R$` e o estado seguro para integrações desconectadas: não há inclusão manual de métodos, apenas orientação para conectar Mercado Pago e Melhor Envio. A captura automatizada em `375×812` abriu a tela de login, pois esse fluxo de preview não compartilha a sessão autenticada do navegador; portanto, a sobreposição móvel não pôde ser confirmada visualmente nessa captura. O CSS do cartão de salvar usa `bottom: calc(9.25rem + env(safe-area-inset-bottom))` no celular e volta para `bottom-3` a partir de `sm`.
