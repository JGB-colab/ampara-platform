# Ciclo de trabalho assistido por IA

**Estado:** rascunho em piloto no Ampara.

## Objetivo e escopo

Este método organiza uma mudança de software assistida por IA para que o resultado seja compreensível, revisável e verificável. A IA acelera a análise e a produção de rascunhos; a pessoa responsável pelo projeto mantém as decisões e a aprovação final.

O método orienta o processo. A arquitetura, as regras de domínio, as ferramentas e os critérios de aceite continuam sendo definidos pelo projeto que o adota.

## Contexto antes de propor uma mudança

Antes de sugerir código ou documentação:

1. Leia as instruções aplicáveis e identifique a fonte de verdade para a tarefa.
2. Inspecione as interfaces, entidades, implementações e testes existentes que serão afetados.
3. Consulte arquitetura, segurança e decisões registradas quando forem relevantes.
4. Separe fatos confirmados, suposições e decisões que precisam da pessoa responsável.
5. Identifique efeitos observáveis, riscos e limites do escopo.

Não trate uma descrição gerada anteriormente como especificação confirmada sem conferir sua fonte.

## Ciclo

### 1. Definir o resultado esperado

Descreva o problema em termos observáveis. Defina critérios de aceite suficientes para distinguir uma mudança concluída de uma incompleta. Mantenha o escopo em uma unidade pequena e coerente.

### 2. Propor antes de editar

Informe os arquivos que serão alterados, o conteúdo ou comportamento pretendido, os riscos relevantes e como o resultado será revisado. Aguarde aprovação explícita antes de editar.

Revisar uma proposta não significa aprovar sua implementação.

### 3. Implementar um rascunho focado

Faça somente a mudança aprovada. Reuse padrões e componentes existentes. Não amplie o escopo, introduza dependências ou altere comportamento por conveniência sem propor essa decisão primeiro.

### 4. Revisar criticamente

Leia o diff completo e compare-o com os critérios de aceite, contratos, testes e padrões do projeto. Verifique a complexidade, os limites, o tratamento de erros e os efeitos em dados e interfaces.

Explique o propósito de cada parte mantida. Se a finalidade ou o comportamento de um trecho não estiver claro, pare e esclareça antes de considerá-lo pronto.

### 5. Verificar

Execute os testes existentes mais relevantes como parte da validação autorizada. Use valores esperados independentes da implementação e verifique comportamentos observáveis. Não altere testes falhos apenas para fazê-los passar; investigue a causa e trate uma mudança de contrato como decisão separada.

Registre o comando executado e o resultado observado. Se uma validação não for executada, declare o que permanece sem confirmação. Uma revisão estática não equivale a um teste executado.

### 6. Entregar e manter o contexto

Informe o que mudou, por que mudou, quais arquivos foram afetados, quais verificações foram executadas e o que ficou pendente. Atualize o board com estado, evidência e próximo passo. Não marque uma etapa como concluída antes de cumprir seus critérios de aceite e obter a revisão humana prevista.

## Delegação

Delegue quando uma tarefa puder avançar de forma independente e o perfil disponível for adequado. Dê ao subagente um objetivo, contexto, critérios de aceite, propriedade dos arquivos e formato de retorno claros. O agente principal revisa e integra o resultado; a delegação não transfere a decisão de produto nem a aprovação final.

## Regras de decisão

- A pessoa responsável decide mudanças de comportamento, contrato, dados e prioridades.
- A IA pode apontar opções e riscos, mas não aprova a própria implementação.
- Se requisitos, código, testes ou documentos discordarem, registre a divergência e peça uma decisão antes de alterar o comportamento.
- Uma alteração que muda o comportamento esperado deve ser tratada como mudança de requisito, não escondida como refatoração.
