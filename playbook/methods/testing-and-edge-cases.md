# Testes e casos de borda

**Estado:** rascunho em piloto no Ampara.

## Objetivo e escopo

Este método ajuda a definir testes que protegem comportamentos observáveis e limites relevantes. Testes complementam o contrato e a revisão; não substituem decisões de produto nem provam, sozinhos, que um sistema está correto.

Use o framework e as convenções existentes no projeto. No piloto Ampara, os exemplos usam `pytest` e `TestClient`; outros projetos devem adaptar os comandos e fixtures à própria stack.

## Testes procuram defeitos

Uma suíte aprovada mostra que os casos executados produziram os resultados esperados. Ela não prova que todos os defeitos foram encontrados. Por isso, avalie cada teste também pela capacidade de detectar uma regressão: pergunte qual alteração incorreta faria a asserção falhar.

Priorize testes que distinguem o comportamento correto de erros plausíveis. Casos de borda, respostas negativas e regressões reproduzidas devem verificar resultados observáveis com expectativas independentes. Cobertura de linhas ou ramos ajuda a localizar caminhos não exercitados, mas não demonstra que as expectativas estão corretas.

Quando apropriado, use TDD para observar primeiro a falha do novo teste, implementar o comportamento e então refatorar preservando a suíte. Uma mutação pequena e isolada pode avaliar se um teste realmente detecta a regra que pretende proteger; ela não substitui uma boa seleção de casos nem precisa ser aplicada em toda mudança.

Encontrar um defeito antes da integração ou produção costuma reduzir o alcance e o custo da correção, mas o valor exato depende do sistema e do processo. Não apresente a regra de “10 vezes mais caro por fase” como constante universal. Registre dados do próprio projeto quando precisar justificar uma decisão econômica.

## Contexto antes de escrever testes

1. Leia critérios de aceite, contrato, implementação, entidades, fixtures e testes próximos.
2. Identifique entradas, saídas, efeitos persistentes, limites e condições de erro documentados.
3. Separe regras confirmadas de suposições. Não invente comportamento para preencher uma lacuna: registre a dúvida para decisão humana.
4. Verifique como o projeto configura banco, isolamento e dados sintéticos para testes.

## Seleção de cenários

O caminho feliz é o fluxo em que tudo dá certo. Ele é necessário, mas é onde a maior parte dos defeitos não está. Os defeitos costumam morar nas fronteiras: valor nulo, lista vazia, entrada muito longa, número negativo, zero, o maior valor aceito, datas-limite, texto com caracteres especiais.

Uma forma prática de encontrar esses casos é perguntar, para cada parâmetro relevante, o que acontece no **mínimo, no máximo, no zero, no vazio e no inválido**. Essa heurística gera uma lista concreta a partir do contrato, sem inventar regras de domínio.

Escolha casos a partir do contrato e do risco. Quando forem relevantes, considere:

- caminho válido representativo;
- valor zero, mínimo, máximo e valores imediatamente abaixo/acima dos limites;
- entrada ausente, nula, vazia, malformada ou com tipo incorreto;
- caracteres especiais e tamanhos extremos aceitos ou rejeitados pelo contrato;
- duplicatas, reenvios, ordenação, timestamps e limites de paginação;
- ausência de credencial, credencial inválida e tentativa de acesso a outro objeto;
- falha de dependência, persistência ou estado vazio, quando fazem parte do comportamento prometido.

Você não vai cobrir todos os casos possíveis. O objetivo é cobrir os que têm **consequência real**. Um desconto acima de 100% que gera valor negativo em um sistema de pagamento merece teste. Um campo de texto com dez caracteres a mais do que o usual provavelmente não merece. Priorize as fronteiras com maior risco e evite casos que não correspondam a uma regra do produto.

### Aplicação no piloto Ampara

Para a API atual, casos relevantes derivam do contrato: PID permitido e não permitido; unidade correspondente; limites de valor por PID; timestamp com fuso e normalização UTC; autorização por veículo; evento repetido idêntico e conflito de `event_id`; resposta 422 sem `input` e `ctx`. Esses exemplos pertencem ao domínio Ampara e não são regras universais do playbook.

## Estrutura e nomes

Organize cada caso em **Arrange, Act, Assert** quando isso combinar com as convenções do projeto:

1. **Arrange** — prepare os dados, dependências e estado inicial do cenário.
2. **Act** — execute exatamente uma ação observável.
3. **Assert** — compare o resultado com o comportamento esperado.

Separe visualmente as três fases com comentários ou linha em branco. A separação não é cosmética: quando o teste falha, ela indica em qual fase o problema ocorreu e reduz o tempo de diagnóstico.

O nome do teste importa tanto quanto o código. Um nome como `rejeita_pid_desconhecido` informa a regra; `testa_validacao` não informa nada. Em uma falha de pipeline, o nome é a primeira pista que o desenvolvedor lê. Prefira nomes que expressem o comportamento esperado em vez de nomes que descrevam apenas uma função interna.

Cada teste deve verificar **um comportamento**. Múltiplos `assert` são aceitáveis quando todos descrevem o mesmo resultado esperado. Um teste que verifica comportamentos distintos não diz qual deles quebrou quando falha.

## Expectativas independentes

O valor esperado precisa ser determinado independentemente da implementação testada. Prefira um resultado literal conferido ou uma regra de referência separada. Não calcule `expected` repetindo a mesma fórmula ou chamando a mesma lógica usada pelo código sob teste.

Asserte status, resposta, estado persistido ou outro efeito relevante. Evite testes que apenas executam código sem verificar um resultado observável.

## Cobertura de código

Ferramentas de cobertura medem quanto do código foi executado durante os testes. As métricas mais comuns são cobertura de linhas, de ramos (cada lado de um `if`) e de funções. A cobertura de ramos é mais útil que a de linhas: uma linha com `if (x) { ... }` pode ser executada sem que o caminho falso seja testado.

Cobertura alta não garante bons testes. Um teste sem nenhuma asserção executa todas as linhas e pode atingir 100% de cobertura. Use cobertura como um **indicador de onde não há testes**, não como meta a ser atingida a qualquer custo. Times que exigem 100% tendem a escrever testes que apenas chamam funções sem verificar resultados.

O relatório de cobertura é útil para encontrar código sem teste. Para descobrir se as asserções existentes realmente detectam defeitos, use revisão de mutação.

## Revisão de mutação

Para avaliar se testes protegem uma regra importante, pode-se introduzir uma alteração proposital e pequena — por exemplo, trocar `<` por `<=` ou remover uma chamada — e confirmar que um teste relevante falha. Ferramentas de mutação automatizam esse processo aplicando alterações sistemáticas e verificando quais "mutantes" sobrevivem sem ser detectados por nenhum teste. Cada mutante sobrevivente indica uma asserção fraca.

- Proponha essa verificação como uma ação separada, com alvo e teste definidos.
- Faça a mutação em uma cópia descartável ou worktree isolada, nunca no workspace compartilhado.
- Execute apenas os testes focados na regra alterada e registre qual falhou e por quê.
- Descarte a cópia mutada e confirme que nenhuma alteração proposital entrou no trabalho normal.
- Se não houver isolamento seguro, não faça a mutação; registre a limitação.

Mutação é uma verificação direcionada, não uma exigência automática para cada teste ou mudança.

## Quando um teste falha

Investigue se a falha revela defeito de implementação, expectativa incorreta ou contrato incompleto. Não altere a expectativa apenas para obter um resultado verde. Se o comportamento desejado mudou, registre e obtenha a decisão humana antes de mudar contrato e teste.

## Registro da verificação

Informe os comandos executados, resultado observado, cenários cobertos e lacunas restantes. Diferencie análise estática de execução. Atualize o board com evidência e próximo passo; não declare uma suíte eficaz somente por quantidade ou cobertura percentual.

## Referências

- [E. W. Dijkstra, “On the reliability of programs” (EWD303)](https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD303.html)
- Barry W. Boehm, *Software Engineering Economics*, 1981. Use os modelos de custo como contexto histórico; não generalize um multiplicador fixo para todos os projetos.
