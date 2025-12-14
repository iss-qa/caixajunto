import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import contratoMd from '../../CONTRATO.MD?raw';

export function Contrato() {
  const [aceitoEm, setAceitoEm] = useState<string | null>(null);
  const [aceitando, setAceitando] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('contratoAceitoEm');
    if (saved) {
      setAceitoEm(saved);
    }
  }, []);

  const handleAceitar = () => {
    setAceitando(true);
    const now = new Date().toISOString();
    localStorage.setItem('contratoAceitoEm', now);
    setAceitoEm(now);
    setTimeout(() => setAceitando(false), 400);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 -m-4 md:-m-5 mb-4 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Contrato e Termos de Uso</h1>
                <p className="text-white/80 text-sm">Leia atentamente antes de aceitar</p>
              </div>
            </div>
            {aceitoEm ? (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white" />
                <span>Você aceitou em {formatDate(aceitoEm)}</span>
              </div>
            ) : (
              <div className="mt-3 text-sm text-white/90">
                Não aceito. É necessário confirmar o aceite para prosseguir.
              </div>
            )}
          </div>

          <div className="px-2 md:px-0">
            <div className="rounded-xl bg-white">
              <div className="p-4 md:p-6">
                <article className="max-w-none font-sans leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
                  {contratoMd}
                </article>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-500">
                    Ao prosseguir, você declara ciência e concordância integral com os termos.
                  </p>
                  <Button
                    onClick={handleAceitar}
                    isLoading={aceitando}
                    variant="primary"
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                  >
                    Li e Aceito os Termos de Uso
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
