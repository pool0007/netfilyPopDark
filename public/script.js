class PopCatGame {
  constructor() {
    this.userCountry = null;
    this.userCountryCode = null;
    this.userClicks = 0;
    this.leaderboardData = [];
    this.currentCounts = {};
    
    // Elementos principales
    this.catContainer = document.getElementById('catContainer');
    this.leaderboardBody = document.getElementById('leaderboardBody');
    this.floatingCounter = document.getElementById('floatingCounter');
    
    // Dashboard
    this.dashboardMinimized = document.getElementById('dashboardMinimized');
    this.dashboardExpanded = document.getElementById('dashboardExpanded');
    this.dashboardToggle = document.getElementById('dashboardToggle');
    this.dashboardClose = document.getElementById('dashboardClose');
    
    // Elementos del dashboard minimizado
    this.topCountryFlag = document.getElementById('topCountryFlag');
    this.topCountryName = document.getElementById('topCountryName');
    this.topCountryClicks = document.getElementById('topCountryClicks');
    this.myMiniFlag = document.getElementById('myMiniFlag');
    this.myMiniClicks = document.getElementById('myMiniClicks');
    
    this.baseURL = window.location.origin + '/api';
    this.isDashboardExpanded = false;
    
    this.init();
  }

  async init() {
    await this.detectCountry();
    this.setupEventListeners();
    await this.loadLeaderboard();
    this.startAutoRefresh();
  }

  async detectCountry() {
    try {
      console.log('🌍 Detecting country...');
      
      let countryData = await this.tryIpApi();
      
      if (!countryData) {
        countryData = await this.tryIpify();
      }
      
      if (!countryData) {
        countryData = {
          country: 'Global',
          countryCode: 'un'
        };
      }
      
      this.userCountry = countryData.country;
      this.userCountryCode = countryData.countryCode;
      
      console.log('✅ Country detected:', this.userCountry, 'Code:', this.userCountryCode);
      
      this.updateUserCountryDisplay();
      
    } catch (error) {
      console.error('❌ Error detecting country:', error);
      this.userCountry = 'Global';
      this.userCountryCode = 'un';
      this.updateUserCountryDisplay();
    }
  }

  async tryIpApi() {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      
      if (data.country_name && data.country_code) {
        return {
          country: data.country_name,
          countryCode: data.country_code.toLowerCase()
        };
      }
      
      return null;
    } catch (error) {
      console.log('❌ ipapi.co failed:', error.message);
      return null;
    }
  }

  updateUserCountryDisplay() {
    const flagUrl = `https://flagcdn.com/16x12/${this.userCountryCode}.png`;
    
    // Actualizar bandera mini
    this.myMiniFlag.src = flagUrl;
    this.myMiniFlag.alt = this.userCountry;
    
    // Actualizar contadores
    this.updateFloatingCounter();
    this.myMiniClicks.textContent = this.userClicks.toLocaleString();
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
    
    // Toggle dashboard
    this.dashboardToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDashboard();
    });
    
    // Cerrar dashboard
    this.dashboardClose.addEventListener('click', (e) => {
      e.stopPropagation();
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
    if (!this.userCountry || this.userCountry === 'Global') {
      this.userCountry = 'Global';
      this.userCountryCode = 'un';
      this.updateUserCountryDisplay();
    }

    this.animateClick();
    this.userClicks++;
    
    // Actualizar contadores con animación
    this.updateFloatingCounter();
    this.animateNumber(this.myMiniClicks, this.userClicks, 300);
    
    try {
      const response = await fetch(`${this.baseURL}/click`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          country: this.userCountry,
          country_code: this.userCountryCode 
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();

      if (data.success) {
        this.updateLeaderboard(data.leaderboard);
        this.updateDashboardStats(data.leaderboard);
      }
    } catch (error) {
      console.error('Error sending click:', error.message);
    }
  }

  // Actualizar contador flotante
  updateFloatingCounter() {
    this.floatingCounter.textContent = this.userClicks.toLocaleString();
  }

  animateNumber(element, targetValue, duration = 500) {
    const startValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
    if (startValue === targetValue) return;
    
    const startTime = performance.now();
    
    const updateNumber = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
      element.textContent = currentValue.toLocaleString();
      
      element.classList.add('animating');
      
      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        element.textContent = targetValue.toLocaleString();
        setTimeout(() => {
          element.classList.remove('animating');
        }, 300);
      }
    };
    
    requestAnimationFrame(updateNumber);
  }

  animateClick() {
    this.catContainer.classList.add('active');
    
    const clickEffect = this.catContainer.querySelector('.click-effect');
    clickEffect.textContent = '+1';
    clickEffect.style.animation = 'none';
    
    setTimeout(() => {
      clickEffect.style.animation = 'floatUp 1s ease-out forwards';
    }, 10);

    this.catContainer.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.catContainer.style.transform = 'scale(1)';
    }, 100);

    setTimeout(() => {
      this.catContainer.classList.remove('active');
    }, 100);
  }

  async loadLeaderboard() {
    try {
      const response = await fetch(`${this.baseURL}/leaderboard`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();

      if (data.success) {
        this.leaderboardData = data.leaderboard;
        this.updateLeaderboard(data.leaderboard);
        this.updateDashboardStats(data.leaderboard);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }

  updateLeaderboard(leaderboard) {
    if (!this.leaderboardBody) return;
    
    const previousCounts = { ...this.currentCounts };
    
    leaderboard.forEach((row, index) => {
      this.currentCounts[row.country] = parseInt(row.total_clicks);
    });

    this.leaderboardBody.innerHTML = '';

    if (leaderboard.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'leaderboard-item';
      emptyItem.innerHTML = `
        <span class="rank">-</span>
        <span class="country">No data yet</span>
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
      
      const countryCode = row.country_code || getCountryCode(row.country);
      const flagUrl = `https://flagcdn.com/24x18/${countryCode}.png`;
      
      item.innerHTML = `
        <span class="rank">${index + 1}</span>
        <span class="country">
          <img src="${flagUrl}" alt="${row.country}" class="country-flag" 
               onerror="this.style.display='none'">
          ${row.country}
        </span>
        <span class="clicks" data-country="${row.country}">${parseInt(row.total_clicks).toLocaleString()}</span>
      `;
      
      this.leaderboardBody.appendChild(item);
    });

    // Animar números del leaderboard
    setTimeout(() => {
      this.animateLeaderboardNumbers(previousCounts);
    }, 100);
  }

  animateLeaderboardNumbers(previousCounts) {
    const clickElements = this.leaderboardBody.querySelectorAll('.clicks');
    
    clickElements.forEach(element => {
      const country = element.getAttribute('data-country');
      const currentValue = this.currentCounts[country] || 0;
      const previousValue = previousCounts[country] || 0;
      
      if (currentValue !== previousValue && currentValue > previousValue) {
        this.animateNumber(element, currentValue, 600);
      }
    });
  }

  updateDashboardStats(leaderboard) {
    // Actualizar país líder en dashboard minimizado
    if (leaderboard.length > 0) {
      const topCountry = leaderboard[0];
      const countryCode = topCountry.country_code || getCountryCode(topCountry.country);
      
      this.topCountryFlag.src = `https://flagcdn.com/16x12/${countryCode}.png`;
      this.topCountryFlag.alt = topCountry.country;
      this.topCountryName.textContent = topCountry.country;
      this.animateNumber(this.topCountryClicks, parseInt(topCountry.total_clicks), 600);
    }
  }

  startAutoRefresh() {
    setInterval(() => {
      this.loadLeaderboard();
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.popCatGame = new PopCatGame();
});
