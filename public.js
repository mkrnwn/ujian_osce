// public.js

// =================================================================
//                 DEKLARASI ELEMEN DOM
// =================================================================
const statusDisplay = document.getElementById('statusUjianPublik');
const warningDisplay = document.getElementById('warningTextPublik');
const timerDisplay = document.getElementById('timerDisplayPublik');
const timerSpan = timerDisplay.querySelector('span');

// =================================================================
//                 FUNGSI UTAMA UNTUK SINKRONISASI
// =================================================================

/**
 * Memformat detik menjadi format string MM:SS.
 * @param {number} seconds - Jumlah total detik.
 * @returns {string} - Waktu yang diformat.
 */
function formatTime(seconds) {
    const mins = String(Math.floor(Math.max(seconds, 0) / 60)).padStart(2, '0');
    const secs = String(Math.max(seconds, 0) % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

/**
 * Membaca state dari localStorage dan memperbarui semua elemen di layar publik.
 * Fungsi ini adalah jantung dari sinkronisasi real-time.
 */
function updatePublicView() {
    try {
        const storedState = localStorage.getItem('osceTimerState');
        if (storedState) {
            const state = JSON.parse(storedState);
            
            // 1. Update status utama (misal: "Stasiun 1 Sedang Berlangsung")
            if (statusDisplay.textContent !== state.status) {
                statusDisplay.textContent = state.status;
            }
            
            // 2. Update teks peringatan yang berkedip
            // Cek apakah ada informasi peringatan dan apakah statusnya 'visible'
            if (state.warning && state.warning.visible) {
                warningDisplay.textContent = state.warning.text;
                warningDisplay.classList.add('visible', 'warning-flash');
            } else {
                // Jika tidak ada peringatan, pastikan teksnya hilang
                warningDisplay.classList.remove('visible', 'warning-flash');
            }

            // 3. Update tampilan timer
            timerSpan.textContent = formatTime(state.sisaDetik);
        }
    } catch (error) {
        console.error("Gagal membaca atau mem-parsing state dari localStorage:", error);
        statusDisplay.textContent = "Error Sinkronisasi";
    }
}

// =================================================================
//                      INISIALISASI SINKRONISASI
// =================================================================

// Mulai proses sinkronisasi dengan memeriksa localStorage setiap 250 milidetik.
// Interval ini cukup cepat untuk terasa real-time tanpa membebani browser.
console.log("Halaman publik aktif dan siap untuk sinkronisasi.");
setInterval(updatePublicView, 250);

// Panggil fungsi sekali saat halaman pertama kali dimuat untuk menampilkan state terakhir yang tersimpan.
updatePublicView();
