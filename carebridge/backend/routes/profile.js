/**
 * CareBridge - Rotas de Perfil e Relatórios
 * --------------------------------------------------
 * NOTA ACADÉMICA:
 * Fornece a camada de dados para os dashboards do Cuidador e Paciente.
 * A geração de relatórios de saúde permite a ponte entre o cuidador informal
 * e o profissional de saúde clínico, abordando a dimensão colaborativa do projeto.
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDb } from '../config/database.js';

const router = express.Router();

// Get current user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await getDb();
    
    const user = await db.get('SELECT id, name, email, age, relationship, contact, experience, concerns, font_size_preference, language FROM users WHERE id = ?', [userId]);
    
    // Get patient info
    const patient = await db.get('SELECT * FROM patients WHERE caregiver_id = ?', [userId]);
    
    let medications = [];
    let medicalRecords = null;
    
    if (patient) {
      medications = await db.all('SELECT * FROM medications WHERE patient_id = ?', [patient.id]);
      medicalRecords = await db.get('SELECT * FROM medical_records WHERE patient_id = ?', [patient.id]);
    }
    
    res.json({
      user,
      patient,
      medications,
      medicalRecords
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update or create patient profile
router.post('/patient', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, age, diagnosis, beliefs, emergency_contact } = req.body;
    const db = await getDb();
    
    const existing = await db.get('SELECT id FROM patients WHERE caregiver_id = ?', [userId]);
    
    if (existing) {
      await db.run(
        'UPDATE patients SET name = ?, age = ?, diagnosis = ?, beliefs = ?, emergency_contact = ? WHERE id = ?',
        [name, age, diagnosis, beliefs, emergency_contact, existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO patients (caregiver_id, name, age, diagnosis, beliefs, emergency_contact) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, name, age, diagnosis, beliefs, emergency_contact]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update or create complete profile details (caregiver + patient + medications)
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { caregiver, patient, medications } = req.body;
    const db = await getDb();
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    // 1. Update caregiver (users table)
    await db.run(
      'UPDATE users SET age = ?, relationship = ?, contact = ?, experience = ?, concerns = ? WHERE id = ?',
      [caregiver.age, caregiver.relationship, caregiver.contact, caregiver.experience, caregiver.concerns, userId]
    );

    // 2. Update/Insert patient
    let patientId = null;
    const existingPatient = await db.get('SELECT id FROM patients WHERE caregiver_id = ?', [userId]);
    if (existingPatient) {
      patientId = existingPatient.id;
      await db.run(
        'UPDATE patients SET name = ?, age = ?, diagnosis = ?, beliefs = ?, emergency_contact = ? WHERE id = ?',
        [patient.name, patient.age, patient.diagnosis, patient.beliefs, patient.emergency_contact, patientId]
      );
    } else if (patient && patient.name) {
      const result = await db.run(
        'INSERT INTO patients (caregiver_id, name, age, diagnosis, beliefs, emergency_contact) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, patient.name, patient.age, patient.diagnosis, patient.beliefs, patient.emergency_contact]
      );
      patientId = result.lastID;
    }

    if (patientId) {
      // 3. Update/Insert medical records
      const existingRecord = await db.get('SELECT id FROM medical_records WHERE patient_id = ?', [patientId]);
      if (existingRecord) {
        await db.run(
          'UPDATE medical_records SET allergies = ?, behaviors = ?, medical_history = ? WHERE patient_id = ?',
          [patient.allergies, patient.behaviors, patient.medical_history, patientId]
        );
      } else {
        await db.run(
          'INSERT INTO medical_records (patient_id, allergies, behaviors, medical_history) VALUES (?, ?, ?, ?)',
          [patientId, patient.allergies, patient.behaviors, patient.medical_history]
        );
      }

      // 4. Update medications (delete existing and insert new list)
      await db.run('DELETE FROM medications WHERE patient_id = ?', [patientId]);
      if (medications && medications.length > 0) {
        for (const med of medications) {
          if (med.name && med.dosage && med.schedule) {
            await db.run(
              'INSERT INTO medications (patient_id, name, dosage, schedule, notes) VALUES (?, ?, ?, ?, ?)',
              [patientId, med.name, med.dosage, med.schedule, med.notes]
            );
          }
        }
      }
    }

    await db.run('COMMIT');
    res.json({ success: true });
  } catch (error) {
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (e) {}
    res.status(500).json({ error: error.message });
  }
});

router.patch('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { font_size_preference, language } = req.body;
    const db = await getDb();

    if (font_size_preference) {
      const allowed = ['medium', 'large'];
      if (!allowed.includes(font_size_preference)) {
        return res.status(400).json({ error: 'Valor inválido. Use \'medium\' ou \'large\'.' });
      }
      await db.run(
        "UPDATE users SET font_size_preference = ? WHERE id = ?",
        [font_size_preference, userId]
      );
    }

    if (language) {
      const allowedLangs = ['pt', 'en'];
      if (!allowedLangs.includes(language)) {
        return res.status(400).json({ error: 'Valor inválido. Use \'pt\' ou \'en\'.' });
      }
      await db.run(
        "UPDATE users SET language = ? WHERE id = ?",
        [language, userId]
      );
    }

    res.json({ success: true, font_size_preference, language });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
