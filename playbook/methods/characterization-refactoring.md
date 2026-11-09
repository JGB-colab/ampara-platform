# Refatoração com testes de caracterização

**Estado:** rascunho em piloto no Ampara.

## Objetivo e escopo

Este método protege mudanças estruturais em código existente cujo comportamento ainda não está suficientemente compreendido. Um teste de caracterização registra o que o sistema faz hoje, inclusive comportamentos surpreendentes, para que uma refatoração não os altere por acidente.

Refatoração muda a estrutura interna preservando o comportamento observável. Uma mudança desejada de comportamento é uma alteração de contrato e precisa de decisão explícita.

## Antes de refatorar

1. Leia instruções, arquitetura, contratos, implementação, chamadores, efeitos persistentes e testes relacionados.
2. Peça uma explicação do fluxo e das dependências antes de propor a reescrita. Confira essa explicação no código e nos testes; trate pontos incertos como perguntas, não como fatos.
3. Liste os comportamentos observáveis relevantes: entradas, saídas, erros, efeitos no banco, ordem, arredondamento, limites e efeitos colaterais.
4. Identifique os casos ainda sem cobertura e proponha testes de caracterização para capturar o comportamento atual.
5. Execute a suíte relevante antes da refatoração e registre o comando e o resultado. Se a linha de base falhar, investigue e registre a falha antes de alterar a estrutura.

Use o framework e as fixtures existentes no projeto. Não introduza dependências para caracterização sem necessidade aprovada.

## Escreva a caracterização

- Prefira testes pequenos que documentem uma observação concreta do comportamento atual.
- Use expectativas explícitas e independentes, incluindo valores ou resultados inesperados que o código realmente produz.
- Nomeie o teste pelo comportamento observado, sem afirmar que esse comportamento é desejável.
- Não transforme uma hipótese sobre a intenção do autor em expectativa de teste sem confirmação.
- Mantenha a diferença entre “o sistema faz” e “o sistema deveria fazer” visível na descrição do teste ou no registro da decisão.

Exemplo: se uma função retorna `-1` para uma lista vazia, a caracterização registra `-1`. Ela não muda esse resultado para `0` durante uma refatoração só porque `0` parece mais intuitivo.

## Durante a refatoração

1. Proponha uma mudança estrutural pequena, com arquivos e efeitos previstos.
2. Preserve os testes de caracterização e os contratos existentes.
3. Refatore uma parte por vez e compare o diff com o comportamento registrado.
4. Rode os testes relevantes após cada unidade segura de mudança.
5. Se um teste falhar, investigue a diferença. Não altere o teste para fazer a refatoração passar.

Se a explicação do código atual estiver errada ou surgir um comportamento não compreendido, pare a reescrita e esclareça antes de continuar.

## Quando o comportamento precisa mudar

Trate a mudança como uma tarefa separada. Descreva o comportamento atual, o comportamento desejado, o impacto em contratos e dados e a cobertura necessária. Obtenha a decisão humana antes de alterar testes de caracterização ou implementação. Registre a decisão onde o projeto mantém seus contratos ou ADRs.

## Depois da refatoração

- Execute a mesma suíte usada como linha de base e registre os comandos e resultados.
- Revise se os testes continuaram expressando o comportamento observado ou se foram alterados; qualquer alteração precisa de justificativa e decisão explícita.
- Compare interfaces públicas, respostas, efeitos persistentes e casos de erro antes/depois.
- Relate o que foi preservado, o que não foi verificado e qualquer comportamento estranho que ainda precise de uma decisão de produto.

Uma refatoração só pode ser considerada preservadora de comportamento para os casos que têm evidência. Testes de caracterização não substituem análise de risco nem garantem equivalência completa.
