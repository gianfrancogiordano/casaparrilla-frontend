import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThermalPrinterService } from '../../services/thermal-printer.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-test-printer',
  imports: [CommonModule],
  templateUrl: './test-printer.component.html',
  styleUrl: './test-printer.component.scss'
})
export class TestPrinterComponent implements OnDestroy {
  logs = signal<string[]>([]);

  private originales = {
    log:   console.log,
    warn:  console.warn,
    error: console.error
  };

  constructor(
    public printer: ThermalPrinterService,
    private alertService: AlertService
  ) {
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
    console.log   = this.originales.log;
    console.warn  = this.originales.warn;
    console.error = this.originales.error;
  }

  addLog(level: string, args: any[]) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    this.logs.update(l => [`[${level}] ${msg}`, ...l]);
  }

  conectar() {
    this.logs.set([]);
    this.printer.conectar();
  }

  desconectar() {
    this.printer.desconectar();
  }

  // Test directo por Web Serial: solo texto plano + ESC/POS mínimo
  async testImpresionBasica() {
    if (!this.printer.conectado()) {
      this.alertService.error('Debes conectar la impresora primero.');
      return;
    }
    try {
      this.addLog('INFO', ['Generando ticket de prueba...']);
      // Acceso privado al writer para el test crudo
      const writer = (this.printer as any).writer as WritableStreamDefaultWriter<Uint8Array>;
      if (!writer) throw new Error('No hay writer conectado');

      const texto = "--------------------------------\n" +
                    "   HOLA DESDE WEB SERIAL\n"      +
                    "   TEST DE IMPRESORA MTP-II\n"   +
                    "--------------------------------\n\n\n\n";

      const bytes = new Uint8Array([
        0x1b, 0x40,                                          // ESC @ → Init
        ...Array.from(texto).map(c => c.charCodeAt(0)),      // Texto plano
        0x1d, 0x56, 0x00                                     // GS V 0 → Cut
      ]);

      this.addLog('INFO', [`Enviando ${bytes.length} bytes por Web Serial...`]);
      for (let i = 0; i < bytes.length; i += 128) {
        await writer.write(bytes.slice(i, i + 128));
        await new Promise(r => setTimeout(r, 50));
      }
      this.addLog('INFO', ['✅ Test enviado exitosamente!']);

    } catch (e: any) {
      this.addLog('ERROR', [`Falló el test: ${e.message}`]);
    }
  }
}
