/* =========================================================
   KPI 宇宙遊戲樂園 — Supabase 雲端版資料層
   所有人共用同一個資料庫，永久累積
   ========================================================= */

const KPI = (() => {

  // ========= Supabase 連線設定 =========
  const SUPABASE_URL = 'https://nukceeqklkmnndgijehj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_jFJLeyumi1hQsnkyaDXrrQ_piDukx6a';

  const REST = SUPABASE_URL + '/rest/v1';
  const HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
  };

  async function _get(path) {
    const r = await fetch(REST + path, { headers: HEADERS });
    if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`);
    return r.json();
  }
  async function _post(path, body, prefer = 'return=representation') {
    const r = await fetch(REST + path, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: prefer },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`POST ${path}: ${r.status} ${await r.text()}`);
    if (prefer.includes('return=representation')) return r.json();
    return null;
  }
  async function _patch(path, body) {
    const r = await fetch(REST + path, {
      method: 'PATCH',
      headers: { ...HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`PATCH ${path}: ${r.status} ${await r.text()}`);
    return r.json();
  }
  async function _delete(path) {
    const r = await fetch(REST + path, { method: 'DELETE', headers: HEADERS });
    if (!r.ok) throw new Error(`DELETE ${path}: ${r.status} ${await r.text()}`);
  }

  // ========= snake_case ↔ camelCase 對應 =========
  function userFromDb(u) {
    return u ? {
      id: u.id,
      name: u.name,
      email: u.email,
      group: u.group_id,
      password: u.password,
      shipImage: u.ship_image,
      coins: u.coins || 0,
      apples: u.apples || 0,
      redStreak: u.red_streak || 0,
      redTotal: u.red_total || 0,
      greenStreak: u.green_streak || 0,
      greenTotal: u.green_total || 0,
      banned: u.banned || false,
      eliminated: u.eliminated || false,
      createdAt: u.created_at,
    } : null;
  }
  function userToDb(u) {
    const d = {};
    if (u.name !== undefined) d.name = u.name;
    if (u.email !== undefined) d.email = u.email;
    if (u.group !== undefined) d.group_id = u.group;
    if (u.password !== undefined) d.password = u.password;
    if (u.shipImage !== undefined) d.ship_image = u.shipImage;
    if (u.coins !== undefined) d.coins = u.coins;
    if (u.apples !== undefined) d.apples = u.apples;
    if (u.redStreak !== undefined) d.red_streak = u.redStreak;
    if (u.redTotal !== undefined) d.red_total = u.redTotal;
    if (u.greenStreak !== undefined) d.green_streak = u.greenStreak;
    if (u.greenTotal !== undefined) d.green_total = u.greenTotal;
    if (u.banned !== undefined) d.banned = u.banned;
    if (u.eliminated !== undefined) d.eliminated = u.eliminated;
    return d;
  }
  function ciFromDb(c) {
    return c ? {
      id: c.id,
      userId: c.user_id,
      date: c.date,
      mainAccount: c.main_account,
      partnerIds: c.partner_ids || [],
      specialTaskDone: c.special_task_done,
      reflectionDone: c.reflection_done,
    } : null;
  }
  function ciToDb(c) {
    const d = {};
    if (c.userId !== undefined) d.user_id = c.userId;
    if (c.date !== undefined) d.date = c.date;
    if (c.mainAccount !== undefined) d.main_account = c.mainAccount;
    if (c.partnerIds !== undefined) d.partner_ids = c.partnerIds;
    if (c.specialTaskDone !== undefined) d.special_task_done = c.specialTaskDone;
    if (c.reflectionDone !== undefined) d.reflection_done = c.reflectionDone;
    d.updated_at = new Date().toISOString();
    return d;
  }
  function likeFromDb(l) {
    return { id: l.id, fromUserId: l.from_user_id, toUserId: l.to_user_id, weekId: l.week_id, createdAt: l.created_at };
  }
  function cmtFromDb(c) {
    return { id: c.id, fromUserId: c.from_user_id, toUserId: c.to_user_id, weekId: c.week_id, text: c.text, createdAt: c.created_at };
  }

  // ========= 本地快取（從 Supabase 同步） =========
  const cache = {
    users: [],
    checkins: [],
    likes: [],
    comments: [],
    settings: {},
    weekStats: [],
    loaded: false,
  };

  // ========= 主帳號 / 夥伴帳號 / 組別（固定資料） =========
  const MAIN_ACCOUNTS = [
    { id: 'm1', name: 'AI在家創業（菽駗）' },
    { id: 'm2', name: 'Susan Fu（菽駗）' },
  ];
  const PARTNER_ACCOUNTS = [
    'Lynn 蔡佩凌（佩凌）','序境．feeling（佩凌）','爸總｜謙哥（學謙）','食光好物社（泳錫）',
    '健康智生活（銘鴻）','昱元屋設計星球（佩紋）','Joanne｜理想生活練習中（昀臻）','好帶研究室（沛潔）',
    '動漫醫生（榮宏）','River Flow（品嫻）','城市中的輕旅行（品嫻）','心觀山月（玲足）',
    'Mandy教你避雷（玲足）','FB&IG帳號：金鑲玉（玲足）','藝遊味境（惠芸）','醫學分享小教室（梅英）',
    'Wenhsien Lin（文賢）','Bryan Lin（文賢）','Bryant Lin（文賢）','Brian Lin（文賢）',
    '你看不到的環境數據（念勳）','大明｜慢活健康·生活轉變（華明）','陳緒罡（緒罡）','Sophia的紅塵足跡（旭雯）',
    '記憶方塊 Memo Cubee（欣宜）','Wynn Chen（雅雯）','［誤差值：0.5倍速生活］在施工暫停的日子裡（雅雯）','Stay Yuma｜嫚嫚慢慢變好（又嫚）',
    '娜沐沐 Namuu\'muu\'（佩珆）','全球教練咖啡館（文足）','歐洲管理驅動（文足）','Snail Ji（懿倫）',
    '藝點心生活（懿倫）','麵之友（展國）','Greg Chang（展國）',
    '寶格。Coach Opal（佩勳）','Catherine Tuan（段維華）','不崩潰料理研究室（段維華）','8意藝術實驗室（段維華）',
  ].map((name, i) => ({ id: 'p' + (i + 1), name }));
  const GROUPS = [
    { id: 'A', name: 'A 組 美編', desc: '視覺設計、素材製作', countsBasic: true, inGame: true },
    { id: 'B', name: 'B 組 找廠商', desc: '廠商開發與聯繫', countsBasic: true, inGame: true },
    { id: 'C', name: 'C 組 自媒體', desc: '內容創作 / 平台經營', countsBasic: true, inGame: true },
    { id: 'D', name: 'D 組 賺流量', desc: '導流、社群擴散', countsBasic: true, inGame: true },
    { id: 'E', name: 'E 組 經理人', desc: 'AI 講師 / 整合營運', countsBasic: false, inGame: true, note: '可不計入基本盤' },
    { id: 'F', name: 'F 組 飯店優惠', desc: '只計組內任務', countsBasic: false, inGame: true, note: '不計基本盤，僅看任務' },
    { id: 'G', name: 'G 組 AI 財商導師', desc: '只計組內任務', countsBasic: false, inGame: true, note: '不計基本盤，僅看任務' },
    { id: 'H', name: 'H 組 轉廠商', desc: '不參與遊戲', countsBasic: false, inGame: false, note: '不參與遊戲' },
  ];

  // ========= 工具 =========
  function today() { return new Date().toISOString().slice(0, 10); }
  function weekId(d = new Date()) {
    const tmp = new Date(d);
    const day = tmp.getDay();
    // 週三起算（day=3 為週三）→ 週二為週末結算日
    const offsetToWed = (day - 3 + 7) % 7;
    tmp.setDate(tmp.getDate() - offsetToWed);
    return tmp.toISOString().slice(0, 10);
  }

  // ========= 初始化：從 Supabase 抓所有資料到 cache =========
  async function init() {
    const [users, checkins, likes, comments, settings] = await Promise.all([
      _get('/users?select=*&order=created_at.asc'),
      _get('/checkins?select=*'),
      _get('/likes?select=*'),
      _get('/comments?select=*&order=created_at.desc'),
      _get('/settings?select=*'),
    ]);
    cache.users = users.map(userFromDb);
    cache.checkins = checkins.map(ciFromDb);
    cache.likes = likes.map(likeFromDb);
    cache.comments = comments.map(cmtFromDb);
    cache.settings = {};
    settings.forEach(s => { cache.settings[s.key] = s.value; });
    cache.loaded = true;
  }

  // ========= Settings =========
  function getSettings() {
    return {
      teamPassword: cache.settings.teamPassword || 'KPI2026',
      throneOfWeek: cache.settings.throneOfWeek || null,
      lastAnnouncement: cache.settings.lastAnnouncement || null,
      adminEmail: cache.settings.adminEmail || 'FUXPIG@gmail.com',
      adminPassword: cache.settings.adminPassword || '12345678',
    };
  }
  async function setSettings(patch) {
    for (const [k, v] of Object.entries(patch)) {
      // 用 upsert 處理（新 key 或既有 key 都 OK）
      const r = await fetch(REST + '/settings?on_conflict=key', {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=minimal,resolution=merge-duplicates' },
        body: JSON.stringify({ key: k, value: v }),
      });
      if (!r.ok) throw new Error(`upsert setting ${k}: ${r.status} ${await r.text()}`);
      cache.settings[k] = v;
    }
  }

  // ========= Users =========
  function listUsers() { return cache.users.slice(); }
  function getUser(id) { return cache.users.find(u => u.id === id) || null; }
  function getUserByName(name) { return cache.users.find(u => u.name === name) || null; }

  async function addUser(u) {
    if (cache.users.find(x => x.name === u.name)) throw new Error('這個暱稱已被使用');
    const dbUser = userToDb({
      ...u,
      coins: 0, apples: 0,
      redStreak: 0, redTotal: 0,
      greenStreak: 0, greenTotal: 0,
      banned: false, eliminated: false,
    });
    const res = await _post('/users', dbUser);
    const newUser = userFromDb(res[0]);
    cache.users.push(newUser);
    return newUser;
  }
  async function updateUser(id, patch) {
    const res = await _patch(`/users?id=eq.${id}`, userToDb(patch));
    if (!res.length) return null;
    const updated = userFromDb(res[0]);
    const i = cache.users.findIndex(u => u.id === id);
    if (i >= 0) cache.users[i] = updated;
    return updated;
  }
  async function deleteUser(id) {
    await _delete(`/users?id=eq.${id}`);
    cache.users = cache.users.filter(u => u.id !== id);
    cache.checkins = cache.checkins.filter(c => c.userId !== id);
    cache.likes = cache.likes.filter(l => l.fromUserId !== id && l.toUserId !== id);
    cache.comments = cache.comments.filter(c => c.fromUserId !== id && c.toUserId !== id);
  }

  // ========= Session（用 localStorage 存目前登入者） =========
  const SESSION_KEY = 'kpi.session';
  async function login(name, password) {
    const u = getUserByName(name);
    if (!u) throw new Error('找不到此暱稱');
    if (u.banned) throw new Error('此帳號已停用');
    if (u.eliminated) throw new Error('此帳號已被黑洞吞噬 🕳️');
    if (u.password !== password) throw new Error('密碼錯誤');
    localStorage.setItem(SESSION_KEY, JSON.stringify(u.id));
    return u;
  }
  function currentUser() {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    return getUser(JSON.parse(id));
  }
  function logout() { localStorage.removeItem(SESSION_KEY); }

  // ========= Check-ins =========
  function listCheckIns(filter = {}) {
    let list = cache.checkins.slice();
    if (filter.userId) list = list.filter(c => c.userId === filter.userId);
    if (filter.date) list = list.filter(c => c.date === filter.date);
    if (filter.weekId) list = list.filter(c => weekId(new Date(c.date)) === filter.weekId);
    return list;
  }
  async function saveCheckIn(c) {
    const dbCi = ciToDb(c);
    // upsert by (user_id, date)
    const r = await fetch(REST + '/checkins?on_conflict=user_id,date', {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(dbCi),
    });
    if (!r.ok) throw new Error(`upsert checkin: ${r.status} ${await r.text()}`);
    const saved = (await r.json())[0];
    const newCi = ciFromDb(saved);
    const i = cache.checkins.findIndex(x => x.userId === newCi.userId && x.date === newCi.date);
    if (i >= 0) cache.checkins[i] = newCi;
    else cache.checkins.push(newCi);
    await recomputeUserStats(c.userId);
  }

  // ========= 計算金幣 / 蘋果 =========
  async function recomputeUserStats(userId) {
    const u = getUser(userId);
    if (!u) return;
    const wk = weekId();
    const weekCheckIns = listCheckIns({ userId, weekId: wk });
    let coins = 0, apples = 0;
    for (const c of weekCheckIns) {
      const hasMain = !!c.mainAccount;
      const hasPartners = (c.partnerIds || []).length >= 3;
      if (hasMain && hasPartners) coins++;
      const extra = Math.max(0, (c.partnerIds || []).length - 3);
      apples += extra;
    }
    await updateUser(userId, { coins, apples });
  }

  // ========= 分層判定 =========
  function tierOf(userId, opts = {}) {
    const u = getUser(userId);
    if (!u) return 'B';
    const group = GROUPS.find(g => g.id === u.group) || { countsBasic: true, inGame: true };
    if (!group.inGame) return 'OUT';

    const wk = weekId(opts.when || new Date());
    const weekCheckIns = listCheckIns({ userId, weekId: wk });

    // 結算時：完全沒互動 → C
    if (opts.atSettlement && weekCheckIns.length === 0) return 'C';
    // 平時：沒互動視為 B（起步狀態）
    if (weekCheckIns.length === 0) return 'B';

    let allBasicMet = true;
    let anyBasicMet = false;
    for (const c of weekCheckIns) {
      const ok = !!c.mainAccount && (c.partnerIds || []).length >= 3;
      if (ok) anyBasicMet = true;
      else allBasicMet = false;
    }
    const hasReflection = weekCheckIns.some(c => c.reflectionDone);
    const taskDone = weekCheckIns.some(c => c.specialTaskDone);

    if (!hasReflection && opts.atSettlement) return 'C';

    if (!group.countsBasic) {
      return taskDone ? 'A' : 'B';
    }
    if (allBasicMet && taskDone && hasReflection) return 'A';
    if (!anyBasicMet && opts.atSettlement) return 'C';
    return 'B';
  }

  function shipPosition(userId) {
    const tier = tierOf(userId);
    const u = getUser(userId);
    if (!u) return 0.5;
    if (tier === 'A') return 0.12;
    if (tier === 'B') return 0.50;
    if (tier === 'C') {
      const streak = u.redStreak || 0;
      if (streak >= 3) return 0.97;
      if (streak === 2) return 0.88;
      return 0.78;
    }
    return 0.50;
  }

  function ranking() {
    return listUsers()
      .filter(u => !u.banned && !u.eliminated)
      .map(u => ({ ...u, score: (u.coins || 0) * 10 + (u.apples || 0) * 2 }))
      .sort((a, b) => b.score - a.score);
  }

  // ========= 按讚 =========
  function listLikes(toUserId, wk = weekId()) {
    return cache.likes.filter(l => l.toUserId === toUserId && l.weekId === wk);
  }
  function hasLiked(fromUserId, toUserId, wk = weekId()) {
    return cache.likes.some(l => l.fromUserId === fromUserId && l.toUserId === toUserId && l.weekId === wk);
  }
  async function toggleLike(fromUserId, toUserId) {
    const wk = weekId();
    const existing = cache.likes.find(l => l.fromUserId === fromUserId && l.toUserId === toUserId && l.weekId === wk);
    if (existing) {
      await _delete(`/likes?id=eq.${existing.id}`);
      cache.likes = cache.likes.filter(l => l.id !== existing.id);
      return false;
    }
    const res = await _post('/likes', { from_user_id: fromUserId, to_user_id: toUserId, week_id: wk });
    cache.likes.push(likeFromDb(res[0]));
    return true;
  }

  // ========= 留言 =========
  function listComments(toUserId, wk = weekId()) {
    return cache.comments
      .filter(c => c.toUserId === toUserId && c.weekId === wk)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  async function addComment(fromUserId, toUserId, text) {
    text = (text || '').trim();
    if (!text) throw new Error('留言不可空白');
    if (text.length > 200) throw new Error('留言不可超過 200 字');
    const res = await _post('/comments', {
      from_user_id: fromUserId, to_user_id: toUserId,
      week_id: weekId(), text,
    });
    const newC = cmtFromDb(res[0]);
    cache.comments.unshift(newC);
    return newC;
  }
  async function deleteComment(commentId, byUserId) {
    const c = cache.comments.find(x => x.id === commentId);
    if (!c) return false;
    if (c.fromUserId !== byUserId) return false;
    await _delete(`/comments?id=eq.${commentId}`);
    cache.comments = cache.comments.filter(x => x.id !== commentId);
    return true;
  }

  // ========= 週結算 =========
  async function settleWeek() {
    const users = listUsers();
    const results = {};
    for (const u of users) {
      if (u.banned || u.eliminated) continue;
      const tier = tierOf(u.id, { atSettlement: true });
      let redStreak = u.redStreak || 0;
      let redTotal = u.redTotal || 0;
      let greenStreak = u.greenStreak || 0;
      let greenTotal = u.greenTotal || 0;
      if (tier === 'C') { redStreak += 1; redTotal += 1; greenStreak = 0; }
      else if (tier === 'A') { redStreak = 0; greenStreak += 1; greenTotal += 1; }
      else { greenStreak = 0; }
      let eliminated = u.eliminated;
      if (redStreak >= 3) eliminated = true;
      await updateUser(u.id, { redStreak, redTotal, greenStreak, greenTotal, eliminated });
      results[u.id] = { tier, redStreak, redTotal, greenStreak, greenTotal, eliminated };
    }
    await _post('/week_stats', { week_id: weekId(), results });
    return results;
  }

  // ========= 重新整理 cache =========
  async function refresh() {
    await init();
  }

  // ========= 工具：emoji → SVG（給示範用）=========
  function emojiToSvgDataUrl(emoji) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='50' fill='%232d1b69'/><text x='50' y='62' font-size='52' text-anchor='middle'>${emoji}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + svg;
  }

  // ========= Demo 帳號（雲端版只在資料庫沒人時建立一次）=========
  async function seedDemoUsers() {
    if (!cache.loaded) await init();
    if (cache.users.length > 0) return;
    const demos = [
      { name: '佩凌 (Demo)', email: 'peilin@demo.com', group: 'A', emoji: '🚀' },
      { name: '泳錫 (Demo)', email: 'yong@demo.com',   group: 'B', emoji: '🛸' },
      { name: '銘鴻 (Demo)', email: 'ming@demo.com',   group: 'C', emoji: '👽' },
      { name: '雅雯 (Demo)', email: 'yawen@demo.com',  group: 'D', emoji: '🌟' },
      { name: '文足 (Demo)', email: 'wenzu@demo.com',  group: 'A', emoji: '☄️' },
      { name: '欣宜 (Demo)', email: 'xinyi@demo.com',  group: 'B', emoji: '🪐' },
      { name: '懿倫 (Demo)', email: 'yilun@demo.com',  group: 'C', emoji: '🌙' },
    ];
    for (const d of demos) {
      await addUser({
        name: d.name, email: d.email, group: d.group,
        password: 'demo', shipImage: emojiToSvgDataUrl(d.emoji),
      });
    }
    const users = listUsers();
    const dates = [-5, -4, -3, -2, -1, 0].map(off => {
      const dt = new Date(); dt.setDate(dt.getDate() + off); return dt.toISOString().slice(0, 10);
    });
    if (users[0]) for (const d of dates) await saveCheckIn({
      userId: users[0].id, date: d, mainAccount: MAIN_ACCOUNTS[0].id,
      partnerIds: [PARTNER_ACCOUNTS[0].id, PARTNER_ACCOUNTS[1].id, PARTNER_ACCOUNTS[2].id, PARTNER_ACCOUNTS[3].id],
      specialTaskDone: true, reflectionDone: true,
    });
    if (users[1]) for (const d of dates.slice(0, 3)) await saveCheckIn({
      userId: users[1].id, date: d, mainAccount: MAIN_ACCOUNTS[0].id,
      partnerIds: [PARTNER_ACCOUNTS[0].id, PARTNER_ACCOUNTS[1].id],
      specialTaskDone: false, reflectionDone: true,
    });
    if (users[3]) for (const d of dates) await saveCheckIn({
      userId: users[3].id, date: d, mainAccount: MAIN_ACCOUNTS[1].id,
      partnerIds: PARTNER_ACCOUNTS.slice(0, 7).map(p => p.id),
      specialTaskDone: true, reflectionDone: true,
    });
    if (users[4]) for (const d of dates) await saveCheckIn({
      userId: users[4].id, date: d, mainAccount: MAIN_ACCOUNTS[0].id,
      partnerIds: [PARTNER_ACCOUNTS[10].id, PARTNER_ACCOUNTS[11].id, PARTNER_ACCOUNTS[12].id, PARTNER_ACCOUNTS[13].id, PARTNER_ACCOUNTS[14].id],
      specialTaskDone: true, reflectionDone: true,
    });
  }

  async function resetAll() {
    // 清空雲端（小心使用！）
    for (const u of cache.users.slice()) await _delete(`/users?id=eq.${u.id}`);
    cache.users = []; cache.checkins = []; cache.likes = []; cache.comments = []; cache.weekStats = [];
    localStorage.removeItem(SESSION_KEY);
  }

  return {
    // 固定資料
    MAIN_ACCOUNTS, PARTNER_ACCOUNTS, GROUPS,
    // 工具
    today, weekId, emojiToSvgDataUrl,
    // 初始化
    init, refresh,
    // settings
    getSettings, setSettings,
    // users
    listUsers, getUser, getUserByName, addUser, updateUser, deleteUser,
    // session
    login, currentUser, logout,
    // checkins
    listCheckIns, saveCheckIn,
    // social
    listLikes, hasLiked, toggleLike,
    listComments, addComment, deleteComment,
    // game logic
    tierOf, shipPosition, ranking, settleWeek, recomputeUserStats,
    // dev
    seedDemoUsers, resetAll,
  };
})();
