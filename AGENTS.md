# Instruções de colaboração

## Trabalho passo a passo com o usuário

- Faça uma ação por vez e explique a próxima antes de executá-la.
- Revisar não significa autorização para editar.
- Antes de editar arquivos, apresente quais arquivos pretende alterar e o que mudará; aguarde aprovação explícita.
- Depois de cada ação aprovada, mostre o resultado e pergunte qual é a próxima.
- Delegue a subagentes sem pedido explícito do usuário de acordo com a necessidade do fluxo de desenvenvolmente no arquivo contigo em [text](.codex/agents)
- Siga `sdlc/architecture-and-delivery.md` e consulte os documentos relacionados antes de propor mudanças.
- Seja direto e conciso, mas não omita detalhes importantes.

## Ciclo de trabalho com IA

- **Contexto antes do rascunho:** leia as instruções aplicáveis, a arquitetura, os contratos/interfaces, as entidades e os testes existentes relacionados à tarefa. Consulte os perfis em `.codex/agents` quando delegar.
- **Uma mudança focada:** proponha uma única unidade de trabalho. Antes de editar, informe os arquivos afetados, o que mudará, o comportamento esperado e os riscos ou limites relevantes; aguarde aprovação explícita.
- **Revisão crítica:** depois da implementação, leia o diff completo e compare-o com os critérios de aceite, contratos, padrões do projeto e testes existentes. Explique o propósito de cada mudança; não mantenha código cuja finalidade não possa ser explicada.
- **Verificação:** após mudanças de código, execute os testes existentes mais relevantes como parte da validação autorizada. Não adicione nem amplie testes sem propor isso antes. Informe o comando e o resultado observado; se não executar a validação, declare o que permanece sem verificar.
- **Board e evidências:** mantenha o board da etapa atualizado após cada tarefa, com estado, evidência e próximo passo. Não marque uma etapa como concluída sem cumprir os critérios de aceite e obter a revisão do usuário.
- **Subagentes:** use os perfis apropriados de `.codex/agents` conforme a necessidade. O agente principal continua responsável por revisar o resultado e manter o contexto do projeto.

## Boas práticas e evolução do playbook

- Quando o trabalho revelar uma boa prática de engenharia de software que seja bem explicada, verificável e reaplicável em outros projetos, incorpore-a ao método correspondente em `playbook/methods/` ou crie um método quando não houver um adequado.
- Escreva a prática como um método: contexto e objetivo, passos aplicáveis, evidências esperadas, limites e riscos. Diferencie princípios gerais de exemplos que dependam de ferramenta, linguagem ou plataforma; verifique a documentação primária quando os detalhes puderem mudar.
- Atualize `playbook/README.md` quando criar um método ou alterar sua organização.
- Mantenha decisões e requisitos exclusivos do Ampara em `sdlc/` ou na documentação do projeto. O playbook pode apontar para esses exemplos, mas não deve transformá-los em regras universais.
- Inclua a evolução do playbook no escopo aprovado da tarefa. Antes de editar, apresente os arquivos e o conteúdo pretendido e aguarde aprovação explícita, conforme o ciclo de trabalho acima.

## Testes e casos de borda

- **Parta do projeto:** antes de propor testes, leia a implementação, o contrato, os fixtures e os testes existentes. Use o `pytest` e o `TestClient` já adotados; não introduza outro framework ou dependência sem necessidade aprovada.
- **Teste comportamento:** prefira nomes que expressem o resultado esperado e organize cada caso em Arrange, Act, Assert quando isso combinar com o padrão existente. Verifique efeitos observáveis, sem acoplar o teste a detalhes internos desnecessários.
- **Derive os limites do contrato:** cubra, quando aplicável, mínimo, zero, máximo, valores logo fora dos limites, entrada nula ou malformada, duplicatas, autorização e falhas relevantes. Não invente regras de domínio para preencher casos.
- **Use expectativas independentes:** valores esperados devem ser conferidos independentemente; não calcule o `expected` reutilizando a mesma fórmula ou lógica da função testada.
- **Faça revisão de mutação quando planejada:** para avaliar se testes protegem uma regra importante, proponha uma alteração temporária e isolada (por exemplo, trocar `<` por `<=`), execute o teste focado e confirme que ele falha. Faça isso em cópia descartável ou worktree isolada, nunca deixe a mutação no workspace compartilhado e relate o resultado. Se não houver isolamento seguro, não faça a mutação; explique a limitação.
- **Controle o escopo:** proponha a adição ou ampliação de testes antes de implementá-la. Rode os testes relevantes como parte da validação autorizada e informe os comandos e resultados; nunca afirme que passaram sem executá-los.
