import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  private readonly CP_ROJO = '#d32f2f';
  private readonly CP_NARANJA = '#ff9800';

  constructor() { }

  /**
   * Muestra un modal de éxito, error, info o warning
   */
  alert(title: string, text: string, icon: SweetAlertIcon = 'info') {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonColor: this.CP_ROJO,
      confirmButtonText: 'Aceptar',
      heightAuto: false,
      customClass: {
        confirmButton: 'rounded-pill px-4'
      }
    });
  }

  /**
   * Muesta una notificación rápida (Toast) en la esquina superior
   */
  toast(title: string, icon: SweetAlertIcon = 'success') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    return Toast.fire({
      icon,
      title
    });
  }

  /**
   * Muestra un diálogo de confirmación (Sí/No)
   */
  async confirm(title: string, text: string, confirmButtonText: string = 'Sí, continuar'): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: this.CP_ROJO,
      cancelButtonColor: '#6e7881',
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      heightAuto: false,
      customClass: {
        confirmButton: 'rounded-pill px-4',
        cancelButton: 'rounded-pill px-4'
      }
    });

    return result.isConfirmed;
  }

  /**
   * Alerta de error rápida
   */
  error(text: string) {
    return this.alert('Error', text, 'error');
  }

  /**
   * Alerta de éxito rápida
   */
  success(text: string) {
    return this.alert('¡Éxito!', text, 'success');
  }
}
