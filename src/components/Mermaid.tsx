import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
});

export const Mermaid = ({ chart }: MermaidProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      mermaid.render(`mermaid-${Math.random().toString(36).substring(7)}`, chart).then((result) => {
        if (ref.current) {
          ref.current.innerHTML = result.svg;
        }
      });
    }
  }, [chart]);

  return <div ref={ref} className="mermaid-diagram" style={{ margin: '20px 0', display: 'flex', justifyContent: 'center' }} />;
};
