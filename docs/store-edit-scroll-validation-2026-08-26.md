# Validação visual — Editar loja

Em 26 de agosto de 2026, a rota autenticada de edição da Loja HQ foi revisada sem salvar alterações. A etapa **Identidade** exibiu apenas o cartão **Informações básicas** expandido. A categoria ficou imediatamente após o nome da loja, enquanto **Endereço público**, **Cor de destaque** e **Fonte da loja** iniciaram fechados.

Após rolagem descendente, o cartão contextual **“Quase lá”** passou para `aria-hidden="true"`, com as classes de transição de opacidade e deslocamento, confirmando que não disputa espaço enquanto o usuário lê o formulário. Uma rolagem ascendente restaurou `aria-hidden="false"`, opacidade total e interação com o botão de salvar.

A captura móvel automatizada posterior encontrou a sessão expirada antes de carregar os formulários; por isso, a validação visual autenticada desta rodada foi feita no navegador de desktop. As suítes automatizadas e o build do painel foram concluídos antes do registro.
