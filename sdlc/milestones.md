# Etapas e estado do projeto

Este é o plano de execução e a fonte de verdade do progresso. Os critérios do curso estão em [`specs/development-project.md`](../specs/development-project.md); a arquitetura e o ciclo técnico estão em [`architecture-and-delivery.md`](architecture-and-delivery.md); os controles de segurança estão em [`security.md`](security.md).

## Estado atual

**Preparação concluída; produto ainda não implementado neste workspace.** Há documentos de arquitetura e segurança e uma configuração Jest sem código ou testes de produto. Não há, neste workspace, API funcional, testes do domínio, ambiente Compose, pipeline, Terraform ou dashboards Grafana. Documento não substitui evidência executável.

O desenvolvimento começa pelo núcleo funcional que também atende ao nível B. Isso não fixa a classificação final: antes da entrega, declarar A somente se todas as evidências A aplicáveis estiverem completas e aceitas; caso contrário, declarar B e entregar o núcleo com qualidade. Depois do prazo, o mesmo projeto pode continuar evoluindo em direção ao A. Se um item avançado ameaçar funcionamento, testes ou CI, ele fica para depois.

## Decisões acordadas

- **Primeira fatia:** API e banco para ingestão, validação, persistência e consulta de telemetria sintética.
- **Interface:** não construir frontend na primeira etapa. Usar a documentação interativa do FastAPI para exercitar e demonstrar as rotas; reconsiderar uma tela depois que o fluxo funcional estiver concluído.
- **Nível da entrega:** começar pelo núcleo comum ao B e decidir a declaração A/B perto da entrega, conforme as evidências concluídas.
- **Stack proposta:** Python, FastAPI, Pydantic, PostgreSQL, SQLModel, Alembic, pytest e Docker Compose. A decisão de pipeline e o provedor Terraform seguem pendentes conforme `architecture-and-delivery.md`.

## Plano por etapas

### Etapa 0 — Fechar o recorte funcional

**Resultado:** uma história de usuário pequena, contrato de entrada/saída e critérios de aceite acordados antes da implementação.

**Recorte inicial proposto:** enviar uma leitura sintética do veículo, validar e persistir a leitura, e consultá-la pela API. Sem carro físico, painel, modelo preditivo, mensageria ou cloud nesta etapa.

**Aceite:**

- campos obrigatórios, unidades, timestamp, PIDs permitidos e respostas para dados inválidos estão documentados;
- política para duplicatas e para lote parcialmente inválido está decidida;
- OpenAPI descreve o mesmo contrato que os testes exercitam;
- critérios de segurança do fluxo (autorização, limites e dados sensíveis) estão registrados.

**Parada de controle:** revisar o contrato e os exemplos antes de iniciar implementação.

### Etapa 1 — Entregar a fatia funcional

**Resultado:** caminho executável de ponta a ponta usando dados sintéticos e uma dependência local reproduzível.

**Aceite:**

- uma leitura válida é aceita pela API e persiste no banco;
- a leitura persistida pode ser consultada pela API;
- payload malformado, PID não permitido e credencial ausente/inválida são rejeitados com resposta previsível;
- reenvio duplicado segue a política definida e não corrompe nem duplica o dado;
- testes de unidade cobrem regras e limites; testes de integração exercitam API e banco;
- uma pessoa consegue iniciar o serviço e executar o fluxo a partir do README.

**Fora do escopo:** conexão com carro real, usuário final, painel, worker, cache e previsão ML.

### Etapa 2 — Tornar a execução reproduzível e a qualidade contínua

**Resultado:** ambiente local simples e pipeline que bloqueia regressões.

**Aceite:**

- Docker Compose inicia aplicação e banco com configuração de exemplo, sem segredos versionados;
- health check confirma disponibilidade da aplicação e prontidão do banco;
- comandos de lint/format, testes e build são documentados e executáveis localmente;
- pipeline executa esses comandos em pull request e apresenta resultado verde;
- ao menos um teste negativo de segurança roda no pipeline;
- README explica subir, testar e parar o ambiente.

O critério para escolher a ferramenta canônica de CI está registrado em [`architecture-and-delivery.md`](architecture-and-delivery.md).

### Etapa 3 — Documentar e explicitar as fronteiras do nível A

**Resultado:** monólito modular simples, com fronteiras coerentes com o domínio, sem distribuir serviços.

**Aceite:**

- módulos têm responsabilidades e interfaces explícitas, e regras de domínio não dependem do framework HTTP;
- dependências entre módulos seguem uma direção documentada, sem ciclos;
- ADR explica a decisão arquitetural relevante e as alternativas consideradas;
- diagrama C4 de contexto e containers corresponde à implementação existente;
- testes protegem as regras nas fronteiras entre domínio, API e persistência.

**Regra:** só criar um módulo se ele representar uma capacidade ou regra de domínio; não criar camadas/pastas vazias para aparentar arquitetura.

### Etapa 4 — Medir antes de otimizar

**Resultado:** plano e medição reproduzível para o endpoint principal.

**Aceite:**

- `docs/desempenho.md` declara ambiente, dados, cenário, concorrência, duração e alvo de p95 antes do teste;
- gerador cria dados sintéticos reproduzíveis e adequados ao domínio;
- k6 executa três estágios definidos no plano, guarda resultados e permite repetir a execução;
- relatório separa observações medidas de hipóteses e registra gargalos;
- otimização só é feita para gargalo observado e é comparada com a medição inicial.

**Questão de avaliação:** confirmar com o professor se o volume de 100 mil pedidos do exemplo A é específico de marketplace ou se espera volume equivalente em outro domínio. Não assumir que telemetria substitui pedidos sem registrar a interpretação aceita.

### Etapa 5 — Adicionar observabilidade útil

**Resultado:** métricas e painéis ajudam a explicar o comportamento do fluxo e da carga.

**Aceite:**

- aplicação expõe métricas mínimas de requisições, erros e latência sem dados pessoais ou segredos;
- Prometheus coleta essas métricas e Grafana apresenta um dashboard versionado;
- dashboard permite relacionar a carga do k6 com taxa de erro e latência;
- instruções locais permitem iniciar e parar a stack de observabilidade;
- alerta inicial tem condição clara e não depende de alertas ruidosos sem ação definida.

Grafana entra depois de termos métricas reais para visualizar; não é critério para declarar o fluxo funcional.

### Etapa 6 — Provisionar infraestrutura com Terraform

**Resultado:** infraestrutura de um ambiente não produtivo descrita e validável como código. Esta etapa é uma evolução Full Cycle do projeto; não substitui os critérios específicos de nível A/B do projeto final.

**Aceite:**

- módulo tem uma responsabilidade, entradas/saídas documentadas e valores sem segredo;
- `terraform fmt`, `validate` e análise estática passam;
- plano é revisável e mostra recursos esperados;
- nenhuma aplicação automática em produção; estado e credenciais são protegidos;
- aplicação implantada usa a mesma imagem imutável validada pelo pipeline, se houver ambiente remoto autorizado e disponível.

Terraform só entra após definir runtime e ambiente-alvo. Não criar módulos de rede, banco e compute sem necessidade demonstrada para o deploy escolhido.

### Etapa 7 — Fechar a entrega

**Aceite:** nível na primeira linha do README; instruções reproduzíveis; CI verde; ADR, OpenAPI, desempenho, CONTRIBUTORS e declaração de uso de IA entregues; medições e imagens demonstráveis; segredos ausentes; histórico de contribuição identificável.

## Plano de uma semana

| Janela | Prioridade | Evidência ao final |
|---|---|---|
| Dia 1 | Etapa 0: contrato e critérios de aceite | Contrato revisado e testes de aceitação definidos |
| Dias 2–3 | Etapa 1: API, regra de domínio e persistência | Fluxo válido e casos inválidos funcionando localmente |
| Dia 4 | Etapa 2: Compose, integração e README | Ambiente recriável e testes reproduzíveis |
| Dia 5 | Pipeline e correção de falhas | Execução verde em pull request |
| Dia 6 | Etapa 3 mínima + preparar medição | ADR, C4 aderente ao código e plano de desempenho |
| Dia 7 | Etapa 4 e fechamento | k6 em três estágios, resultados registrados e buffer de correções |

Grafana e Terraform ficam no próximo ciclo, depois da entrega, a menos que as etapas anteriores terminem com margem e o ambiente esteja disponível. Não sacrificar funcionamento, testes ou CI para encaixá-los.

## Registro de progresso

Atualizar este arquivo ao concluir uma etapa, com data, evidência (commit, PR, CI ou relatório) e próximo passo. Marcar uma etapa como concluída somente quando todos os critérios de aceite correspondentes tiverem evidência executável. A próxima unidade de trabalho deve ser uma única fatia, com critérios revisados antes do código.
