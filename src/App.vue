<script setup>
import { ref, computed } from 'vue';
// To git push
//git add .
//git commit -m "commentary"
//git push

// Generate 100 mock requests
const genresList = ['Poster', 'Logo', 'Web', 'UI', 'UX', 'Branding', 'Print', 'Social', 'Packaging'];
const payments = ['On delivery', '50% upfront', 'Monthly', 'Full payment', 'After approval'];

function generateRealisticPrice() {
  // Distribution biaisée vers les petits montants
  const r = Math.random();
  let price;

  if (r < 0.6) {
    // petits projets
    price = Math.random() * 5000;
  } else if (r < 0.9) {
    // projets moyens
    price = 5000 + Math.random() * 45000;
  } else {
    // gros projets
    price = 50000 + Math.random() * 300000;
  }

  // arrondi réaliste
  return `${Math.round(price / 50) * 50}€`;
}

const requests = ref(
  Array.from({ length: 100 }, (_, i) => {
    const genre = genresList[i % genresList.length];
    const payment = payments[i % payments.length];

    return {
      id: i + 1,
      title: `Request ${i + 1} - ${genre}`,
      price: generateRealisticPrice(),
      payment,
      deadline: `2026-02-${String((i % 28) + 1).padStart(2, '0')}`,
      pdf: `request_${i + 1}.pdf`,
      genre,
    };
  })
);


const search = ref('');
const genreFilter = ref('');
const isDark = ref(false);

const genres = computed(() => {
  const all = requests.value.map(r => r.genre);
  return [...new Set(all)];
});

const filteredRequests = computed(() => {
  return requests.value.filter(r => {
    const matchesTitle = r.title.toLowerCase().includes(search.value.toLowerCase());
    const matchesGenre = !genreFilter.value || r.genre === genreFilter.value;
    return matchesTitle && matchesGenre;
  });
});

// --- GENERATE BUTTON LOGIC FOR FIRST CARD ONLY ---
import { onMounted } from 'vue';
const showGeneratedText = ref(false);
const displayedText = ref("");
const text = `Fixed-price public contract (€157,337.86 excl. VAT) for full creativity, design, and production of a national campaign, to be executed in 40 calendar days, with single payment after completion, no price revision, and a 5% performance guarantee required.
Scope is broad and complex: multiple creative proposals (TV, radio, digital, social, print, merchandising), detailed technical deliverables, competitive scoring weighted 60% on subjective quality, and extensive administrative compliance, creating high upfront workload and execution risk within a short timeframe.
Overall assessment: financially acceptable only for well-resourced agencies; tight schedule, deferred payment, no price adjustment, and high creative demands reduce margin flexibility and increase risk, making the contract demanding relative to its budget and execution period.`;/*Two or three phrases of 30 or 40 word resume containing only the most relevant professional information. Without redundancy. No assumptions. Bullet points only.`;*/
const speedMs = 40;
let i = 0;
function handleGenerateClick() {
  showGeneratedText.value = true;
  displayedText.value = "";
  i = 0;
  const tick = () => {
    displayedText.value = text.slice(0, i);
    i++;
    if (i <= text.length) {
      setTimeout(tick, speedMs);
    }
  };
  tick();
}
</script>

<template>
  <div :class="['page-wrapper', isDark ? 'dark-mode' : '']">
    <!-- Header (fixed) -->
    <header class="header fixed-header">
      <div class="header-content">
        <a class="navbar-brand d-inline-block h-blur" href="/">
          <img class="hidden md:block logo-img" src="/main_logo.svg" alt="Logo" width="260" height="0">
          <img class="md:hidden logo-img" src="/main_logo2.svg" alt="Logo" width="125" height="0">
        </a>
        <div>
          <h1>Sokorro Public Design Requests</h1>
          <p class="subtitle">Find and explore the latest public design requests, filtered by AI.</p>
        </div>
        <div class="theme-toggle">
          <span>Dark</span>
          <label class="switch">
            <input v-model="isDark" type="checkbox">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </header>

    <!-- Everything else scrolls -->
    <div class="main-scrollable">
      <!-- Filters sticky at the top, left-aligned -->
      <section class="filters filters-bar mt-[50px] lg:mt-[5px]">
        <input v-model="search" type="text" placeholder="Search by title..." class="filter-input" />
        <select v-model="genreFilter" class="filter-select">
          <option value="">All genres</option>
          <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
        </select>
      </section>

      <!-- Requests list -->
      <main class="container mt-[120px] lg:mt-[40px]">
        <div v-if="filteredRequests.length === 0" class="no-results">
          No requests found.
        </div>
        <div v-else class="request-list">
          <div v-for="(request, idx) in filteredRequests" :key="request.id" class="request-card neumorph-card">
            <div class="request-card-content">
              <div class="request-main-info">
                <h2>{{ request.title }}</h2>
                <div class="request-genre">{{ request.genre }}</div>
              </div>
              <div class="request-details">
                <div><strong>Price:</strong> {{ request.price }}</div>
                <div><strong>Payment terms:</strong> {{ request.payment }}</div>
                <div><strong>Deadline:</strong> {{ request.deadline }}</div>
                <div><strong>PDF:</strong> <a :href="'/public/' + request.pdf" target="_blank">{{ request.pdf }}</a>
                </div>
                <div v-if="idx === 0" style="min-width:220px;">
                  <button v-if="!showGeneratedText" class="uiverse" @click="handleGenerateClick">
                    <div class="wrapper">
                      <span>GENERATE</span>
                      <div class="circle circle-12"></div>
                      <div class="circle circle-11"></div>
                      <div class="circle circle-10"></div>
                      <div class="circle circle-9"></div>
                      <div class="circle circle-8"></div>
                      <div class="circle circle-7"></div>
                      <div class="circle circle-6"></div>
                      <div class="circle circle-5"></div>
                      <div class="circle circle-4"></div>
                      <div class="circle circle-3"></div>
                      <div class="circle circle-2"></div>
                      <div class="circle circle-1"></div>
                    </div>
                  </button>
                  <div v-else class="generated-text-area whitespace-pre-wrap">{{ displayedText }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(120deg, #e0e7ef 0%, #f4f6fa 100%);
  position: relative;
  overflow-x: hidden;
}

.header {
  /*background: rgba(255,255,255,0.7);*/
  backdrop-filter: blur(8px);
  color: #222;
  padding: 0.7rem 0 0.3rem 0;
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.07);
}

.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  z-index: 100;
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.07);
}

.main-scrollable {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-top: 110px;
  /* header (50-60px) + filters (50px) */
}

.header-content {
  max-width: 100vw;
  margin: 10px;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 1.2rem;
}

.h-blur:hover {
  filter: blur(1.5px);
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.subtitle {
  margin: 0.1rem 0 0 0;
  font-size: 0.95rem;
  color: #0078d4;
  font-weight: 500;
}

.theme-toggle {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.filters {
  width: 100vw;
  max-width: none;

  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  border-radius: 0 0 12px 0;
  padding: 0.5rem 1.2rem 0.5rem 1.2rem;
  position: fixed;
  top: 90px;
  left: 0;
  z-index: 101;
  box-sizing: border-box;
}

.filters-bar {
  justify-content: flex-start;
}

.filter-input,
.filter-select {
  min-width: 180px;
  max-width: 320px;
  width: 100%;
  flex: 1 1 180px;
  padding: 0.7rem 1.2rem;
  border-radius: 10px;
  border: none;
  font-size: 1rem;
  background: #f4f6fa;
  box-shadow: 2px 2px 8px #e3e9f1, -2px -2px 8px #fff;
  outline: none;
  transition: box-shadow 0.2s;
}

.filter-input:focus,
.filter-select:focus {
  box-shadow: 0 0 0 2px #00b4d8;
}

.summary-blur {
  min-width: 400px;
  min-height: 60px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 18px;
  box-shadow: 0 4px 32px 0 rgba(0, 0, 0, 0.10);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  color: #0078d4;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.container {
  width: 100%;
  max-width: 1100%;
  flex: 1;
  padding: 0 0.5rem;
  box-sizing: border-box;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-top: 0.7rem;
}

.request-card {
  width: 100%;
  min-height: 80px;
  display: flex;
  align-items: center;
  background: #f4f6fa;
  border-radius: 14px;
  box-shadow: 4px 4px 12px #d1d9e6, -4px -4px 12px #fff;
  transition: box-shadow 0.2s, transform 0.2s;
  padding: 0;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.neumorph-card:hover {
  box-shadow: 0 8px 32px 0 #b0c4de, 0 1.5px 8px 0 #fff;
  transform: translateY(-2px) scale(1.01);
}

.request-card-content {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.7rem 1rem;
  gap: 1rem;
}

.request-main-info {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.request-main-info h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #222;
}

.request-genre {
  font-size: 1.05rem;
  color: #00b4d4;
  font-weight: 600;
  margin-top: 0.2rem;
}

.request-details {
  flex: 4;
  display: flex;
  flex-direction: row;
  gap: 2.5rem;
  font-size: 1.08rem;
  color: #444;
  flex-wrap: wrap;
}

.request-details>div {
  min-width: 140px;
  margin-bottom: 0.3rem;
}

.request-details a {
  color: #0078d4;
  text-decoration: underline;
  font-weight: 500;
}

.no-results {
  text-align: center;
  color: #888;
  font-size: 1.2rem;
  margin-top: 3rem;
}

.generated-text-area {
  padding: 0.7rem 1rem;
  border-radius: 15px;
  background: #e0e0e0;
  box-shadow: inset 7px 7px 19px #bebebe,
    inset -7px -7px 19px #ffffff;
  font-size: 1rem;
  color: #222;
  min-width: 200px;
  max-width: 100%;
  word-break: break-word;
}

@media (max-width: 800px) {

  .header-content,
  .filters,
  .container {
    max-width: 100vw;
    padding-left: 0.2rem;
    padding-right: 0.2rem;
  }

  .request-card-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.7rem;
    padding: 0.7rem 0.5rem;
  }

  .request-details {
    flex-direction: column;
    gap: 0.5rem;
  }

  .summary-blur {
    min-width: 98vw;
    font-size: 1rem;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem;
    top: 70px;
  }

  .filter-input,
  .filter-select {
    min-width: 0;
    max-width: none;
    width: 100%;
    flex: 1 1 100%;
  }

  .logo {
    width: 28px;
    height: 28px;
  }

  h1 {
    font-size: 1.1rem;
  }

  .container {
    padding: 0 0.1rem;
  }
}

/* Hide summary button in offers */
.summary-btn {
  display: none !important;
}

.switch {
  font-size: 17px;
  position: relative;
  display: inline-block;
  width: 3.5em;
  height: 2em;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  box-shadow: inset 2px 5px 10px rgba(0, 0, 0, 0.3);
  transition: 0.4s;
  border-radius: 5px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 1.4em;
  width: 0.1em;
  border-radius: 0px;
  left: 0.3em;
  bottom: 0.3em;
  background-color: white;
  transition: 0.4s;
}

input:checked+.slider {
  background-color: #171717;
  box-shadow: inset 2px 5px 10px rgb(0, 0, 0);
}

input:checked+.slider:before {
  transform: translateX(2.8em) rotate(360deg);
}

.dark-mode {
  background: #0b0b0b;
  color: #e5e5e5;
}

.dark-mode .header {
  color: #e5e5e5;
  background: rgba(0, 0, 0, 0.65);
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.5);
}

.logo-img {
  transition: filter 0.2s ease;
}

.dark-mode .logo-img {
  filter: brightness(0) invert(1);
}

.dark-mode .subtitle {
  color: #a3a3a3;
}

.dark-mode .filters {
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dark-mode .filter-input,
.dark-mode .filter-select {
  background: #111111;
  color: #e5e5e5;
  box-shadow: inset 2px 2px 8px #000000, inset -2px -2px 8px #1a1a1a;
}

.dark-mode .filter-input::placeholder {
  color: #737373;
}

.dark-mode .filter-input:focus,
.dark-mode .filter-select:focus {
  box-shadow: 0 0 0 2px #404040;
}

.dark-mode .request-main-info h2 {
  color: #f5f5f5;
}

.dark-mode .request-card-content{
  background-color: #000000;
}

.dark-mode .request-genre {
  color: #bdbdbd;
}

.dark-mode .request-details a {
  color: #e5e5e5;
}

.dark-mode .request-card {
  background: #111111;
  box-shadow: 4px 4px 12px #000000, -4px -4px 12px #1a1a1a;
}

.dark-mode .neumorph-card:hover {
  box-shadow: 0 8px 32px 0 #000000, 0 1.5px 8px 0 #1a1a1a;
}

.dark-mode .no-results {
  color: #a3a3a3;
}

.dark-mode .generated-text-area {
  background: #0f0f0f;
  color: #e5e5e5;
  box-shadow: inset 7px 7px 19px #000000, inset -7px -7px 19px #1a1a1a;
}

.uiverse {
  --duration: 5s;
  --easing: ease-in-out;
  --c-color-1: #ff6f00;
  --c-color-2: #1a23ff;
  --c-color-3: #e21bda;
  --c-color-4: #ffd800;
  --c-shadow: rgba(0, 0, 0, 0.2);
  --c-shadow-inset-top: rgba(0, 0, 0, 0.1);
  --c-shadow-inset-bottom: rgba(0, 0, 0, 0.1);
  --c-radial-inner: #ffd215;
  --c-radial-outer: #fff172;
  --c-color: #fff;
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: none;
  outline: none;
  position: relative;
  cursor: pointer;
  border: none;
  display: table;
  border-radius: 24px;
  padding: 0;
  margin: 0;
  text-align: center;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.02em;
  line-height: 1.5;
  color: var(--c-color);
  background: radial-gradient(circle, var(--c-radial-inner), var(--c-radial-outer) 80%);
  box-shadow: 0 0 14px var(--c-shadow);
}

.uiverse:before {
  content: '';
  pointer-events: none;
  position: absolute;
  z-index: 3;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  border-radius: 24px;
  box-shadow: inset 0 3px 12px var(--c-shadow-inset-top), inset 0 -3px 4px var(--c-shadow-inset-bottom);
}
</style>
<style>
.uiverse .wrapper {
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  overflow: hidden;
  border-radius: 24px;
  min-width: 132px;
  padding: 12px 0;
}

.uiverse .wrapper span {
  display: inline-block;
  position: relative;
  z-index: 1;
}

.uiverse .wrapper .circle {
  position: absolute;
  left: 0;
  top: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  filter: blur(var(--blur, 8px));
  background: var(--background, transparent);
  transform: translate(var(--x, 0), var(--y, 0)) translateZ(0);
  animation: var(--animation, none) var(--duration) var(--easing) infinite;
}

.uiverse .wrapper .circle.circle-1,
.uiverse .wrapper .circle.circle-9,
.uiverse .wrapper .circle.circle-10 {
  --background: var(--c-color-4);
}

.uiverse .wrapper .circle.circle-3,
.uiverse .wrapper .circle.circle-4 {
  --background: var(--c-color-2);
  --blur: 14px;
}

.uiverse .wrapper .circle.circle-5,
.uiverse .wrapper .circle.circle-6 {
  --background: var(--c-color-3);
  --blur: 16px;
}

.uiverse .wrapper .circle.circle-2,
.uiverse .wrapper .circle.circle-7,
.uiverse .wrapper .circle.circle-8,
.uiverse .wrapper .circle.circle-11,
.uiverse .wrapper .circle.circle-12 {
  --background: var(--c-color-1);
  --blur: 12px;
}

.uiverse .wrapper .circle.circle-1 {
  --x: 0;
  --y: -40px;
  --animation: circle-1;
}

.uiverse .wrapper .circle.circle-2 {
  --x: 92px;
  --y: 8px;
  --animation: circle-2;
}

.uiverse .wrapper .circle.circle-3 {
  --x: -12px;
  --y: -12px;
  --animation: circle-3;
}

.uiverse .wrapper .circle.circle-4 {
  --x: 80px;
  --y: -12px;
  --animation: circle-4;
}

.uiverse .wrapper .circle.circle-5 {
  --x: 12px;
  --y: -4px;
  --animation: circle-5;
}

.uiverse .wrapper .circle.circle-6 {
  --x: 56px;
  --y: 16px;
  --animation: circle-6;
}

.uiverse .wrapper .circle.circle-7 {
  --x: 8px;
  --y: 28px;
  --animation: circle-7;
}

.uiverse .wrapper .circle.circle-8 {
  --x: 28px;
  --y: -4px;
  --animation: circle-8;
}

.uiverse .wrapper .circle.circle-9 {
  --x: 20px;
  --y: -12px;
  --animation: circle-9;
}

.uiverse .wrapper .circle.circle-10 {
  --x: 64px;
  --y: 16px;
  --animation: circle-10;
}

.uiverse .wrapper .circle.circle-11 {
  --x: 4px;
  --y: 4px;
  --animation: circle-11;
}

.uiverse .wrapper .circle.circle-12 {
  --blur: 14px;
  --x: 52px;
  --y: 4px;
  --animation: circle-12;
}

@keyframes circle-1 {
  0% {
    transform: translate(0px, 0px) translateZ(0);
  }

  50% {
    transform: translate(0px, 16px) translateZ(0);
  }

  100% {
    transform: translate(0px, 0px) translateZ(0);
  }
}

@keyframes circle-2 {
  0% {
    transform: translate(80px, -10px) translateZ(0);
  }

  50% {
    transform: translate(72px, -48px) translateZ(0);
  }

  100% {
    transform: translate(80px, -10px) translateZ(0);
  }
}

@keyframes circle-3 {
  0% {
    transform: translate(20px, 12px) translateZ(0);
  }

  50% {
    transform: translate(12px, 4px) translateZ(0);
  }

  100% {
    transform: translate(20px, 12px) translateZ(0);
  }
}

@keyframes circle-4 {
  0% {
    transform: translate(76px, -12px) translateZ(0);
  }

  50% {
    transform: translate(112px, -8px) translateZ(0);
  }

  100% {
    transform: translate(76px, -12px) translateZ(0);
  }
}

@keyframes circle-5 {
  0% {
    transform: translate(84px, 28px) translateZ(0);
  }

  50% {
    transform: translate(40px, -32px) translateZ(0);
  }

  100% {
    transform: translate(84px, 28px) translateZ(0);
  }
}

@keyframes circle-6 {
  0% {
    transform: translate(28px, -16px) translateZ(0);
  }

  50% {
    transform: translate(76px, -56px) translateZ(0);
  }

  100% {
    transform: translate(28px, -16px) translateZ(0);
  }
}

@keyframes circle-7 {
  0% {
    transform: translate(8px, 28px) translateZ(0);
  }

  50% {
    transform: translate(20px, -60px) translateZ(0);
  }

  100% {
    transform: translate(8px, 28px) translateZ(0);
  }
}

@keyframes circle-8 {
  0% {
    transform: translate(32px, -4px) translateZ(0);
  }

  50% {
    transform: translate(56px, -20px) translateZ(0);
  }

  100% {
    transform: translate(32px, -4px) translateZ(0);
  }
}

@keyframes circle-9 {
  0% {
    transform: translate(20px, -12px) translateZ(0);
  }

  50% {
    transform: translate(80px, -8px) translateZ(0);
  }

  100% {
    transform: translate(20px, -12px) translateZ(0);
  }
}

@keyframes circle-10 {
  0% {
    transform: translate(68px, 20px) translateZ(0);
  }

  50% {
    transform: translate(100px, 28px) translateZ(0);
  }

  100% {
    transform: translate(68px, 20px) translateZ(0);
  }
}

@keyframes circle-11 {
  0% {
    transform: translate(4px, 4px) translateZ(0);
  }

  50% {
    transform: translate(68px, 20px) translateZ(0);
  }

  100% {
    transform: translate(4px, 4px) translateZ(0);
  }
}

@keyframes circle-12 {
  0% {
    transform: translate(56px, 0px) translateZ(0);
  }

  50% {
    transform: translate(60px, -32px) translateZ(0);
  }

  100% {
    transform: translate(56px, 0px) translateZ(0);
  }
}
</style>

<script>
import { ref, onMounted } from "vue"

const text = ``

const speedMs = 40

const displayedText = ref("")
let i = 0

onMounted(() => {
  const tick = () => {
    displayedText.value = text.slice(0, i)
    i++

    if (i <= text.length) {
      setTimeout(tick, speedMs)
    }
  }

  tick()
})
</script>
