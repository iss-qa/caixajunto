O SplitService gerencia a distribuição de pagamentos entre diferentes partes quando um participante paga sua mensalidade de um consórcio/caixa.

1. Mês 1 (Cota + Fundo de Reserva + Taxa)
Total da Transação: R$ 317,50 (250,00 + 62,50 + 5,00)

Sistema: Recebe Fundo (62,50) + Taxa (5,00) = R$ 67,50 (21,26%)

Contemplado: Recebe a Cota = R$ 250,00 (78,74%)

JSON

[
    {
        "percentage": 21.26,
        "description": "Fundo de Reserva + Taxa de Servico",
        "_recipientId": "693c5c508d48ed94888798a6"
    },
    {
        "percentage": 78.74,
        "description": "Participante Contemplado do Mes",
        "_recipientId": "ID_DO_CONTEMPLADO_ATUAL"
    }
]





2. Meses Intermediários (Cota + Taxa Fixa)
Total da Transação: R$ 255,00 (250,00 + 5,00)

Sistema: Recebe a Taxa Fixa = R$ 10,00 

Contemplado: Recebe a Cota = R$ 250,00 (98,04%)

JSON

{
  "type": "fixedValue",
  "recipients": [
    {
      "value": 1000,
      "description": "Taxa de Serviço (R$ 10,00)",
      "_recipientId": "693c5c508d48ed94888798a6"
    },
    {
      "value": 100410,
      "description": "Participante Contemplado: [NOME] - Cota R$ 1000.00 + IPCA R$ 4.10",
      "_recipientId": "ID_DO_CONTEMPLADO_ATUAL"
    }
  ]
}


3. Último Mês (Cota + Bônus 10% + Taxa Fixa)
Total da Transação: R$ 355,00 (250,00 + 100,00 + 5,00)

Sistema: Recebe a Taxa Fixa = R$ 5,00 (1,41%)

Administrador: Recebe o Bônus do Fundo = R$ 100,00 (28,17%)

Contemplado: Recebe a Cota = R$ 250,00 (70,42%)

JSON

[
    {
        "percentage": 1.41,
        "description": "Taxa de Servico Fixa (5.00)",
        "_recipientId": "693c5c508d48ed94888798a6"
    },
    {
        "percentage": 28.17,
        "description": "Bonus 10% do Caixa",
        "_recipientId": "693c5c508d48ed94888798a6"
    },
    {
        "percentage": 70.42,
        "description": "Participante Contemplado do Mes",
        "_recipientId": "ID_DO_CONTEMPLADO_ATUAL"
    }
]
