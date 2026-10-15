/* 单题页的页内自测评分：与刷题工作台共用同一份 localStorage 进度 */
(function () {
  var LS_KEY = 'bagu_shuati_v1';
  var PRESETS = {
    forgot: { retention: 35, nextReviewText: '10 分钟后重刷' },
    hard: { retention: 65, nextReviewText: '1 天后复习' },
    good: { retention: 86, nextReviewText: '3 天后复习' },
    easy: { retention: 98, nextReviewText: '7 天后复习' }
  };
  var body = document.body;
  var QID = body.dataset.qid;
  var QTITLE = body.dataset.qtitle || '';
  var QTOPIC = body.dataset.topic || '';

  function pad(n) { return String(n).padStart(2, '0'); }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function now() { return today() + ' ' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()) + ':' + pad(new Date().getSeconds()); }

  function read() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || {}; } catch (e) { return {}; }
  }
  function write(snap) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(snap)); } catch (e) { /* 存储受限时静默降级 */ }
  }

  var toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);
  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  function paintProgress(srs) {
    var pill = document.querySelector('[data-srs-pill]');
    if (!pill) return;
    if (!srs || !srs.reviewCount) {
      pill.textContent = '尚未刷过';
      pill.className = 'badge srs';
      return;
    }
    pill.textContent = '已刷 ' + srs.reviewCount + ' 次 · 留存 ' + (srs.retention || 0) + '%';
    pill.className = 'badge srs';
  }

  var snap = read();
  snap.srs = snap.srs || {};
  paintProgress(snap.srs[QID]);

  // 展开答案后才展示评分区（避免未对照答案就先评分）
  var details = document.querySelector('[data-answer]');
  var rateBox = document.querySelector('[data-rate-box]');
  if (details && rateBox) {
    var sync = function () { rateBox.style.display = details.open ? '' : 'none'; };
    sync();
    details.addEventListener('toggle', sync);
  }

  document.querySelectorAll('[data-rate]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var rating = btn.dataset.rate;
      var preset = PRESETS[rating];
      if (!preset) return;

      var s = read();
      s.srs = s.srs || {};
      s.logs = s.logs || [];
      var cur = Object.assign({ reviewCount: 0, lastReviewedAt: '尚未刷过', retention: 25, nextReviewText: '新题待攻克', lastRating: null, userNote: '' }, s.srs[QID] || {});
      cur.reviewCount += 1;
      cur.lastReviewedAt = now();
      cur.lastRating = rating;
      cur.retention = preset.retention;
      cur.nextReviewText = preset.nextReviewText;
      s.srs[QID] = cur;

      s.logs.unshift({
        id: 'log_' + Date.now(), qId: QID, qTitle: QTITLE, bankName: QTOPIC,
        time: cur.lastReviewedAt, rating: rating,
        countAfter: cur.reviewCount, retentionAfter: preset.retention
      });
      s.logs = s.logs.slice(0, 400);

      if (s.todayDate === today()) s.today = (s.today || 0) + 1;
      else { s.todayDate = today(); s.today = 1; }
      s.v = 1;
      write(s);

      paintProgress(cur);
      showToast('已记录第 ' + cur.reviewCount + ' 次刷完 · 留存率 ' + preset.retention + '% · 进度已同步到工作台');
    });
  });
})();
