// Teste de carga k6 para a API de telemetria do Ampara.
// Requer scripts/carga/eventos.json gerado por scripts/gerar_carga.py.
//
// Uso:
//   k6 run -e BASE_URL=http://localhost:8001 -e AMAPARA_DEVICE_TOKEN=<token> scripts/carga.k6.js
//   GET (execução separada): k6 run -e MODO=consulta -e BASE_URL=... -e AMAPARA_DEVICE_TOKEN=... scripts/carga.k6.js
import http from "k6/http";
import { check } from "k6";
import { SharedArray } from "k6/data";

const eventos = new SharedArray("eventos", function () {
  return JSON.parse(open("./carga/eventos.json"));
});

const BASE_URL = __ENV.BASE_URL || "http://localhost:8001";
const TOKEN = __ENV.AMAPARA_DEVICE_TOKEN || "";
const MODO = __ENV.MODO || "post";
const VEICULO = "classic-demo";

const headers = {
  "Content-Type": "application/json",
  "X-Device-Token": TOKEN,
};

// Estágios do plano em docs/desempenho.md. A tag "estagio" é aplicada às
// métricas de cada cenário e permite avaliar p95 por estágio nos thresholds.
const cenarioPost = {
  scenarios: {
    inicial: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 20 },
        { duration: "2m", target: 20 },
      ],
      exec: "ingestao",
      tags: { estagio: "inicial" },
    },
    sustentada: {
      executor: "constant-vus",
      vus: 50,
      duration: "3m",
      startTime: "3m",
      exec: "ingestao",
      tags: { estagio: "sustentada" },
    },
    pico: {
      executor: "ramping-vus",
      startVUs: 50,
      stages: [
        { duration: "1m", target: 150 },
        { duration: "1m", target: 150 },
        { duration: "30s", target: 0 },
      ],
      startTime: "6m",
      exec: "ingestao",
      tags: { estagio: "pico" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{estagio:sustentada}": ["p(95)<500"],
  },
};

const cenarioConsulta = {
  scenarios: {
    consulta: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 20 },
        { duration: "2m", target: 20 },
      ],
      exec: "consulta",
      tags: { estagio: "consulta" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
};

export const options = MODO === "consulta" ? cenarioConsulta : cenarioPost;

export function ingestao() {
  const evento = eventos[(__ITER * 7 + __VU) % eventos.length];
  const res = http.post(`${BASE_URL}/v1/telemetria`, JSON.stringify(evento), { headers });
  check(res, {
    "status 200 ou 201": (r) => r.status === 200 || r.status === 201,
  });
}

export function consulta() {
  const res = http.get(`${BASE_URL}/v1/veiculos/${VEICULO}/telemetria?limit=100`, { headers });
  check(res, { "status 200": (r) => r.status === 200 });
}
