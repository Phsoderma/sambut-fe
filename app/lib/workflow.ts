import { WorkflowState, UserIntent, StaffIntent } from './types';

export interface StateConfig {
  id: WorkflowState;
  title: string;
  questionText: string;
  bisindoVideoUrl?: string;
  signDescription: string;
  allowedUserIntents: UserIntent[];
  allowedStaffIntents: StaffIntent[];
  nextState: WorkflowState;
  previousState?: WorkflowState;
}

export const WORKFLOW_STATES: Record<WorkflowState, StateConfig> = {
  START: {
    id: 'START',
    title: 'Persiapan Sesi',
    questionText: 'SAMBUT siap digunakan. Silakan tunggu petugas memulai sesi.',
    signDescription: 'Sesi belum dimulai. Petugas loket akan memilih alur pendaftaran.',
    allowedUserIntents: ['YA'],
    allowedStaffIntents: ['TANYA_STATUS_PASIEN'],
    nextState: 'PATIENT_STATUS',
  },
  PATIENT_STATUS: {
    id: 'PATIENT_STATUS',
    title: 'Status Pasien',
    questionText: 'Apakah Anda pernah berobat di Puskesmas ini sebelumnya?',
    signDescription: 'Isyaratkan YA (Pasien Lama) atau TIDAK (Pasien Baru).',
    allowedUserIntents: ['YA', 'TIDAK', 'NEW_PATIENT', 'RETURNING_PATIENT', 'UNKNOWN'],
    allowedStaffIntents: ['TANYA_STATUS_PASIEN', 'KONFIRMASI'],
    nextState: 'IDENTITY',
    previousState: 'START',
  },
  IDENTITY: {
    id: 'IDENTITY',
    title: 'Pemeriksaan Identitas',
    questionText: 'Silakan tunjukkan KTP, KK, atau identitas diri kepada petugas.',
    signDescription: 'Tunjukkan dokumen KTP/KK ke loket lalu isyaratkan YA jika sudah.',
    allowedUserIntents: ['YA', 'TERIMA_KASIH', 'TOLONG', 'UNKNOWN'],
    allowedStaffIntents: ['TANYA_KELUHAN', 'KONFIRMASI'],
    nextState: 'INSURANCE',
    previousState: 'PATIENT_STATUS',
  },
  INSURANCE: {
    id: 'INSURANCE',
    title: 'Status Kepesertaan / BPJS',
    questionText: 'Apakah Anda menggunakan kartu JKN / BPJS Kesehatan?',
    signDescription: 'Isyaratkan YA jika BPJS, atau TIDAK jika Pasien Umum.',
    allowedUserIntents: ['YA', 'TIDAK', 'BPJS', 'GENERAL_PATIENT', 'UNKNOWN'],
    allowedStaffIntents: ['TANYA_BPJS', 'KONFIRMASI'],
    nextState: 'DESTINATION',
    previousState: 'IDENTITY',
  },
  DESTINATION: {
    id: 'DESTINATION',
    title: 'Keperluan & Poli Tujuan',
    questionText: 'Apa keperluan Anda atau keluhan yang dirasakan hari ini?',
    signDescription: 'Isyaratkan SAKIT atau jelaskan keluhan utama Anda.',
    allowedUserIntents: ['SAKIT', 'TOLONG', 'YA', 'TIDAK', 'UNKNOWN'],
    allowedStaffIntents: ['TANYA_KELUHAN', 'KONFIRMASI'],
    nextState: 'CONFIRM',
    previousState: 'INSURANCE',
  },
  CONFIRM: {
    id: 'CONFIRM',
    title: 'Konfirmasi Pendaftaran',
    questionText: 'Apakah data pendaftaran Anda di atas sudah benar?',
    signDescription: 'Isyaratkan YA jika sudah sesuai, atau TIDAK untuk memperbaiki.',
    allowedUserIntents: ['YA', 'TIDAK', 'TERIMA_KASIH', 'UNKNOWN'],
    allowedStaffIntents: ['KONFIRMASI', 'INSTRUKSI_MASUK'],
    nextState: 'COMPLETED',
    previousState: 'DESTINATION',
  },
  COMPLETED: {
    id: 'COMPLETED',
    title: 'Pendaftaran Selesai',
    questionText: 'Pendaftaran selesai. Silakan menunggu panggilan di Ruang Tunggu Poli Umum.',
    signDescription: 'Layanan pendaftaran telah selesai. Terima kasih!',
    allowedUserIntents: ['TERIMA_KASIH'],
    allowedStaffIntents: ['INSTRUKSI_MASUK', 'INSTRUKSI_TUNGGU'],
    nextState: 'COMPLETED',
    previousState: 'CONFIRM',
  },
};

export const INTENT_TRANSLATIONS: Record<UserIntent, { labelText: string; descriptionText: string }> = {
  YA: { labelText: 'Ya / Setuju', descriptionText: 'Pengguna mengonfirmasi pernyataan atau pasien lama.' },
  TIDAK: { labelText: 'Tidak / Belum', descriptionText: 'Pengguna menolak atau baru pertama kali berobat.' },
  TERIMA_KASIH: { labelText: 'Terima Kasih', descriptionText: 'Pengguna menyampaikan ucapan terima kasih.' },
  SAKIT: { labelText: 'Sakit / Ada Keluhan', descriptionText: 'Pengguna melaporkan adanya rasa sakit atau keluhan fisik.' },
  TOLONG: { labelText: 'Minta Bantuan', descriptionText: 'Pengguna memerlukan bantuan lebih lanjut dari petugas.' },
  NEW_PATIENT: { labelText: 'Pasien Baru', descriptionText: 'Pasien baru pertama kali mendaftar.' },
  RETURNING_PATIENT: { labelText: 'Pasien Lama', descriptionText: 'Pasien sudah memiliki rekam medis/kartu berobat.' },
  BPJS: { labelText: 'Peserta BPJS / JKN', descriptionText: 'Menggunakan fasilitas JKN-BPJS.' },
  GENERAL_PATIENT: { labelText: 'Pasien Umum', descriptionText: 'Pendaftaran berobat umum tanpa BPJS.' },
  UNKNOWN: { labelText: 'Isyarat Belum Dipahami', descriptionText: 'Sistem tidak yakin dengan gestur isyarat.' },
};
