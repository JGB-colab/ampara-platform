# Especificação do projeto final

## Objetivo

Consolidar, no projeto desenvolvido durante o curso, evidências de engenharia de software cobrindo o conteúdo do Módulo 4, do container ao teste de carga. O objetivo é demonstrar decisões e execução com qualidade, não aumentar o tamanho do sistema. Reaproveite os entregáveis já produzidos (ADR, contextos, diagramas C4, OpenAPI, plano de p95 e k6); não é necessário começar um trabalho novo.

## Cronograma e formato

- **Entrega no Moodle:** até 13/11. Commits posteriores ao prazo não serão avaliados.
- **Apresentações opcionais:** ao vivo em 16/11 ou por vídeo enviado pelo Moodle. O vídeo também deve ser enviado até 13/11.
- **Participação:** individual ou em grupo de até três pessoas. O escopo esperado é o mesmo em ambos os formatos.
- **Avaliação:** individual. Cada estudante deve ter commits e PRs identificáveis e contribuir com `CONTRIBUTORS.md`, que descreve quem fez o quê. Na apresentação, cada integrante defende sua parte; a contribuição precisa estar evidenciada no histórico.

As datas foram transcritas do material da aula, que não informa o ano. Confirme o calendário vigente do curso/Moodle.

## Escolha de nível

Declare **Projeto A** ou **Projeto B** na primeira linha do README. Os níveis usam a mesma rubrica; muda a extensão das evidências esperadas.

### Projeto A — avançado

- Evoluir o sistema existente como monólito modular, com fronteiras explícitas entre módulos de domínio. O exemplo apresentado em aula é um marketplace com catálogo, pedidos e pagamento; a orientação geral é consolidar o projeto já existente.
- Incluir arquitetura documentada e os artefatos de arquitetura e desempenho do curso.
- Demonstrar teste de carga k6 em três estágios, com resultados medidos e análise de p95.
- Quando o domínio for marketplace, incluir banco com pelo menos 100 mil pedidos sintéticos.

O professor esclareceu que o estudante pode resolver um problema real de outro domínio, desde que a entrega siga os moldes do nível escolhido. Para domínios diferentes de marketplace, confirmar se há expectativa de volume sintético equivalente; registrar a interpretação aceita em `docs/desempenho.md` ou em ADR.

### Projeto B — simples

- Entregar uma API de domínio único (por exemplo, pedidos, biblioteca ou agenda) com um fluxo principal funcionando de ponta a ponta.
- Não exige decomposição em módulos nem volume mínimo de dados.
- Incluir README, um ADR, contrato OpenAPI e um smoke test.
- A estrutura de referência não exige pasta `docs/c4/` para este nível.

Projeto B continua exigindo um fluxo real, executável e demonstrável. A recomendação da aula é escolher A se CI e testes já estão funcionando; se o prazo ameaçar a entrega funcional, reduzir o escopo e proteger um resultado completo. Um B completo vale mais que um A pela metade.

## Referência de exemplo

O professor indicou [henriquelopeslima/payb2](https://github.com/henriquelopeslima/payb2) como projeto-base de exemplo. Use-o para estudar estrutura e decisões; a entrega continua sendo o projeto escolhido pelo estudante, adaptado ao nível declarado. O conteúdo do repositório não foi validado ao redigir esta especificação.

## Entrega

Enviar pelo Moodle:

1. Link do repositório (ou convite de acesso se privado).
2. README com nível escolhido, instruções para subir a aplicação e executar os testes.
3. Link para uma execução verde do CI.
4. `docs/desempenho.md` e `CONTRIBUTORS.md`.

O material da aula também cita `docs/ia.md`: registre ali os prompts relevantes usados. A IA é permitida e esperada, mas as alternativas devem ser avaliadas pelo estudante, que precisa explicar o código e as decisões que apresenta.

Estrutura de referência mostrada em aula:

```text
├── docker-compose.yml
├── README.md
├── docs/
│   ├── adr/0001-decisao.md
│   ├── c4/contexto.md
│   ├── openapi.yaml
│   └── desempenho.md
├── src/
├── tests/
└── .github/workflows/ci.yml
```

Para o Projeto B, o material especifica README, um ADR e OpenAPI em `docs/`, sem exigir C4. Ajuste os artefatos à estrutura do repositório e ao nível escolhido.

## Apresentação opcional

A apresentação pode render bônus de até 10 pontos. O material indica roteiro de 10 minutos, mas não detalha os tópicos nos slides recebidos. Cada integrante deve explicar e defender sua contribuição.

## Avaliação e cuidados

A rubrica é a mesma para A e B, mas os slides recebidos não detalham seus critérios ou pesos. Os pontos explicitamente enfatizados na aula são funcionamento demonstrável, CI verde, README que permita executar o sistema, medições reais de desempenho e testes com asserções.

Evite os problemas destacados pelo professor: escopo inflado sem entrega funcional, CI ausente ou vermelha, instruções insuficientes para subir a aplicação, segredos commitados, testes sem asserções e números de desempenho sem medição. Nunca inclua credenciais ou segredos no repositório.

## Decisões a registrar antes de sair

- Nível escolhido: A ou B.
- Formação do grupo: individual ou até três nomes.
- Repositório que será entregue.
- Opcionalmente, abrir PR com o README já declarando o nível.

## Relação com os requisitos do Ampara

Esta especificação registra o trabalho final do Módulo 4. A arquitetura e o fluxo de entrega estão em [`sdlc/architecture-and-delivery.md`](../sdlc/architecture-and-delivery.md); as etapas e critérios de aceite estão em [`sdlc/milestones.md`](../sdlc/milestones.md); os controles de segurança estão em [`sdlc/security.md`](../sdlc/security.md).
