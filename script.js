const API = {
  quran: "https://api.alquran.cloud/v1",
  aladhan: "https://api.aladhan.com/v1"
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const state = {
  surahs: [],
  currentSurah: 1,
  tasbeeh: 0,
  phrase: "سُبْحَانَ اللَّهِ",
  quizIndex: 0
};

const hadiths = [
  ["إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ", "صحيح البخاري، 1؛ صحيح مسلم، 1907"],
  ["مَنْ لَا يَرْحَمْ لَا يُرْحَمْ", "صحيح البخاري، 5997؛ صحيح مسلم، 2318"],
  ["الدِّينُ النَّصِيحَةُ", "صحيح مسلم، 55"],
  ["مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ", "صحيح مسلم، 2699"]
];

const stories = [
  ["قصة نبي الله نوح عليه السلام", "دعا نوح قومه إلى عبادة الله زمنًا طويلًا وصبر على أذاهم. انظر سورة نوح وسورة هود."],
  ["قصة نبي الله إبراهيم عليه السلام", "تأمّل قصة إبراهيم عليه السلام في التوحيد والثبات والابتلاء. انظر سورة الأنعام وسورة إبراهيم."],
  ["قصة نبي الله يوسف عليه السلام", "تجمع سورة يوسف بين الصبر والعفة والعفو، وتبيّن كيف تتبدل الأحوال بتقدير الله. انظر سورة يوسف."],
  ["قصة نبي الله موسى عليه السلام", "تروي آيات كثيرة مواجهة موسى لفرعون، وما فيها من الثبات والثقة بالله. انظر سورة طه وسورة القصص."]
];

const quizzes = [
  { q: "كم عدد سور القرآن الكريم؟", opts: ["114", "112", "120"], correct: "114", why: "القرآن الكريم يتكوّن من 114 سورة." },
  { q: "ما السورة التي تُسمّى أمّ الكتاب؟", opts: ["البقرة", "الفاتحة", "الإخلاص"], correct: "الفاتحة", why: "من أسماء سورة الفاتحة: أمّ الكتاب." },
  { q: "في أي شهر يصوم المسلمون صيام الفريضة؟", opts: ["شعبان", "رمضان", "شوّال"], correct: "رمضان", why: "صيام رمضان فريضة على المسلم المستطيع." },
  { q: "ما أطول سورة في القرآن الكريم؟", opts: ["آل عمران", "النساء", "البقرة"], correct: "البقرة", why: "سورة البقرة هي أطول سور القرآن الكريم." },
  { q: "كم عدد أركان الإسلام؟", opts: ["خمسة", "ستة", "أربعة"], correct: "خمسة", why: "أركان الإسلام خمسة كما ورد في الحديث." }
];

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

function safeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("تعذّر الاتصال بالخدمة");
  }

  const json = await response.json();

  if (json.code && json.code >= 400) {
    throw new Error(json.status || "تعذّر تحميل البيانات");
  }

  return json;
}

/* القرآن الكريم */

async function loadSurahIndex() {
  const list = $("#surahList");

  try {
    const response = await getJSON(`${API.quran}/surah`);
    state.surahs = response.data;

    renderSurahList();

    let savedSurah = 1;

    try {
      savedSurah = Number(localStorage.getItem("alhuda-last-surah") || 1);
    } catch (error) {}

    await loadSurah(savedSurah, false);
  } catch (error) {
    list.innerHTML = '<div class="error-box">تعذّر تحميل فهرس القرآن. تحقّق من اتصال الإنترنت.</div>';
    $("#ayahContainer").innerHTML = '<div class="error-box">تعذّر الاتصال بمصدر القرآن الكريم.</div>';
  }
}

function renderSurahList(filter = "") {
  const list = $("#surahList");
  const query = filter.trim().toLowerCase();

  const items = state.surahs.filter(surah =>
    !query ||
    surah.name.includes(query) ||
    surah.englishName.toLowerCase().includes(query) ||
    String(surah.number) === query
  );

  if (!items.length) {
    list.innerHTML = '<div class="loading">لا توجد سورة بهذا الاسم.</div>';
    return;
  }

  list.innerHTML = items.map(surah => `
    <button class="surah-option ${surah.number === state.currentSurah ? "active" : ""}"
            data-surah="${surah.number}">
      <span class="surah-number">${surah.number}</span>
      <span>
        <b>${safeText(surah.name)}</b>
        <small>${surah.numberOfAyahs} آيات • ${surah.revelationType === "Meccan" ? "مكية" : "مدنية"}</small>
      </span>
    </button>
  `).join("");

  $$(".surah-option").forEach(button => {
    button.addEventListener("click", () => {
      loadSurah(Number(button.dataset.surah));
    });
  });
}

async function loadSurah(number, scroll = true) {
  if (!Number.isFinite(number) || number < 1 || number > 114) return;

  state.currentSurah = number;

  $("#ayahContainer").innerHTML = '<div class="loading">جارٍ تحميل الآيات…</div>';
  renderSurahList($("#surahSearch").value);

  try {
    const response = await getJSON(
      `${API.quran}/surah/${number}/quran-uthmani`
    );

    const surah = response.data;

    $("#surahTitle").textContent = surah.name;
    $("#surahMeta").textContent =
      `${surah.numberOfAyahs} آيات • ${surah.revelationType === "Meccan" ? "مكية" : "مدنية"}`;

    const basmala = number !== 1 && number !== 9
      ? '<div class="basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>'
      : "";

    $("#ayahContainer").innerHTML = basmala + surah.ayahs.map(ayah => `
      <span class="ayah-wrap">
        <span class="ayah">${safeText(ayah.text)}</span>
        <span class="ayah-num" title="الآية ${ayah.numberInSurah}">
          ${ayah.numberInSurah}
        </span>
      </span>
    `).join(" ");

    $("#readingStatus").textContent =
      "النص القرآني: AlQuran Cloud • رواية حفص";

    try {
      localStorage.setItem("alhuda-last-surah", String(number));
    } catch (error) {}

    $("#lastReadTitle").textContent = surah.name;
    $("#lastReadSubtitle").textContent =
      `السورة ${number} • ${surah.numberOfAyahs} آيات`;

    setAudioSource();

    if (scroll && window.innerWidth < 680) {
      $("#quran").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    $("#ayahContainer").innerHTML =
      '<div class="error-box">تعذّر تحميل السورة. تحقّق من الاتصال ثم حاول مجددًا.</div>';
  }
}

function setAudioSource() {
  const audio = $("#quranAudio");

  audio.pause();

  audio.src =
    `https://cdn.islamic.network/quran/audio-surah/128/${$("#reciterSelect").value}/${state.currentSurah}.mp3`;

  audio.load();
}

$("#surahSearch").addEventListener("input", event => {
  renderSurahList(event.target.value);
});

$("#reciterSelect").addEventListener("change", setAudioSource);

$("#playAudio").addEventListener("click", async () => {
  const audio = $("#quranAudio");

  if (!audio.src) setAudioSource();

  try {
    await audio.play();
  } catch (error) {
    toast("اضغط زر التشغيل في مشغّل الصوت لبدء التلاوة.");
  }
});

$("#saveProgress").addEventListener("click", () => {
  try {
    localStorage.setItem("alhuda-last-surah", String(state.currentSurah));
    toast("تم حفظ آخر سورة على هذا الجهاز.");
  } catch (error) {
    toast("تعذّر حفظ موضع القراءة على هذا الجهاز.");
  }
});

$("#openTafsir").addEventListener("click", () => {
  window.open(
    `https://quran.com/${state.currentSurah}`,
    "_blank",
    "noopener,noreferrer"
  );
});

/* التسبيح */

function updateTasbeehUI() {
  $("#tasbeehCount").textContent = state.tasbeeh;
  $("#todayCount").textContent = state.tasbeeh;
  $("#tasbeehPhrase").textContent = state.phrase;
}

try {
  state.tasbeeh = Number(localStorage.getItem("alhuda-tasbeeh") || 0);
} catch (error) {}

updateTasbeehUI();

$("#tasbeehBtn").addEventListener("click", () => {
  state.tasbeeh++;
  updateTasbeehUI();

  try {
    localStorage.setItem("alhuda-tasbeeh", String(state.tasbeeh));
  } catch (error) {}
});

$("#resetTasbeeh").addEventListener("click", () => {
  state.tasbeeh = 0;
  updateTasbeehUI();

  try {
    localStorage.setItem("alhuda-tasbeeh", "0");
  } catch (error) {}

  toast("تمت إعادة ضبط السبحة.");
});

$$(".phrase-chip").forEach(button => {
  button.addEventListener("click", () => {
    $$(".phrase-chip").forEach(item => item.classList.remove("active"));

    button.classList.add("active");
    state.phrase = button.dataset.phrase;

    updateTasbeehUI();
  });
});

/* مواقيت الصلاة والتقويم الهجري */

async function loadPrayer(city = "Tunis") {
  $("#prayerGrid").innerHTML = '<div class="loading">جارٍ تحميل المواقيت…</div>';

  try {
    const country = city.toLowerCase() === "tunis" ? "Tunisia" : "";

    const url =
      `${API.aladhan}/timingsByCity?city=${encodeURIComponent(city)}` +
      `&country=${encodeURIComponent(country)}&method=3`;

    const response = await getJSON(url);
    const data = response.data;

    displayPrayerData(data, city);
  } catch (error) {
    $("#prayerGrid").innerHTML =
      '<div class="error-box">تعذّر تحميل المواقيت. جرّب اسم مدينة بالإنجليزية.</div>';

    $("#hijriDate").textContent = "التاريخ غير متاح دون اتصال.";
  }
}

function displayPrayerData(data, cityName) {
  const times = data.timings;

  const prayerList = [
    ["الفجر", "Fajr"],
    ["الشروق", "Sunrise"],
    ["الظهر", "Dhuhr"],
    ["العصر", "Asr"],
    ["المغرب", "Maghrib"],
    ["العشاء", "Isha"]
  ];

  $("#cityLabel").textContent =
    cityName === "Tunis" ? "تونس، تونس" : cityName;

  $("#prayerDate").textContent =
    `${data.date.readable} • ${data.date.hijri.date} هـ`;

  $("#prayerGrid").innerHTML = prayerList.map(([arabic, key]) => `
    <div class="prayer-time" data-prayer="${key}">
      <span>${arabic}</span>
      <b>${safeText(String(times[key] || "--:--").split(" ")[0])}</b>
    </div>
  `).join("");

  $("#hijriDate").textContent =
    `${data.date.hijri.day} ${data.date.hijri.month.ar} ${data.date.hijri.year} هـ`;

  $("#hijriHero").textContent =
    `${data.date.hijri.day} ${data.date.hijri.month.ar}`;

  markNextPrayer(times);
}

function markNextPrayer(times) {
  const keys = [
    ["الفجر", "Fajr"],
    ["الظهر", "Dhuhr"],
    ["العصر", "Asr"],
    ["المغرب", "Maghrib"],
    ["العشاء", "Isha"]
  ];

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let next = keys.find(([name, key]) => {
    const [hours, minutes] = String(times[key] || "00:00")
      .split(":")
      .map(Number);

    return hours * 60 + minutes > currentMinutes;
  });

  if (!next) next = keys[0];

  $$(".prayer-time").forEach(element => {
    element.classList.toggle(
      "active",
      element.dataset.prayer === next[1]
    );
  });

  $("#nextPrayerName").textContent = next[0];
  $("#nextPrayerTime").textContent =
    `${String(times[next[1]] || "--:--").split(" ")[0]} • حسب المدينة المختارة`;
}

$("#cityForm").addEventListener("submit", event => {
  event.preventDefault();

  const city = $("#cityInput").value.trim();

  if (city) loadPrayer(city);
});

$("#locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    toast("المتصفح لا يدعم تحديد الموقع.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const { latitude, longitude } = position.coords;

      const response = await getJSON(
        `${API.aladhan}/timings?latitude=${latitude}&longitude=${longitude}&method=3`
      );

      displayPrayerData(response.data, "موقعك الحالي");

      $("#cityLabel").textContent = "موقعك الحالي";
      toast("تم تحديث المواقيت حسب موقعك.");
    } catch (error) {
      toast("تعذّر حساب المواقيت لهذا الموقع.");
    }
  }, () => {
    toast("اسمح للموقع بالوصول إلى موقعك أو أدخل المدينة يدويًا.");
  }, { timeout: 10000 });
});

/* اتجاه القبلة */

$("#qiblaBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    toast("المتصفح لا يدعم تحديد الموقع.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const { latitude, longitude } = position.coords;

      const response = await getJSON(
        `${API.aladhan}/qibla/${latitude}/${longitude}`
      );

      const direction = response.data.direction;

      $("#qiblaResult").textContent =
        `اتجاه القبلة: ${direction.toFixed(1)}° من الشمال باتجاه عقارب الساعة.`;
    } catch (error) {
      $("#qiblaResult").textContent =
        "تعذّر حساب اتجاه القبلة. حاول لاحقًا.";
    }
  }, () => {
    toast("اسمح للموقع بالوصول إلى موقعك لحساب القبلة.");
  }, { timeout: 10000 });
});

/* البحث في القرآن */

$("#globalSearch").addEventListener("submit", async event => {
  event.preventDefault();

  const query = $("#globalSearchInput").value.trim();
  const output = $("#searchResults");

  if (!query) {
    toast("اكتب كلمة أو اسم سورة للبحث.");
    return;
  }

  output.innerHTML = '<div class="loading">جارٍ البحث…</div>';

  const localResults = state.surahs.filter(surah =>
    surah.name.includes(query) ||
    surah.englishName.toLowerCase().includes(query.toLowerCase()) ||
    String(surah.number) === query
  );

  let html = localResults.map(surah => `
    <div class="search-result">
      <button data-go-surah="${surah.number}">${safeText(surah.name)}</button>
      — سورة رقم ${surah.number}
    </div>
  `).join("");

  try {
    const response = await getJSON(
      `${API.quran}/search/${encodeURIComponent(query)}/all/ar`
    );

    const matches = (response.data.matches || []).slice(0, 5);

    html += matches.map(match => `
      <div class="search-result">
        <button data-go-surah="${match.surah.number}">
          ${safeText(match.surah.name)} • آية ${match.numberInSurah}
        </button>
        <div>${safeText(match.text)}</div>
      </div>
    `).join("");
  } catch (error) {
    // تبقى نتائج أسماء السور متاحة إذا تعذّر البحث النصي.
  }

  output.innerHTML = html ||
    '<div class="search-result">لم نعثر على نتيجة. جرّب كلمة عربية أخرى.</div>';

  output.querySelectorAll("[data-go-surah]").forEach(button => {
    button.addEventListener("click", () => {
      loadSurah(Number(button.dataset.goSurah));

      $("#quran").scrollIntoView({ behavior: "smooth" });
    });
  });
});

/* الأحاديث */

let hadithIndex = 0;

$("#nextHadith").addEventListener("click", () => {
  hadithIndex = (hadithIndex + 1) % hadiths.length;

  $(".hadith-text").textContent =
    `«${hadiths[hadithIndex][0]}»`;

  $(".hadith-source").textContent =
    hadiths[hadithIndex][1];
});

/* قصص الأنبياء */

let storyIndex = 0;

$("#nextStory").addEventListener("click", () => {
  storyIndex = (storyIndex + 1) % stories.length;

  $("#storyTitle").textContent = stories[storyIndex][0];
  $("#storyText").textContent = stories[storyIndex][1];
});

/* الاختبار الإسلامي */

function renderQuiz() {
  const quiz = quizzes[state.quizIndex % quizzes.length];

  $("#quizQuestion").textContent = quiz.q;

  $("#quizOptions").innerHTML = quiz.opts.map(option => `
    <button data-answer="${safeText(option)}">
      ${safeText(option)}
    </button>
  `).join("");

  $("#quizFeedback").textContent = "";

  $("#quizOptions").querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      const correct = button.dataset.answer === quiz.correct;

      $("#quizFeedback").textContent = correct
        ? `إجابة صحيحة. ${quiz.why}`
        : `الإجابة الصحيحة: ${quiz.correct}. ${quiz.why}`;

      $("#quizFeedback").style.color =
        correct ? "var(--green-2)" : "#a55a19";
    });
  });
}

$("#newQuiz").addEventListener("click", () => {
  state.quizIndex = (state.quizIndex + 1) % quizzes.length;
  renderQuiz();
});

renderQuiz();

/* الوضع الليلي */

$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const dark = document.body.classList.contains("dark");

  $("#themeToggle").textContent = dark ? "☀" : "☾";

  try {
    localStorage.setItem("alhuda-theme", dark ? "dark" : "light");
  } catch (error) {}
});

try {
  if (localStorage.getItem("alhuda-theme") === "dark") {
    document.body.classList.add("dark");
    $("#themeToggle").textContent = "☀";
  }
} catch (error) {}

/* قائمة الهاتف */

$("#menuToggle").addEventListener("click", () => {
  $("#mainNav").classList.toggle("open");
});

$$("#mainNav a").forEach(link => {
  link.addEventListener("click", () => {
    $("#mainNav").classList.remove("open");
  });
});

/* تشغيل الموقع */

function updateLocalDate() {
  const date = new Date();

  $("#prayerDate").textContent =
    date.toLocaleDateString("ar-TN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
}

updateLocalDate();
loadSurahIndex();
loadPrayer("Tunis");
