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
2. **Coletor ELM327 real:** ponte (PC/celular/Raspberry Pi) que fala AT commands com o dongle e faz `POST /v1/telemetria` com o contrato já existente.
3. **Mais PIDs e DTCs:** expandir a allowlist do contrato (hoje `0105`, `010C`, `010D`) para os PIDs que o ELM327 realmente oferece no veículo do usuário.
4. **Autenticação por dispositivo:** substituir o token estático único por credencial por veículo/motorista — pré-requisito para multi-usuário.
5. **Dashboard do motorista:** interface web/mobile mostrando saúde do veículo e alertas preditivos (o Grafana da Etapa 5 é o embrião disso).
6. **Modelo preditivo:** regras de tendência primeiro (ex.: temperatura subindo em série = risco), ML só depois de haver dados reais acumulados.

## O que já está pronto para esse caminho

- Contrato de ingestão/consulta validado e testado (`POST /v1/telemetria`, `GET /v1/veiculos/{id}/telemetria`).
- Persistência com política de duplicatas e idempotência.
- Medição de desempenho e plano de otimização documentados.
- Stack containerizada reproduzível — base para deploy em VPS com Terraform (Etapa 6).
