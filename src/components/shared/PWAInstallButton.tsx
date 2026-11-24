import { Download, Share, Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Instalar o aplicativo MedAir Logistics no dispositivo"
        className="inline-flex items-center gap-1.5 rounded-md bg-teal-500/20 border border-teal-300/40 px-2.5 py-1.5 text-xs font-semibold text-teal-100 hover:bg-teal-500/30 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Instruções para instalar no iPhone ou iPad"
          className="inline-flex items-center gap-1.5 rounded-md bg-teal-500/20 border border-teal-300/40 px-2.5 py-1.5 text-xs font-semibold text-teal-100 hover:bg-teal-500/30 transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B2545]/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 text-[#0B2545] shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-[#E3F0F4] text-[#0F4C5C] flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3
                    id="ios-install-title"
                    className="text-sm font-bold text-[#0B2545]"
                  >
                    Instalar MedAir no iPhone / iPad
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Fechar instruções de instalação"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-2.5 text-xs text-slate-600 leading-relaxed list-decimal list-inside">
                <li>
                  Toque no botão{' '}
                  <strong className="inline-flex items-center gap-1 text-[#0B2545]">
                    Compartilhar <Share className="w-3 h-3 inline" />
                  </strong>{' '}
                  na barra do Safari.
                </li>
                <li>
                  Role a lista de opções e selecione{' '}
                  <strong className="text-[#0B2545]">
                    Adicionar à Tela de Início
                  </strong>
                  .
                </li>
                <li>
                  Toque em <strong className="text-[#0B2545]">Adicionar</strong>{' '}
                  no canto superior direito para abrir o MedAir em modo
                  aplicativo.
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-md bg-[#0F4C5C] py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
