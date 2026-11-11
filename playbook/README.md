# Playbook de engenharia assistida por IA

**Estado:** rascunho em piloto no Ampara. Ainda não é uma versão pronta para adoção em outros projetos.

## Propósito

Registrar métodos de desenvolvimento e boas práticas que possam ser reaplicados em outros repositórios. O playbook orienta o processo de trabalho; não substitui os requisitos, a arquitetura, os controles de segurança ou os testes de cada produto.

## Como será organizado

- **Métodos gerais:** ciclos de trabalho com IA, testes e casos de borda, refatoração com testes de caracterização, governança de engenharia e entrega segura com revisão de PR e métricas de pipeline.
- **Adaptações por projeto:** stack, comandos, arquitetura, domínio, riscos, critérios de aceite e perfis de agentes específicos.
- **Templates:** boards, checkpoints, critérios de aceite e registros de decisão que ajudem a aplicar os métodos sem copiar regras de outro domínio.

Os métodos gerais devem permanecer independentes do Ampara. Exemplos, comandos e limites próprios do Ampara pertencem às adaptações do projeto.

## Piloto Ampara

O Ampara é o primeiro projeto a aplicar e revisar esses métodos. Durante o piloto, registrar o que funcionou, ambiguidades encontradas, esforço de adoção e mudanças necessárias. Manter as decisões de produto do Ampara em `sdlc/`, sem transformá-las em regras universais do playbook.

## Critérios para uma versão reutilizável

O playbook estará pronto para uma primeira versão reutilizável quando:

- os métodos gerais estiverem separados das instruções específicas do Ampara;
- cada método indicar contexto, passos, evidências esperadas e limites de uso;
- templates e perfis puderem ser adaptados sem exigir FastAPI, telemetria veicular ou a arquitetura deste projeto;
- o piloto tiver sido concluído com evidências e lacunas registradas;
- outro repositório conseguir adotar a base sem herdar regras de domínio do Ampara.

## Próximos passos

1. Extrair para `playbook/` os métodos já aprovados em `AGENTS.md`.
2. Separar os exemplos e comandos de `pytest` como adaptação Python, sem torná-los requisitos de todos os projetos.
3. Aplicar os métodos nas próximas etapas do Ampara e registrar resultados no board do projeto.
4. Preparar e revisar uma versão prévia somente depois de reunir evidências do piloto.

## Métodos disponíveis

- [Ciclo de trabalho assistido por IA](methods/ai-work-cycle.md)
- [Testes e casos de borda](methods/testing-and-edge-cases.md)
- [Refatoração com testes de caracterização](methods/characterization-refactoring.md)
- [Governança e responsabilidade de engenharia](methods/governance-and-engineering-ownership.md)
- [CI seguro, revisão de PR e métricas de entrega](methods/secure-ci-pr-and-pipeline-metrics.md)
