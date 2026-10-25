// ========================================
// 1. SISTEM PENGATURAN LOKASI & STORAGE
// ========================================
const CONFIG = {
    DEFAULT_LOKASI: { nama: "Jakarta", lat: -6.2088, lng: 106.8456 },
    STORAGE_KEY_LOKASI: 'user_masjid_location',
    STORAGE_KEY_LOADING: 'lastMasjidLoadingDate',
    STORAGE_KEY_SCROLL: 'user_scroll_positions'
};

// Fungsi Ambil Lokasi Tersimpan (Atau Default jika pertama kali)
function getLokasiTersimpan() {
    const data = localStorage.getItem(CONFIG.STORAGE_KEY_LOKASI);
    return data ? JSON.parse(data) : CONFIG.DEFAULT_LOKASI;
}

// Fungsi Simpan Lokasi Permanen
function simpanLokasiPermanen(nama, lat, lng) {
    const dataLokasi = { nama, lat, lng, tanggalDiperbarui: new Date().toDateString() };
    localStorage.setItem(CONFIG.STORAGE_KEY_LOKASI, JSON.stringify(dataLokasi));
    return dataLokasi;
}

// ========================================
// 2. PRELOADER FULL SCREEN (LOGIKA ANIMASI KONDISIONAL)
// ========================================
function initAplikasiMasjid() {
    const pathHalaman = window.location.pathname;
    
    // Deteksi apakah saat ini benar-benar berada di halaman index/beranda utama
    const isIndexPage = pathHalaman.endsWith('index.html') || pathHalaman === '/' || pathHalaman.endsWith('/') || pathHalaman === '';

    // Deteksi apakah halaman sedang di-refresh
    const navEntries = performance.getEntriesByType('navigation');
    const isRefresh = (navEntries.length > 0 && navEntries[0].type === 'reload') || 
                      (performance.navigation && performance.navigation.type === 1);

    // Cek status penyimpanan navigasi
    const dariMenu = sessionStorage.getItem('dari_menu') === 'true';
    
    // Hapus status setelah dibaca agar bersih
    sessionStorage.removeItem('dari_menu');

    // Aturan Tampil Animasi:
    // - Hanya tampil jika di halaman index DAN bukan karena klik menu/home.
    // - Muncul jika di-refresh (isRefresh) atau pertama kali buka browser (!dariMenu).
    // - Tidak muncul sama sekali jika pengguna mengeklik tombol Home dari menu ikon atau kembali dari subpage.
    if (isIndexPage) {
        if (isRefresh || !dariMenu) {
            tampilkanLoadingOverlay();
        } else {
            console.log('🔄 Animasi dilewati karena berpindah dari menu/ikon.');
        }
    } else {
        console.log('🔄 Animasi dilewati karena bukan di halaman index.');
    }
    
    // Tangkap klik link/menu ikon untuk memastikan tombol Home tidak memunculkan animasi
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.getAttribute('href')) {
            const href = link.getAttribute('href');
            
            // Cek apakah link yang diklik mengarah ke beranda/index (Home)
            const isTargetHome = href.includes('index.html') || href === './' || href === '/' || href.endsWith('index.html');
            
            if (isTargetHome) {
                // Set 'dari_menu' ke true agar saat halaman index dimuat, animasi dilewati
                sessionStorage.setItem('dari_menu', 'true');
            } else {
                // Jika pergi ke halaman lain / subpage
                sessionStorage.setItem('dari_menu', 'true');
            }
        }
    });

    // Inisialisasi Fitur Utama Website
    initManajemenLokasiDanJadwal();
    initRestorasiScroll();
    initJamDanBackground();
}

// Pengecekan Aman: Pastikan berjalan baik saat DOMContentLoaded atau jika sudah siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAplikasiMasjid);
} else {
    initAplikasiMasjid();
}

function tampilkanLoadingOverlay() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';

    // Mengatur posisi full screen dengan background persis seperti style.css (#059669 & Unknown.jpeg)
    Object.assign(loadingOverlay.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        height: '100dvh', // Menyesuaikan tinggi layar HP secara akurat saat address bar muncul/hilang
        boxSizing: 'border-box',
        margin: '0',
        padding: '0',
        backgroundColor: '#059669',
        backgroundImage: 'url("foto/Unknown.jpeg")',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        zIndex: '999999',
        transition: 'opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'opacity'
    });

    // Lapisan efek multiply dan opasitas agar selaras dengan style.css
    const overlayTint = document.createElement('div');
    Object.assign(overlayTint.style, {
        position: 'absolute',
        inset: '0',
        backgroundColor: '#059669',
        opacity: '0.8',
        mixBlendMode: 'multiply',
        zIndex: '-1',
        pointerEvents: 'none'
    });

    // Elemen Background Video diset 'contain' agar tampil utuh tanpa zoom/terpotong di HP/PC
    const bgVideo = document.createElement('video');
    bgVideo.src = 'Background.mp4'; 
    bgVideo.muted = true;
    bgVideo.loop = true; 
    bgVideo.playsInline = true;
    bgVideo.preload = 'auto';
    
    Object.assign(bgVideo.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        objectFit: 'contain', // Menjamin video tampil utuh secara proporsional tanpa zoom atau terpotong
        zIndex: '-2',
        pointerEvents: 'none',
        willChange: 'transform'
    });

    loadingOverlay.appendChild(bgVideo);
    loadingOverlay.appendChild(overlayTint);
    document.documentElement.appendChild(loadingOverlay);

    const styleEl = document.createElement('style');
    styleEl.textContent = `
        #loading-overlay.fade-out { 
            opacity: 0 !important; 
        }
    `;
    document.head.appendChild(styleEl);

    let isClosed = false;
    function tutupOverlay() {
        if (isClosed || !document.getElementById('loading-overlay')) return;
        isClosed = true;
        loadingOverlay.classList.add('fade-out');
        setTimeout(() => {
            loadingOverlay.remove();
            styleEl.remove();
        }, 900);
    }

    // Paksa putar video secara aman
    bgVideo.play().catch(error => {
        console.warn("Autoplay video dicegah oleh browser:", error);
    });

    // Durasi tampil layar animasi dikunci tepat 4 detik (4000ms)
    setTimeout(tutupOverlay, 4000); 
}

// ========================================
// 3. JADWAL SHOLAT & LOKASI PERMANEN
// ========================================
function initManajemenLokasiDanJadwal() {
    const lokasiAktif = getLokasiTersimpan();
    const HARI_INI = new Date().toDateString();
    
    if (lokasiAktif.tanggalDiperbarui !== HARI_INI) {
        console.log("📅 Berganti hari: Mengambil ulang jadwal sholat dengan lokasi terakhir...");
        muatJadwalSholat(lokasiAktif, true);
    } else {
        muatJadwalSholat(lokasiAktif, false);
    }
    
    const btnAmbilLokasi = document.getElementById('btn-ambil-lokasi');
    if (btnAmbilLokasi) {
        btnAmbilLokasi.addEventListener('click', ambilLokasiGPS);
    }
}

function ambilLokasiGPS() {
    if (!navigator.geolocation) {
        alert("Geolokasi tidak didukung oleh browser Anda.");
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const lokasiBaru = simpanLokasiPermanen("Lokasi Saya", latitude, longitude);
            muatJadwalSholat(lokasiBaru, true);
            alert("Lokasi berhasil diperbarui!");
        },
        (error) => {
            console.warn("⚠️ Gagal mengambil GPS. Menggunakan lokasi tersimpan sebelumnya.");
            alert("Gagal mengambil GPS. Menggunakan lokasi tersimpan sebelumnya.");
            const lokasiTersimpan = getLokasiTersimpan();
            muatJadwalSholat(lokasiTersimpan, false);
        }
    );
}

function muatJadwalSholat(lokasi, forceUpdate = false) {
    console.log(`🕌 Memuat jadwal sholat untuk: ${lokasi.nama} (${lokasi.lat}, ${lokasi.lng})`);
    if (forceUpdate) {
        simpanLokasiPermanen(lokasi.nama, lokasi.lat, lokasi.lng);
    }
}

// ========================================
// 4. RESTORASI POSISI SCROLL SETIAP HALAMAN
// ========================================
function initRestorasiScroll() {
    const pathHalaman = window.location.pathname;
    const dataScroll = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_SCROLL) || '{}');
    
    if (dataScroll[pathHalaman] !== undefined) {
        window.scrollTo(0, dataScroll[pathHalaman]);
    }
    
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const dataScrollTerbaru = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_SCROLL) || '{}');
            dataScrollTerbaru[pathHalaman] = window.scrollY;
            localStorage.setItem(CONFIG.STORAGE_KEY_SCROLL, JSON.stringify(dataScrollTerbaru));
        }, 100);
    });
}

// ========================================
// 5. FUNGSI JAM & BACKGROUND DINAMIS
// ========================================
function initJamDanBackground() {
    function updateJamAndBg() {
        const sekarang = new Date();
        const jam = sekarang.getHours();
        
        const elJam = document.getElementById('jam-digital');
        if (elJam) {
            elJam.textContent = sekarang.toLocaleTimeString('id-ID');
        }
        
        const elBg = document.body;
        if (jam >= 5 && jam < 11) {
            elBg.dataset.waktu = 'pagi';
        } else if (jam >= 11 && jam < 15) {
            elBg.dataset.waktu = 'siang';
        } else if (jam >= 15 && jam < 18) {
            elBg.dataset.waktu = 'sore';
        } else {
            elBg.dataset.waktu = 'malam';
        }
    }
    
    setInterval(updateJamAndBg, 1000);
    updateJamAndBg();
}