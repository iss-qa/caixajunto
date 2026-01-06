import { useState } from 'react';
import { CheckCircle, FileText, Download, Building2, User, Calendar, Shield } from 'lucide-react';

export default function ContratoViewer() {
  const [aceito, setAceito] = useState(false);
  const [aceitando, setAceitando] = useState(false);

  const handleAceitar = () => {
    setAceitando(true);
    setTimeout(() => {
      setAceito(true);
      setAceitando(false);
    }, 600);
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = document.getElementById('contrato-content')?.innerHTML || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contrato Juntix</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
            h1 { color: #10b981; font-size: 24px; margin-top: 30px; }
            h2 { color: #059669; font-size: 20px; margin-top: 25px; }
            h3 { color: #047857; font-size: 16px; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: 600; }
            .header { text-align: center; margin-bottom: 30px; }
            .highlight { background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 15px 0; }
            ul { margin: 10px 0; padding-left: 25px; }
            @media print {
              body { margin: 20px; }
              h1 { page-break-before: avoid; }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Contrato de Adesão ao Juntix</h1>
                  <p className="text-green-100">Termos e Condições de Uso da Plataforma</p>
                </div>
              </div>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors backdrop-blur-sm"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Baixar PDF</span>
              </button>
            </div>
          </div>

          {aceito && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 m-6 rounded-r-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Contrato Aceito com Sucesso</p>
                  <p className="text-sm text-green-700">Você concordou com os termos em {new Date().toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          )}

          <div id="contrato-content" className="p-8 space-y-8">
            <section className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Preâmbulo</h2>
              <p className="text-gray-700 leading-relaxed">
                Diante dos abusos praticados por agiotas, das altas taxas de juros cobradas por cartões de crédito, empréstimos bancários e financeiras, somados à elevada carga tributária que onera as operações financeiras tradicionais no Brasil, a <strong>ISS SOFWARE QUALITY SOLUTIONS</strong> desenvolveu o <strong>Juntix</strong>, uma plataforma digital que visa modernizar e trazer segurança ao tradicional sistema de "caixa rotativo".
              </p>
              <div className="mt-4 p-4 bg-white rounded-lg border border-green-300">
                <p className="text-sm text-gray-700">
                  O <strong>Juntix</strong> não é uma instituição financeira, nem realiza operações de crédito. Trata-se exclusivamente de uma <strong>ferramenta tecnológica de gestão e organização de grupos colaborativos</strong>.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-green-600" />
                Partes Contratantes
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                  <h3 className="font-bold text-lg text-blue-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Contratada
                  </h3>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="font-semibold text-blue-900 py-2">Razão Social:</td>
                        <td className="text-blue-800">ISS SOFWARE QUALITY SOLUTIONS</td>
                      </tr>
                      <tr>
                        <td className="font-semibold text-blue-900 py-2">CNPJ:</td>
                        <td className="text-blue-800">39.997.807/0001-86</td>
                      </tr>
                      <tr>
                        <td className="font-semibold text-blue-900 py-2">CNAE:</td>
                        <td className="text-blue-800">6209-1/00</td>
                      </tr>
                      <tr>
                        <td className="font-semibold text-blue-900 py-2">Endereço:</td>
                        <td className="text-blue-800">R Beta 39 Quadra 12 Lote, Itinga, Lauro de Freitas</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                  <h3 className="font-bold text-lg text-purple-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Contratante
                  </h3>
                  <div className="space-y-3 text-sm text-purple-800">
                    <p><strong>Qualificação:</strong> Pessoa física, maior de 18 anos, plenamente capaz</p>
                    <p><strong>Adesão:</strong> Voluntária através do cadastro na plataforma</p>
                    <p><strong>Denominação:</strong> Usuário ou Participante</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Definições</h2>
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
                  <h4 className="font-bold text-gray-900 mb-2">Caixa Coletivo ou Caixa Rotativo</h4>
                  <p className="text-gray-700 text-sm">Grupo formado por pessoas de confiança que contribuem mensalmente com valor fixo, sendo que a cada mês um participante recebe o montante total acumulado.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-bold text-gray-900 mb-2">Administrador</h4>
                  <p className="text-gray-700 text-sm">Participante responsável por recrutar membros, organizar o caixa e zelar pelo cumprimento das obrigações.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500">
                  <h4 className="font-bold text-gray-900 mb-2">Gateway de Pagamento</h4>
                  <p className="text-gray-700 text-sm">Plataforma intermediária licenciada que processa transações financeiras garantindo segurança e conformidade legal.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500">
                  <h4 className="font-bold text-gray-900 mb-2">Fundo de Reserva</h4>
                  <p className="text-gray-700 text-sm">Valor coletado no primeiro mês para cobrir eventuais inadimplências e garantir continuidade do caixa.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Composição Financeira e Transparência</h2>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                      <th className="p-4 text-left">Componente</th>
                      <th className="p-4 text-left">Valor Exemplo</th>
                      <th className="p-4 text-left">Destinatário</th>
                      <th className="p-4 text-left">Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">Parcela</div>
                        <div className="text-sm text-gray-600">Cota mensal do participante</div>
                      </td>
                      <td className="p-4 font-bold text-green-600">R$ 250,00</td>
                      <td className="p-4 text-sm text-gray-700">Participante contemplado</td>
                      <td className="p-4 text-sm text-gray-700">Todos os meses</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">Taxa de Serviço</div>
                        <div className="text-sm text-gray-600">Processamento PIX/Boleto</div>
                      </td>
                      <td className="p-4 font-bold text-blue-600">R$ 10,00</td>
                      <td className="p-4 text-sm text-gray-700">Gateway de Pagamento</td>
                      <td className="p-4 text-sm text-gray-700">Todos os meses</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">Fundo de Reserva</div>
                        <div className="text-sm text-gray-600">Proteção contra inadimplência</div>
                      </td>
                      <td className="p-4 font-bold text-orange-600">R$ 62,50</td>
                      <td className="p-4 text-sm text-gray-700">Retido pela plataforma</td>
                      <td className="p-4 text-sm text-gray-700">Apenas 1º mês</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">Taxa IPCA</div>
                        <div className="text-sm text-gray-600">Correção monetária</div>
                      </td>
                      <td className="p-4 font-bold text-purple-600">R$ 1,03</td>
                      <td className="p-4 text-sm text-gray-700">Participante contemplado</td>
                      <td className="p-4 text-sm text-gray-700">A partir do 2º mês</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">Comissão do Administrador</div>
                        <div className="text-sm text-gray-600">10% do valor total do caixa</div>
                      </td>
                      <td className="p-4 font-bold text-indigo-600">R$ 25,00</td>
                      <td className="p-4 text-sm text-gray-700">Administrador</td>
                      <td className="p-4 text-sm text-gray-700">Apenas último mês</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Exemplo Prático de Pagamento Mensal</h3>
                <p className="text-sm text-gray-600 mb-4">Caixa de R$ 2.500,00 com 10 participantes</p>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-3 text-left text-sm font-semibold">Mês</th>
                        <th className="p-3 text-right text-sm font-semibold">Parcela</th>
                        <th className="p-3 text-right text-sm font-semibold">Taxa Serviço</th>
                        <th className="p-3 text-right text-sm font-semibold">Fundo Reserva</th>
                        <th className="p-3 text-right text-sm font-semibold">Taxa IPCA</th>
                        <th className="p-3 text-right text-sm font-semibold">Comissão Admin</th>
                        <th className="p-3 text-right text-sm font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="p-3 text-sm font-semibold">1º</td>
                        <td className="p-3 text-right text-sm">R$ 250,00</td>
                        <td className="p-3 text-right text-sm">R$ 10,00</td>
                        <td className="p-3 text-right text-sm text-orange-600 font-semibold">R$ 62,50</td>
                        <td className="p-3 text-right text-sm">R$ 1,03</td>
                        <td className="p-3 text-right text-sm text-gray-400">-</td>
                        <td className="p-3 text-right text-sm font-bold text-green-600">R$ 323,53</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-3 text-sm font-semibold">2º ao 9º</td>
                        <td className="p-3 text-right text-sm">R$ 250,00</td>
                        <td className="p-3 text-right text-sm">R$ 10,00</td>
                        <td className="p-3 text-right text-sm text-gray-400">-</td>
                        <td className="p-3 text-right text-sm">R$ 1,03</td>
                        <td className="p-3 text-right text-sm text-gray-400">-</td>
                        <td className="p-3 text-right text-sm font-bold text-green-600">R$ 261,03</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-sm font-semibold">10º (último)</td>
                        <td className="p-3 text-right text-sm">R$ 250,00</td>
                        <td className="p-3 text-right text-sm">R$ 10,00</td>
                        <td className="p-3 text-right text-sm text-gray-400">-</td>
                        <td className="p-3 text-right text-sm">R$ 1,03</td>
                        <td className="p-3 text-right text-sm text-indigo-600 font-semibold">R$ 25,00</td>
                        <td className="p-3 text-right text-sm font-bold text-green-600">R$ 286,03</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-green-600" />
                Papel e Responsabilidades do Administrador
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                  <h3 className="font-bold text-blue-900 mb-3">Atribuições Principais</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">●</span>
                      <span>Selecionar pessoas de confiança pessoal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">●</span>
                      <span>Manter comunicação constante com participantes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">●</span>
                      <span>Acompanhar status dos pagamentos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">●</span>
                      <span>Realizar cobranças quando necessário</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
                  <h3 className="font-bold text-purple-900 mb-3">Remuneração</h3>
                  <div className="space-y-3 text-sm text-purple-800">
                    <p><strong>Comissão:</strong> 10% do valor total do caixa</p>
                    <p><strong>Pagamento:</strong> Apenas no último mês, após conclusão bem-sucedida</p>
                    <p className="pt-2 border-t border-purple-200">
                      <strong>Exemplo:</strong> Administrando 5 caixas de R$ 2.500 = R$ 1.250 em comissões
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-red-50 p-6 rounded-xl border border-red-200">
              <h2 className="text-2xl font-bold text-red-900 mb-4">Importante: O Juntix NÃO É</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-red-800">
                  <span className="text-2xl">✗</span>
                  <span>Instituição financeira ou banco</span>
                </div>
                <div className="flex items-center gap-2 text-red-800">
                  <span className="text-2xl">✗</span>
                  <span>Operação de crédito ou empréstimo</span>
                </div>
                <div className="flex items-center gap-2 text-red-800">
                  <span className="text-2xl">✗</span>
                  <span>Consórcio regulamentado</span>
                </div>
                <div className="flex items-center gap-2 text-red-800">
                  <span className="text-2xl">✗</span>
                  <span>Captação pública de recursos</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-red-300">
                <h3 className="font-bold text-red-900 mb-2">O Juntix É:</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-green-800">
                    <span className="text-2xl">✓</span>
                    <span>Software de gestão (SaaS)</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-800">
                    <span className="text-2xl">✓</span>
                    <span>Ferramenta de organização</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-800">
                    <span className="text-2xl">✓</span>
                    <span>Facilitador tecnológico</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-800">
                    <span className="text-2xl">✓</span>
                    <span>Provedor de transparência</span>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Proteção de Dados (LGPD)</h2>
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                <p className="text-gray-700 mb-4">Tratamento de dados em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-indigo-900 mb-2">Dados Coletados:</p>
                    <p className="text-gray-700">Nome, CPF, telefone, e-mail, endereço, dados de pagamento</p>
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-900 mb-2">Finalidade:</p>
                    <p className="text-gray-700">Viabilizar funcionamento da plataforma e cumprimento do contrato</p>
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-900 mb-2">Segurança:</p>
                    <p className="text-gray-700">Criptografia, servidores seguros, backups regulares</p>
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-900 mb-2">Direitos do Titular:</p>
                    <p className="text-gray-700">Acesso, correção, exclusão, portabilidade</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-xl text-white">
              <h2 className="text-2xl font-bold mb-4">Canais de Atendimento</h2>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-1">E-mail</p>
                  <p className="text-green-100">suporte@juntix.com.br</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">WhatsApp</p>
                  <p className="text-green-100">(71) 3599-0522</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Website</p>
                  <p className="text-green-100">www.juntix.com.br</p>
                </div>
              </div>
            </section>

            <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-gray-600" />
                <div className="text-sm text-gray-700">
                  <p><strong>Data de Vigência:</strong> 01/02/2026</p>
                  <p><strong>Versão:</strong> 1.0</p>
                </div>
              </div>
              <div className="text-xs text-gray-600 pt-3 border-t border-gray-300">
                <p>ISS SOFWARE QUALITY SOLUTIONS | CNPJ: 39.997.807/0001-86</p>
                <p className="mt-1">Representante Legal: Isaias Santos Silva</p>
                <p className="mt-2 italic">Documento elaborado em conformidade com o Código Civil Brasileiro, LGPD, Código de Defesa do Consumidor e legislações aplicáveis.</p>
              </div>
            </section>
          </div>

          {!aceito && (
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Ao prosseguir, você declara ciência e concordância integral com todos os termos apresentados.
                </p>
                <button
                  onClick={handleAceitar}
                  disabled={aceitando}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {aceitando ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Li e Aceito os Termos de Uso</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}