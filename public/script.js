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
    
    // DETECCIÓN DE IPHONE PARA DESACTIVAR SONIDO
    this.isIPhone = this.detectIPhone();
    this.soundEnabled = !this.isIPhone; // Desactivar solo en iPhone
    
    // Sistema de sonido solo si está habilitado
    if (this.soundEnabled) {
      this.audioElements = [];
      this.maxAudioElements = 8;
      this.currentAudioIndex = 0;
      this.audioUnlocked = false;
    }
    
    this.baseURL = window.location.origin + '/api';
    this.isDashboardExpanded = false;
    
    console.log(`📱 Dispositivo: ${this.isIPhone ? 'iPhone - Sonido DESACTIVADO' : 'Otro - Sonido ACTIVADO'}`);
    
    this.init();
  }

  detectIPhone() {
    // Detectar iPhone/iPad/iPod
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  }

  async init() {
    await this.detectCountry();
    if (this.soundEnabled) {
      this.initSound();
    }
    this.setupEventListeners();
    await this.loadLeaderboard();
    this.startAutoRefresh();
  }

  initSound() {
    if (!this.soundEnabled) return;
    
    const soundUrl = 'https://www.myinstants.com/media/sounds/pop-cat-original-meme_3ObdYkj.mp3';
    
    for (let i = 0; i < this.maxAudioElements; i++) {
      const audio = new Audio();
      audio.src = soundUrl;
      audio.preload = 'auto';
      audio.volume = 0.7;
      this.audioElements.push(audio);
    }
    
    console.log(`✅ Sonido activado - ${this.maxAudioElements} elementos precargados`);
    this.unlockAudio();
  }

  unlockAudio() {
    if (!this.soundEnabled) return;
    
    const unlock = () => {
      if (this.audioUnlocked) return;
      
      this.audioUnlocked = true;
      console.log('✅ Audio desbloqueado');
      
      this.playUnlockSound();
    };

    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    
    setTimeout(unlock, 1000);
  }

  playUnlockSound() {
    if (!this.soundEnabled) return;
    
    try {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.volume = 0;
      silentAudio.play().catch(() => {});
    } catch (e) {}
  }

  playPopSound() {
    // No reproducir sonido en iPhone
    if (!this.soundEnabled || !this.audioUnlocked) return;
    
    try {
      const audio = this.audioElements[this.currentAudioIndex];
      
      audio.pause();
      audio.currentTime = 0;
      
      audio.play().catch(error => {
        if (!error.message.includes('user didn\'t interact') && 
            !error.message.includes('pause()') &&
            !error.message.includes('interrupted')) {
          console.log('🔇 Error audio:', error.message);
        }
      });
      
      this.currentAudioIndex = (this.currentAudioIndex + 1) % this.audioElements.length;
      
    } catch (error) {
      // Silenciar errores
    }
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
    
    this.myMiniFlag.src = flagUrl;
    this.myMiniFlag.alt = this.userCountry;
    
    this.updateFloatingCounter();
    this.myMiniClicks.textContent = this.userClicks.toLocaleString();
  }

  setupEventListeners() {
    this.catContainer.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleClick();
    });
    
    this.catContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleClick();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleClick();
      }
    });
    
    this.dashboardToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDashboard();
    });
    
    this.dashboardClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDashboard();
    });
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

    // ANIMACIÓN INMEDIATA
    this.animateClick();
    this.userClicks++;
    
    // CONTADORES
    this.rotateCounter();
    this.updateFloatingCounter();
    this.animateNumber(this.myMiniClicks, this.userClicks, 300);
    
    // SONIDO SOLO SI ESTÁ HABILITADO (no en iPhone)
    if (this.soundEnabled) {
      setTimeout(() => {
        this.playPopSound();
      }, 0);
    }
    
    // API CALL
    this.sendClickToAPI();
  }

  async sendClickToAPI() {
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

  // Efecto de rotación y agrandamiento para el contador
  rotateCounter() {
    // Remover clases anteriores
    this.floatingCounter.classList.remove('rotate-left', 'rotate-right', 'rotate-center', 'animating');
    
    // Direcciones aleatorias
    const directions = ['rotate-left', 'rotate-right', 'rotate-center'];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    
    // Aplicar las clases de animación
    this.floatingCounter.classList.add(randomDirection, 'animating');
    
    // Remover las clases después de la animación
    setTimeout(() => {
      this.floatingCounter.classList.remove(randomDirection, 'animating');
    }, 200);
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
    
    void clickEffect.offsetWidth;
    
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
      
      // Determinar qué icono usar según la posición (ICONOS INLINE)
      let medalIcon = '';
      let medalClass = 'medal-other';
      
      if (index === 0) {
        // Medalla de Oro
        medalIcon = `<svg class="medal-icon medal-gold" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M20,2H4V4L9.81,8.36C6.14,9.57 4.14,13.53 5.35,17.2C6.56,20.87 10.5,22.87 14.19,21.66C17.86,20.45 19.86,16.5 18.65,12.82C17.8,10.38 15.59,8.69 13,8.25V14.75C13,15.85 12.1,16.75 11,16.75H9C7.9,16.75 7,15.85 7,14.75V10.14L4,7.79V18H20V2Z"/>
        </svg>`;
        medalClass = 'medal-gold';
      } else if (index === 1) {
        // Medalla de Plata
        medalIcon = `<svg class="medal-icon medal-silver" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M20,2H4V4L9.81,8.36C6.14,9.57 4.14,13.53 5.35,17.2C6.56,20.87 10.5,22.87 14.19,21.66C17.86,20.45 19.86,16.5 18.65,12.82C17.8,10.38 15.59,8.69 13,8.25V14.75C13,15.85 12.1,16.75 11,16.75H9C7.9,16.75 7,15.85 7,14.75V10.14L4,7.79V18H20V2Z"/>
        </svg>`;
        medalClass = 'medal-silver';
      } else if (index === 2) {
        // Medalla de Bronce
        medalIcon = `<svg class="medal-icon medal-bronze" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M20,2H4V4L9.81,8.36C6.14,9.57 4.14,13.53 5.35,17.2C6.56,20.87 10.5,22.87 14.19,21.66C17.86,20.45 19.86,16.5 18.65,12.82C17.8,10.38 15.59,8.69 13,8.25V14.75C13,15.85 12.1,16.75 11,16.75H9C7.9,16.75 7,15.85 7,14.75V10.14L4,7.79V18H20V2Z"/>
        </svg>`;
        medalClass = 'medal-bronze';
      } else {
        // Icono genérico para otras posiciones
        medalIcon = `<svg class="medal-icon medal-other" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M4,10V21H6V14H8V21H10V14H12V21H14V14H16V21H18V14H20V21H22V10L12,2L4,10M16,8L12,4.5L8,8H16Z"/>
        </svg>`;
        medalClass = 'medal-other';
      }
      
      item.innerHTML = `
        <span class="rank ${medalClass}">
          ${medalIcon}
          ${index + 1}
        </span>
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
