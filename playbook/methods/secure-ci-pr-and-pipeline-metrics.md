# CI seguro, revisão de PR e métricas de entrega

**Estado:** rascunho em piloto.

## Objetivo e escopo

Este método ajuda uma equipe a impedir que uma mudança sem revisão ou com riscos conhecidos chegue à branch principal, sem transformar cada alerta de ferramenta em bloqueio automático. Ele combina proteção de branch, análise estática, revisão de dependências, tratamento de falsos positivos, apoio de IA na revisão e acompanhamento do próprio pipeline.

Adapte ferramentas, severidades e exigências ao risco do produto. Uma configuração de exemplo não substitui a política de segurança do projeto nem a confirmação de que os recursos estão disponíveis no serviço escolhido.

## 1. Proteja a branch principal

Configure a branch principal para exigir:

- pull request antes do merge e aprovação humana independente do autor;
- checks obrigatórios com nomes estáveis, correspondentes aos jobs da CI;
- branch atualizada com a principal antes do merge, quando a equipe conseguir manter esse fluxo;
- proibição de force-push e exclusão acidental;
- aplicação da regra a administradores, sem bypass implícito.

Se uma emergência exigir exceção, registre quem autorizou, quando ocorreu, por que era necessária, quais checks foram ignorados e qual acompanhamento ficou pendente. Revise o registro depois da emergência. Não use uma exceção para contornar uma falha rotineira.

Depois de renomear ou reorganizar jobs, atualize os checks obrigatórios e confirme-os em uma pull request. Um nome removido ou alterado pode deixar todas as mudanças bloqueadas ou, inversamente, deixar um gate sem exigência.

## 2. Use gates de segurança graduais

Execute análise estática e revisão de dependências em pull requests. Dê a cada job permissões mínimas e um nome estável. Fixe versões de actions, imagens e ferramentas quando isso for viável e mantenha um processo de atualização.

Comece bloqueando achados de alta ou crítica severidade e deixe os níveis inferiores visíveis para triagem. Não configure o primeiro gate para falhar por qualquer aviso. Registre o mapeamento entre as severidades da ferramenta e a política do projeto: classificações de ferramentas diferentes não são necessariamente equivalentes a CVSS.

Semgrep `p/default` é um exemplo de conjunto de regras. Ajuste o limite de falha à severidade fornecida pelas regras e conserve a saída completa para análise. A configuração pode mudar; valide opções e comportamento na documentação oficial da versão adotada.

Separe estes controles, que cumprem funções diferentes:

- análise estática examina padrões no código;
- revisão de dependências avalia vulnerabilidades introduzidas por mudanças em dependências;
- alertas de vulnerabilidades identificam problemas conhecidos nas dependências já detectadas;
- atualizações automáticas propõem versões corrigidas ou mais recentes.

No GitHub, `dependabot.yml` configura ecossistemas e agenda de atualização; os alertas e as atualizações de segurança também dependem das configurações de segurança do repositório. Um manifesto ou arquivo de lock compatível melhora a visibilidade de dependências transitivas. Verifique a documentação atual da plataforma antes de configurar esses controles.

## 3. Trate falsos positivos localmente

Investigue cada achado bloqueante. Corrija a causa real sempre que possível. Se o uso for legítimo no contexto analisado, aplique uma exceção restrita ao ponto e à regra afetados, com uma justificativa próxima ao código e revisão humana no PR.

Não desative globalmente uma regra para resolver um único caso. Use a sintaxe específica da ferramenta: por exemplo, Semgrep reconhece comentários `nosemgrep` associados à regra. `nosec` pertence a outras ferramentas e não deve ser presumido como equivalente.

Registre a justificativa, a regra, o escopo e, quando útil, a condição que faria a exceção deixar de ser válida. Uma aceitação de risco não é um falso positivo; classifique-as separadamente.

Calcule por ferramenta:

> taxa de falsos positivos = achados revisados e classificados como falso positivo ÷ total de achados revisados × 100

Registre período, tamanho da amostra e os achados ainda sem triagem. Revise regras e configuração trimestralmente. Se mais de metade dos achados revisados for descartada como falso positivo, ajuste o conjunto de regras e verifique novamente sua utilidade. Não esconda a taxa removendo achados do denominador sem documentar a decisão.

## 4. Use IA como apoio, nunca como aprovação

Um assistente pode comentar problemas mecânicos, resumir o diff e verificar regras escritas do projeto. Ele não substitui a análise humana de objetivo, arquitetura, contratos, segurança e impacto operacional.

Se houver revisão automática por IA, configure-a para comentar ou sugerir mudanças. Não permita que o bot aprove a própria pull request nem conte sua aprovação como a aprovação humana obrigatória.

Um template de pull request deve pedir, no mínimo:

- resumo do resultado e arquivos ou contratos afetados;
- principais riscos da mudança;
- teste ou evidência que demonstra o comportamento;
- o que pode quebrar em produção e como verificar;
- exceções de scanner incluídas e justificativa;
- confirmação de que resumos e sugestões de IA correspondem ao diff.

## 5. Acompanhe o pipeline

Registre pelo menos estes indicadores:

| Indicador | Como medir | Sinal para investigar |
|---|---|---|
| Tempo médio do pipeline | Duração entre início e conclusão de execuções comparáveis; acompanhe também a espera em fila separadamente. | Mais de 10 minutos em pull requests pequenas. |
| Falhas causadas pelo pipeline | Execuções atribuídas a infraestrutura ou testes instáveis ÷ total de execuções no período. Registre a causa; uma falha de produto não é falha da infraestrutura. | Mais de 5%. |
| Tempo entre abertura e merge | Tempo entre a criação e o merge de pull requests mescladas; acompanhe a tendência por período, não um PR isolado. | Crescimento sustentado ao longo de semanas. |
| Bypasses de proteção | Contagem e registro das exceções ou overrides da proteção no período. | Qualquer bypass sem responsável, motivo e acompanhamento registrados. |

Informe período, quantidade de execuções ou PRs e dados sem amostra. Não declare taxa zero quando não há observações suficientes. Use a plataforma de CI para duração, o histórico de pull requests para lead time e o audit log disponível para overrides. Se a plataforma não fornecer o histórico de bypasses, mantenha um registro operacional explícito e declare essa limitação.

Colete os valores em uma cadência regular e revise-os ao menos mensalmente. Se a média crescer, investigue cache, fila e paralelismo; se houver falhas instáveis, corrija fixtures e dependências; se o lead time subir, examine disponibilidade e fluxo de revisão. Uma métrica sinaliza onde investigar, mas não identifica sozinha a causa.

## 6. Exercício integrado: pipeline para uma API

Use uma API existente como base. O objetivo é demonstrar que um teste de borda detecta uma regressão e que a proteção da branch impede que ela seja integrada.

1. Escolha uma função pequena de regra de negócio e registre seu comportamento esperado e seus limites.
2. Escreva pelo menos cinco testes unitários pelo ciclo **RED, GREEN, REFACTOR**. Inclua os nomes dos casos e os limites cobertos. Se usar IA para rascunhar testes, confira de forma independente os dados e resultados esperados.
3. Adicione um teste de integração contra PostgreSQL real, usando dados sintéticos e um banco isolado.
4. Configure um workflow com lint, testes unitários, integração PostgreSQL, análise de segurança e cache de dependências. Dê nomes estáveis aos quatro checks que devem bloquear o merge e torne-os obrigatórios na proteção da branch principal.
5. Em uma branch de exercício isolada, altere a regra para violar um dos casos de borda. Abra uma PR e confirme que o job falha, que o log mostra o teste e a mensagem esperada e que a proteção impede o merge. Nunca integre essa versão defeituosa.
6. Corrija a regra na mesma PR ou em uma nova e confirme que os quatro checks passam. Verifique 100% de cobertura de ramos para a função escolhida, além do teste PostgreSQL.

O estudante escreve a descrição da PR de teste sem delegá-la à IA. Ela deve citar o caso de borda violado, explicar por que o gate bloqueou a mudança e resumir como a correção evita a regressão. Um assistente pode revisar clareza e consistência depois, mas não deve escrever essa evidência em nome do estudante nem aprovar a PR.

Guarde como evidências os casos de teste, o relatório de cobertura de ramos, a execução vermelha com a mensagem de falha, a execução verde após a correção e a descrição escrita pelo estudante. Use branch ou fork descartável e não altere `main` para demonstrar a falha.

## Evidências e limites

Ao adotar este método, registre as regras ativas, os nomes dos checks obrigatórios, os limites de severidade, as exceções revisadas e a linha de base das métricas. Não declare um gate ativo apenas porque o workflow existe: confirme que a proteção exige seu resultado. Não interprete ausência de alertas, de bypasses ou de falsos positivos como prova de ausência de risco.
