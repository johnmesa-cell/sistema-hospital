'use client';

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function ProgramarCitaForm() {
  const [medicos, setMedicos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [form, setForm] = useState({
    idMedico: '', idPaciente: '', fecha: new Date(), hora: ''
  });
  const [mensaje, setMensaje] = useState('');
  const [disponible, setDisponible] = useState(true);

  useEffect(() => {
    fetch('/api/citas/medicos').then(r => r.json()).then(setMedicos);
    fetch('/api/citas/pacientes').then(r => r.json()).then(setPacientes);
  }, []);

  const verificar = async () => {
    const res = await fetch(
      `/api/citas/disponibilidad?id_medico=${form.idMedico}&fecha=${form.fecha.toISOString().split('T')[0]}&hora=${form.hora}`
    );
    const data = await res.json();
    setDisponible(data.disponible);
    setMensaje(data.disponible ? 'Disponible' : 'Horario ocupado');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!disponible) return;

    const res = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_medico: form.idMedico,
        id_paciente: form.idPaciente,
        fecha: form.fecha.toISOString().split('T')[0],
        hora: form.hora
      })
    });

    const data = await res.json();
    setMensaje(res.ok ? 'Cita programada!' : data.error);
  };

  return (
    <form onSubmit={submit} className="max-w-lg mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Programar Cita</h2>

      <div className="mb-4">
        <label className="block font-medium">Médico</label>
        <select
          value={form.idMedico}
          onChange={e => setForm({...form, idMedico: e.target.value})}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">Selecciona...</option>
          {medicos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <label className="block font-medium">Paciente</label>
        <select
          value={form.idPaciente}
          onChange={e => setForm({...form, idPaciente: e.target.value})}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">Selecciona...</option>
          {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <label className="block font-medium">Fecha</label>
        <DatePicker
          selected={form.fecha}
          onChange={date => setForm({...form, fecha: date})}
          className="w-full border p-2 rounded"
          dateFormat="yyyy-MM-dd"
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium">Hora</label>
        <input
          type="time"
          value={form.hora}
          onChange={e => setForm({...form, hora: e.target.value})}
          className="w-full border p-2 rounded"
          required
        />
      </div>

      <button type="button" onClick={verificar} className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
        Verificar
      </button>
      <button type="submit" disabled={!disponible} className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50">
        Programar
      </button>

      <p className="mt-4 text-sm">{mensaje}</p>
    </form>
  );
}