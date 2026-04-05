import { Injectable, signal } from '@angular/core';
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { AlertService } from './alert.service';
import { Order } from './orders.service';

// ─── Specs de la MTP-II ───────────────────────────────────────────────────────
//
//  La impresora MTP-II usa Bluetooth CLÁSICO (SPP / RFCOMM)
//  UUID del protocolo: 00001101-0000-1000-8000-00805F9B34FB  (Serial Port)
//
//  En macOS/Windows, al emparejarla por Bluetooth Clásico, el SO crea un
//  puerto serie virtual (ej: /dev/tty.MTP-II) accesible vía Web Serial API.
//
//  Baud Rate: 9600 bps  |  Data bits: 8  |  Stop bits: 1  |  Parity: None
//
// ─── Constantes de impresión ──────────────────────────────────────────────────
const COLUMNS    = 32;   // 48mm / fuente 12px = 32 chars por línea
const CHUNK_SIZE = 128;  // Bytes por escritura (igual al buffer HW de la MTP-II)

// ─── Comando ESC/POS: cambiar codepage a PC850 ────────────────────────────────
// ESC t 2  →  PC850 (Western European, soporta á é í ó ú ñ ü ¿ ¡)
const CMD_CODEPAGE_PC850 = new Uint8Array([0x1b, 0x74, 0x02]);

@Injectable({ providedIn: 'root' })
export class ThermalPrinterService {

  // Estado reactivo expuesto al template
  readonly conectado       = signal(false);
  readonly nombreImpresora = signal('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private port:   any | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  constructor(private alertService: AlertService) {}

  // ─── Conexión ──────────────────────────────────────────────────────────────

  async conectar(): Promise<void> {
    if (!('serial' in navigator)) {
      this.alertService.alert(
        'Navegador no soportado',
        'Este navegador no soporta Web Serial. Usa Google Chrome en escritorio y asegúrate de que la impresora esté emparejada.',
        'error'
      );
      return;
    }

    try {
      // Mostrar selector de puertos serie del sistema.
      // La impresora MTP-II aparecerá como "MTP-II" o como un puerto /dev/tty.MTP-II
      // una vez emparejada por Bluetooth Clásico en el SO.
      this.port = await (navigator as any).serial.requestPort();

      // Parámetros SPP de la MTP-II (9600 baud, 8N1)
      await this.port!.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' });

      this.writer = this.port!.writable!.getWriter();

      // Inicializar codepage a PC850 para soporte de español
      await this._enviarRaw(CMD_CODEPAGE_PC850);

      this.conectado.set(true);
      this.nombreImpresora.set('MTP-II');

      console.log('[ThermalPrinter] Conectado por Web Serial | Baud: 9600 | Codepage: PC850');

    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('No port selected')) {
        // Usuario canceló el selector
        return;
      }
      console.error('[ThermalPrinter] Error al conectar:', err);
      this.alertService.alert(
        'Error de Conexión',
        `No se pudo conectar a la impresora. ${err?.message ?? ''}\n\nVerifica que esté encendida, emparejada y que uses Chrome.`,
        'error'
      );
      this.conectado.set(false);
    }
  }

  async desconectar(): Promise<void> {
    try {
      this.writer?.releaseLock();
      await this.port?.close();
    } catch { /* ignorar */ }
    this.writer = null;
    this.port   = null;
    this.conectado.set(false);
    this.nombreImpresora.set('');
    console.log('[ThermalPrinter] Desconectado.');
  }

  // ─── Impresión ─────────────────────────────────────────────────────────────

  async imprimirComanda(orden: Order, mesa: string): Promise<void> {
    if (!this.writer) {
      // Si no está conectada, lo enviamos a consola para debug
      this.verTicketEnConsola(orden, mesa);
      console.warn('[ThermalPrinter] Impresora no conectada. Ticket enviado a consola para debug.');
      return;
    }
    const bytes = this._generarTicket(orden, mesa);
    await this._enviarEnChunks(bytes);
  }

  /**
   * Genera una representación visual del ticket en la consola (DEBUG)
   */
  verTicketEnConsola(orden: Order, mesa: string): void {
    const ahora = new Date();
    const hora  = ahora.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const fecha = ahora.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });

    console.group('%c 🧾 TICKET DE IMPRESIÓN (DEBUG) ', 'background: #333; color: #00ff00; font-weight: bold; padding: 2px;');
    console.log('%cWidth: 32 chars', 'color: #888; font-style: italic;');
    console.log('='.repeat(COLUMNS));
    console.log(this._centerText('*** COCINA ***', COLUMNS));
    console.log('='.repeat(COLUMNS));
    console.log(`MESA: ${mesa}`);
    console.log(`Hora: ${hora}   ${fecha}`);
    console.log(`Ord:  ${orden.orderNumber}`);
    console.log('-'.repeat(COLUMNS));

    for (const item of orden.items) {
      const qty = `${item.quantity}x`.padEnd(5);
      const lineas = this._wrapText(item.productName.toUpperCase(), COLUMNS - 6);
      
      console.log(`${qty} ${lineas[0]}`);
      for (let i = 1; i < lineas.length; i++) {
        console.log(`      ${lineas[i]}`);
      }

      if (item.notes) {
        const lineasNotas = this._wrapText(item.notes, COLUMNS - 8);
        for (const ln of lineasNotas) {
          console.log(`      > ${ln}`);
        }
      }
    }

    console.log('='.repeat(COLUMNS));
    const footer = `${orden.items.length} item${orden.items.length !== 1 ? 's' : ''}`;
    console.log(this._centerText(footer, COLUMNS));
    console.log('='.repeat(COLUMNS));
    console.groupEnd();
  }

  private _centerText(text: string, width: number): string {
    if (text.length >= width) return text;
    const side = Math.floor((width - text.length) / 2);
    return ' '.repeat(side) + text + ' '.repeat(width - text.length - side);
  }

  /**
   * Divide un texto en múltiples líneas sin romper palabras si es posible.
   */
  private _wrapText(text: string, width: number): string[] {
    if (!text) return [];
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + (currentLine ? ' ' : '') + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
        // Si una palabra sola es más ancha que el máximo, la picamos por fuerza bruta
        while (currentLine.length > width) {
          lines.push(currentLine.substring(0, width));
          currentLine = currentLine.substring(width);
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // ─── Generación del ticket ESC/POS ─────────────────────────────────────────
  //
  //  Diseño (32 chars por línea):
  //
  //  ================================
  //       *** COCINA ***
  //  ================================
  //  MESA: 4
  //  Hora: 09:42   01/04/2026
  //  Ord:  ORD-1743519745
  //  --------------------------------
  //    2x  Churrasco completo
  //    1x  Costillas BBQ
  //  ================================
  //       3 items
  //

  private _generarTicket(orden: Order, mesa: string): Uint8Array {
    const ahora = new Date();
    const hora  = ahora.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const fecha = ahora.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const encoder = new ReceiptPrinterEncoder({ columns: COLUMNS, language: 'esc-pos' });

    // Sanitizar caracteres especiales del español como fallback de seguridad
    const safe = (s: string) => s
      .replace(/á/g, 'a').replace(/Á/g, 'A')
      .replace(/é/g, 'e').replace(/É/g, 'E')
      .replace(/í/g, 'i').replace(/Í/g, 'I')
      .replace(/ó/g, 'o').replace(/Ó/g, 'O')
      .replace(/ú/g, 'u').replace(/Ú/g, 'U')
      .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/¿/g, '?').replace(/¡/g, '!');

    const ticket = encoder
      .initialize()
      .align('center').bold(true).size('normal')
      .line('*** COCINA ***')
      .bold(false).rule({ style: 'double' })
      .align('left')
      .bold(true).line(`MESA: ${mesa}`).bold(false)
      .line(`Hora: ${hora}   ${fecha}`)
      .line(`Ord:  ${orden.orderNumber}`)
      .rule()
      .align('left');

    for (const item of orden.items) {
      const maxNombre = COLUMNS - 6;
      const lineasNombre = this._wrapText(safe(item.productName), maxNombre);
      
      // Primera línea con la cantidad
      ticket.bold(true).text(`  ${item.quantity}x`).bold(false).line(`  ${lineasNombre[0]}`);
      
      // Líneas subsiguientes indentadas
      for (let i = 1; i < lineasNombre.length; i++) {
        ticket.line(`      ${lineasNombre[i]}`);
      }

      if (item.notes) {
        const lineasNotas = this._wrapText(safe(item.notes), COLUMNS - 8);
        for (const ln of lineasNotas) {
          ticket.line(`      > ${ln}`);
        }
      }
    }

    ticket
      .rule({ style: 'double' })
      .align('center').bold(true)
      .line(`${orden.items.length} item${orden.items.length !== 1 ? 's' : ''}`)
      .bold(false).newline().newline().newline()
      .cut();

    return ticket.encode();
  }

  // ─── Envío de datos brutos (inicialización) ────────────────────────────────

  private async _enviarRaw(data: Uint8Array): Promise<void> {
    await this.writer!.write(data);
    await new Promise(r => setTimeout(r, 100));
  }

  // ─── Envío por chunks (igual al buffer de 128 bytes del HW) ───────────────

  private async _enviarEnChunks(data: Uint8Array): Promise<void> {
    console.log(`[ThermalPrinter] Enviando ${data.length} bytes...`);
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await this.writer!.write(chunk);
      await new Promise(r => setTimeout(r, 50));
    }
    console.log('[ThermalPrinter] Ticket enviado exitosamente.');
  }
}
