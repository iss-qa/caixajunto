# Configuração dos PDFs no Backend

Adicione as seguintes variáveis ao arquivo `.env` do backend:

```env
# Documentos (Google Drive - URLs públicas)
DOCUMENT_CONTRACT_URL=https://drive.google.com/uc?id=1Qo1lD9HzKEuBE-VL7kVD43uggkuFRyyc
DOCUMENT_TERMS_URL=https://drive.google.com/uc?id=17yBwzaMcmNNvAnqnfwgHmxCKzkimd7LI
```

## Como adicionar:

1. Abra o arquivo `/Users/isaiassilva/development/projects/caixaJunto/backend/.env`
2. Adicione as linhas acima ao final do arquivo
3. Reinicie o servidor backend:
   ```bash
   # No terminal do backend
   # Pressione Ctrl+C para parar
   # Execute novamente:
   npm run start:dev
   ```

## Verificação:

Após reiniciar, quando um caixa for iniciado:
- **T+0s**: Mensagem de boas-vindas
- **T+60s**: Ordem de contemplação
- **T+120s**: Contrato PDF enviado
- **T+180s**: Termos de Uso PDF enviado
