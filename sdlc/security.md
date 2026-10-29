# Segurança do Ampara

## Compromisso

Segurança faz parte dos requisitos, do design, da implementação, dos testes, da infraestrutura e da operação. Não será adiada para uma sprint final nem tratada como checklist opcional. Este documento define um baseline educativo e prático; antes de um SaaS público, os controles devem ser revistos para o contexto legal, de privacidade e de risco real.

Referências de trabalho: NIST SSDF para integrar práticas seguras ao ciclo de desenvolvimento; OWASP ASVS para requisitos verificáveis de aplicações web; OWASP API Security Top 10 para riscos de API. Use essas referências como orientação e rastreie requisitos relevantes, em vez de declarar conformidade sem avaliação. ([NIST SSDF](https://csrc.nist.gov/pubs/sp/800/218/final), [OWASP ASVS 5.0](https://asvs.owasp.org/), [OWASP API Security](https://devguide.owasp.org/en/07-training-education/07-api-top-ten/))

## Modelo inicial de ameaças

### Ativos a proteger

- Credenciais de usuários, dispositivos, cloud e Jenkins.
- Telemetria, associação entre usuário e veículo, histórico de uso e eventuais previsões.
- Artefatos de modelo, imagens, código-fonte, pipeline e estado Terraform.
- Disponibilidade e integridade da API, banco e dados coletados.

### Atores e cenários

- Pessoa não autenticada que tenta ingerir, consultar ou alterar dados.
- Usuário autenticado que tenta acessar veículo de outra conta (falha de autorização por objeto).
- Dispositivo clonado ou token exposto que envia dados falsos/repetidos ou consome recursos.
- Dependência, imagem, ação Jenkins ou pacote comprometido que introduz código malicioso.
- Erro de configuração ou permissão ampla que expõe banco, bucket, state ou logs.
- Perda do celular/conector ou interrupção da rede, que causa extravio ou reenvio de leituras.

### Limites explícitos do MVP

- O sistema é somente leitura em relação ao veículo. Não implementar comandos de atuação, escrita em ECU ou funções que possam alterar a operação do carro.
- Coletar somente PIDs necessários. Tratar identificadores de veículo e padrões de condução como dados sensíveis; não coletar VIN ou localização por padrão.
- Previsões são sinais informativos para estudo, não diagnóstico certificado nem instrução para dirigir ou reparar o veículo.
- Até existir gestão de identidade completa, manter o acesso fechado a usuários/dispositivos explicitamente autorizados; não publicar API sem autenticação.

## Requisitos de segurança por controle

### Identidade, autenticação e autorização

- Cada chamada de ingestão deve autenticar um dispositivo; cada consulta deve autenticar usuário.
- Aplicar autorização no backend em toda operação usando `vehicle_id`/identificadores enviados pelo cliente. Não confiar em ocultação de botões, UUID difícil de adivinhar ou filtro feito apenas no frontend.
- Vincular dispositivo a veículo/conta, permitir revogar e rotacionar credenciais. Usar tokens com escopo e expiração; não usar uma chave compartilhada global para todos os dispositivos.
- Administradores e automações têm identidades/credenciais distintas. Aplicar menor privilégio e remover acessos sem uso.

### Dados e privacidade

- Documentar finalidade, classificação, retenção e necessidade de cada campo antes de persistir.
- Minimizar identificadores e dados de localização; usar ID pseudônimo quando o VIN não for necessário.
- Criptografar tráfego em trânsito com TLS em qualquer ambiente exposto e habilitar criptografia de armazenamento/backup oferecida pela plataforma.
- Não colocar tokens, VIN, payload completo ou dados pessoais em logs. Definir retenção e processo de exportação/exclusão conforme o escopo do produto e requisitos legais aplicáveis.
- Validar backup e restauração; restringir acesso e retenção dos próprios backups.

### API e aplicação

- Validar esquema, limites de tamanho, unidades, timestamp, intervalos plausíveis e conjunto permitido de PIDs no servidor.
- Aplicar idempotência para reenvios, rate limiting e timeout; responder sem expor stack traces, queries ou segredos.
- Usar ORM/queries parametrizadas; escapar saída em interface; configurar CORS estritamente; armazenar tokens do frontend de forma segura e evitar exposição em `localStorage` sem análise de risco.
- Restringir consultas, paginação e ordenação para evitar consumo ilimitado; não oferecer endpoints genéricos para filtrar qualquer coluna.
- Testar autenticação, autorização por objeto e por função, validação negativa, repetição, payload grande, abuso de recursos e comportamento em erros.

### ELM327 e coletor

- Restringir a implementação a comandos de leitura aprovados para o escopo; validar respostas truncadas, ruído serial, timeouts e valores inválidos.
- Nunca executar comandos recebidos da nuvem como instruções arbitrárias para o adaptador/ECU.
- Limitar a fila offline, proteger arquivos locais contra acesso casual, limpar dados após sincronização segundo política e evitar persistir credenciais junto aos dados.
- Dispositivo/adaptador simulado em testes; hardware real só em testes controlados e sem comandos de atuação.

### Dependências, imagens e cadeia de build

- Fixar dependências por lockfile e revisar atualizações; remover dependências sem uso.
- Rodar verificação de vulnerabilidades de dependências e imagens no CI; triagem documentada de achados com responsável e prazo.
- Construir imagens reproduzíveis com base mínima e usuário sem privilégios; não inserir `.env`, chaves, cache ou dados de teste sensíveis na imagem.
- Restringir acesso a registries e artefatos; preferir referência por digest em deploy e registrar commit/model version de cada release.
- Jenkins e plugins precisam de atualização controlada, acesso administrativo restrito, agentes isolados e credenciais pelo Credentials Store. Nunca imprimir segredos no log.

### Terraform e cloud

- Revisar código e plano; executar `fmt`, `validate` e scanner de IaC antes de apply.
- Separar state e credenciais de staging e produção; proteger state com controle de acesso, criptografia e locking quando disponível.
- Não versionar state, `.tfvars` secretos, chaves ou outputs sensíveis. Usar secret manager/credential store e referências a segredos, não valores em texto claro.
- Banco e serviços de dados sem endpoint público por padrão; regras de rede específicas; runtime sem permissões de provisionamento.
- Revisar mudanças destrutivas, exposição de portas, políticas IAM e alterações de criptografia antes de aplicar.

## Segurança no ciclo de desenvolvimento

| Etapa | Prática mínima | Evidência no projeto |
|---|---|---|
| Planejar | Identificar ativos, dados, atores, abuso e requisito de segurança da história | Checklist de ameaça/decisão atualizado em `sdlc/` |
| Desenhar | Definir trust boundaries, autenticação, autorização, retenção e falhas seguras | Diagrama/contrato e ADR quando decisão for relevante |
| Implementar | Validar input, aplicar menor privilégio, tratar erros e evitar segredos | Revisão de código e testes negativos |
| Verificar | Testes unitários/integrados de segurança, dependências, secrets e IaC | Relatórios do pipeline Jenkins; achados tratados ou aceitos com justificativa |
| Entregar | Artefato imutável, staging, smoke tests e aprovação de produção | Registro de build, commit, versão de imagem/modelo e aprovação |
| Operar | Monitorar falhas de autenticação, abuso, erros, capacidade e dependências vulneráveis | Logs sem segredos, alertas, backup e procedimento de resposta |
| Aprender | Corrigir causa raiz e atualizar testes/processo depois de incidente/defeito | Issue/ADR sem dados sensíveis e teste de regressão |

## Gates de segurança no Jenkins

O pipeline evolui junto às sprints. Não é necessário instalar toda ferramenta no primeiro dia, mas cada controle obrigatório daquele marco deve bloquear a promoção quando falhar.

1. **Em todo PR:** lint/typecheck, testes, detecção de segredos e revisão humana.
2. **Antes de publicar imagem:** scanner de dependências e imagem; build não roda como root; artefato associado ao commit.
3. **Antes de deploy em staging:** integração, migrações reversíveis/planejadas, configuração sem segredos em texto claro e health check.
4. **Antes de produção:** plano Terraform revisado, scanner IaC sem achado crítico não tratado, imagem/modelo imutável validado, aprovação humana e plano de rollback.
5. **Após deploy:** smoke test, métricas de erro/latência, autenticação/negações observáveis e confirmação de backup conforme política.

Um scanner não substitui revisão nem análise de risco. Achados devem ter severidade, decisão, responsável e prazo; falso positivo deve ser justificado e registrado, nunca simplesmente escondido.

## Incidentes e resposta

Manter um procedimento curto, testável e sem segredos que responda: como revogar token de dispositivo/usuário, bloquear endpoint ou credencial comprometida, identificar releases afetados, restaurar dados, preservar evidências sem expor dados pessoais e comunicar pessoas responsáveis. Para o projeto educacional, simular pelo menos revogação de credencial e restauração de backup antes de declarar a operação pronta.

## Definition of Done de segurança

Uma entrega não está pronta enquanto:

- requisitos de acesso e dados estiverem indefinidos;
- caminho crítico não tiver testes de autorização e casos negativos;
- segredo estiver no código, configuração versionada, imagem, log ou artifact;
- dados de uma conta puderem ser lidos por outra;
- infraestrutura expuser banco/serviço sem justificativa e revisão;
- achado crítico conhecido não tiver mitigação, responsável e decisão explícita;
- não houver forma documentada de revogar credencial e recuperar a operação.

## Referências

- [NIST SP 800-218: Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)
- [OWASP Application Security Verification Standard (ASVS)](https://asvs.owasp.org/)
- [OWASP API Security Top 10](https://devguide.owasp.org/en/07-training-education/07-api-top-ten/)
- [OWASP Top 10](https://owasp.org/projects/top-ten)
