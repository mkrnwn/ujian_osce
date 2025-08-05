// =================================================================
//                 DEKLARASI VARIABEL & ELEMEN DOM
// =================================================================
let siklusUjian = [];
let examLog = [];
let indeksSiklusSaatIni = 0;
let timerInterval;
let sisaDetik = 0;
let timerAktif = false;
let isFirstStart = true;
let warningTimeout;

const soundLibrary = [
    { category: 'Tanpa Suara', name: 'Hening', path: '' },
    { category: 'Bel Notifikasi', name: 'Bel Klasik 1', path: 'sounds/bell_classic_1.mp3' },
    { category: 'Bel Notifikasi', name: 'Bel Digital Pendek', path: 'sounds/bell_digital_short.mp3' },
    { category: 'Bel Notifikasi', name: 'Bel Peringatan', path: 'sounds/bell_warning.mp3' },
    { category: 'Suara Manusia', name: 'Instruksi - Baca Soal', path: 'sounds/voice_read_instruction.mp3' },
    { category: 'Suara Manusia', name: 'Instruksi - Mulai Stasiun', path: 'sounds/voice_start_station.mp3' },
    { category: 'Suara Manusia', name: 'Instruksi - Pindah Stasiun', path: 'sounds/voice_move_station.mp3' },
    { category: 'Suara Manusia', name: 'Instruksi - Ujian Selesai', path: 'sounds/voice_exam_finish.mp3' }
];

const el = {
    jumlahStasiun: document.getElementById('jumlahStasiun'),
    durasiBacaSoal: document.getElementById('durasiBacaSoal'),
    durasiPindah: document.getElementById('durasiPindah'),
    peringatanWaktu: document.getElementById('peringatanWaktu'),
    stationListContainer: document.getElementById('station-list-container'),
    statusUjian: document.getElementById('statusUjian'),
    warningText: document.getElementById('warningText'),
    timerDisplayWrapper: document.getElementById('timerDisplay'),
    timerDisplay: {
        min1: document.getElementById('min1'), min2: document.getElementById('min2'),
        sec1: document.getElementById('sec1'), sec2: document.getElementById('sec2'),
    },
    buttons: {
        start: document.getElementById('startBtn'), stop: document.getElementById('stopBtn'),
        restart: document.getElementById('restartBtn'), skip: document.getElementById('skipBtn'),
        downloadReport: document.getElementById('downloadReportBtn'),
    },
    presets: {
        nameInput: document.getElementById('preset-name'),
        select: document.getElementById('preset-select'),
    },
    soundSelectors: {
        read: document.getElementById('readSoundSelect'),
        start: document.getElementById('startSoundSelect'),
        warning: document.getElementById('warningSoundSelect'),
        end: document.getElementById('endSoundSelect'),
        finish: document.getElementById('finishSoundSelect'),
    },
    defaultSounds: {
        opening: document.getElementById('openingSound'),
    },
    loadingScreen: document.getElementById('loadingScreen'),
    welcomeModal: document.getElementById('welcomeModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
};

// =================================================================
//                   FUNGSI UTAMA SIKLUS OSCE
// =================================================================

function bangunSiklus() {
    siklusUjian = [];
    const durasiBacaSoalDetik = parseInt(el.durasiBacaSoal.value) * 60;
    const durasiPindahDetik = parseInt(el.durasiPindah.value) * 60;
    const stationRows = document.querySelectorAll('.station-row');

    stationRows.forEach((row, index) => {
        const namaStasiun = row.querySelector('.station-name').value || `Stasiun ${index + 1}`;
        const durasiStasiunDetik = parseInt(row.querySelector('.station-duration').value) * 60;

        siklusUjian.push({ nama: `Silakan Baca Soal ${namaStasiun}`, durasi: durasiBacaSoalDetik, tipe: 'baca_soal' });
        siklusUjian.push({ nama: `${namaStasiun} Sedang Berlangsung`, durasi: durasiStasiunDetik, tipe: 'stasiun' });
        if (index < stationRows.length - 1) {
            const namaStasiunBerikutnya = document.querySelectorAll('.station-row')[index + 1].querySelector('.station-name').value || `Stasiun ${index + 2}`;
            siklusUjian.push({ nama: `Waktu Pindah ke ${namaStasiunBerikutnya}`, durasi: durasiPindahDetik, tipe: 'pindah' });
        }
    });
    tambahLog("Siklus ujian dibangun berdasarkan pengaturan.");
}

function jalankanSiklusBerikutnya() {
    if (indeksSiklusSaatIni >= siklusUjian.length) {
        selesaikanUjian();
        return;
    }

    const sesi = siklusUjian[indeksSiklusSaatIni];
    sisaDetik = sesi.durasi;
    updateStatus(sesi.nama);
    tambahLog(`Memulai fase: ${sesi.nama}`);
    updateDisplay();

    let soundPath;
    if (sesi.tipe === 'baca_soal') soundPath = el.soundSelectors.read.value;
    if (sesi.tipe === 'stasiun') soundPath = el.soundSelectors.start.value;
    if (sesi.tipe === 'pindah') soundPath = el.soundSelectors.end.value;

    playInstructionalSound(soundPath, () => {
        mulaiTimer();
    });

    indeksSiklusSaatIni++;
}

function mulaiTimer() {
    if (timerAktif) return;
    timerAktif = true;
    el.timerDisplayWrapper.classList.remove('animate-assemble');
    aturTombol(true);

    timerInterval = setInterval(() => {
        sisaDetik--;
        updateDisplay();
        updateLocalStorageState();

        const peringatanDetik = parseInt(el.peringatanWaktu.value) * 60;
        if (sisaDetik === peringatanDetik) {
            tampilkanPeringatan();
        }

        if (sisaDetik < 0) {
            clearInterval(timerInterval);
            timerAktif = false;
            jalankanSiklusBerikutnya();
        }
    }, 1000);
}

function selesaikanUjian() {
    updateStatus("Seluruh Rangkaian Ujian Telah Selesai");
    tambahLog("Ujian Selesai.");
    sisaDetik = 0;
    updateDisplay();
    updateLocalStorageState();
    aturTombol(false, true);
    el.buttons.downloadReport.classList.remove('hidden');
    
    playInstructionalSound(el.soundSelectors.finish.value, () => {});
}

// =================================================================
//                FUNGSI KONTROL & MANAJEMEN
// =================================================================

function persiapanMulai() {
    if (timerAktif) { 
        mulaiTimer();
        return;
    }

    bangunSiklus();
    if (siklusUjian.length === 0) {
        alert("Tidak ada stasiun untuk dijalankan.");
        return;
    }
    
    indeksSiklusSaatIni = 0;
    examLog = [];
    
    if (isFirstStart) {
        tambahLog("Tombol Mulai ditekan untuk pertama kali.");
        playInstructionalSound(el.defaultSounds.opening, () => {
            updateStatus("Persiapan Ujian...");
            tambahLog("Jeda 7 detik dimulai setelah opening sound.");
            setTimeout(() => {
                jalankanSiklusBerikutnya();
            }, 7000);
        });
        isFirstStart = false;
    } else {
        jalankanSiklusBerikutnya();
    }
}

function jedaTimer() {
    clearInterval(timerInterval);
    timerAktif = false;
    aturTombol(false);
    tambahLog("Ujian dijeda.");
}

function restartUjian() {
    if (!confirm("Apakah Anda yakin ingin mengatur ulang seluruh siklus ujian?")) return;
    clearInterval(timerInterval);
    sembunyikanPeringatan();
    timerAktif = false;
    isFirstStart = true;
    indeksSiklusSaatIni = 0;
    siklusUjian = [];
    sisaDetik = 0;
    updateStatus("Ujian Siap Dimulai");
    updateDisplay();
    el.timerDisplayWrapper.classList.add('animate-assemble');
    updateLocalStorageState();
    aturTombol(false);
    el.buttons.downloadReport.classList.add('hidden');
}

function skipKeSiklusBerikutnya() {
    if (!timerAktif) return;
    clearInterval(timerInterval);
    sembunyikanPeringatan();
    timerAktif = false;
    tambahLog("Melompat ke sesi berikutnya.");
    jalankanSiklusBerikutnya();
}

function generateStationInputs() {
    const jumlah = parseInt(el.jumlahStasiun.value) || 0;
    el.stationListContainer.innerHTML = '';
    for (let i = 1; i <= jumlah; i++) {
        const row = document.createElement('div');
        row.className = 'station-row';
        row.innerHTML = `
            <label for="station-name-${i}">Stasiun ${i}:</label>
            <input type="text" id="station-name-${i}" class="station-name" placeholder="Nama Stasiun (opsional)">
            <input type="number" id="station-duration-${i}" class="station-duration" value="15" min="1">
        `;
        el.stationListContainer.appendChild(row);
    }
}

// =================================================================
//                SUARA, PRESET, LAPORAN, & TAMPILAN PUBLIK
// =================================================================

function playSound(path) {
    if (path) {
        const audio = new Audio(path);
        audio.play().catch(e => console.error("Gagal memutar suara:", e));
    }
}

function playInstructionalSound(soundSource, callback) {
    let soundToPlay;
    if (typeof soundSource === 'string') {
        if (!soundSource) {
            callback();
            return;
        }
        soundToPlay = new Audio(soundSource);
    } else {
        soundToPlay = soundSource;
    }

    if (soundToPlay && soundToPlay.src) {
        soundToPlay.onended = null;
        soundToPlay.onended = callback;
        soundToPlay.play().catch(e => {
            console.error("Gagal memutar suara instruksi, menjalankan callback.", e);
            callback();
        });
    } else {
        callback();
    }
}

function populateSoundSelectors() {
    const selectors = Object.values(el.soundSelectors);
    const categories = [...new Set(soundLibrary.map(s => s.category))];

    selectors.forEach(select => {
        select.innerHTML = '';
        categories.forEach(category => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            soundLibrary.filter(s => s.category === category).forEach(sound => {
                const option = document.createElement('option');
                option.value = sound.path;
                option.textContent = sound.name;
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        });
    });
}

function simpanPengaturan() {
    const presetName = el.presets.nameInput.value.trim();
    if (!presetName) { alert("Harap masukkan nama untuk preset!"); return; }

    const stationDetails = [];
    document.querySelectorAll('.station-row').forEach(row => {
        stationDetails.push({
            name: row.querySelector('.station-name').value,
            duration: row.querySelector('.station-duration').value,
        });
    });

    const config = {
        jumlahStasiun: el.jumlahStasiun.value,
        durasiBacaSoal: el.durasiBacaSoal.value,
        durasiPindah: el.durasiPindah.value,
        peringatanWaktu: el.peringatanWaktu.value,
        stations: stationDetails,
        sounds: {
            read: el.soundSelectors.read.value,
            start: el.soundSelectors.start.value,
            warning: el.soundSelectors.warning.value,
            end: el.soundSelectors.end.value,
            finish: el.soundSelectors.finish.value,
        }
    };

    localStorage.setItem(`oscePreset_${presetName}`, JSON.stringify(config));
    alert(`Preset "${presetName}" berhasil disimpan!`);
    muatDaftarPreset();
    el.presets.nameInput.value = '';
}

function muatDaftarPreset() {
    el.presets.select.innerHTML = '<option value="">Pilih Preset...</option>';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('oscePreset_')) {
            const presetName = key.replace('oscePreset_', '');
            const option = document.createElement('option');
            option.value = key;
            option.textContent = presetName;
            el.presets.select.appendChild(option);
        }
    }
}

function muatPengaturan() {
    const key = el.presets.select.value;
    if (!key) { alert("Pilih preset yang akan dimuat!"); return; }

    const config = JSON.parse(localStorage.getItem(key));
    el.jumlahStasiun.value = config.jumlahStasiun;
    el.durasiBacaSoal.value = config.durasiBacaSoal;
    el.durasiPindah.value = config.durasiPindah;
    el.peringatanWaktu.value = config.peringatanWaktu;
    
    generateStationInputs();

    document.querySelectorAll('.station-row').forEach((row, index) => {
        row.querySelector('.station-name').value = config.stations[index].name;
        row.querySelector('.station-duration').value = config.stations[index].duration;
    });

    if (config.sounds) {
        el.soundSelectors.read.value = config.sounds.read;
        el.soundSelectors.start.value = config.sounds.start;
        el.soundSelectors.warning.value = config.sounds.warning;
        el.soundSelectors.end.value = config.sounds.end;
        el.soundSelectors.finish.value = config.sounds.finish;
    }
    alert(`Preset "${key.replace('oscePreset_', '')}" berhasil dimuat!`);
}

function unduhLaporan() {
    let reportContent = `Laporan Ujian OSCE\nTanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;
    reportContent += "========================================\n\n";
    examLog.forEach(log => {
        reportContent += `[${log.timestamp}] ${log.pesan}\n`;
    });

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `laporan-osce-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function bukaLayarPublik() {
    window.open('public.html', '_blank');
}

// =================================================================
//                     FUNGSI BANTU (HELPERS)
// =================================================================

function tampilkanPeringatan() {
    playSound(el.soundSelectors.warning.value);
    tambahLog("Suara peringatan diputar.");

    const warningMinutes = el.peringatanWaktu.value;
    el.warningText.textContent = `Waktu Tersisa ${warningMinutes} Menit`;
    el.warningText.classList.add('visible', 'warning-flash');
    updateLocalStorageState();

    clearTimeout(warningTimeout);
    warningTimeout = setTimeout(sembunyikanPeringatan, 5000);
}

function sembunyikanPeringatan() {
    clearTimeout(warningTimeout);
    el.warningText.classList.remove('visible', 'warning-flash');
    updateLocalStorageState();
}

function updateDisplay() {
    const menit = String(Math.floor(Math.max(sisaDetik, 0) / 60)).padStart(2, '0');
    const detik = String(Math.max(sisaDetik, 0) % 60).padStart(2, '0');
    el.timerDisplay.min1.textContent = menit[0];
    el.timerDisplay.min2.textContent = menit[1];
    el.timerDisplay.sec1.textContent = detik[0];
    el.timerDisplay.sec2.textContent = detik[1];
}

function updateStatus(text) {
    el.statusUjian.textContent = text;
    updateLocalStorageState();
}

function updateLocalStorageState() {
    const state = {
        sisaDetik: sisaDetik,
        status: el.statusUjian.textContent,
        warning: {
            text: el.warningText.textContent,
            visible: el.warningText.classList.contains('visible')
        }
    };
    localStorage.setItem('osceTimerState', JSON.stringify(state));
}

function tambahLog(pesan) {
    const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
    examLog.push({ timestamp, pesan });
}

function aturTombol(sedangBerjalan, selesai = false) {
    el.buttons.start.disabled = sedangBerjalan || selesai;
    el.buttons.stop.disabled = !sedangBerjalan || selesai;
    el.buttons.restart.disabled = sedangBerjalan;
    el.buttons.skip.disabled = !sedangBerjalan || selesai;
    if (selesai) el.buttons.restart.disabled = false;
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

// =================================================================
//                      INISIALISASI APLIKASI
// =================================================================

function closeModal() {
    el.welcomeModal.classList.remove('visible');
    sessionStorage.setItem('welcomeModalShown', 'true');
}

window.addEventListener("load", () => {
    el.jumlahStasiun.addEventListener('change', generateStationInputs);
    el.closeModalBtn.addEventListener('click', closeModal);
    
    document.querySelectorAll('.test-sound-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const selectedSound = document.getElementById(targetId).value;
            playSound(selectedSound);
        });
    });

    populateSoundSelectors();
    generateStationInputs();
    muatDaftarPreset();
    showPage("home");
    updateDisplay();
    el.timerDisplayWrapper.classList.add('animate-assemble');
    
    setTimeout(() => {
        el.loadingScreen.style.opacity = '0';
        setTimeout(() => {
            el.loadingScreen.style.display = 'none';
            if (!sessionStorage.getItem('welcomeModalShown')) {
                el.welcomeModal.classList.add('visible');
            }
        }, 500); 
    }, 2500);
});
