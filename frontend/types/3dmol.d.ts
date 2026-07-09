declare module "3dmol/build/3Dmol.js" {
  export function createViewer(
    element: HTMLElement,
    config?: Record<string, unknown>
  ): {
    addModel: (data: string, format: string) => void;
    setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void;
    zoomTo: () => void;
    zoom: (factor: number) => void;
    spin: (axis: string, speed: number) => void;
    render: () => void;
    clear: () => void;
  };
}
