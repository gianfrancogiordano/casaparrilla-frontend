import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThermalPrinterService } from '../../services/thermal-printer.service';

@Component({
  selector: 'app-test-printer',
  imports: [CommonModule],
  templateUrl: './test-printer.component.html',
  styleUrl: './test-printer.component.scss'
})
export class TestPrinterComponent implements OnDestroy {
  logs = signal<string[]>([]);
  private originales = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };

  constructor(public printer: ThermalPrinterService) {
    // Interceptar console para mostrarlo en pantalla
    console.log = (...args: any[]) => {
      this.addLog('INFO', args);
      this.originales.log.apply(console, args);
    };
    console.warn = (...args: any[]) => {
      this.addLog('WARN', args);
      this.originales.warn.apply(console, args);
    };
    console.error = (...args: any[]) => {
      this.addLog('ERROR', args);
      this.originales.error.apply(console, args);
    };
  }

  ngOnDestroy() {
    console.log = this.originales.log;
    console.warn = this.originales.warn;
    console.error = this.originales.error;
  }

  addLog(level: string, args: any[]) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    this.logs.update(l => [ `[${level}] ${msg}`, ...l]);
  }

  conectar() {
    this.logs.set([]); // Limpiar logs
    this.printer.conectar();
  }

  desconectar() {
    this.printer.desconectar();
  }

  async testImpresionBasica() {
    if (!this.printer.conectado()) {
       alert("Debes conectar la impresora primero");
       return; 
    }
    try {
      this.addLog('INFO', ['Generando ticket de prueba manual...']);
      
      const char = (this.printer as any).characteristic;
      if (!char) throw new Error('No hay característica conectada');

      const text = "--------------------------------\n      HOLA DESDE CHROME\n       TEST DE IMPRESORA\n--------------------------------\n\n\n\n";
      
      const bytes = new Uint8Array([
        0x1b, 0x40, // Init
        ...Array.from(text).map(c => c.charCodeAt(0)),
        0x1d, 0x56, 0x00 // Cut
      ]);
      
      this.addLog('INFO', ['Enviando por chunks...']);
      for (let i = 0; i < bytes.length; i += 100) {
        let chunk = bytes.slice(i, i+100);
        await char.writeValue(chunk.buffer as ArrayBuffer);
        await new Promise(r => setTimeout(r, 50));
      }
      this.addLog('INFO', ['Impresión manual términada con éxito!']);

    } catch(e: any) {
      this.addLog('ERROR', [ `Falló la impresión cruda: ${e.message}` ]);
    }
  }
}
