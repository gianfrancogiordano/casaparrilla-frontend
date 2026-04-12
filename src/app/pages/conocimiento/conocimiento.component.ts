import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';

@Component({
  selector: 'app-conocimiento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conocimiento.component.html',
  styleUrls: ['./conocimiento.component.scss'],
})
export class ConocimientoComponent implements OnInit {
  content = '';
  originalContent = '';
  loading = true;
  saving = false;
  saved = false;
  error = '';

  constructor(private agentService: AgentService) {}

  ngOnInit() {
    this.agentService.getKnowledge().subscribe({
      next: (data) => {
        this.content = data.content;
        this.originalContent = data.content;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo conectar con el agente. ¿Está corriendo Valentina?';
        this.loading = false;
      },
    });
  }

  save() {
    if (this.saving) return;
    this.saving = true;
    this.saved = false;
    this.error = '';

    this.agentService.updateKnowledge(this.content).subscribe({
      next: () => {
        this.originalContent = this.content;
        this.saving = false;
        this.saved = true;
        setTimeout(() => (this.saved = false), 4000);
      },
      error: () => {
        this.error = 'Error guardando. Verifica que el agente esté activo.';
        this.saving = false;
      },
    });
  }

  reset() {
    this.content = this.originalContent;
  }

  get hasChanges(): boolean {
    return this.content !== this.originalContent;
  }

  get wordCount(): number {
    return this.content.trim() ? this.content.trim().split(/\s+/).length : 0;
  }
}
