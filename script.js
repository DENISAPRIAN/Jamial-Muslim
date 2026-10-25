// ========================================
// KONFIGURASI UTAMA
// ========================================
let jadwal = {};
let audioEnabled = true;

let muteStatus = {
    subuh: false,
    dzuhur: false,
    ashar: false,
    maghrib: false,
    isya: false
};

let adzanPlayed = {};

// ========================================
// GAMBAR BACKGROUND
// ========================================
const fotoSubuh = 'foto/Subuh.png';
const fotoPagi = 'foto/Siang.PNG';
const fotoSore = 'foto/Sore.PNG';
const fotoMalam = 'foto/Malam.png';

// ========================================
// UTILITY
// ========================================
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ========================================
// JAM & BACKGROUND
// ========================================
function updateJam() {
    const now = new Date();
    const jamEl = document.getElementById('jam');
    const tanggalEl = document.getElementById('tanggal');

    if (jamEl) {
        jamEl.textContent = now.toLocaleTimeString('id-ID', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    if (tanggalEl) {
        tanggalEl.textContent = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    updateBackground();
}

function updateBackground() {
    const now = new Date();
    const hour = now.getHours();
    const header = document.querySelector('header');

    let bgImage = './images/default.jpg';

    if (hour >= 5 && hour < 11) {
        bgImage = fotoSubuh;
    } else if (hour >= 11 && hour < 15) {
        bgImage = fotoPagi;
    } else if (hour >= 15 && hour < 18) {
        bgImage = fotoSore;
    } else {
        bgImage = fotoMalam;
    }

    if (header) {
        header.style.backgroundImage = `url('${bgImage}')`;
        header.style.backgroundSize = 'cover';
        header.style.backgroundPosition = 'center';
        header.style.backgroundRepeat = 'no-repeat';
    }
}

// ========================================
// GEOLOCATION TO CITY NAME
// ========================================
async function getCityFromCoords(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
        );
        const data = await res.json();
        const address = data.address || {};
        return address.city || address.regency || address.county || address.town || (data.display_name ? data.display_name.split(', ')[0] : 'Lokasi GPS');
    } catch (e) {
        console.log('❌ Gagal dapat nama kota, pakai koordinat');
        return `Lat:${lat.toFixed(2)} Lon:${lon.toFixed(2)}`;
    }
}

// ========================================
// JADWAL SHOLAT - BERDASARKAN KOORDINAT
// ========================================
async function getPrayerTimes(lat = -6.2088, lon = 106.8456, kota = null) {
    try {
        const savedLocation = localStorage.getItem('muslimLocation');
        if (!kota && savedLocation) {
            try {
                const parsed = JSON.parse(savedLocation);
                kota = parsed.kota || 'Jakarta';
                lat = parsed.lat || lat;
                lon = parsed.lon || lon;
            } catch (e) {
                kota = 'Jakarta';
            }
        } else if (!kota) {
            kota = 'Jakarta';
        }

        const kotaEl = document.getElementById('kota');
        const zonaEl = document.getElementById('zona');

        if (kotaEl) kotaEl.textContent = kota;

        const today = new Date().toISOString().split('T')[0];
        const url = `https://api.aladhan.com/v1/timings/${lat},${lon}?date=${today}&method=20&tune=0,2,0,2,2,2,0,0`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.code === 200) {
            const t = data.data.timings;
            const meta = data.data.meta;
            const timezoneClean = meta.timezone ? meta.timezone.replace('Asia/', '') : '';

            if (zonaEl && timezoneClean) zonaEl.textContent = timezoneClean;

            const cleanTime = (str) => (str ? str.split(' ')[0] : '--:--');

            jadwal = {
                subuh: cleanTime(t.Fajr),
                dzuhur: cleanTime(t.Dhuhr),
                ashar: cleanTime(t.Asr),
                maghrib: cleanTime(t.Maghrib),
                isya: cleanTime(t.Isha)
            };

            localStorage.setItem('muslimLocation', JSON.stringify({
                lat: lat,
                lon: lon,
                kota: kota,
                zona: timezoneClean
            }));

            localStorage.setItem('muslimJadwal', JSON.stringify(jadwal));
            localStorage.setItem('muslimJadwalTanggal', today);

            updateAllDisplay();
            return true;
        }

        return await getPrayerTimesByCity(kota);
    } catch (error) {
        console.error('❌ Error API:', error);
        syncUIState();
        return false;
    }
}

async function getPrayerTimesByCity(kota) {
    try {
        const res = await fetch(
            `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(kota)}&country=Indonesia&method=20&tune=0,2,0,2,2,2,0,0`
        );
        const data = await res.json();

        if (data.code === 200) {
            const t = data.data.timings;
            const cleanTime = (str) => (str ? str.split(' ')[0] : '--:--');

            jadwal = {
                subuh: cleanTime(t.Fajr),
                dzuhur: cleanTime(t.Dhuhr),
                ashar: cleanTime(t.Asr),
                maghrib: cleanTime(t.Maghrib),
                isya: cleanTime(t.Isha)
            };

            localStorage.setItem('muslimJadwal', JSON.stringify(jadwal));
            localStorage.setItem('muslimJadwalTanggal', new Date().toISOString().split('T')[0]);

            updateAllDisplay();
            return true;
        }
    } catch (e) {
        console.log('❌ API error kota');
    }
    return false;
}

function loadJakartaDefault() {
    getPrayerTimes(-6.2088, 106.8456, 'Jakarta');
}

function updateAllDisplay() {
    const waktuSholat = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    waktuSholat.forEach(w => {
        const el1 = document.getElementById(w);
        const el2 = document.getElementById(w + '2');
        if (el1) el1.textContent = jadwal[w] || '--:--';
        if (el2) el2.textContent = jadwal[w] || '--:--';
    });
    syncUIState();
    updateNextAdzan();
}

function syncUIState() {
    const savedLocation = localStorage.getItem('muslimLocation');
    if (savedLocation) {
        try {
            const lokasi = JSON.parse(savedLocation);
            const kotaEl = document.getElementById('kota');
            const zonaEl = document.getElementById('zona');
            if (kotaEl && lokasi.kota) kotaEl.textContent = lokasi.kota;
            if (zonaEl && lokasi.zona) zonaEl.textContent = lokasi.zona;
        } catch (e) {}
    }

    const savedJadwal = localStorage.getItem('muslimJadwal');
    if (savedJadwal) {
        try {
            jadwal = JSON.parse(savedJadwal);
            const waktuSholat = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
            waktuSholat.forEach(w => {
                const el1 = document.getElementById(w);
                const el2 = document.getElementById(w + '2');
                if (el1) el1.textContent = jadwal[w] || '--:--';
                if (el2) el2.textContent = jadwal[w] || '--:--';
            });
        } catch (e) {}
    }
}

window.ambilLokasi = async function() {
    if (!navigator.geolocation) {
        alert('❌ GPS tidak didukung browser');
        return;
    }

    const kotaEl = document.getElementById('kota');
    if (kotaEl) kotaEl.textContent = 'Mencari lokasi...';

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const kota = await getCityFromCoords(lat, lon);
            await getPrayerTimes(lat, lon, kota);
        },
        (err) => {
            const savedLocation = localStorage.getItem('muslimLocation');
            if (savedLocation) {
                try {
                    const lokasi = JSON.parse(savedLocation);
                    if (kotaEl && lokasi.kota) kotaEl.textContent = lokasi.kota;
                    return;
                } catch (e) {}
            }
            alert('Gagal mengambil lokasi. Silakan coba lagi.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
};

function cekAdzan() {
    if (Object.keys(jadwal).length === 0) return;
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    for (let waktu in jadwal) {
        if (currentTime === jadwal[waktu] && !muteStatus[waktu] && !adzanPlayed[waktu]) {
            adzanPlayed[waktu] = true;
            playAdzan(waktu);
        }
    }
    updateNextAdzan();
}

function playAdzan(waktu) {
    const audioSelect = document.getElementById('audio' + capitalize(waktu));
    if (audioSelect && audioSelect.value) {
        try {
            const audio = new Audio(audioSelect.value);
            audio.volume = 0.7;
            audio.play().then(() => showNotification(waktu)).catch(e => {});
        } catch (e) {}
    }
}

function toggleMute(waktu) {
    muteStatus[waktu] = !muteStatus[waktu];
    const btnId = 'mute' + capitalize(waktu);
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.textContent = muteStatus[waktu] ? '🔇 MUTE' : '🔊 ON';
        btn.style.background = muteStatus[waktu] ? '#ef4444' : '#10b981';
    }
}

function updateNextAdzan() {
    if (Object.keys(jadwal).length === 0) return;
    const now = new Date();
    const times = Object.entries(jadwal);

    for (let [nama, jam] of times) {
        const [h, m] = jam.split(':').map(Number);
        const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

        if (targetTime > now) {
            const nextEl = document.getElementById('nextAdzan');
            if (nextEl) nextEl.innerHTML = `🕰️ Adzan <strong>${capitalize(nama)}</strong> <span>${jam}</span>`;
            return;
        }
    }
    const nextEl = document.getElementById('nextAdzan');
    if (nextEl) nextEl.innerHTML = '⏰ Semua adzan selesai';
}

function showNotification(waktu) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: linear-gradient(135deg, #10b981, #059669); color: white;
        padding: 20px 30px; border-radius: 20px; font-family: 'Cairo', sans-serif;
        font-size: 20px; font-weight: bold; box-shadow: 0 20px 40px rgba(16,185,129,0.4);
    `;
    notif.innerHTML = `🕌 WAKTU <strong>${capitalize(waktu).toUpperCase()}</strong>!`;
    document.body.appendChild(notif);
    setTimeout(() => { if (notif.parentNode) notif.remove(); }, 4000);
}

// ========================================
// INISIALISASI UTAMA
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🕌 jamial muslim  - 🚀 STARTED');

    const savedLocation = localStorage.getItem('muslimLocation');
    const savedJadwal = localStorage.getItem('muslimJadwal');
    const savedTanggal = localStorage.getItem('muslimJadwalTanggal');
    const today = new Date().toISOString().split('T')[0];

    if (savedLocation) {
        try {
            const lokasi = JSON.parse(savedLocation);
            const kotaEl = document.getElementById('kota');
            const zonaEl = document.getElementById('zona');

            if (kotaEl) kotaEl.textContent = lokasi.kota || 'Lokasi GPS';
            if (zonaEl) zonaEl.textContent = lokasi.zona || '';

            if (savedJadwal && savedTanggal === today) {
                jadwal = JSON.parse(savedJadwal);
                updateAllDisplay();
            } else {
                getPrayerTimes(lokasi.lat, lokasi.lon, lokasi.kota || 'Lokasi GPS');
            }
        } catch (error) {
            localStorage.clear();
            loadJakartaDefault();
        }
    } else {
        loadJakartaDefault();
    }

    updateJam();
    setInterval(updateJam, 1000);
    setInterval(cekAdzan, 15000);

    // Touch effects & UI state maintenance
    document.querySelectorAll('button, .btn').forEach(btn => {
        btn.addEventListener('touchstart', () => { btn.style.transform = 'scale(0.95)'; });
        btn.addEventListener('touchend', () => { btn.style.transform = ''; });
        btn.addEventListener('click', () => { btn.style.transform = 'scale(0.98)'; });
    });

    document.querySelectorAll('a, .menu-item, .nav-link, button').forEach(item => {
        item.addEventListener('click', () => { setTimeout(syncUIState, 100); });
    });

    console.log('✅ SISTEM LOKASI & JADWAL AKTIF');
});

window.reloadJadwal = () => loadJakartaDefault();

let saveScrollTimer = null;
window.addEventListener('scroll', () => {
    clearTimeout(saveScrollTimer);
    saveScrollTimer = setTimeout(() => {
        localStorage.setItem('muslimScroll_' + location.pathname, window.scrollY.toString());
    }, 200);
}, { passive: true });

window.addEventListener('beforeunload', () => {
    localStorage.setItem('muslimScroll_' + location.pathname, window.scrollY.toString());
});

window.addEventListener('load', () => {
    const savedPosition = localStorage.getItem('muslimScroll_' + location.pathname);
    if (savedPosition !== null) {
        setTimeout(() => { window.scrollTo(0, parseInt(savedPosition, 10)); }, 150);
    }
});

window.addEventListener('popstate', () => { syncUIState(); });

function toggleSidebar() {
    const sidebar = document.getElementById('sidebarMenu');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebarName');
    const overlay = document.getElementById('sidebarOverlay');
    const body = document.body;
    if (sidebar) sidebar.classList.add('active');
    if (overlay) overlay.classList.add('active');
    if (body) body.classList.add('no-scroll');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebarMenu');
    const overlay = document.getElementById('sidebarOverlay');
    const body = document.body;
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (body) body.classList.remove('no-scroll');
    syncUIState();
}

const overlay = document.getElementById('sidebarOverlay');
if (overlay) {
    overlay.addEventListener('click', closeSidebar);
}

// ========================================
// 3D LOGO INTERACTIVE & AUTO ROTATE LOGIC (BOLAK-BALIK KANAN-KIRI)
// ========================================
const logo = document.getElementById("logo3d");
const scene = document.getElementById("scene");

let rotX = -20;
let rotY = -28;
let targetX = rotX;
let targetY = rotY;

let dragging = false;
let previousX = 0;
let previousY = 0;
let velocityX = 0;
let velocityY = 0;
let lastMove = 0;
let lastTime = 0;
let autoRotate = true;

let rotateDirection = 1; // 1 = ke kanan, -1 = ke kiri
const maxAngleY = 45;    
const minAngleY = -45;   
const rotateSpeed = 0.6; 

function render(time = 0) {
    const dt = lastTime ? Math.min((time - lastTime) / 16.67, 2) : 1;
    lastTime = time;

    if (!dragging) {
        if (autoRotate) {
            targetY += rotateSpeed * rotateDirection * dt;

            if (targetY >= maxAngleY) {
                targetY = maxAngleY;
                rotateDirection = -1;
            } else if (targetY <= minAngleY) {
                targetY = minAngleY;
                rotateDirection = 1;
            }
        }

        targetX += velocityX * dt;
        targetY += velocityY * dt;

        velocityX *= Math.pow(.94, dt);
        velocityY *= Math.pow(.94, dt);

        if (Math.abs(velocityX) < .01) velocityX = 0;
        if (Math.abs(velocityY) < .01) velocityY = 0;
    }

    rotX += (targetX - rotX) * Math.min(1, .16 * dt);
    rotY += (targetY - rotY) * Math.min(1, .16 * dt);

    if (logo) {
        logo.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }

    requestAnimationFrame(render);
}

requestAnimationFrame(render);

if (scene) {
    scene.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        dragging = true;
        autoRotate = false;
        previousX = e.clientX;
        previousY = e.clientY;
        lastMove = performance.now();
        velocityX = 0;
        velocityY = 0;
        scene.setPointerCapture(e.pointerId);
        scene.style.cursor = "grabbing";
    });

    scene.addEventListener("pointermove", (e) => {
        if (!dragging) return;

        const dx = e.clientX - previousX;
        const dy = e.clientY - previousY;

        targetY += dx * .8;
        targetX -= dy * .8;

        const now = performance.now();
        const elapsed = Math.max(1, now - lastMove);

        velocityY = (dx * .8) / (elapsed / 16.67);
        velocityX = (-dy * .8) / (elapsed / 16.67);

        previousX = e.clientX;
        previousY = e.clientY;
        lastMove = now;
    });

    function stopDrag() {
        if (!dragging) return;
        dragging = false;
        scene.style.cursor = "grab";
        autoRotate = true;
    }

    scene.addEventListener("pointerup", stopDrag);
    scene.addEventListener("pointercancel", stopDrag);
    scene.addEventListener("lostpointercapture", stopDrag);
}