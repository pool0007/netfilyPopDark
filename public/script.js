class PopCatGame {
  constructor() {
    this.userCountry = null;
    this.userCountryCode = null;
    this.userClicks = 0;
    this.totalClicks = 0;
    this.leaderboardData = [];
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
      
      // Actualizar la UI con bandera
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
           style="margin-right: 8px; border-radius: 2px;">
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
    this.userClicksStat.textContent = this.userClicks.toLocaleString();

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
      
      // Usar la función del archivo externo
      const countryCode = row.country_code || getCountryCode(row.country);
      const flagUrl = `https://flagcdn.com/w24/${countryCode}.png`;
      
      item.innerHTML = `
        <span class="rank">${index + 1}</span>
        <span class="country">
          <img src="${flagUrl}" alt="${row.country}" class="country-flag" 
               onerror="this.src='https://flagcdn.com/w24/un.png'">
          ${row.country}
        </span>
        <span class="clicks">${parseInt(row.total_clicks).toLocaleString()}</span>
      `;
      
      this.leaderboardBody.appendChild(item);
    });

    this.updateUserRank(leaderboard);
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
    this.miniTotalClicks.textContent = this.totalClicks.toLocaleString();
    
    if (this.leaderboardData.length > 0) {
      const topCountry = this.leaderboardData[0];
      const countryCode = topCountry.country_code || getCountryCode(topCountry.country);
      
      this.miniTopCountry.innerHTML = `
        <img src="https://flagcdn.com/w16/${countryCode}.png" 
             alt="${topCountry.country}" 
             style="margin-right: 4px; border-radius: 1px; vertical-align: middle;">
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
