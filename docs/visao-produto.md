# Visão de produto e evolução

Contexto registrado em 2026-11-11, fora do escopo de entrega do curso (nível B). Serve como norte para evolução do Ampara além do projeto acadêmico.

## Problema real

O projeto nasceu de um problema pessoal: falhas no veículo descobertas tarde, quando o dano já era maior e o custo de manutenção disparou. A pergunta que orienta o produto é: **como dar ao motorista visibilidade preditiva antes da quebra, com custo acessível?**

## Persona e mercado

- **Público inicial:** motoristas de aplicativos, donos de frotas locais pequenas e MEIs que dependem do veículo para trabalhar.
- **Referência de mercado:** TRACTIAN — mas ela vende sensores industriais (vibração, ultrassom, corrente) para indústria, com custo que inviabiliza o motorista individual.
- **Posicionamento do Ampara:** software + dongle OBD-II barato (~R$50–150) em vez de hardware dedicado. O valor está na camada de dados e alertas, não no sensor.

## Limitação técnica honesta

O ELM327 lê a porta OBD-II e expõe PIDs do motor (rotação, temperatura, velocidade, carga, códigos de falha/DTCs). Ele **não** mede vibração, ultrassom ou corrente elétrica como os sensores da TRACTIAN. O Ampara deve prometer o que OBD-II entrega: indicadores de motor, códigos de falha e tendências de degradação — não diagnóstico mecânico profundo.

## Roadmap de evolução (pós-nível B)

1. **Coletor ELM327 simulado:** script que gera leituras no formato de carro real, validando o pipeline sem hardware.
2. **Coletor ELM327 real:** ponte (PC/celular/Raspberry Pi) usando a biblioteca comunitária **python-OBD** (`pip install obd`) — mantida, fala ELM327 e já parseia Modes 01/09 e DTCs, em vez de escrever AT commands manualmente. Faz `POST /v1/telemetria` com o contrato já existente.
3. **Mais PIDs e DTCs:** expandir a allowlist do contrato (hoje `0105`, `010C`, `010D`) para os PIDs que o ELM327 realmente oferece no veículo do usuário.
4. **Autenticação por usuário (login):** conta por motorista com email+senha (hash argon2/bcrypt), sessão (JWT ou cookie httpOnly) e veículos vinculados ao dono — o motorista vê apenas seus dados. Isso substitui o token estático único como credencial de leitura e é pré-requisito para multi-usuário. O token de dispositivo continua existindo, mas passa a ser credencial de ingestão por veículo (pairing), não de consulta.
5. **Dashboard do motorista:** interface web/mobile mostrando saúde do veículo e alertas preditivos. Em 2026-11-12 foi entregue a versão mínima (`GET /` serve UI estática que consome a API; token digitado na página, com opção de lembrar no navegador). O Grafana da Etapa 5 continua sendo a visão operacional, não a do motorista.
6. **Identificação do veículo por VIN:** o OBD-II Mode 09 PID 02 expõe o VIN (chassi, 17 caracteres, único por carro). O coletor pode ler o VIN na primeira conexão e usá-lo como `vehicle_id` — o veículo se **auto-registra** sem cadastro manual. Ressalvas: nem toda ECU responde Mode 09 de forma padronizada e clones de ELM327 variam na implementação; para o MVP o `vehicle_id` manual continua válido. Esse fluxo também é o ponto natural de **pairing**: o dispositivo recebe sua credencial no primeiro registro, eliminando o token digitado à mão.
7. **Modelo preditivo:** regras de tendência primeiro (ex.: temperatura subindo em série = risco), ML só depois de haver dados reais acumulados.
8. **Migração para VPS própria:** evolução natural do deploy atual (Render free + túnel) para uma máquina virtual dedicada — elimina cold start, o erro 530 do túnel quando o container dorme e a dependência de dois free tiers. O `docker-compose` atual já é a base; Terraform pode provisionar a VPS quando houver orçamento de cloud.

## O que já está pronto para esse caminho

- Contrato de ingestão/consulta validado e testado (`POST /v1/telemetria`, `GET /v1/veiculos/{id}/telemetria`).
- Persistência com política de duplicatas e idempotência.
- Medição de desempenho e plano de otimização documentados.
- Stack containerizada reproduzível — base para deploy em VPS com Terraform (Etapa 6).
- Deploy em produção no ar: `https://ampara.jgborg.dev.br` (Render + Postgres gerenciado + Neon/Render, DNS via Terraform + Cloudflare Tunnel — ver `docs/deploy.md` e `terraform/README.md`).
