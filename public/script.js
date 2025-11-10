class PopCatGame {
  constructor() {
    this.userCountry = null;
    this.userCountryCode = null;
    this.userClicks = 0;
    this.totalClicks = 0;
    this.leaderboardData = [];
    this.currentCounts = {}; // Para animaciones
    this.catContainer = document.getElementById('catContainer');
    this.totalClicksElement = document.getElementById('totalClicks');
    this.leaderboardBody = document.getElementById('leaderboardBody');
    
    this.dashboardMinimized = document.getElementById('dashboardMinimized');
    this.dashboardExpanded = document.getElementById('dashboardExpanded');
    this.miniTotalClicks = document.getElementById('miniTotalClicks');
    this.miniTopCountry = document.getElementById('miniTopCountry');
    this.userCountryStat = document.getElementById('userCountryStat');
    this.userClicksStat = document.getElementById('userClicksStat');
    this.userRankStat = document.getElementById('userRankStat');
    
    this.baseURL = window.location.origin + '/api';
    this.isDashboardExpanded = false;
    
    this.init();
  }

  async init() {
    await this.detectCountry();
    this.setupEventListeners();
    await this.loadLeaderboard();
    this.startAutoRefresh();
    this.updateDashboardStats();
  }

  async detectCountry() {
    try {
      console.log('🌍 Detecting country with ipapi...');
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      
      this.userCountry = data.country_name || 'Unknown';
      this.userCountryCode = data.country_code ? data.country_code.toLowerCase() : 'un';
      
      console.log('✅ Country detected:', this.userCountry, 'Code:', this.userCountryCode);
      
      this.updateUserCountryDisplay();
      
    } catch (error) {
      console.error('❌ Error detecting country:', error);
      this.userCountry = 'Unknown';
      this.userCountryCode = 'un';
      this.userCountryStat.textContent = 'Not detected';
    }
  }

  updateUserCountryDisplay() {
    this.userCountryStat.innerHTML = `
      <img src="https://flagcdn.com/w20/${this.userCountryCode}.png" 
           alt="${this.userCountry}" 
           class="country-flag-small">
      ${this.userCountry}
    `;
  }

  setupEventListeners() {
    this.catContainer.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleClick();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleClick();
      }
    });
    
    document.getElementById('dashboardToggle').addEventListener('click', () => {
      this.toggleDashboard();
    });
    
    document.getElementById('dashboardClose').addEventListener('click', () => {
      this.toggleDashboard();
    });
    
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
    if (!this.userCountry || this.userCountry === 'Unknown') {
      alert('Country not detected. Please reload the page.');
      return;
    }

    this.animateClick();
    this.userClicks++;
    
    // Animación para clicks del usuario
    this.animateNumber(this.userClicksStat, this.userClicks, 200);
    
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        this.updateLeaderboard(data.leaderboard);
        this.updateTotalClicks(data.leaderboard);
        this.updateDashboardStats();
      } else {
        alert('Server error: ' + data.error);
      }
    } catch (error) {
      alert('Error sending click: ' + error.message);
    }
  }

  // Función para animar números
  animateNumber(element, targetValue, duration = 500) {
    const startValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
    const startTime = performance.now();
    
    const updateNumber = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function para animación suave
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
      element.textContent = currentValue.toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        element.textContent = targetValue.toLocaleString();
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        this.leaderboardData = data.leaderboard;
        this.updateLeaderboard(data.leaderboard);
        this.updateTotalClicks(data.leaderboard);
        this.updateDashboardStats();
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }

  updateLeaderboard(leaderboard) {
    if (!this.leaderboardBody) return;
    
    // Guardar los valores actuales antes de actualizar
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
      
      // Usar la función del archivo country-codes.js
      const countryCode = row.country_code || getCountryCode(row.country);
      const flagUrl = `https://flagcdn.com/w24/${countryCode}.png`;
      
      item.innerHTML = `
        <span class="rank">${index + 1}</span>
        <span class="country">
          <img src="${flagUrl}" alt="${row.country}" class="country-flag" 
               onerror="this.src='https://flagcdn.com/w24/un.png'">
          ${row.country}
        </span>
        <span class="clicks" data-country="${row.country}">${parseInt(row.total_clicks).toLocaleString()}</span>
      `;
      
      this.leaderboardBody.appendChild(item);
    });

    // Animar los números del leaderboard
    setTimeout(() => {
      this.animateLeaderboardNumbers(previousCounts);
    }, 100);

    this.updateUserRank(leaderboard);
  }

  animateLeaderboardNumbers(previousCounts) {
    const clickElements = this.leaderboardBody.querySelectorAll('.clicks');
    
    clickElements.forEach(element => {
      const country = element.getAttribute('data-country');
      const currentValue = this.currentCounts[country] || 0;
      const previousValue = previousCounts[country] || 0;
      
      if (currentValue !== previousValue) {
        this.animateNumber(element, currentValue, 800);
      }
    });
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
    const newTotalClicks = leaderboard.reduce((sum, row) => sum + parseInt(row.total_clicks || 0), 0);
    
    if (newTotalClicks !== this.totalClicks) {
      this.animateNumber(this.totalClicksElement, newTotalClicks, 600);
      this.animateNumber(this.miniTotalClicks, newTotalClicks, 600);
      this.totalClicks = newTotalClicks;
    }
  }

  updateDashboardStats() {
    if (this.leaderboardData.length > 0) {
      const topCountry = this.leaderboardData[0];
      const countryCode = topCountry.country_code || getCountryCode(topCountry.country);
      
      this.miniTopCountry.innerHTML = `
        <img src="https://flagcdn.com/w16/${countryCode}.png" 
             alt="${topCountry.country}" 
             class="country-flag-mini">
        ${topCountry.country}
      `;
    } else {
      this.miniTopCountry.textContent = '-';
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
