# Marcos e progresso do Ampara

Este registro acompanha entregas demonstráveis. Um marco só é considerado concluído quando seus critérios de saída estão atendidos; planejamento documentado não conta como implementação executável.

## 2026-10-28 — Marco 0: preparação do projeto

**Status: concluído como etapa de planejamento.** O projeto está pronto para iniciar a primeira fatia de domínio, mas ainda não concluiu o Sprint 1 de implementação.

### O que foi feito

- Consolidado o escopo do programa e separado dos detalhes de arquitetura: `specs/` descreve requisitos; `sdlc/` descreve como construir, entregar e operar.
- Definida uma arquitetura-alvo incremental para coletor Python/ELM327, FastAPI, PostgreSQL, módulo Python de predição, painel React/TypeScript, Terraform e Jenkins.
- Registrados requisitos de segurança desde o desenho, incluindo interação somente de leitura com o veículo, proteção de credenciais, autorização por veículo e revisão de infraestrutura.
- Definida paridade entre staging e produção: mesmos componentes, funcionalidades, versões e imagem imutável; endpoints, credenciais, dados e capacidade isolados por ambiente.
- Definidos sete papéis de agentes Codex em `.codex/agents/`, com limites específicos de segurança e escopo.
- Criado `.gitignore` para dependências, ambientes locais, segredos e estado Terraform; as regras foram verificadas com `git check-ignore`.
- Removida a especificação arquitetural duplicada/desatualizada; `specs/development-project.md` agora mantém somente os requisitos do projeto e aponta para o SDLC.

### O que este marco não entregou

- Não há ainda implementação Python do domínio de telemetria, coletor, API, painel ou infraestrutura.
- Não há testes Python da telemetria no repositório; a configuração Jest/TypeScript existente está sem arquivos de aplicação ou testes associados.
- Docker, Terraform e Jenkins foram planejados, mas ainda não executados.

### Critério de saída do Marco 0

Escopo do curso registrado, arquitetura e segurança documentadas, sequência incremental definida, papéis de agentes configurados e arquivos locais sensíveis/gerados cobertos pelo `.gitignore`. Esses itens estão atendidos; por isso, o Marco 0 pode ser encerrado sem afirmar que o produto está implementado.

## Próximo: Sprint 1 — contrato de telemetria e domínio Python

### Objetivo

Transformar uma leitura simulada em um evento de telemetria normalizado e testar as regras sem depender do carro, do adaptador ou da nuvem.

### Primeiro micro-passo

Definir o contrato mínimo de uma leitura e os resultados esperados para entradas válidas e inválidas. Antes de escrever a lógica, decidir e registrar pelo menos:

- campos obrigatórios: identificador pseudônimo do veículo, instante da leitura, PID, valor e unidade;
- formato de timestamp e unidades canônicas;
- comportamento para PID desconhecido, unidade incompatível, valor fora do intervalo e leitura incompleta;
- se uma leitura inválida rejeita somente aquela leitura ou todo o lote.

**Retomar na próxima sessão com esta decisão:** se um lote contiver nove leituras válidas e uma inválida, aceitar as nove válidas e rejeitar somente a inválida, ou rejeitar o lote inteiro? Depois da decisão, transformar o comportamento em casos de teste antes de implementar a lógica.

### Critérios de saída do Sprint 1

- contrato da leitura documentado e exemplos sintéticos disponíveis;
- testes unitários descrevem casos válidos, inválidos e limites;
- implementação Python normaliza os casos válidos e rejeita os inválidos conforme o contrato;
- testes passam usando dados simulados, sem acesso a veículo real;
- nenhuma etapa de Docker, cloud ou CI/CD é necessária para declarar este Sprint concluído.

Depois desse marco, a próxima etapa será adicionar API e PostgreSQL com Compose e testes de integração, seguindo o roadmap em `architecture-and-delivery.md`.
