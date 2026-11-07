# Vendinha do Vô Tonico

Jogo idle mobile em português do Brasil. O jogo inteiro está em **[index.html](index.html)**: HTML, CSS, JavaScript, dados, sons sintetizados e visuais em emojis. Não depende de servidor, bibliotecas, imagens externas ou internet.

Baixe o arquivo e abra no navegador. No celular, use um navegador que permita abrir arquivos HTML. Para hospedar, qualquer servidor estático pode servir o mesmo arquivo.

- Seis abas, seis funcionários e três níveis de treinamento por pessoa.
- 40 melhorias e sinergias, 42 eventos e 22 decisões de fechamento.
- 14 receitas, puzzle 4×4, 12 cartas, cinco capítulos e dois finais.
- 25 conquistas, 12 compras de legado e cinco modificadores de recomeço.
- Salvamento local com versão, validação, exportação e importação em base64.
- Ausência de até oito horas, com eficiência de 50% (65% com uma compra de legado).
- Nenhuma escolha importante é tomada automaticamente durante a ausência; uma escolha pendente pausa a vivência.

A jornada inicial tem marcos de vivência, além de objetivos de equipe, reputação, receitas e cartas. Foi simulada até o final em aproximadamente 5h30, sem dinheiro extra. Isso não substitui o teste de ritmo com pessoas jogando.

`showRewardedAd(callback)` é uma demonstração **local** de três segundos, sem publicidade real. O comentário na função indica o ponto de integração futura com AdMob. Não há cadastro, compra ou envio de dados.

## Como testar — 10 passos

1. Abra `index.html` sem internet, receba a chave e conclua as seis etapas do tutorial.
2. Observe os clientes sendo atendidos sozinhos; reponha um produto e confira caixa e estoque.
3. Compre a primeira prateleira, visite as seis abas e confira os motivos dos botões indisponíveis.
4. Após quatro minutos de vivência, contrate alguém, escale um turno e teste humor e treinamento.
5. Resolva ou deixe um evento com os vizinhos. Confirme que o relógio pausa durante a escolha.
6. No fechamento, escolha uma decisão e confira o novo dia. Teste o bônus opcional de lucro e a recarga de energia.
7. Arrume a prateleira trocando pares de produtos até formar quatro linhas uniformes. Teste também pular, o prazo de 45s e tentar novamente.
8. Aos 25 minutos, experimente `milho + água` e outras combinações. Veja as receitas aparecerem nas vendas.
9. Exporte uma cópia em Mais, recarregue, importe a cópia e teste um código inválido. Depois deixe a tela oculta e confira o resumo de ausência.
10. Acompanhe os objetivos na História até as 12 cartas e o final. Recomece com um modificador e confira selos, conquistas e receitas herdadas. Para testes mais rápidos, acrescente `?debug=1` ao endereço e use tempo ×10, dinheiro e pular dia.

## Verificação automatizada

Com Node.js, sem instalar dependências:

```sh
node tests-core.cjs
```

São 31 testes de lógica com DOM simulado, incluindo uma jornada inteira, importação inválida, salvamento bloqueado/corrompido, offline, puzzle, eventos, habilidades, ambos os finais e prestígio. Os testes não medem layout ou aparência.

Para testes de integração em um navegador real, o roteiro `tests.cjs` requer Playwright e Chromium. Configure `CHROMIUM_PATH` se o executável não estiver em `/usr/bin/chromium`:

```sh
node tests.cjs
```

O ambiente de desenvolvimento bloqueou a abertura do navegador local; a suíte Playwright e a aparência visual ainda precisam ser confirmadas em um ambiente que permita esse acesso. As capturas geradas pela suíte ficam apenas no diretório de trabalho.

## Ajustes

As tabelas de produtos, clientes, equipe, melhorias, receitas, eventos, decisões, capítulos, cartas, modificadores, legado, conquistas e tutorial ficam no início do script. Os custos de melhorias básicas crescem em 1,28 por nível.

O armazenamento é específico do navegador e da origem do arquivo/site. Exporte o save antes de mudar de aparelho, navegador, arquivo ou endereço. Se o armazenamento estiver indisponível, o jogo continua com aviso e exportação manual.
