import { Component, ChangeDetectorRef } from '@angular/core'; // <-- Importamos ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; 
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credenciales = {
    username: '',
    password: ''
  };

  verPassword = false; 
  mensajeToast: string = ''; 

  constructor(
    private authService: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef // <-- Lo inyectamos aquí
  ) {}

  togglePassword() {
    this.verPassword = !this.verPassword;
  }

  mostrarToast(mensaje: string) {
    this.mensajeToast = mensaje;
    this.cdr.detectChanges(); // 
  }

  iniciarSesion() {
    if (!this.credenciales.username || !this.credenciales.password) {
      this.mostrarToast('❌ Error: Por favor completa todos los campos');
      setTimeout(() => {
        this.mensajeToast = '';
        this.cdr.detectChanges();
      }, 3000);
      return;
    }

    this.authService.login(this.credenciales).subscribe({
      next: (respuesta) => {
        const rol = respuesta.mensaje.includes('FUNCIONARIO') ? 'FUNCIONARIO' : 'AFICIONADO';
        localStorage.setItem('rol', rol);
        
        this.mostrarToast('✅ ¡Login exitoso! Redirigiendo al panel...');
        
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        if (err.status === 401) {
          this.mostrarToast('❌ Error: Credenciales incorrectas');
        } else {
          this.mostrarToast('❌ Error: No se pudo conectar con el servidor');
        }
        console.error('Error en el login:', err);

        setTimeout(() => {
          this.mensajeToast = '';
          this.cdr.detectChanges(); // <-- Lo ocultamos y refrescamos pantalla
        }, 3000);
      }
    });
  }
}