# Governança, débito técnico e responsabilidade de engenharia

## Objetivo

Definir controles simples para que o uso de assistentes de IA aumente a velocidade de trabalho sem reduzir a capacidade da equipe de entender, revisar e manter o software.

Este método é geral. Cada projeto deve adaptar seus controles ao risco, às regras de segurança, à privacidade e às obrigações legais aplicáveis.

## Práticas obrigatórias

### Revisão humana antes da produção

Toda alteração de código gerada ou modificada com auxílio de IA deve passar por revisão humana antes de ser integrada ou publicada em produção. A pessoa responsável pela aprovação precisa entender a mudança, verificar seu comportamento e avaliar seus efeitos sobre contratos, arquitetura, segurança e manutenção.

Uma aprovação automática, uma resposta do assistente ou testes passando não substituem essa revisão.

### Responsabilidade pelos testes

A pessoa que mantém ou aprova a mudança é responsável por escrever ou auditar os testes relevantes. Os testes devem verificar comportamento observável e casos de borda derivados do contrato. Não se deve aceitar um teste apenas porque foi gerado junto com a implementação: seus dados e resultados esperados precisam ser conferidos de forma independente.

### Política para dados enviados a assistentes

Cada projeto deve registrar uma política simples indicando quais informações podem ser enviadas a cada assistente aprovado e quais devem ser removidas, mascaradas ou mantidas fora dele. A política deve considerar, conforme o contexto, credenciais e segredos, dados pessoais, dados de clientes, código confidencial e obrigações contratuais ou regulatórias.

Na ausência de autorização explícita para uma categoria de dado, não a envie. Use exemplos sintéticos ou versões minimizadas quando forem suficientes para a tarefa. Revise o conteúdo antes de colá-lo ou anexá-lo ao assistente.

## Responsabilidade de engenharia

O assistente pode ajudar a explorar alternativas e produzir rascunhos, mas a equipe continua responsável por decidir:

- o que construir e o que deixar fora do escopo;
- como dividir e integrar o sistema;
- quais riscos aceitar e quais controles exigir;
- se uma sugestão está correta e adequada ao projeto;
- quando rejeitar uma funcionalidade ou uma mudança proposta.

Velocidade de escrita não é evidência de qualidade. Se uma alteração não puder ser explicada e mantida por pessoas responsáveis pelo projeto, ela não está pronta para seguir adiante.

## Evidências no fluxo de trabalho

Para cada mudança assistida por IA, o fluxo de revisão deve permitir identificar:

- quem revisou e aprovou a mudança;
- quais verificações e testes relevantes foram executados;
- limitações ou riscos conhecidos que exigem acompanhamento;
- se a mudança respeitou a política de dados do projeto.

O projeto pode registrar essas evidências na pull request, no board ou no mecanismo de revisão que já utiliza. Não é necessário criar um processo separado se o fluxo existente já fornece esse registro.

## Limites

Este método não define sozinho requisitos legais, classificação de dados, níveis de aprovação ou ferramentas autorizadas. Cada projeto deve documentá-los conforme suas políticas e seu contexto. A revisão humana continua necessária mesmo quando o assistente e a suíte de testes indicam que a alteração está correta.
