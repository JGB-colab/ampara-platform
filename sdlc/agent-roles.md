# Papéis de agentes Codex para o Ampara

## Objetivo

Usar subagentes como especialistas auxiliares para tarefas delimitadas, mantendo o usuário como responsável pelas decisões e o agente principal como coordenador e integrador. Estes papéis são propostas para você revisar e completar; não são uma obrigação de usar vários agentes em toda tarefa.

Subagentes ajudam quando o trabalho pode ser dividido em frentes independentes, como revisar módulos diferentes ou fazer uma auditoria paralela. Para tarefas curtas, sequenciais ou que alterem os mesmos arquivos, a coordenação custa mais do que ajuda. A documentação do Codex recomenda tarefas independentes, com pergunta e resultado esperado claros, e coordenação quando agentes possam editar os mesmos arquivos. ([Subagents no Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents))

## Matriz de papéis

| Papel | Responsabilidade principal | Entregas esperadas | Limites iniciais |
|---|---|---|---|
| **Coordenador / Arquiteto** | Traduzir o pedido em escopo pequeno, identificar dependências, decidir se delegar e integrar resultados | Plano curto, critérios de aceite, arquivos responsáveis por cada frente e resumo final para o usuário | Não delegar decisão de produto nem aprovação final; evitar múltiplos agentes editando o mesmo arquivo |
| **Backend** | API FastAPI, domínio, autenticação/autorização, persistência e contrato OpenAPI | Mudança proposta/implementada, testes unitários e de integração, riscos e comandos de verificação | Não modificar frontend ou Terraform sem escopo explícito; respeitar os testes como especificação |
| **Frontend** | React + TypeScript, acessibilidade e integração com a API | Componentes, estados de loading/erro/vazio, testes de componente e integração com contrato | Não duplicar regras de negócio nem acessar o banco diretamente; não colocar segredo no bundle |
| **Telemetria / Dispositivo** | Protocolo ELM327, parsing serial, catálogo de PIDs, normalização, sincronização offline | Contrato de leitura, adaptador simulado, testes para respostas inválidas/timeout/reenvio e limitações do hardware | Somente leitura no veículo; nunca criar ou executar comandos de atuação/escrita na ECU |
| **Dados / ML** | Qualidade de dados, preprocessing, baseline preditiva, avaliação e versionamento de modelo | Dataset/fixture seguro, métricas, testes de preprocessing e previsão, versão e limitações do modelo | Não promover modelo só por métrica agregada; não apresentar saída experimental como diagnóstico veicular |
| **Infraestrutura / DevOps** | Docker, Terraform, Jenkins, ambientes, deploy, observabilidade e recuperação | Plano Terraform, pipeline Jenkins, configuração reproduzível, smoke checks e plano de rollback | Não aplicar infraestrutura de produção, alterar credenciais ou publicar releases sem autorização específica |
| **Segurança** | Revisão independente de ameaças, autenticação/autorização, dados, dependências, pipeline e IaC | Achados priorizados com evidência, impacto, caminho de correção e testes de regressão sugeridos | Começar em modo revisão; não enfraquecer controles, ocultar achados ou tratar scanner como aprovação suficiente |
| **QA / Testes** | Analisar critérios de aceite, cobertura por risco, casos negativos e regressões entre componentes | Matriz requisito→teste, cenários, lacunas de cobertura e resultados observados | Não alterar produção para fazer teste passar; não reescrever testes de comportamento sem decisão do usuário |

## Contrato comum para qualquer agente

Complete e aplique estas regras nas instruções específicas de cada perfil:

1. **Objetivo:** qual parte do produto e quais tipos de tarefa o agente atende?
2. **Contexto obrigatório:** quais arquivos de `sdlc/` e do código deve ler antes de propor mudanças?
3. **Escopo:** quais diretórios pode alterar e quais são explicitamente fora do escopo?
4. **Segurança:** quais dados/segredos não pode expor e quais controles deve revisar sempre?
5. **Qualidade:** quais testes, linters, scanners e verificações precisa executar para a tarefa?
6. **Entrega:** devolver resumo, arquivos tocados, decisões/assunções, evidências e riscos em aberto.
7. **Autonomia:** não fazer deploy, aplicar Terraform remoto, modificar credenciais, publicar pacote, apagar dados ou realizar ações externas sem autorização explícita.
8. **Conflitos:** se a especificação, os testes ou instruções discordarem, parar a implementação e explicar a divergência ao coordenador.

## Protocolo de delegação

1. O coordenador lê o pedido e identifica objetivo, aceite, riscos e instruções do repositório.
2. Delegar somente partes que possam avançar independentemente; cada tarefa recebe pergunta clara, arquivos de referência e formato de retorno.
3. Definir propriedade de arquivos antes de permitir edição. Para revisão de segurança e QA, preferir revisão somente leitura em paralelo com implementação.
4. O coordenador integra o resultado, resolve conflitos e executa a verificação apropriada do conjunto.
5. O usuário recebe a síntese, os arquivos alterados, as verificações executadas e decisões que ainda exigem sua escolha.

Uma divisão exemplo para uma feature de ingestão seria: Backend implementa a rota e regras; QA propõe casos de teste de autorização e payload; Segurança revisa o desenho e diff; Telemetria revisa o contrato dos PIDs. Infraestrutura só entra se a feature exigir alteração de execução ou recursos. Não chamar todos os perfis por padrão.

## Como isso se traduz para Codex

Há duas camadas distintas:

- **Instruções do repositório:** `AGENTS.md` informa ao Codex as regras e contexto que deve aplicar ao trabalhar no projeto. Codex descobre esse arquivo por convenção; arquivos com outros nomes, como `.ai`, não são automaticamente instruções de projeto a menos que sejam configurados como nomes alternativos. ([Instruções AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md))
- **Agentes customizados:** a documentação atual do Codex descreve um arquivo TOML independente por agente em `.codex/agents/` para agentes do projeto. Cada arquivo define ao menos `name`, `description` e `developer_instructions`. As instruções abaixo podem ser completadas primeiro neste documento e depois copiadas para esses arquivos. ([Subagents e agentes customizados](https://learn.chatgpt.com/docs/agent-configuration/subagents))

Os perfis iniciais deste projeto estão definidos nestes arquivos:

```text
.codex/
└── agents/
    ├── backend.toml
    ├── frontend.toml
    ├── telemetry.toml
    ├── data-ml.toml
    ├── infrastructure.toml
    ├── security.toml
    └── qa.toml
```

Os TOML de agentes configuram comportamento e instruções; não substituem testes, controles de acesso do ambiente ou revisão humana. Não definir um agente com poderes mais amplos que a tarefa exige. As permissões disponíveis e o uso de ferramentas dependem da configuração ativa do Codex e do ambiente.

## Campos para você completar

Para cada papel, acrescente quando estiver pronto:

- dono humano/revisor;
- pastas concretas de leitura e escrita;
- modelo/esforço de raciocínio, se necessário;
- ferramentas permitidas e desabilitadas;
- critérios para delegar ou chamar o agente;
- comandos de validação que são padrão no projeto;
- critérios de recusa/escala para segurança, hardware, produção e dados sensíveis.
