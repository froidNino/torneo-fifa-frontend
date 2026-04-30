import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GrupoService } from '../../services/grupo/grupo.service';
import { EquipoService } from '../../services/equipo/equipo.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  rolUsuario: string = '';
  resumenGrupos: any[] = [];
  vistaActual: string = 'resumen';

  listaEquipos: any[] = [];
  gruposDisponibles: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  tablaGeneral: any[] = [];

  equipoSeleccionado: string = '';
  grupoSeleccionado: string = '';

  equipoLocalPartido: string = '';
  equipoVisitantePartido: string = '';
  golesLocal: number = 0;
  golesVisitante: number = 0;
  amarillasLocal: number = 0;
  rojasLocal: number = 0;
  amarillasVisitante: number = 0;
  rojasVisitante: number = 0;

  tablaGeneralFiltrada: any[] = []; 
  textoBusqueda: string = '';
  confederacionFiltro: string = 'TODAS';
  
  totalGolesTorneo: number = 0;
  mejorAtaque: string = '-';
  mensajeToast: string = '';
  private timeoutId: any;

  equiposClasificados: any[] = [];
  esEliminacion: boolean = false;
  penalesLocal: number = 0;
  penalesVisitante: number = 0;
  
  mejoresTerceros: any[] = [];
  equiposEliminadosFaseGrupos: any[] = []; 

  // NUEVAS VARIABLES DEL ÁRBOL DINÁMICO 🌳
  enfrentamientosOctavos: any[] = []; // La dejamos temporalmente para que no se rompa tu HTML viejo
  llaves32: any[] = []; // Dieciseisavos
  llaves16: any[] = []; // Octavos
  llaves8: any[] = [];  // Cuartos
  llaves4: any[] = [];  // Semis
  llaves2: any[] = [];  // Gran Final
  campeon: any = null;  // El Rey del Mundo 👑
  guardandoPartido: boolean = false; // Para evitar el doble clic

  // Función para el botón ✖️ del buscador
  limpiarBusqueda() {
    this.textoBusqueda = '';
    this.aplicarFiltros();
  }

  get equiposParaJugar() {
    if (this.esEliminacion) {
      return this.listaEquipos.filter(equipo => equipo.eliminado === false);
    }
    return this.listaEquipos;
  }
  // Verifica si ya están los 48 equipos inscritos
  get torneoLleno(): boolean {
    let totalEquiposInscritos = 0;
    for (let grupo of this.resumenGrupos) {
      if (grupo.equipos) {
        totalEquiposInscritos += grupo.equipos.length;
      }
    }
    return totalEquiposInscritos >= 48;
  }
  
  constructor(
    private router: Router, 
    private grupoService: GrupoService,
    private equipoService: EquipoService, 
    private cdr: ChangeDetectorRef 
  ){}

  registrarEquipo() {
    if (!this.equipoSeleccionado || !this.grupoSeleccionado) {
      alert('⚠️ Por favor selecciona un equipo y un grupo.');
      return;
    }

    this.grupoService.inscribirEquipo(this.grupoSeleccionado, Number(this.equipoSeleccionado)).subscribe({
      next: (respuesta) => {
        alert('✅ ' + respuesta.mensaje);
        this.equipoSeleccionado = '';
        this.grupoSeleccionado = '';
        this.cargarResumen(); 
      },
      error: (err) => {
        alert('❌ Error: ' + err.error.error);
      }
    });
  }

  cambiarVista(nuevaVista: string) {
    this.vistaActual = nuevaVista;
  }
  
  ngOnInit() {
    this.rolUsuario = localStorage.getItem('rol') || 'AFICIONADO';
    this.cargarResumen();
    this.cargarEquipos(); 
  }

  cargarEquipos() {
    this.equipoService.obtenerEquipos().subscribe({
      next: (datos) => {
        this.listaEquipos = datos;
        this.calcularEstadisticas();
        this.generarTablaGeneral(); 
        this.cdr.detectChanges(); 
      },
      error: (err) => console.error('Error cargando equipos', err)
    });
  }

  generarTablaGeneral() {
    this.tablaGeneral = [...this.listaEquipos];

    this.tablaGeneral.sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos; 
      const difB = b.golesFavor - b.golesContra;
      const difA = a.golesFavor - a.golesContra;
      if (difB !== difA) return difB - difA;
      if (b.golesFavor !== a.golesFavor) return b.golesFavor - a.golesFavor; 
      if (a.tarjetasAmarillas !== b.tarjetasAmarillas) return a.tarjetasAmarillas - b.tarjetasAmarillas;
      if (a.tarjetasRojas !== b.tarjetasRojas) return a.tarjetasRojas - b.tarjetasRojas;
      return a.nombre.localeCompare(b.nombre);
    });

    this.aplicarFiltros();
    this.calcularMejoresTerceros(); 
    this.calcularEliminadosGrupos(); 
    this.generarLlaves(); // <- Ahora esta función hace magia
  }

  aplicarFiltros() {
    this.tablaGeneralFiltrada = this.tablaGeneral.filter(equipo => {
      const coincideTexto = equipo.nombre.toLowerCase().includes(this.textoBusqueda.toLowerCase());
      const coincideConf = this.confederacionFiltro === 'TODAS' || equipo.confederacion === this.confederacionFiltro;
      return coincideTexto && coincideConf;
    });
  }

  calcularEstadisticas() {
    this.totalGolesTorneo = this.listaEquipos.reduce((suma, eq) => suma + eq.golesFavor, 0);
    const equipoGoleador = [...this.listaEquipos].sort((a, b) => b.golesFavor - a.golesFavor)[0];
    this.mejorAtaque = (equipoGoleador && equipoGoleador.golesFavor > 0) 
      ? `${this.obtenerBandera(equipoGoleador.nombre)} ${equipoGoleador.nombre}` 
      : 'Por definir';
  }

  cargarResumen() {
    this.grupoService.obtenerResumenGeneral().subscribe({
      next: (datos) => {
        this.resumenGrupos = datos;
        this.calcularMejoresTerceros(); 
        this.calcularEliminadosGrupos(); 
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al cargar los grupos', err);
      }
    });
  }

  cerrarSesion() {
    localStorage.removeItem('rol');
    this.router.navigate(['/login']);
  }

  obtenerBandera(nombreEquipo: string): string {
    const banderas: { [key: string]: string } = {
      // CONMEBOL
      'Colombia': '🇨🇴', 'Ecuador': '🇪🇨', 'Argentina': '🇦🇷', 'Brasil': '🇧🇷',
      'Uruguay': '🇺🇾', 'Perú': '🇵🇪', 'Chile': '🇨🇱', 'Venezuela': '🇻🇪',
      'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴',
      
      // CONCACAF
      'USA': '🇺🇸', 'México': '🇲🇽', 'Canadá': '🇨🇦', 'Costa Rica': '🇨🇷',
      'Panamá': '🇵🇦', 'Jamaica': '🇯🇲', 'Honduras': '🇭🇳', 'El Salvador': '🇸🇻',
      
      // UEFA
      'Francia': '🇫🇷', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'España': '🇪🇸', 'Alemania': '🇩🇪',
      'Portugal': '🇵🇹', 'Italia': '🇮🇹', 'Países Bajos': '🇳🇱', 'Bélgica': '🇧🇪',
      'Croacia': '🇭🇷', 'Suiza': '🇨🇭', 'Dinamarca': '🇩🇰', 'Serbia': '🇷🇸',
      'Polonia': '🇵🇱', 'Suecia': '🇸🇪', 'Gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      
      // AFC (Asia)
      'Japón': '🇯🇵', 'Corea del Sur': '🇰🇷', 'Irán': '🇮🇷', 'Arabia Saudita': '🇸🇦',
      'Australia': '🇦🇺', 'Qatar': '🇶🇦', 'Uzbekistán': '🇺🇿', 'EAU': '🇦🇪',
      
      // CAF (África)
      'Marruecos': '🇲🇦', 'Senegal': '🇸🇳', 'Egipto': '🇪🇬', 'Nigeria': '🇳🇬',
      'Camerún': '🇨🇲', 'Ghana': '🇬🇭', 'Costa de Marfil': '🇨🇮', 'Argelia': '🇩🇿',
      'Mali': '🇲🇱',
      
      // OFC (Oceanía)
      'Nueva Zelanda': '🇳🇿', 'Fiyi': '🇫🇯', 'Tahití': '🇵🇫',
      
      // CASO POR DEFECTO
      'TBD': '🏳️'
    };
    
    return banderas[nombreEquipo] || '🏳️'; 
  }

// ==========================================
  // EL MOTOR DEL TORNEO (ÁRBOL DINÁMICO MEJORADO)
  // ==========================================
  generarLlaves() {
    this.equiposClasificados = this.tablaGeneral.slice(0, 32);

    // 1. DIECISEISAVOS (32 equipos -> 16 llaves)
    this.llaves32 = [];
    for (let i = 0; i < 16; i++) {
      if (this.equiposClasificados[i] && this.equiposClasificados[31 - i]) {
        this.llaves32.push({
          llave: `16avos ${i + 1}`,
          local: this.equiposClasificados[i],
          visitante: this.equiposClasificados[31 - i]
        });
      }
    }
  
    // 🔥 EL NUEVO ÁRBITRO INTELIGENTE 
    const obtenerGanador = (equipoA: any, equipoB: any) => {
      if (!equipoA || !equipoB) return null;

      // REGLA 1: El que haya jugado más partidos, fue el que avanzó.
      if (equipoA.partidosJugados > equipoB.partidosJugados) return equipoA;
      if (equipoB.partidosJugados > equipoA.partidosJugados) return equipoB;

      // REGLA 2: Si tienen los mismos partidos jugados, el que NO está eliminado es el ganador.
      if (equipoA.eliminado && !equipoB.eliminado) return equipoB;
      if (!equipoA.eliminado && equipoB.eliminado) return equipoA;

      // REGLA 3 (HACK DE SIMULACIÓN): Si los datos SQL chocan y ambos equipos están 
      // idénticos, forzamos un ganador para que el mapa no se congele.
      // ¡Y le damos pase directo a la final a Colombia! 🇨🇴
      if (equipoA.nombre === 'Colombia') return equipoA;
      if (equipoB.nombre === 'Colombia') return equipoB;

      return equipoA; // Si no juega Colombia, que pase el Local para que el árbol siga
    };

    // 2. OCTAVOS DE FINAL (16 equipos -> 8 llaves)
    this.llaves16 = [];
    for (let i = 0; i < 8; i++) {
      const ganadorLlave1 = this.llaves32[i * 2] ? obtenerGanador(this.llaves32[i * 2].local, this.llaves32[i * 2].visitante) : null;
      const ganadorLlave2 = this.llaves32[i * 2 + 1] ? obtenerGanador(this.llaves32[i * 2 + 1].local, this.llaves32[i * 2 + 1].visitante) : null;
      this.llaves16.push({ llave: `Octavos ${i + 1}`, local: ganadorLlave1, visitante: ganadorLlave2 });
    }

    // 3. CUARTOS DE FINAL (8 equipos -> 4 llaves)
    this.llaves8 = [];
    for (let i = 0; i < 4; i++) {
      const ganadorLlave1 = this.llaves16[i * 2] ? obtenerGanador(this.llaves16[i * 2].local, this.llaves16[i * 2].visitante) : null;
      const ganadorLlave2 = this.llaves16[i * 2 + 1] ? obtenerGanador(this.llaves16[i * 2 + 1].local, this.llaves16[i * 2 + 1].visitante) : null;
      this.llaves8.push({ llave: `Cuartos ${i + 1}`, local: ganadorLlave1, visitante: ganadorLlave2 });
    }

    // 4. SEMIFINALES (4 equipos -> 2 llaves)
    this.llaves4 = [];
    for (let i = 0; i < 2; i++) {
      const ganadorLlave1 = this.llaves8[i * 2] ? obtenerGanador(this.llaves8[i * 2].local, this.llaves8[i * 2].visitante) : null;
      const ganadorLlave2 = this.llaves8[i * 2 + 1] ? obtenerGanador(this.llaves8[i * 2 + 1].local, this.llaves8[i * 2 + 1].visitante) : null;
      this.llaves4.push({ llave: `Semi ${i + 1}`, local: ganadorLlave1, visitante: ganadorLlave2 });
    }

    // 5. LA GRAN FINAL (2 equipos -> 1 llave)
    this.llaves2 = [];
    const finalistaA = this.llaves4[0] ? obtenerGanador(this.llaves4[0].local, this.llaves4[0].visitante) : null;
    const finalistaB = this.llaves4[1] ? obtenerGanador(this.llaves4[1].local, this.llaves4[1].visitante) : null;
    this.llaves2.push({ llave: `🏆 FINAL`, local: finalistaA, visitante: finalistaB });

    // 6. EL CAMPEÓN DEL MUNDO
    this.campeon = this.llaves2[0] ? obtenerGanador(this.llaves2[0].local, this.llaves2[0].visitante) : null;
  }

  calcularMejoresTerceros() {
    if (!this.resumenGrupos || this.resumenGrupos.length === 0) return;
    if (!this.tablaGeneral || this.tablaGeneral.length === 0) return;

    const nombresTerceros = this.resumenGrupos
      .filter(grupo => grupo.equipos && grupo.equipos.length >= 3)
      .map(grupo => grupo.equipos[2].nombre); 

    const tercerosOrdenados = this.tablaGeneral.filter(equipo => nombresTerceros.includes(equipo.nombre));
    this.mejoresTerceros = tercerosOrdenados.slice(0, 8);
  }

  calcularEliminadosGrupos() {
    if (this.tablaGeneral && this.tablaGeneral.length > 32) {
      this.equiposEliminadosFaseGrupos = this.tablaGeneral.slice(32);
    } else {
      this.equiposEliminadosFaseGrupos = [];
    }
  }

  mostrarToast(mensaje: string) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.mensajeToast = mensaje;
    this.cdr.detectChanges(); 
    this.timeoutId = setTimeout(() => {
      this.mensajeToast = '';
      this.cdr.detectChanges(); 
    }, 6000); 
  }

  guardarPartido() {
    // 1. Bloqueo de doble clic rápido
    if (this.guardandoPartido) return;

    // 2. Validaciones de campos vacíos o equipos repetidos
    if (!this.equipoLocalPartido || !this.equipoVisitantePartido) {
      this.mostrarToast('⚠️ Por favor selecciona ambos equipos.');
      return;
    }
    
    if (this.equipoLocalPartido === this.equipoVisitantePartido) {
      this.mostrarToast('⚠️ Un equipo no puede jugar contra sí mismo.');
      return;
    }

    // 3. Validaciones "Antitrampas" (Lógica pura)
    if (this.golesLocal < 0 || this.golesVisitante < 0) {
      this.mostrarToast('⚠️ Los goles no pueden ser negativos.');
      return;
    }

    if (this.rojasLocal > 11 || this.rojasVisitante > 11) {
      this.mostrarToast('⚠️ Partido suspendido: Un equipo no puede recibir más de 11 rojas.');
      return;
    }

    // 4. Validación de penales
    if (this.esEliminacion && this.golesLocal === this.golesVisitante) {
       if (this.penalesLocal === this.penalesVisitante) {
          this.mostrarToast('⚠️ En muerte súbita, la tanda de penales no puede quedar empatada.');
          return;
       }
    }

    // 5. El Seguro de Vida (Confirmación antes de eliminar)
    if (this.esEliminacion) {
      const seguro = confirm('🔥 ¿Estás seguro de registrar este resultado?\nEl equipo perdedor quedará eliminado del torneo definitivamente.');
      if (!seguro) return; // Si el usuario le da a "Cancelar", abortamos.
    }

    // Si pasamos todas las defensas, bloqueamos el botón
    this.guardandoPartido = true;

    const payload = {
      idEquipoLocal: Number(this.equipoLocalPartido),
      idEquipoVisitante: Number(this.equipoVisitantePartido),
      golesLocal: this.golesLocal,
      golesVisitante: this.golesVisitante,
      amarillasLocal: this.amarillasLocal,
      rojasLocal: this.rojasLocal,
      amarillasVisitante: this.amarillasVisitante,
      rojasVisitante: this.rojasVisitante,
      esEliminacionDirecta: this.esEliminacion,
      penalesLocal: (this.esEliminacion && this.golesLocal === this.golesVisitante) ? this.penalesLocal : null,
      penalesVisitante: (this.esEliminacion && this.golesLocal === this.golesVisitante) ? this.penalesVisitante : null
    };

    this.equipoService.registrarPartido(payload).subscribe({
      next: (res: any) => {
        this.guardandoPartido = false; // Desbloqueamos el botón
        this.mostrarToast('✅ ' + res.mensaje);
        
        // Limpiamos todo
        this.equipoLocalPartido = '';
        this.equipoVisitantePartido = '';
        this.golesLocal = 0;
        this.golesVisitante = 0;
        this.amarillasLocal = 0;
        this.rojasLocal = 0;
        this.amarillasVisitante = 0;
        this.rojasVisitante = 0;
        this.esEliminacion = false; 
        this.penalesLocal = 0; 
        this.penalesVisitante = 0;
        
        this.cargarResumen(); 
        this.cargarEquipos();
      },
      error: (err) => {
        this.guardandoPartido = false; // Desbloqueamos el botón si hay error
        if (err.error && err.error.mensaje) {
          this.mostrarToast('❌ ' + err.error.mensaje);
        } else {
          this.mostrarToast('❌ Error de conexión con el servidor.');
        }
      }
    });
  }
}