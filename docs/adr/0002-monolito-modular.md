# ADR 0002: monólito modular com fronteiras de responsabilidade explícitas

- **Status:** Aceita
- **Data:** 2026-11-10

## Contexto

O primeiro fluxo do Ampara é pequeno: recebe uma leitura de telemetria, valida,
persiste e permite consultar. Não há razão técnica para distribuir esse comportamento
em serviços separados neste estágio. Ao mesmo tempo, misturar regras de domínio,
detalhes HTTP e acesso ao banco num único módulo dificultaria testar cada camada
isoladamente e aumentaria o custo de qualquer mudança futura.

A questão é como organizar o código dentro de um único processo de forma que as
responsabilidades sejam claras, as dependências sigam uma direção previsível e os
testes consigam exercitar o domínio sem depender do framework ou do banco.

## Decisão

Adotar um **monólito modular**: um único processo Python com módulos de
responsabilidade explícita e dependências em uma única direção.

### Módulos e responsabilidades

| Módulo | Responsabilidade | Dependências externas |
|---|---|---|
| `domain.py` | Regras de negócio: allowlist de PIDs, faixas de valor, validação de leitura | Nenhuma (stdlib pura) |
| `schemas.py` | Contrato de entrada e saída da API: validação de formato, normalização de PID, invocação da validação de domínio | `domain.py` |
| `models.py` | Mapeamento objeto-relacional: `TelemetryRecord`, restrição de unicidade | SQLModel |
| `database.py` | Fábrica de sessões e engine; lê URL do banco de `config.py` | `config.py`, SQLModel |
| `config.py` | Leitura de variáveis de ambiente via Pydantic Settings | Pydantic |
| `api.py` | Rotas HTTP, autorização de dispositivo, conversão de erros de domínio em respostas HTTP | Todos os módulos acima |

### Direção das dependências

```
api.py
 ├── schemas.py ──→ domain.py
 ├── domain.py
 ├── models.py
 ├── database.py ──→ config.py
 └── config.py

domain.py  ←  não depende de nenhum módulo interno
models.py  ←  não depende de nenhum módulo interno
```

A regra é: **dependências apontam de fora para dentro**. `api.py` conhece tudo;
`domain.py` não conhece nada do projeto além de si mesmo. Nenhum módulo de
infraestrutura (HTTP, banco, configuração) é importado por `domain.py` ou
`models.py`.

### Regra de crescimento

Criar um novo módulo somente quando ele representar uma capacidade ou regra de
domínio nova. Não criar pastas ou arquivos para aparentar arquitetura em camadas.
Se uma responsabilidade crescer a ponto de justificar extração, registrar a decisão
em um ADR antes de mover código.

## Alternativas consideradas

- **Microsserviços desde o início:** descartado. Adiciona latência de rede,
  complexidade de deploy e overhead operacional sem benefício observável no estágio
  atual. A fronteira entre serviços só faz sentido quando há times ou requisitos de
  escala independente.

- **Código sem separação de módulos (tudo em `main.py`):** descartado. Impede
  testar regras de domínio sem subir a API; mistura preocupações que mudam por
  motivos diferentes.

- **Arquitetura em camadas (controllers / services / repositories):** não adotada
  como estrutura obrigatória. As camadas existem conceitualmente, mas não como
  diretórios artificiais. O projeto só cria um módulo quando há código suficiente
  para justificá-lo.

## Consequências

- `domain.py` pode ser testado com `pytest` puro, sem `TestClient`, banco ou
  variáveis de ambiente.
- Adicionar um novo PID ou mudar uma faixa de valor exige alterar apenas
  `domain.py` e `schemas.py`; `api.py` não precisa mudar.
- Se o volume de PIDs, veículos ou regras crescer, extrair `domain.py` para um
  pacote interno continua possível sem alterar o contrato HTTP.
- A estrutura atual não suporta múltiplos veículos com credenciais independentes,
  workers assíncronos nem modelo preditivo. Cada uma dessas necessidades, quando
  surgir, requer um novo ADR antes da implementação.
