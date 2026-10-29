# SDLC do Ampara

Este diretório documenta como o Ampara será desenhado, construído, testado, implantado e operado. Segurança é um requisito de cada etapa, não uma tarefa para o final do projeto.

## Documentos

- [Requisitos do projeto](../specs/development-project.md): escopo e exigências do programa; esta é a fonte do que o projeto deve entregar.
- [Arquitetura e ciclo de entrega](architecture-and-delivery.md): componentes, fronteiras, estrutura do repositório, fluxo de dados, Jenkins, Terraform, testes e roadmap incremental.
- [Segurança](security.md): modelo inicial de ameaças, controles obrigatórios, verificações no pipeline e critérios mínimos para cada entrega.
- [Papéis de agentes Codex](agent-roles.md): responsabilidades sugeridas, limites de atuação, entregas e como transformar os papéis em agentes customizados.
- [Marcos e progresso](milestones.md): registro datado do que foi concluído e critérios do próximo marco.

## Princípios de trabalho

1. Entregar fatias pequenas e demonstráveis, mantendo os testes como especificação do comportamento.
2. Separar interface, API, persistência e predição por responsabilidade; não criar serviços distribuídos sem uma necessidade concreta.
3. Projetar para falhas: leituras inválidas, perda de conectividade, indisponibilidade de dependências e recuperação de backup.
4. Aplicar menor privilégio, coletar o mínimo de dados necessário e manter segredos fora do código e do Git.
5. Toda mudança de aplicação, modelo ou infraestrutura passa por revisão e verificações automatizadas adequadas ao risco.

## Como usar este plano

O roadmap define a sequência de aprendizado, não exige implementar tudo de uma vez. Em cada marco, escolha uma entrega pequena, documente a decisão, escreva os testes do comportamento esperado e só então implemente. Os controles de segurança mínimos daquele marco são parte dos critérios de conclusão.
