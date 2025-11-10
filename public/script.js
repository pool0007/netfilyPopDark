class PopCatGame {
  constructor() {
    this.userCountry = null;
    this.userClicks = 0;
    this.totalClicks = 0;
    this.leaderboardData = [];
    this.catContainer = document.getElementById('catContainer');
    this.totalClicksElement = document.getElementById('totalClicks');
    this.leaderboardBody = document.getElementById('leaderboardBody');
    
    // Dashboard elements
    this.dashboardMinimized = document.getElementById('dashboardMinimized');
    this.dashboardExpanded = document.getElementById('dashboardExpanded');
    this.miniTotalClicks = document.getElementById('miniTotalClicks');
    this.miniTopCountry = document.getElementById('miniTopCountry');
    this.userCountryStat = document.getElementById('userCountryStat');
    this.userClicksStat = document.getElementById('userClicksStat');
    this.userRankStat = document.getElementById('userRankStat');
    
    // IMPORTANTE: Para Netlify Functions
    this.baseURL = window.location.origin + '/api';
    this.isDashboardExpanded = false;
    
    this.init();
  }

  async init() {
    console.log('🚀 Initializing PopCat Game...');
    console.log('🌐 Base URL:', this.baseURL);
    await this.detectCountry();
    this.setupEventListeners();
    await this.loadLeaderboard();
    this.startAutoRefresh();
    this.updateDashboardStats();
  }

  async detectCountry() {
    try {
      console.log('🌍 Detecting country...');
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      this.userCountry = data.country_name || 'Desconocido';
      this.userCountryStat.textContent = this.userCountry;
      console.log('✅ Country detected:', this.userCountry);
    } catch (error) {
      console.error('❌ Error detecting country:', error);
      this.userCountry = 'Desconocido';
      this.userCountryStat.textContent = 'No detectado';
    }
  }

  setupEventListeners() {
    // Click en el gato
    this.catContainer.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleClick();
    });
    
    // Tecla espacio
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleClick();
      }
    });
    
    // Dashboard toggle
    document.getElementById('dashboardToggle').addEventListener('click', () => {
      this.toggleDashboard();
    });
    
    document.getElementById('dashboardClose').addEventListener('click', () => {
      this.toggleDashboard();
    });
    
    // Touch para móviles
    this.catContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleClick();
    }, { passive: false });
  }

  toggleDashboard() {
    this.isDashboardExpanded = !this.isDashboardExpanded;
    
    if (this.isDashboardExpanded) {
      this.dashboardMinimized.style.display = 'none';
      this.dashboardExpanded.style.display = 'block';
    } else {
      this.dashboardMinimized.style.display = 'block';
      this.dashboardExpanded.style.display = 'none';
    }
  }

  async handleClick() {
    if (!this.userCountry || this.userCountry === 'Desconocido') {
      console.log('❌ No country detected, cannot send click');
      alert('País no detectado. Intenta recargar la página.');
      return;
    }

    console.log('🐱 Click detected for country:', this.userCountry);
    console.log('📤 Sending to:', `${this.baseURL}/click`);
    
    // Efecto visual inmediato
    this.animateClick();
    
    // Contador local
    this.userClicks++;
    this.userClicksStat.textContent = this.userClicks.toLocaleString();

    try {
      const response = await fetch(`${this.baseURL}/click`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ country: this.userCountry }),
      });

      console.log('📤 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (data.success) {
        this.updateLeaderboard(data.leaderboard);
        this.updateTotalClicks(data.leaderboard);
        this.updateDashboardStats();
        console.log('🎯 Click registered successfully');
      } else {
        console.error('❌ Server returned error:', data.error);
        alert('Error del servidor: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error sending click:', error);
      alert('Error al enviar click: ' + error.message);
    }
  }

  animateClick() {
    // Animación del gato
    this.catContainer.classList.add('active');
    
    // Efecto de texto +1
    const clickEffect = this.catContainer.querySelector('.click-effect');
    clickEffect.textContent = '+1';
    clickEffect.style.animation = 'none';
    
    setTimeout(() => {
      clickEffect.style.animation = 'floatUp 1s ease-out forwards';
    }, 10);

    // Efecto de pulsación
    this.catContainer.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.catContainer.style.transform = 'scale(1)';
    }, 100);

    // Quitar clase active después de la animación
    setTimeout(() => {
      this.catContainer.classList.remove('active');
    }, 100);
  }

  async loadLeaderboard() {
    try {
      console.log('📊 Loading leaderboard from:', `${this.baseURL}/leaderboard`);
      const response = await fetch(`${this.baseURL}/leaderboard`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📥 Leaderboard data:', data);

      if (data.success) {
        this.leaderboardData = data.leaderboard;
        this.updateLeaderboard(data.leaderboard);
        this.updateTotalClicks(data.leaderboard);
        this.updateDashboardStats();
        console.log('📈 Leaderboard updated successfully');
      } else {
        console.error('❌ Leaderboard error:', data.error);
      }
    } catch (error) {
      console.error('❌ Error loading leaderboard:', error);
    }
  }

  updateLeaderboard(leaderboard) {
    if (!this.leaderboardBody) return;
    
    this.leaderboardBody.innerHTML = '';

    if (leaderboard.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'leaderboard-item';
      emptyItem.innerHTML = `
        <span class="rank">-</span>
        <span class="country">No hay datos aún</span>
        <span class="clicks">0</span>
      `;
      this.leaderboardBody.appendChild(emptyItem);
      return;
    }

    leaderboard.forEach((row, index) => {
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      
      // Destacar el país del usuario
      if (row.country === this.userCountry) {
        item.style.background = 'rgba(255, 235, 59, 0.2)';
        item.style.border = '1px solid rgba(255, 235, 59, 0.5)';
      }
      
      // Obtener código de país para la bandera
      const countryCode = this.getCountryCode(row.country);
      const flagUrl = `https://flagcdn.com/w40/${countryCode}.png`;
      
      item.innerHTML = `
        <span class="rank">${index + 1}</span>
        <span class="country">
          <img src="${flagUrl}" alt="${row.country}" class="country-flag" onerror="this.style.display='none'">
          ${row.country}
        </span>
        <span class="clicks">${parseInt(row.total_clicks).toLocaleString()}</span>
      `;
      
      this.leaderboardBody.appendChild(item);
    });

    // Actualizar ranking del usuario
    this.updateUserRank(leaderboard);
  }

  getCountryCode(countryName) {
    const countryMap = {
      'Argentina': 'ar',
      'Chile': 'cl',
      'España': 'es',
      'Mexico': 'mx',
      'Estados Unidos': 'us',
      'United States': 'us',
      'Brazil': 'br',
      'Colombia': 'co',
      'Peru': 'pe',
      'France': 'fr',
      'Germany': 'de',
      'Italy': 'it',
      'United Kingdom': 'gb',
      'Japan': 'jp',
      'China': 'cn',
      'India': 'in',
      'Australia': 'au',
      'Canada': 'ca',
      'Russia': 'ru'
    };
    
    return countryMap[countryName] || 'un';
  }

  updateUserRank(leaderboard) {
    const userIndex = leaderboard.findIndex(row => row.country === this.userCountry);
    if (userIndex !== -1) {
      this.userRankStat.textContent = `#${userIndex + 1}`;
    } else {
      this.userRankStat.textContent = '-';
    }
  }

  updateTotalClicks(leaderboard) {
    this.totalClicks = leaderboard.reduce((sum, row) => sum + parseInt(row.total_clicks || 0), 0);
    this.totalClicksElement.textContent = this.totalClicks.toLocaleString();
  }

  updateDashboardStats() {
    // Actualizar clicks totales
    this.miniTotalClicks.textContent = this.totalClicks.toLocaleString();
    
    // Actualizar país líder
    if (this.leaderboardData.length > 0) {
      const topCountry = this.leaderboardData[0];
      this.miniTopCountry.textContent = topCountry.country;
    } else {
      this.miniTopCountry.textContent = '-';
    }
  }

  startAutoRefresh() {
    // Actualizar leaderboard cada 3 segundos
    setInterval(() => {
      this.loadLeaderboard();
    }, 3000);
    
    console.log('🔄 Auto-refresh started (3s interval)');
  }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM loaded, starting game...');
  window.popCatGame = new PopCatGame();
});

// Manejar errores no capturados
window.addEventListener('error', (event) => {
  console.error('💥 Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Unhandled promise rejection:', event.reason);
});
