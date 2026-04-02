import { Injectable, signal } from '@angular/core';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { Order } from './orders.service';

// ─── Specs reales de la MTP-II (hoja de estado de la impresora) ──────────────
//
//  [BT SPP + BLE]  Name: MTP-II  |  PIN: 0000
//  Max Dots: 128 (heat batch, no el ancho del papel)
//  Print width: 48mm → 384 dots → 32 chars con fuente 12×24
//  Default Font: 12×24
//  Default Codepage: GB2312 (chino) → DEBEMOS cambiar a PC850 para español
//  Feed Line Cmd: LF (0x0A)
//
// ─── UUIDs GATT (BLE mode) ────────────────────────────────────────────────────
const SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
const CHAR_UUID    = '49535343-fe7d-4ae5-8fa9-9fafd205e455';

// ─── Constantes de impresión ──────────────────────────────────────────────────
const COLUMNS    = 32;    // 48mm / fuente 12px = 32 chars por línea
const CHUNK_SIZE = 100;   // bytes por escritura BLE (conservador por MTU BLE)

// ─── Comando ESC/POS: cambiar codepage a PC850 (Western European / español) ───
// ESC t 2  →  Select PC850 (multilingual, soporta á é í ó ú ñ ü ¿ ¡)
const CMD_CODEPAGE_PC850 = new Uint8Array([0x1b, 0x74, 0x02]);

@Injectable({ providedIn: 'root' })
export class ThermalPrinterService {

  // Estado reactivo expuesto al template
  readonly conectado       = signal(false);
  readonly nombreImpresora = signal('');

  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  // ─── Conexión ──────────────────────────────────────────────────────────────

  async conectar(): Promise<void> {
    if (!navigator.bluetooth) {
      alert('Este navegador no soporta Web Bluetooth.\nUsa Chrome en Android o Chrome Desktop.');
      return;
    }
    try {
      // Usamos acceptAllDevices para mostrar todos los dispositivos BLE cercanos.
      // Muchas impresoras térmicas genéricas (MTP-II y clones) NO publican su
      // UUID en los paquetes de advertising, por lo que los filtros por servicio
      // lanzan "Unsupported device". Con acceptAllDevices lo evitamos.
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          SERVICE_UUID,                            // MTP-II / ITPP072 / clones
          '00001800-0000-1000-8000-00805f9b34fb',  // Generic Access
          '00001801-0000-1000-8000-00805f9b34fb',  // Generic Attribute
          '0000ae30-0000-1000-8000-00805f9b34fb',  // Goojprt / Peripage
          '0000ff00-0000-1000-8000-00805f9b34fb',  // ISSC BLE Module
          '0000ffe0-0000-1000-8000-00805f9b34fb',  // HM-10 BLE (común en clones)
        ],
      });

      this.device.addEventListener('gattserverdisconnected', () => this._onDesconectado());

      const server = await this.device.gatt!.connect();

      // Intentar obtener el servicio principal. Si el UUID de fábrica falla,
      // mostramos los servicios reales para diagnóstico en consola.
      let service: BluetoothRemoteGATTService;
      try {
        service = await server.getPrimaryService(SERVICE_UUID);
      } catch {
        // Diagnóstico: listar todos los servicios disponibles en la impresora
        const allServices = await server.getPrimaryServices();
        console.warn(
          '[ThermalPrinter] UUID primario no encontrado. Servicios disponibles:',
          allServices.map(s => s.uuid)
        );
        throw new Error(`UUID de servicio no encontrado. Ver consola para servicios detectados.`);
      }

      this.characteristic = await service.getCharacteristic(CHAR_UUID);

      // Cambiar codepage a PC850 para soporte de español (á,é,í,ó,ú,ñ,ü,¿,¡)
      await this._enviarRaw(CMD_CODEPAGE_PC850);

      this.conectado.set(true);
      this.nombreImpresora.set(this.device.name ?? 'Impresora BLE');

      console.log('[ThermalPrinter] Conectado a:', this.device.name, '| Codepage: PC850');
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        // El usuario cerró el diálogo sin seleccionar → silencioso
        return;
      }
      console.error('[ThermalPrinter] Error al conectar:', err);
      alert(`No se pudo conectar a la impresora.\n\n${err?.message ?? 'Error desconocido'}\n\n¿Está encendida y cerca del dispositivo?`);
      this.conectado.set(false);
    }
  }

  desconectar(): void {
    this.device?.gatt?.disconnect();
    this._onDesconectado();
  }

  private _onDesconectado(): void {
    this.conectado.set(false);
    this.nombreImpresora.set('');
    this.characteristic = null;
    console.log('[ThermalPrinter] Desconectado.');
  }

  // ─── Impresión ─────────────────────────────────────────────────────────────

  async imprimirComanda(orden: Order, mesa: string): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Impresora no conectada.');
    }
    const bytes = this._generarTicket(orden, mesa);
    await this._enviarEnChunks(bytes);
  }

  // ─── Generación del ticket ESC/POS ─────────────────────────────────────────
  //
  //  Diseño para papel 57mm / 32 chars por línea / fuente 12×24
  //
  //  ================================  (32 =)
  //     COMANDA - COCINA
  //  ================================
  //  Mesa: 4        Hora: 09:42
  //  Fecha: 01/04/2026
  //  Orden: ORD-1743519745
  //  --------------------------------
  //    2x  Churrasco completo
  //    1x  Costillas BBQ
  //  --------------------------------
  //  Total: 3 items
  //  ================================
  //

  private _generarTicket(orden: Order, mesa: string): Uint8Array {
    const ahora = new Date();
    const hora  = ahora.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const fecha = ahora.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const encoder = new ReceiptPrinterEncoder({
      columns:  COLUMNS,
      language: 'esc-pos',
    });

    // Reemplazamos caracteres especiales del español para asegurar compatibilidad
    // PC850 los soporta, pero lo hacemos como fallback de seguridad
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

      // ── Header ────────────────────────────────────────────────────────────
      .align('center')
      .bold(true).size('normal')
      .line('*** COCINA ***')
      .bold(false)
      .rule({ style: 'double' })

      // ── Datos de la orden ─────────────────────────────────────────────────
      .align('left')
      .bold(true).line(`MESA: ${mesa}`).bold(false)
      .line(`Hora: ${hora}   ${fecha}`)
      .line(`Ord:  ${orden.orderNumber}`)
      .rule()

      // ── Items ─────────────────────────────────────────────────────────────
      .align('left');

    for (const item of orden.items) {
      // Máx 24 chars para el nombre (deja espacio para " 2x " al inicio)
      const maxNombre = COLUMNS - 6; // "  2x  " = 6 chars
      const nombre = item.productName.length > maxNombre
        ? item.productName.substring(0, maxNombre - 1) + '.'
        : item.productName;
      ticket.bold(true).text(`  ${item.quantity}x`).bold(false).line(`  ${safe(nombre)}`);
      if (item.notes) {
        ticket.line(`      > ${safe(item.notes)}`);
      }
    }

    ticket
      .rule({ style: 'double' })
      .align('center')
      .bold(true)
      .line(`${orden.items.length} item${orden.items.length !== 1 ? 's' : ''}`)
      .bold(false)

      // ── Espacio de corte (feed antes del cut) ─────────────────────────────
      .newline()
      .newline()
      .newline()
      .cut();

    return ticket.encode();
  }

  // ─── Envío raw (para comandos de inicialización) ──────────────────────────

  private async _enviarRaw(data: Uint8Array): Promise<void> {
    await this.characteristic!.writeValue(data.buffer as ArrayBuffer);
    await new Promise(r => setTimeout(r, 100));
  }

  // ─── Envío por chunks (límite MTU BLE conservador) ────────────────────────
  //
  //  La MTP-II puede perderse si los chunks son muy grandes.
  //  Usamos 100 bytes con 60ms de pausa entre cada uno.

  private async _enviarEnChunks(data: Uint8Array): Promise<void> {
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await this.characteristic!.writeValueWithoutResponse(chunk);
      await new Promise(r => setTimeout(r, 60));
    }
    console.log(`[ThermalPrinter] Ticket enviado (${data.length} bytes en chunks de ${CHUNK_SIZE}).`);
  }
}
