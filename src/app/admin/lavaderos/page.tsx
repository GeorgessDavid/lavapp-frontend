// src/app/admin/lavaderos/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getLavaderosReal, registrarLavadero, registrarUsuarioRol } from '@/lib/api';
import Link from 'next/link';

export default function AdminLavaderosPage() {
  const [lavaderos, setLavaderos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // --- Formulario 1: Alta de Lavadero ---
  const [nombreLavadero, setNombreLavadero] = useState('');
  const [direccion, setDireccion] = useState('');
  const [capacidadPuestos, setCapacidadPuestos] = useState(5);
  const [emailDueno, setEmailDueno] = useState('');
  const [passwordDueno, setPasswordDueno] = useState('');

  // --- Formulario 2: Creación de Usuarios adicionales ---
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [passwordUsuario, setPasswordUsuario] = useState('');
  const [rol, setRol] = useState<'DUENO' | 'EMPLEADO'>('EMPLEADO');
  const [lavaderoSeleccionadoId, setLavaderoSeleccionadoId] = useState('');

  useEffect(() => {
    cargarLavaderos();
  }, []);

  const cargarLavaderos = async () => {
    try {
      const data = await getLavaderosReal();
      setLavaderos(data || []);
    } catch (error) {
      console.error('Error al cargar lavaderos:', error);
    }
  };

  // Crear Lavadero (Independiente)
  const handleCrearLavadero = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      await registrarLavadero({
        nombreLavadero,
        direccion,
        capacidadPuestos: Number(capacidadPuestos),
        email: emailDueno,
        password: passwordDueno,
      });

      setMensaje({ texto: '¡Lavadero registrado exitosamente!', tipo: 'success' });
      
      // Limpiar Formulario 1
      setNombreLavadero('');
      setDireccion('');
      setCapacidadPuestos(5);
      setEmailDueno('');
      setPasswordDueno('');

      // Recargar lista de lavaderos para el selector del Formulario 2
      await cargarLavaderos();
    } catch (error: any) {
      setMensaje({ texto: `Error al registrar lavadero: ${error.message}`, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Crear Usuario para un Lavadero existente (Independiente)
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lavaderoSeleccionadoId) {
      setMensaje({ texto: 'Debe seleccionar un lavadero de la lista.', tipo: 'error' });
      return;
    }

    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      await registrarUsuarioRol({
        nombre: nombreUsuario,
        email: emailUsuario,
        password: passwordUsuario,
        rol,
        lavaderoId: Number(lavaderoSeleccionadoId),
      });

      setMensaje({ texto: `¡Usuario (${rol}) agregado al lavadero correctamente!`, tipo: 'success' });
      
      // Limpiar Formulario 2
      setNombreUsuario('');
      setEmailUsuario('');
      setPasswordUsuario('');
      setLavaderoSeleccionadoId('');
    } catch (error: any) {
      setMensaje({ texto: `Error al crear usuario: ${error.message}`, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">

      <div>
        <Link 
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
          ← Volver al Dashboard
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración de Lavaderos y Usuarios</h1>
        <p className="text-sm text-gray-500">Cree lavaderos con su dueño inicial y gestione personal adicional.</p>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded-md text-sm ${mensaje.tipo === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Formulario 1: Alta de Lavadero */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">1. Crear Nuevo Lavadero</h2>
          <form onSubmit={handleCrearLavadero} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre del Lavadero</label>
              <input
                type="text"
                value={nombreLavadero}
                onChange={(e) => setNombreLavadero(e.target.value)}
                required
                placeholder="Ej. Lavadero Express"
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dirección</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                required
                placeholder="Ej. Av. Corrientes 1234"
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Capacidad de Puestos</label>
              <input
                type="number"
                value={capacidadPuestos}
                onChange={(e) => setCapacidadPuestos(Number(e.target.value))}
                required
                min={1}
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <hr className="my-2 border-gray-200" />
            <p className="text-xs font-semibold text-gray-500 uppercase">Datos del Dueño Inicial</p>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email del Dueño</label>
              <input
                type="email"
                value={emailDueno}
                onChange={(e) => setEmailDueno(e.target.value)}
                required
                placeholder="dueno@lavadero.com"
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña del Dueño</label>
              <input
                type="password"
                value={passwordDueno}
                onChange={(e) => setPasswordDueno(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Lavadero'}
            </button>
          </form>
        </div>

        {/* Formulario 2: Asignación de Usuarios a un Lavadero Existente */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">2. Agregar Personal a Lavadero</h2>
          <form onSubmit={handleCrearUsuario} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Seleccionar Lavadero Existente</label>
              <select
                value={lavaderoSeleccionadoId}
                onChange={(e) => setLavaderoSeleccionadoId(e.target.value)}
                required
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Elija un lavadero --</option>
                {lavaderos.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre || l.nombreLavadero} - {l.direccion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre del Usuario</label>
              <input
                type="text"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                required
                placeholder="Ej. Pedro Gómez"
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email del Usuario</label>
              <input
                type="email"
                value={emailUsuario}
                onChange={(e) => setEmailUsuario(e.target.value)}
                required
                placeholder="empleado@lavadero.com"
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <input
                type="password"
                value={passwordUsuario}
                onChange={(e) => setPasswordUsuario(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as 'DUENO' | 'EMPLEADO')}
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="EMPLEADO">Empleado</option>
                <option value="DUENO">Dueño Secundario</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Asignar Usuario'}
            </button>
          </form>
        </div>

      </div>
      
    </div>
  );
}

