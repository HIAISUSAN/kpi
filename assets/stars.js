/* 隨機產生星空背景 + 流星 + 漂浮星球 */
(function makeStars() {
  const sf = document.querySelector('.starfield');
  if (!sf) return;
  // 200 顆星星
  for (let i = 0; i < 200; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.setProperty('--dur', (2 + Math.random() * 4) + 's');
    s.style.animationDelay = Math.random() * 5 + 's';
    sf.appendChild(s);
  }
  // 5 顆流星
  for (let i = 0; i < 5; i++) {
    const ss = document.createElement('div');
    ss.className = 'shooting-star';
    ss.style.left = (50 + Math.random() * 50) + '%';
    ss.style.top = Math.random() * 50 + '%';
    ss.style.animationDelay = (i * 2.5) + 's';
    sf.appendChild(ss);
  }
  // 漂浮星球
  const planets = [
    { emoji: '🪐', size: 80, x: 8, y: 18, color: '#fbbf24' },
    { emoji: '🌙', size: 60, x: 90, y: 25, color: '#e5e7eb' },
    { emoji: '👽', size: 50, x: 5, y: 75, color: '#34d399' },
    { emoji: '☄️', size: 56, x: 88, y: 70, color: '#f87171' },
    { emoji: '🛸', size: 70, x: 80, y: 12, color: '#a855f7' },
  ];
  planets.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'planet';
    el.textContent = p.emoji;
    el.style.fontSize = p.size + 'px';
    el.style.left = p.x + '%';
    el.style.top = p.y + '%';
    el.style.color = p.color;
    el.style.animationDelay = (i * 0.8) + 's';
    sf.appendChild(el);
  });
})();
