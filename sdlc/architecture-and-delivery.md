# Arquitetura e ciclo de entrega do Ampara

## Objetivo

Construir uma plataforma de telemetria automotiva e manutenção preditiva que também demonstre engenharia Full Cycle: modelagem, implementação, testes, empacotamento, infraestrutura como código, CI/CD e operação. A arquitetura começa como um monólito modular e evolui somente quando volume, disponibilidade ou autonomia de deploy justificarem novas fronteiras.

## Arquitetura inicial

| Componente | Tecnologia inicial | Responsabilidade | Testes de aceitação técnica |
|---|---|---|---|
| Coletor veicular | Python e biblioteca serial compatível com ELM327 | Ler PIDs autorizados, validar/unificar valores, carimbar horário e manter fila local limitada durante perda de rede | Unidade: parsing, conversões, entradas inválidas e fila; integração com adaptador simulado |
| API de ingestão | Python com FastAPI | Autenticar o dispositivo, validar lotes, aplicar autorização por veículo, limitar requisições e persistir telemetria | Unidade: regras e validação; integração: HTTP, autenticação, autorização e banco |
| Persistência | PostgreSQL | Guardar contas/veículos, telemetria, previsões e metadados de modelo com integridade referencial | Integração: migrações, constraints, isolamento entre usuários e operações de leitura/escrita |
| Predição | Python com scikit-learn, inicialmente dentro do backend ou como worker do mesmo repositório | Versionar preprocessing/modelo, produzir previsões reproduzíveis e guardar a versão usada | Unidade: preprocessing e saídas de referência; integração: carregamento do artefato e pipeline de previsão |
| Painel web | React com TypeScript | Apresentar veículos, telemetria e previsões consumindo a API, sem conexão direta ao banco | Unidade/componente: estados e visualizações; integração: contrato API; ponta a ponta para fluxos críticos |
| Infraestrutura | Terraform com módulos próprios | Criar e configurar rede, runtime, banco e armazenamento nos ambientes remotos | `fmt`, `validate`, análise estática, plano revisável e testes de módulos quando aplicável |
| Entrega contínua | Jenkins Pipeline declarativo com `Jenkinsfile` no Git | Validar mudanças, construir artefatos e promover releases com gates | Pipeline: comprovar que verificações bloqueiam falhas e deploy de produção requer aprovação |

FastAPI publica um contrato OpenAPI que pode ser usado para gerar um cliente TypeScript, reduzindo divergência entre a API Python e o frontend. Os dados que chegam pela rede também precisam de validação em runtime; tipos TypeScript ajudam durante o desenvolvimento, mas não validam o payload recebido por si só.

## Fronteiras e fluxo de dados

```text
ELM327 → Coletor Python → HTTPS → API FastAPI → PostgreSQL
                                      ↑             ↓
                              React + TypeScript ← previsão
                                      ↑             ↑
                                API/consultas   módulo Python/worker
```

1. O coletor lê apenas PIDs necessários e permitidos. Para desenvolvimento e testes, oferece adaptador simulado para não depender do carro.
2. O coletor valida a leitura, adiciona identificador pseudônimo do veículo, horário e unidade canônica. Se offline, guarda uma fila local com tamanho e tempo de retenção limitados; reenvios usam identificador idempotente.
3. A API exige transporte HTTPS e identidade de dispositivo, valida tamanho/formato/intervalo das leituras, verifica que o dispositivo só pode enviar dados do veículo vinculado e grava em transação.
4. O banco conserva eventos e índices úteis. Uma fila em nuvem não faz parte do primeiro MVP; será considerada quando taxa, disponibilidade ou desacoplamento forem requisitos comprovados.
5. O módulo de predição consome dados persistidos e produz resultado com `model_version`, horário e referência aos dados usados. Uma previsão não deve ser apresentada como diagnóstico ou instrução de segurança veicular.
6. O painel consulta a API autenticada. Não acessa diretamente o banco nem contém segredos de backend no bundle do navegador.

## Estrutura do repositório

```text
.
├── sdlc/                         # Arquitetura, segurança, decisões e roadmap
├── src/
│   ├── collector/                # Coletor e adaptadores real/simulado
│   ├── backend/                   # API, domínio, persistência e predição
│   └── frontend/                 # React + TypeScript
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── component/
│   └── e2e/
├── deploy/
│   ├── compose.yaml               # Execução e dependências locais
│   └── terraform/
│       ├── modules/
│       │   ├── network/
│       │   ├── app_runtime/
│       │   ├── database/
│       │   └── object_storage/
│       └── envs/
│           ├── staging/
│           └── production/
├── Jenkinsfile
└── .gitignore
```

Esta é uma estrutura-alvo, não uma exigência de mover arquivos agora. `compose.yaml` cobre desenvolvimento local e ambientes de teste. Terraform cobre ambientes remotos, inicialmente staging e produção. Busque paridade entre staging e produção: use os mesmos componentes, funcionalidades, versões e tipos de conexão, e promova a mesma imagem imutável entre ambientes. Os endpoints, credenciais, variáveis específicas, dados e capacidade são próprios de cada ambiente; staging não usa credenciais nem dados reais de produção. Evite diferenças de feature flags que façam staging executar um caminho funcional diferente do release de produção. Não simule um ambiente cloud local com Terraform sem uma necessidade pedagógica concreta.

Cada módulo Terraform deve ter uma responsabilidade coesa, interface de variáveis/saídas documentada e exemplos/testes quando úteis. As configurações `envs/` compõem os módulos, com valores e estado separados. Não guardar state, credenciais ou `*.tfvars` secretos no Git. Usar backend remoto com controle de acesso e locking quando o projeto passar a provisionar cloud compartilhada.

## Jenkins e fluxo CI/CD

O `Jenkinsfile` versionado é a fonte do pipeline; Jenkins o executa. Os mesmos comandos devem ser executáveis localmente para não acoplar regras de build/teste à UI do Jenkins.

### Pull request / branch

1. Checkout do commit exato e instalação reprodutível a partir de lockfiles.
2. Lint, formatação e análise estática de Python e TypeScript.
3. Testes unitários; depois testes de integração com banco efêmero/Compose.
4. Verificações de dependências, segredos e imagens/código conforme maturidade do marco.
5. Construção da imagem somente após os gates; marcar com commit imutável e publicar artefato de teste quando houver registry.
6. Terraform `fmt`, `validate` e análise estática; gerar plano em PR para revisão, sem aplicar automaticamente produção.

### Promoção

1. Deploy do artefato imutável em staging e smoke tests.
2. Verificar migrações, health checks, logs e métricas; preservar possibilidade de rollback.
3. Produção exige aprovação humana, plano de infraestrutura revisado e artefato já validado em staging.
4. Mudança de modelo executa testes de dados/preprocessing e validação de métricas/limiares antes de publicar artefato versionado. Mudar o modelo não altera Terraform automaticamente.

Separar a autorização/credenciais e o estado Terraform por ambiente. Jenkins deve receber somente credenciais com escopo mínimo e usar IDs do credential store; nenhum segredo fica no Jenkinsfile, logs ou argumentos visíveis. Preferir agente isolado para builds e aplicar atualizações de Jenkins/plugins de maneira controlada.

## Pirâmide de qualidade

- **Unidade:** domínio, validação, normalização, cálculos e preprocessing sem rede ou banco real.
- **Integração:** API, autenticação/autorização, banco, migrações, adaptador e worker nos limites entre módulos.
- **Componente:** frontend renderiza estados de sucesso, vazio, loading e erro; backend valida resposta e contrato.
- **Ponta a ponta:** poucos fluxos críticos, como dispositivo autorizado envia leitura e usuário autorizado visualiza histórico.
- **Infraestrutura:** formatação, validação, scanners e revisão de plano; não aplicar mudanças destrutivas em produção como etapa automática de PR.

Cobertura percentual é um indicador, não uma prova de qualidade. Cobrir primeiro regras críticas e casos negativos de segurança: usuário A tentando consultar veículo B, token inválido, payload excessivo, valor fora de faixa, repetição de evento e falha parcial de persistência.

## Roadmap incremental em quatro marcos

### 1. Domínio Python e contrato de telemetria

**Entrega:** parser/normalizador, entidades/regras e fixtures de leituras simuladas, com testes unitários. Sem cloud e sem dependência do ELM327 físico para validar comportamento.

**Segurança desde o primeiro commit:** definir PIDs permitidos, não emitir comandos de escrita/controle ao veículo, não registrar VIN/segredos em fixtures, validar tamanho e ranges dos dados.

**Pronto quando:** exemplos válidos são normalizados e entradas malformadas/inesperadas são rejeitadas de forma previsível.

### 2. API, persistência e ambiente local reproduzível

**Entrega:** FastAPI, PostgreSQL, migrações e Compose; autenticação inicial de dispositivo e testes de integração API+banco.

**Segurança:** TLS no ambiente remoto, autorização por veículo em toda consulta/escrita, limites de payload e taxa, queries parametrizadas/ORM, conta de banco sem privilégio administrativo, configuração via ambiente/secret store.

**Pronto quando:** uma leitura autenticada é persistida e consultada pelo proprietário autorizado; um usuário/dispositivo diferente recebe negação; o ambiente pode ser recriado sem perder dados por acidente.

### 3. Painel, previsões e rastreabilidade do modelo

**Entrega:** React/TypeScript consumindo OpenAPI, primeira baseline Python e previsões associadas a versão de modelo.

**Segurança:** autenticação de usuário, autorização server-side, validação de payload no backend, proteção contra exposição de dados entre contas, dependências e artefatos versionados, dados de avaliação sem identificadores pessoais desnecessários.

**Pronto quando:** usuário vê somente seus veículos; previsão e versão do modelo são rastreáveis; fluxos essenciais têm testes de componente e integração.

### 4. Terraform, Jenkins e operação em staging/produção

**Entrega:** módulos próprios, ambientes remotos separados, pipeline Jenkins com gates, deploy em staging, observabilidade e procedimento de recuperação.

**Segurança:** análise de IaC e imagem, permissões mínimas, criptografia, backups protegidos, credenciais segregadas, revisão do plano e aprovação de produção, registro de auditoria e processo de atualização/rollback.

**Pronto quando:** PR executa verificações e mostra plano; falha crítica bloqueia promoção; staging é implantado pelo pipeline; produção só avança com aprovação e plano revisado.

## Referências técnicas

- [Jenkins Pipeline como código](https://www.jenkins.io/doc/book/pipeline/)
- [Terraform: estrutura padrão de módulos](https://developer.hashicorp.com/terraform/language/modules/develop/structure)
- [Docker Compose](https://docs.docker.com/compose/)
- [FastAPI: gerar clientes a partir do OpenAPI](https://fastapi.tiangolo.com/advanced/generate-clients/)
- [Papéis propostos para subagentes Codex](agent-roles.md)
