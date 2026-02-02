<script setup>
import { ref, computed } from 'vue';

// Generate 100 mock requests
const genresList = ['Poster', 'Logo', 'Web', 'UI', 'UX', 'Branding', 'Print', 'Social', 'Packaging'];
const payments = ['On delivery', '50% upfront', 'Monthly', 'Full payment', 'After approval'];
const requests = ref(
  Array.from({ length: 100 }, (_, i) => {
    const genre = genresList[i % genresList.length];
    const payment = payments[i % payments.length];
    return {
      id: i + 1,
      title: `Request ${i + 1} - ${genre}`,
      price: `${200 + (i % 10) * 50}€`,
      payment,
      deadline: `2026-02-${String((i % 28) + 1).padStart(2, '0')}`,
      pdf: `request_${i + 1}.pdf`,
      genre,
    };
  })
);

const search = ref('');
const genreFilter = ref('');

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
</script>

<template>
  <div class="page-wrapper">
    <!-- Header (fixed) -->
    <header class="header fixed-header">
      <div class="header-content">
        <a class="navbar-brand d-inline-block h-blur" href="/">
            <img class="hidden md:block" src="/main_logo.png" alt="Logo" width="260" height="0">
            <img  class="md:hidden" src="/main_logo2.png" alt="Logo" width="125" height="0">

          </a>
        <div>
          <h1>Sokorro Public Design Requests</h1>
          <p class="subtitle">Find and explore the latest public design requests, filtered by AI.</p>
        </div>
      </div>
    </header>

    <!-- Everything else scrolls -->
    <div class="main-scrollable">
      <!-- Filters sticky at the top, left-aligned -->
      <section class="filters filters-bar mt-[50px] lg:mt-[5px]">
        <input
          v-model="search"
          type="text"
          placeholder="Search by title..."
          class="filter-input"
        />
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
          <div v-for="request in filteredRequests" :key="request.id" class="request-card neumorph-card">
            <div class="request-card-content">
              <div class="request-main-info">
                <h2>{{ request.title }}</h2>
                <div class="request-genre">{{ request.genre }}</div>
              </div>
              <div class="request-details">
                <div><strong>Price:</strong> {{ request.price }}</div>
                <div><strong>Payment terms:</strong> {{ request.payment }}</div>
                <div><strong>Deadline:</strong> {{ request.deadline }}</div>
                <div><strong>PDF:</strong> <a :href="'/public/' + request.pdf" target="_blank">{{ request.pdf }}</a></div>
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
  box-shadow: 0 2px 16px 0 rgba(0,0,0,0.07);
}
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  z-index: 100;
  box-shadow: 0 2px 16px 0 rgba(0,0,0,0.07);
}
.main-scrollable {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-top: 110px; /* header (50-60px) + filters (50px) */
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
.filter-input, .filter-select {
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
.filter-input:focus, .filter-select:focus {
  box-shadow: 0 0 0 2px #00b4d8;
}

.summary-blur {
  min-width: 400px;
  min-height: 60px;
  background: rgba(255,255,255,0.55);
  border-radius: 18px;
  box-shadow: 0 4px 32px 0 rgba(0,0,0,0.10);
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
  margin: 0.7rem 10px;
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
  flex: 3;
  display: flex;
  flex-direction: row;
  gap: 2.5rem;
  font-size: 1.08rem;
  color: #444;
  flex-wrap: wrap;
}
.request-details > div {
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

@media (max-width: 800px) {
  .header-content, .filters, .container {
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
    padding: 0.8rem 0.8rem;
    top: 70px;
  }
  .filter-input, .filter-select {
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
</style>
