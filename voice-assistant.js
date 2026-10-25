document.addEventListener('DOMContentLoaded', () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert('Browser tidak mendukung Speech Recognition. Gunakan Google Chrome!');
    return;
  }

  // Deteksi posisi halaman (apakah di dalam folder menu atau di root)
  const isSubfolder = window.location.pathname.includes('/menu/');
  const assImgPath = isSubfolder ? '../ass.png' : 'ass.png';

  // 1. Suara bahasa Indonesia
  let femaleVoice = null;
  let recognition = null;

  function loadVoice() {
    if (!('speechSynthesis' in window)) return;

    const voices = window.speechSynthesis.getVoices();

    femaleVoice = voices.find(v =>
      v.lang.toLowerCase().includes('id') &&
      /female|wanita|gadis|damayanti|google/i.test(v.name)
    ) || voices.find(v =>
      v.lang.toLowerCase().includes('id')
    ) || null;
  }

  loadVoice();

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoice;
  }


  // 2. Tampilan assistant (menggunakan assImgPath dinamis)
  const style = document.createElement('style');
  style.textContent = `
    /* Tombol assistant */
    #btn-assistant.btn-voice {
      position: fixed !important;
      right: 20px !important;
      bottom: 90px !important;
      width: 65px !important;
      height: 65px !important;
      min-width: 65px !important;
      min-height: 65px !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 2px solid rgba(255,255,255,.3) !important;
      border-radius: 50% !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      background: #1e4b3c url("${assImgPath}") center / cover no-repeat !important;
      box-shadow: 0 4px 15px rgba(95,217,142,.4) !important;
      z-index: 99999 !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      touch-action: manipulation !important;
      transition: transform .2s ease, box-shadow .2s ease !important;
    }

    #btn-assistant.btn-voice:hover {
      transform: scale(1.06) !important;
      box-shadow: 0 6px 20px rgba(5,150,105,.6) !important;
    }

    /* Modal assistant: background memenuhi layar */
    .siri-modal {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;

      width: 100% !important;
      height: 100% !important;
      height: 100vh !important;
      height: 100dvh !important;

      margin: 0 !important;
      padding: 24px !important;
      border: 0 !important;
      box-sizing: border-box !important;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      z-index: 100000 !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior: contain;
      isolation: isolate;
    }

    .siri-modal.hidden {
      display: none !important;
    }

    /* Lingkaran animasi */
    .siri-circle {
      width: clamp(100px, 18vw, 160px);
      height: clamp(100px, 18vw, 160px);
      flex: 0 0 auto;
      border-radius: 50%;

      background:
        linear-gradient(
          135deg,
          rgba(6,78,59,.75),
          rgba(5,150,105,.55),
          rgba(52,211,153,.35)
        ),
        url("${assImgPath}") center / cover no-repeat;

      border: 2px solid rgba(255,255,255,.35);
      box-shadow:
        0 0 35px rgba(5,150,105,.65),
        0 0 90px rgba(16,185,129,.25);

      animation: pulse 1.2s infinite alternate;
      margin: 0 0 28px;
    }

    /* Status assistant */
    #siri-status {
      color: #059669 ;
      -webkit-text-stroke: 1px black;
      
      font-family: sans-serif;
      font-size: clamp(16px, 2.5vw, 22px);
      line-height: 1.5;
      text-align: center;

      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      padding: 0 16px;

      box-sizing: border-box;
      overflow-wrap: anywhere;
    }

    @keyframes pulse {
      from {
        transform: scale(.96);
        box-shadow: 0 0 25px rgba(5,150,105,.4);
      }

      to {
        transform: scale(1.04);
        box-shadow: 0 0 55px rgba(52,211,153,.75);
      }
    }

    /* Tablet dan laptop dengan layar pendek */
    @media (max-height: 500px) {
      .siri-modal {
        justify-content: flex-start !important;
        padding-top: 20px !important;
        padding-bottom: 20px !important;
      }

      .siri-circle {
        width: 90px;
        height: 90px;
        margin-bottom: 16px;
      }
    }
  `;

  document.head.appendChild(style);

  // 3. Tombol assistant
  const btnAssistant = document.createElement('button');

  btnAssistant.id = 'btn-assistant';
  btnAssistant.className = 'btn-voice';
  btnAssistant.title = 'Panggil Assistant';
  btnAssistant.type = 'button';
  btnAssistant.setAttribute('aria-label', 'Panggil Assistant');

  document.body.appendChild(btnAssistant);

  // 4. Modal assistant
  const siriModal = document.createElement('div');

  siriModal.id = 'siri-modal';
  siriModal.className = 'siri-modal hidden';
  siriModal.innerHTML = `
    <div class="siri-circle"></div>
    <p id="siri-status">Izinkan mikrofon...</p>
  `;

  document.body.appendChild(siriModal);

  const siriStatus = document.getElementById('siri-status');

  // 5. Daftar menu website
  const menuMap = {
    'beranda': 'menu/index.html',
    'home': 'menu/index.html',
    'wudhu': 'menu/wudhu.html',
    'wudu': 'menu/wudhu.html',
    'sholat': 'menu/doa-sholat.html',
    'solat': 'menu/doa-sholat.html',
    'dzikir': 'menu/dzikir.html',
    'zikir': 'menu/dzikir.html',
    'tasbih': 'menu/tasbih.html',
    'kiblat': 'menu/kompas.html',
    'kompas': 'menu/kompas.html',
    'quran': 'menu/alquran.html',
    'al quran': 'menu/alquran.html',
    'alquran': 'menu/alquran.html',
    'asmaul husna': 'menu/asmaallah.html',
    'asmaulhusna': 'menu/asmaallah.html',
    'asmaul': 'menu/asmaallah.html',
    'husna': 'menu/asmaallah.html',
    'nama nama allah': 'menu/asmaallah.html',
    'kalender': 'menu/hijriah.html',
    'hijriah': 'menu/hijriah.html',
    'tahlil': 'menu/tahlil.html',
    'nabi': 'menu/nama-namanabi.html',
    'malaikat': 'menu/malaikat.html',
    'zakat': 'menu/zakat.html'
  };


  // 6. Daftar nama surah dan variasi pengucapan
  const surahNames = [
    'fatihah', 'al fatihah', 'alfatihah', 'fateha',
    'al fateha', 'fatiha', 'faticha', 'alfateha',
    'baqarah', 'al baqarah', 'albaqarah',
    'baqoroh', 'baqaroh', 'bakoroh', 'baqara',
    'al baqara', 'bakara',
    'ali imran', 'alimran', 'imran', 'ali imron',
    'al imran', 'al imron',
    'nisa', 'an nisa', 'annisa', 'an nisaa',
    'annisaa', 'nisaa', 'nisak',
    'maidah', 'al maidah', 'alma idah', 'maedah',
    'maida', 'al maida',
    'anam', 'al anam', 'alanam', 'an am',
    'araf', 'al araf', 'alaraf', 'ar araf',
    'anfal', 'al anfal', 'alanfal',
    'taubah', 'at taubah', 'attaubah',
    'tauba', 'tawbah', 'at tauba',
    'yunus', 'yunos',
    'hud', 'huud',
    'yusuf', 'yusup', 'yusof',
    'rad', 'ar rad', 'ar raad', 'raad',
    'ibrahim', 'ibrohim', 'ibrahiim',
    'hijr', 'al hijr', 'alhijr',
    'nahl', 'an nahl', 'annahl',
    'isra', 'al isra', 'isro', 'israa',
    'kahfi', 'al kahfi', 'alkahfi',
    'kahf', 'alkahf', 'kahfii',
    'maryam', 'mariam',
    'taha', 'ta ha', 'thoha', 'thaha',
    'anbiya', 'al anbiya', 'anbiyaa',
    'hajj', 'al hajj', 'haji',
    'muminun', 'al muminun', 'mukminun',
    'mu minun', 'muminin',
    'nur', 'an nur', 'annur',
    'furqan', 'al furqan', 'furqon',
    'syuara', 'asy syuara', 'shuara',
    'naml', 'an naml', 'an-naml',
    'qasas', 'al qasas', 'qosos',
    'ankabut', 'al ankabut', 'ankabud',
    'rum', 'ar rum', 'arrum',
    'luqman', 'lukman', 'luqmaan',
    'sajdah', 'as sajdah', 'sajadah',
    'ahzab', 'al ahzab', 'ahzaab',
    'saba', 'as saba',
    'fatir', 'faatir', 'fathir',
    'yasin', 'ya sin', 'yaseen', 'yaasiin',
    'saffat', 'as saffat', 'saffaat',
    'sad', 'shaad', 'shad',
    'zumar', 'az zumar', 'zumaar',
    'ghafir', 'al ghafir', 'gafir',
    'fussilat', 'fushilat', 'fushshilat',
    'syura', 'asy syura', 'shura',
    'zukhruf', 'az zukhruf', 'zukh ruf',
    'dukhan', 'ad dukhan', 'dukhon',
    'jasiyah', 'al jasiyah', 'jaasiyah',
    'ahqaf', 'al ahqaf', 'ahqaaf',
    'muhammad', 'muhamad', 'mohammad',
    'fath', 'al fath', 'alfath',
    'hujurat', 'al hujurat', 'hujurot',
    'qaf', 'qaaf', 'kaaf',
    'zariyat', 'az zariyat', 'dzariyat',
    'tur', 'at tur', 'ath thur',
    'najm', 'an najm', 'annajm',
    'qamar', 'al qamar', 'qomar',
    'rahman', 'ar rahman', 'arrahman',
    'ar rohman', 'arrohman',
    'waqiah', 'al waqiah', 'alwaq', 'waqi', 'waki', 'waqia',
    'hadid', 'al hadid', 'hadiid',
    'mujadilah', 'al mujadilah', 'mujadalah',
    'hasyr', 'al hasyr', 'hasher',
    'mumtahanah', 'al mumtahanah',
    'saff', 'as saff', 'shaff',
    'jumuah', 'al jumuah', 'jumat',
    'munafiqun', 'al munafiqun', 'munafikun',
    'tagabun', 'at tagabun', 'taghabun',
    'talaq', 'at talaq', 'talak',
    'tahrim', 'at tahrim',
    'mulk', 'al mulk', 'almulk', 'muluk',
    'qalam', 'al qalam', 'kalam',
    'haqqah', 'al haqqah', 'haqah',
    'maarij', 'al maarij',
    'nuh', 'nuuh', 'nooh',
    'jin', 'al jin', 'jinn',
    'muzzammil', 'al muzzammil', 'muzammil',
    'muddatstsir', 'mudatsir', 'muddassir',
    'qiyamah', 'al qiyamah', 'kiamat',
    'insan', 'al insan', 'insaan',
    'mursalat', 'al mursalat', 'mursalaat',
    'naba', 'an naba', 'annaba',
    'naba besar', 'berita besar',
    'naziat', 'an naziat', 'naaziat',
    'abasa', 'abassa', 'asa',
    'takwir', 'at takwir', 'takweer',
    'infitar', 'al infitar', 'infitaar',
    'mutaffifin', 'al mutaffifin', 'mutafifin',
    'insyiqaq', 'al insyiqaq', 'inshiqaq',
    'buruj', 'al buruj', 'buruuj',
    'tariq', 'at tariq', 'thariq',
    'ala', 'al ala', 'al a la',
    'ghasyiyah', 'al ghasyiyah', 'ghashiyah',
    'fajr', 'al fajr', 'fajar',
    'balad', 'al balad',
    'syams', 'asy syams', 'shams',
    'lail', 'al lail', 'laili',
    'duha', 'ad duha', 'dhuha',
    'insyirah', 'asy syarh', 'al insyirah',
    'tin', 'at tin', 'tiin',
    'alaq', 'al alaq', 'iqra', 'iqro',
    'qadr', 'al qadr', 'lailatul qadar',
    'bayyinah', 'al bayyinah', 'bayinah',
    'zalzalah', 'az zalzalah', 'zilzalah',
    'adiyat', 'al adiyat', 'aadiyat',
    'qariah', 'al qariah', 'qoriah',
    'takatsur', 'at takatsur',
    'asr', 'al asr', 'ashar',
    'humazah', 'al humazah', 'humazoh',
    'fil', 'al fil', 'gajah',
    'quraisy', 'quraish',
    'maun', 'al maun',
    'kausar', 'al kausar', 'kautsar',
    'kafirun', 'al kafirun',
    'nasr', 'an nasr', 'annasr',
    'lahab', 'al lahab', 'masad',
    'ikhlas', 'al ikhlas', 'al ikhlaas',
    'falaq', 'al falaq', 'alfalaq',
    'nas', 'an nas', 'annas'
  ];


  // 7. Hentikan suara dan mikrofon
  function stopAll() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (recognition) {
      try {
        recognition.abort();
      } catch (error) {
        // Abaikan jika mikrofon sudah berhenti.
      }

      recognition = null;
    }
  }

  // 8. Assistant berbicara
  function speakText(text, callback) {
    if (!('speechSynthesis' in window)) {
      if (callback) callback();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1;
    utterance.pitch = 1.1;

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onend = () => {
      if (callback) callback();
    };

    utterance.onerror = () => {
      if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
  }

  // 9. Tutup modal
  function closeModal() {
    stopAll();
    siriModal.classList.add('hidden');
  }

  // 10. Tombol untuk mulai mendengarkan
  btnAssistant.addEventListener('click', () => {
    stopAll();
    siriModal.classList.remove('hidden');
    startListening();
  });

  // 11. Mulai mendengarkan
  function startListening() {
    stopRecognitionOnly();

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'id-ID';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      siriStatus.textContent = 'Mendengarkan... Silakan bicara!';
    };

    recognition.onresult = event => {
      const result = event.results[0][0];
      const text = result.transcript.trim().toLowerCase();

      siriStatus.textContent = 'Mendengar: "' + text + '"';
      stopRecognitionOnly();

      if (/^(hai|halo|hello|hai jami|halo jami|hai muslim|halo muslim)$/i.test(text)) {
        speakText('Iya, ada yang bisa saya bantu?', () => {
          startListeningCommand();
        });
        return;
      }

      executeCommand(text);
    };

    recognition.onerror = event => {
      siriStatus.textContent =
        event.error === 'not-allowed'
          ? 'Mikrofon belum diizinkan di browser.'
          : 'Suara tidak tertangkap. Silakan coba lagi.';

      stopRecognitionOnly();
      setTimeout(closeModal, 1600);
    };

    recognition.onend = () => {};

    try {
      recognition.start();
    } catch (error) {
      stopRecognitionOnly();
      siriStatus.textContent = 'Mikrofon belum siap. Coba tekan tombol lagi.';
    }
  }

  function stopRecognitionOnly() {
    if (recognition) {
      const oldRecognition = recognition;
      recognition = null;

      try {
        oldRecognition.abort();
      } catch (error) {}
    }
  }

  // 12. Mendengarkan perintah setelah sapaan
  function startListeningCommand() {
    siriModal.classList.remove('hidden');

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'id-ID';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      siriStatus.textContent = 'Silakan sebutkan perintah...';
    };

    recognition.onresult = event => {
      const text = event.results[0][0].transcript.trim().toLowerCase();

      siriStatus.textContent = 'Mendengar: "' + text + '"';
      stopRecognitionOnly();
      executeCommand(text);
    };

    recognition.onerror = () => {
      stopRecognitionOnly();
      siriStatus.textContent = 'Suara tidak tertangkap.';
      setTimeout(closeModal, 1200);
    };

    try {
      recognition.start();
    } catch (error) {
      stopRecognitionOnly();
      closeModal();
    }
  }

  // 13. Deteksi waktu dan lokasi
  function handleTimeAndLocation() {
    siriStatus.textContent = 'Mendeteksi waktu dan lokasi...';

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    if (!navigator.geolocation) {
      fallbackTime(hours, minutes);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const url =
            'https://nominatim.openstreetmap.org/reverse?format=json&lat=' +
            position.coords.latitude +
            '&lon=' +
            position.coords.longitude;

          const response = await fetch(url);
          const data = await response.json();
          const address = data.address || {};

          const city =
            address.city ||
            address.town ||
            address.city_district ||
            address.county ||
            address.state ||
            'Indonesia';

          const reply = `Sekarang jam ${hours} ${minutes}, di lokasi ${city}.`;

          siriStatus.textContent = reply;
          speakText(reply, () => setTimeout(closeModal, 1200));
        } catch (error) {
          fallbackTime(hours, minutes);
        }
      },
      () => fallbackTime(hours, minutes),
      { timeout: 5000 }
    );
  }

  function fallbackTime(hours, minutes) {
    const reply = `Sekarang jam ${hours} ${minutes}.`;

    siriStatus.textContent = reply;
    speakText(reply, () => setTimeout(closeModal, 1200));
  }

  // 14. Normalisasi teks
  function normalizeText(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 15. Jalankan perintah
  function executeCommand(text) {
    const originalText = text.trim().toLowerCase();
    const cleanText = normalizeText(originalText);

    if (/\b(jam|pukul|waktu)\b/.test(cleanText)) {
      handleTimeAndLocation();
      return;
    }

    const quranRequested =
      /\b(quran|alquran|surah|surat|ayat|juz)\b/.test(cleanText) ||
      surahNames.some(name => cleanText.includes(name));

    if (quranRequested) {
      sessionStorage.setItem('auto_play_quran', 'true');
      sessionStorage.setItem('target_quran_query', originalText);

      const ayatMatch = cleanText.match(/\bayat\s*(\d+)\b/);

      if (ayatMatch) {
        sessionStorage.setItem('target_ayat', ayatMatch[1]);
      } else {
        sessionStorage.removeItem('target_ayat');
      }

      siriStatus.textContent = 'Membuka perintah Al-Qur’an...';

      speakText('Membuka Al-Qur’an.', () => {
        closeModal();

        const currentPage = window.location.pathname
          .split('/')
          .pop()
          .toLowerCase();

        if (currentPage === 'alquran.html') {
          window.location.reload();
        } else {
          window.location.href = isSubfolder ? 'alquran.html' : 'menu/alquran.html';
        }
      });

      return;
    }

    const commandText = cleanText.replace(
      /^(tolong\s+)?(bisa\s+)?(coba\s+)?(bukakan|buka|tampilkan|masuk ke|pergi ke|open|go to|menu)\s+/,
      ''
    ).trim();

    const matchedKey = Object.keys(menuMap)
      .sort((a, b) => b.length - a.length)
      .find(key =>
        commandText === key ||
        commandText.includes(key)
      );

    if (matchedKey) {
      siriStatus.textContent = 'Membuka menu ' + matchedKey + '...';

      speakText('Membuka menu ' + matchedKey + '.', () => {
        closeModal();
        
        let targetUrl = menuMap[matchedKey];
        if (isSubfolder) {
          if (targetUrl.startsWith('menu/')) {
            targetUrl = targetUrl.replace('menu/', '');
          } else {
            targetUrl = '../' + targetUrl;
          }
        }
        window.location.href = targetUrl;
      });

      return;
    }

    siriStatus.textContent =
      'Perintah belum dikenali: "' + originalText + '"';

    speakText(
      'Maaf, perintah belum dikenali. Silakan coba dengan nama menu atau nama surah.',
      () => setTimeout(closeModal, 1500)
    );
  }
});