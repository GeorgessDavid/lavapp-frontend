// src/components/admin/AdminPanel.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { registrarLavadero, registrarUsuarioRol, getLavaderosReal } from '@/lib/api';

export default function AdminPanel() {
  const [lavaderos, setLavaderos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Estados formulario Lavadero
  const [nombreLavadero, setNombreLavadero] = useState('');
  const [direccion, setDireccion] = useState('');
  const [capacidad, setCapacidad] = useState(5);

  // Estados formulario Usuario (Dueño / Empleado)
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [passwordUsuario, setPasswordUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState<'DUENO' | 'EMPLEADO'>('EMPLEADO');
  const [lavaderoSeleccionado, setLavaderoSeleccionado] = useState('');

  useEffect(() => {
    cargarLavaderos();
  }, []);

  const cargarLavaderos = async () => {
    try {
      const data = await getLavaderosReal();
      setLavaderos(data);
    } catch (error) {
      console.error('Error al cargar lavaderos reales:', error);
    }
  };

  const handleCrearLavadero = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      await registrarLavadero({
        nombre: nombreLavadero,
        direccion,
        capacidadPuestos: Number(capacidad),
      });
      setMensaje({ texto: '¡Lavadero registrado con éxito en la Base de Datos!', tipo: 'success' });
      setNombreLavadero('');
      setDireccion('');
      setCapacidad(5);
      cargarLavaderos();
    } catch (error: any) {
      setMensaje({ texto: `Error al registrar lavadero: ${error.message}`, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      await registrarUsuarioRol({
        nombre: nombreUsuario,
        email: emailUsuario,
        password: passwordUsuario,
        rol: rolUsuario,
        lavaderoId: lavaderoSeleccionado ? Number(lavaderoSeleccionado) : undefined,
      });
      setMensaje({ texto: `¡Usuario ${rolUsuario} creado exitosamente!`, tipo: 'success' });
      setNombreUsuario('');
      setEmailUsuario('');
      setPasswordUsuario('');
    } catch (error: any) {
      setMensaje({ texto: `Error al crear usuario: ${error.message}`, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Panel de Administración - Gestión Central</h1>

      {mensaje.texto && (
        <div className={`p-4 rounded ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-750'}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Sección 1: Alta de Lavaderos y Capacidad */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold mb-4">Registrar Nuevo Lavadero & Capacidad</h2>
        <form onSubmit={handleCrearLavadero} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre del Lavadero</label>
            <input
              type="text"
              value={nombreLavadero}
              onChange={(e) => setNombreLavadero(e.target.value)}
              required
              className="w-full border p-2 rounded mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Dirección</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              required
              className="w-full border p-2 rounded mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Capacidad de Puestos (Playón)</label>
            <input
              type="number"
              value={capacidad}
              onChange={(e) => setCapacidad(Number(e.target.value))}
              required
              min={1}
              className="w-full border p-2 rounded mt-1"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Lavadero en BD'}
          </button>
        </form>
      </div>

      {/* Sección 2: Creación de Usuarios (Dueño / Empleado) */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold mb-4">Crear Usuario (Dueño / Empleado)</h2>
        <form onSubmit={handleCrearUsuario} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre Completo</label>
            <input
              type="text"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              required
              className="w-full border p-2 rounded mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Correo Electrónico</label>
            <input
              type="email"
              value={emailUsuario}
              onChange={(e) => setEmailUsuario(e.target.value)}
              required
              className="w-full border p-2 rounded mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              value={passwordUsuario}
              onChange={(e) => setPasswordUsuario(e.target.value)}
              required
              className="w-full border p-2 rounded mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Tipo de Rol</label>
            <select
              value={rolUsuario}
              onChange={(e) => setRolUsuario(e.target.value as 'DUENO' | 'EMPLEADO')}
              className="w-full border p-2 rounded mt-1"
            >
              <option value="EMPLEADO">Empleado</option>
              <option value="DUENO">Dueño</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Asignar a Lavadero</label>
            <select
              value={lavaderoSeleccionado}
              onChange={(e) => setLavaderoSeleccionado(e.target.value)}
              className="w-full border p-2 rounded mt-1"
            >
              <option value="">Seleccione un lavadero...</option>
              {lavaderos.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} - {l.direccion}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrar Usuario'}
          </button>
        </form>
      </div>
    </div>
  );
}