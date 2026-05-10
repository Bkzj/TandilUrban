import PanelHeader from '@/components/panel/PanelHeader';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
<div className="min-h-screen bg-gradient-to-br from-text-primary via-verde-dark to-naranja-dark text-white">      <PanelHeader />
      {/* Este div es clave para que el contenido no quede pegado al header */}
      <div className="pt-4"> 
        {children}
      </div>
    </div>
  );
}
