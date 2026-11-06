# Como desenvolver o Ampara

Este diretório descreve um processo incremental para transformar o Ampara em um projeto Full Cycle. A regra de trabalho é simples: primeiro entregar um fluxo útil, confiável e verificável; depois acrescentar arquitetura, desempenho e operação conforme os critérios do curso.

## Fonte de verdade de cada assunto

- [`specs/development-project.md`](../specs/development-project.md): requisitos do curso, níveis, prazos e materiais de entrega.
- [`architecture-and-delivery.md`](architecture-and-delivery.md): fluxo funcional, arquitetura escolhida e desenho do pipeline.
- [`milestones.md`](milestones.md): ordem de execução, critérios de aceite e estado atual.
- [`security.md`](security.md): requisitos e verificações de segurança aplicáveis a cada etapa.
- [`agent-roles.md`](agent-roles.md): referência opcional para dividir trabalho entre agentes; não é requisito do produto.

Cada requisito deve ter uma fonte principal. Os outros documentos devem apontar para ela, sem copiar a mesma lista.

## Fluxo de desenvolvimento

Para cada fatia:

1. Descrever o problema e quem se beneficia.
2. Definir uma entrada, uma saída e critérios observáveis de aceite.
3. Registrar apenas as decisões que limitam a implementação, em um ADR quando houver alternativas relevantes.
4. Criar ou atualizar testes que expressem os critérios, incluindo pelo menos um caso inválido relevante.
5. Implementar a menor mudança que completa o fluxo.
6. Executar os comandos de validação documentados e corrigir falhas antes de começar outra fatia.
7. Revisar segurança, documentação e impacto operacional proporcionais à mudança.
8. Mostrar o resultado e registrar o que foi concluído, o que ficou pendente e a próxima decisão.

Uma fatia só está pronta quando funciona em ambiente reproduzível, passa nos testes pertinentes, tem instruções atualizadas e não introduz segredo no Git. Planejamento, diagramas e código sem execução demonstrável não contam como fluxo concluído.

## Princípios

- Começar pelo menor fluxo vertical que resolve uma necessidade real.
- Preferir um monólito modular; só separar processos ou serviços quando houver motivo medido ou requisito explícito.
- Manter os mesmos comandos de validação disponíveis localmente e no pipeline.
- Tratar dados de teste como sintéticos, segredos fora do repositório e segurança como parte dos critérios desde a primeira fatia.
- Não adicionar Terraform, Grafana, filas, cache, frontend ou modelos ao caminho crítico antes de a fatia funcional estar confiável.
