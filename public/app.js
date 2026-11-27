import { connect, isDemo } from './data.js';

// Display bg (1) through bg (9) in order; keep legacy saved IDs 9–14 valid.
const backgroundFiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 2, 5, 8, 9, 8];
const backgrounds = backgroundFiles.map(file => '/art/background-' + file + '.png');
const selectableBackgrounds = [0, 1, 2, 3, 4, 5, 6, 7, 8];
// Preserve the flower/cream/pearl IDs used by existing letters.
const styles = ['59', '58', '58-1', '59-1', '84', '60', '82', '83', '85', '88', '89']
  .map(file => '/art/ornament-' + file + '.png');
const backgroundLabels = { 1: '눈 내리는 하늘', 2: '레드 체크', 3: '레드 반짝이', 4: '핑크 반짝이',
  5: '화이트 니트', 6: '눈 오는 산책길', 7: '별빛 눈밭', 8: '핑크 레이스 체크', 9: '그린 체크' };
const backgroundNames = backgroundFiles.map(file => backgroundLabels[file]);
const styleNames = ['진주 꽃', '크림 리본', '레이스 리본', '아이보리 새틴 리본', '핑크 새틴 리본', '진주 리본',
  '레드 체크 리본', '그린 타탄 리본', '핑크 체크 리본', '미니 핑크 리본', '미니 핑크 매듭 리본'];
// Match the title to the actual artwork, including mixed light/dark patterns.
function sceneTheme(background) {
  const dark = [2, 3, 6].includes(backgroundFiles[background]);
  return {
    title: dark ? '#fff9ee' : '#254737',
    subtitle: dark ? '#f1eadc' : '#3e584b',
  };
}
const treeArt = '/art/tree-illustrated-v1.png';
const lights = [[49,12],[43,24],[55,28],[38,38],[52,43],[62,41],[30,54],[46,55],[59,56],[70,60],[24,69],[39,70],[54,70],[65,75],[78,76],[16,83],[33,84],[49,86],[74,88],[87,85]];
const app = document.querySelector('#app');
const sheet = document.querySelector('#sheet');
const toast = document.querySelector('#toast');

let store, tree, treeId, cursor, more, selected, drag, toastTimer;
let letters = [];
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const closeIcon = '<img src="/art/close.svg" alt="">';
const isOwner = () => treeId === store.ownerId();
const canMove = letter => isOwner() || (letter.authorUid && letter.authorUid === store.uid());

function notice(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toastTimer = setTimeout(() => { toast.textContent = ''; }, 3500);
}

function scene(data, preview = false, owner = false) {
  const tag = preview ? 'strong' : 'h1';
  const name = data.name || (preview ? '{제인}' : '제인');
  const parts = lights.map(([x, y]) => '<i style="left:' + x + '%;top:' + y + '%"></i>').join('');
  const background = backgrounds[data.background];
  const theme = sceneTheme(data.background);
  return '<section class="scene' + (data.lit ? ' is-lit' : '') + (owner ? ' owner-scene' : '') + (background ? ' has-backdrop' : '') + '"'
    + ' style="--scene-title:' + theme.title + ';--scene-subtitle:' + theme.subtitle + '"'
    + (preview ? ' aria-label="트리 미리보기"' : '') + '>'
    + (background ? '<img class="backdrop" alt="" src="' + background + '">' : '')
    + '<div class="scene-copy' + (name.length === 4 ? ' long' : '') + '"><p lang="en">Merry Christmas</p><' + tag + '>' + escape(name) + '의 트리</' + tag + '></div>'
    + '<div class="stage"><img class="tree" src="' + treeArt + '" alt="">'
    + '<div class="bulbs" aria-hidden="true">' + parts + '</div></div></section>';
}

function action(id, title, description, primary = false) {
  return '<button class="' + (primary ? 'primary' : 'secondary') + '" id="' + id + '" type="button"><strong>'
    + title + '</strong><small>' + description + '</small></button>';
}

function render() {
  const owner = isOwner();
  app.innerHTML = scene(tree, false, owner)
    + (owner ? '<label class="light-control">반짝이는 조명 키기 <input id="light" type="checkbox" role="switch"'
      + (tree.lit ? ' checked' : '') + '></label>' : '')
    + (letters.length ? '<p class="tree-hint">장식을 누르면 편지가 열려요' + (owner ? ' · 끌어서 위치를 바꿔보세요' : '') + '</p>' : '')
    + '<div class="actions tree-actions">'
    + (owner
      ? action('invite', '공유하기', '친구에게 공유해서 오너먼트를 추가해달라고 요청해보세요!', true)
        + '<div class="pair">' + action('save-image', '내 트리사진 저장하기', '내 트리랑 메시지를 간직해요')
        + action('copy-link', '링크 복사하기', '초대 링크를 복사하고 보내봐요') + '</div>'
      : action('write', '편지 남기고 장식 달기', '장식을 추가하고 하고 싶은 말을 남겨보세요!', true)
        + '<div class="pair">' + action('create', '내 트리 만들기', '내 트리를 새로 만들어봐요')
        + action('my-tree', '내 트리 보기', '만든 내 트리를 보러가요') + '</div>')
    + '</div><div class="utilities">'
    + (letters.length ? '<button id="letter-list">편지 목록 보기</button>' : '')
    + (more ? '<button id="more">이전 편지 더 보기</button>' : '')
    + (owner ? '<button id="share-image">사진 공유</button>' + (isDemo
      ? '<a href="/?demo=1&amp;tree=demo">샘플 트리</a>' : '<button id="logout">로그아웃</button>') : '')
    + (owner ? '<button id="delete-tree">내 트리 삭제하기</button>' : '')
    + '</div>';
  const stage = app.querySelector('.stage');
  stage.parentElement.addEventListener('click', event => {
    if (!event.target.closest('.ornament,.bubble')) showLetter(null);
  });
  renderOrnaments();
  document.querySelector('#my-tree')?.addEventListener('click', () => myTree());
  document.querySelector('#logout')?.addEventListener('click', async () => {
    try { await store.signOut(); location.assign('/'); } catch { notice('로그아웃을 완료하지 못했어요.'); }
  });
  document.querySelector('#light')?.addEventListener('change', toggleLight);
  document.querySelector('#delete-tree')?.addEventListener('click', deleteTreePrompt);
  document.querySelector('#write')?.addEventListener('click', letterForm);
  document.querySelector('#letter-list')?.addEventListener('click', letterList);
  document.querySelector('#create')?.addEventListener('click', createForm);
  document.querySelector('#invite')?.addEventListener('click', () => invite());
  document.querySelector('#copy-link')?.addEventListener('click', () => invite(true));
  document.querySelector('#save-image')?.addEventListener('click', () => imageAction(false));
  document.querySelector('#share-image')?.addEventListener('click', () => imageAction(true));
  document.querySelector('#more')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try { await loadLetters(); render(); } catch { notice('편지를 불러오지 못했어요. 다시 시도해 주세요.'); }
    const button = document.querySelector('#more');
    if (button) button.disabled = false;
  });
}

function deleteTreePrompt() {
  if (!isOwner()) return;
  openSheet('트리를 삭제할까?', '<p class="delete-copy">친구들이 남긴 편지도 모두 사라져.<br>삭제한 트리와 편지는 되돌릴 수 없어.</p>'
    + '<form class="form"><p class="error" role="alert"></p><div class="pair">'
    + '<button class="secondary" type="button" id="keep-tree">간직할래</button>'
    + '<button class="primary danger" type="submit">삭제할래</button></div></form>');
  sheet.className = 'delete-sheet';
  const form = sheet.querySelector('form');
  const keep = sheet.querySelector('#keep-tree');
  const close = sheet.querySelector('.close');
  keep.addEventListener('click', () => sheet.close());
  keep.focus();
  const preventCancel = event => { if (form.dataset.submitting) event.preventDefault(); };
  sheet.addEventListener('cancel', preventCancel);
  sheet.addEventListener('close', () => sheet.removeEventListener('cancel', preventCancel), { once: true });
  submit(form, async () => {
    keep.disabled = close.disabled = true;
    const button = form.querySelector('.primary');
    button.textContent = '삭제하는 중…';
    try {
      await store.deleteTree(treeId);
      tree = null;
      treeId = null;
      letters = [];
      selected = cursor = undefined;
      more = false;
      history.replaceState(null, '', isDemo ? '/?demo=1' : '/');
      document.title = '소복소복 · 크리스마스 트리';
      sheet.close();
      renderHome();
      notice('트리와 편지를 삭제했어요.');
    } catch {
      throw new Error('삭제를 완료하지 못했어요. 연결을 확인하고 다시 눌러줘. 이미 삭제된 편지는 복구되지 않아.');
    } finally {
      keep.disabled = close.disabled = false;
      button.textContent = '삭제할래';
    }
  });
}

function letterList() {
  openSheet('받은 편지', '<div class="letter-list">' + letters.map(letter =>
    '<article><b>' + escape(letter.author) + '</b><p>' + escape(letter.message) + '</p></article>').join('') + '</div>'
    + (more ? '<button class="secondary" id="list-more">이전 편지 더 보기</button><p class="error" role="alert"></p>' : ''));
  sheet.querySelector('#list-more')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await loadLetters();
      render();
      letterList();
    } catch {
      sheet.querySelector('.error').textContent = '이전 편지를 불러오지 못했어요.';
    } finally { button.disabled = false; }
  });
}

function renderOrnaments() {
  const stage = app.querySelector('.stage');
  for (const letter of letters) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ornament' + (canMove(letter) ? ' movable' : '');
    button.setAttribute('aria-label', letter.author + '님의 편지' + (canMove(letter) ? ', 방향키로 위치 이동' : ''));
    button.setAttribute('aria-expanded', 'false');
    button.dataset.id = letter.id;
    position(button, letter);
    const image = document.createElement('img');
    image.src = styles[letter.style];
    image.alt = '';
    image.draggable = false;
    button.append(image);
    if (!isOwner() && letter.authorUid && letter.authorUid === store.uid()) {
      const tag = document.createElement('small');
      tag.textContent = '내꺼';
      button.append(tag);
    }
    stage.append(button);
    button.addEventListener('click', () => {
      if (!button.dataset.suppressClick) showLetter(selected === letter.id ? null : letter.id);
    });
    if (canMove(letter)) wireMove(button, stage, letter);
  }
  showLetter(selected);
}

function showLetter(id) {
  selected = id;
  const scene = app.querySelector('.scene');
  scene?.querySelector('.bubble')?.remove();
  for (const button of scene?.querySelectorAll('.ornament') || []) {
    button.setAttribute('aria-expanded', String(button.dataset.id === id));
  }
  const letter = letters.find(item => item.id === id);
  if (!letter || !scene) return;
  const bubble = document.createElement('article');
  const above = letter.y > 57;
  bubble.className = 'bubble' + (above ? ' above' : '');
  bubble.style.left = Math.max(42, Math.min(58, letter.x)) + '%';
  bubble.style.top = (121 + letter.y * 4.76) / 5.97 + (above ? -3.4 : 3.4) + '%';
  bubble.innerHTML = '<b>' + escape(letter.author) + '</b><p>' + escape(letter.message) + '</p>'
    + '<button class="close" type="button" aria-label="편지 닫기"><img src="/art/letter-close.svg" alt=""></button>';
  bubble.querySelector('button').addEventListener('click', () => {
    showLetter(null);
    [...scene.querySelectorAll('.ornament')].find(item => item.dataset.id === id)?.focus();
  });
  scene.append(bubble);
}

function position(button, { x, y }) {
  button.style.left = x + '%';
  button.style.top = y + '%';
}

// Narrow the upper range so ornaments stay near the tree as it tapers.
function withinTree(x, y) {
  y = Math.round(Math.max(13, Math.min(86, y)) * 10) / 10;
  const spread = Math.min(42, Math.max(9, y * .48));
  x = Math.round(Math.max(50 - spread, Math.min(50 + spread, x)) * 10) / 10;
  return { x, y };
}

async function persistMove(button, letter, point) {
  if (point.x === letter.x && point.y === letter.y) return;
  button.dataset.saving = 'true';
  const id = treeId;
  position(button, point);
  try {
    await store.move(id, letter.id, point);
    Object.assign(letter, point);
  } catch {
    position(button, letter);
    notice('위치를 저장하지 못했어요. 다시 시도해 주세요.');
  } finally {
    delete button.dataset.saving;
  }
}

function wireMove(button, stage, letter) {
  button.addEventListener('pointerdown', event => {
    if (drag || button.dataset.saving || event.button !== 0) return;
    drag = { id: event.pointerId, button, x: event.clientX, y: event.clientY, point: null };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', event => {
    if (drag?.button !== button || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.point && Math.hypot(dx, dy) < 6) return;
    if (!drag.point) showLetter(null);
    const bounds = stage.getBoundingClientRect();
    drag.point = withinTree(letter.x + 100 * dx / bounds.width, letter.y + 100 * dy / bounds.height);
    button.classList.add('dragging');
    position(button, drag.point);
  });
  const end = event => {
    if (drag?.button !== button || drag.id !== event.pointerId) return;
    const { point } = drag;
    drag = null;
    button.classList.remove('dragging');
    if (!point) return;
    button.dataset.suppressClick = 'true';
    setTimeout(() => { delete button.dataset.suppressClick; }, 0);
    if (event.type === 'pointerup') persistMove(button, letter, point);
    else position(button, letter);
  };
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('lostpointercapture', end);
  button.addEventListener('keydown', event => {
    const step = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -3], ArrowDown: [0, 3] }[event.key];
    if (!step) return;
    event.preventDefault();
    if (button.dataset.saving) return;
    showLetter(null);
    persistMove(button, letter, withinTree(letter.x + step[0], letter.y + step[1]));
  });
}

function choices(items, labels, active, background = false) {
  return '<div class="choices">' + items.map(([src, id]) =>
    '<button type="button" class="choice' + (background ? ' background' : '') + '" data-choice="' + id
      + '" aria-label="' + labels[id] + '" aria-pressed="' + active.includes(id) + '">'
      + '<img src="' + src + '" alt=""></button>').join('') + '</div>';
}

function choose(event, current, multi) {
  const button = event.target.closest('[data-choice]');
  if (!button) return current;
  const value = Number(button.dataset.choice);
  const next = multi ? (current.includes(value) ? current.filter(id => id !== value) : [...current, value]) : [value];
  if (!next.length) return current;
  for (const item of button.parentElement.querySelectorAll('[data-choice]')) {
    item.setAttribute('aria-pressed', String(next.includes(Number(item.dataset.choice))));
  }
  return next;
}

function openSheet(title, content) {
  sheet.className = '';
  sheet.setAttribute('aria-label', title);
  sheet.innerHTML = '<h2>' + escape(title) + '</h2><button class="close" type="button" aria-label="닫기">' + closeIcon + '</button>' + content;
  sheet.querySelector('.close').addEventListener('click', () => sheet.close());
  if (!sheet.open) sheet.showModal();
}

function letterForm() {
  let chosen = [];
  openSheet('크리스마스 편지 쓰기', '<form class="form">'
    + '<fieldset><legend>어떤 장식에 담을까?</legend>'
    + choices(tree.styles.map(id => [styles[id], id]), styleNames, chosen) + '</fieldset>'
    + '<label>어떤 이름으로 남길까?<input name="author" maxlength="16" required placeholder="친구가 알아볼 이름이나 별명"></label>'
    + '<label>어떤 말을 전하고 싶어?<span class="message-field"><textarea name="message" maxlength="180" required'
    + ' placeholder="올해도 너랑 친구여서 좋았어.&#10;내년에도 맛있는 거 많이 먹으러 다니자!"></textarea>'
    + '<span id="count">0 / 180</span></span></label>'
    + '<p class="error" role="alert"></p><button class="primary" disabled>트리에 달아주기</button></form>');
  sheet.className = 'compose';
  const form = sheet.querySelector('form');
  const button = form.querySelector('.primary');
  const updateButton = () => {
    button.disabled = form.dataset.submitting === 'true' || !chosen.length
      || !form.elements.author.value.trim() || !form.elements.message.value.trim();
  };
  form.querySelector('.choices').addEventListener('click', event => {
    chosen = choose(event, chosen, false);
    updateButton();
  });
  form.addEventListener('input', () => {
    form.querySelector('#count').textContent = form.elements.message.value.length + ' / 180';
    updateButton();
  });
  submit(form, async () => {
    const author = form.elements.author.value.trim();
    const message = form.elements.message.value.trim();
    if (!author || !message) throw new Error('이름과 편지를 모두 입력해 주세요.');
    if (message.split('\n').length > 5) throw new Error('편지는 최대 5줄까지 적을 수 있어요.');
    const point = newPoint();
    const letter = await store.add(treeId, { author, message, style: chosen[0], ...point });
    letters.unshift(letter);
    selected = letter.id;
    sheet.close();
    render();
    notice('편지를 달았어요! 오너먼트를 끌어서 옮겨보세요.');
  }, updateButton);
}

function newPoint() {
  const spots = [[53,29],[41,43],[61,45],[34,57],[53,59],[68,62],[27,73],[43,75],[59,75],[74,77],[18,84],[82,85]];
  const best = spots.find(([x, y]) => letters.every(item => Math.hypot(x - item.x, y - item.y) > 10));
  const [x, y] = best || spots[letters.length % spots.length];
  return withinTree(x, y);
}

function submit(form, action, updateButton) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button.primary');
    if (button.disabled) return;
    form.dataset.submitting = 'true';
    button.disabled = true;
    const error = form.querySelector('.error');
    error.textContent = '';
    try { await action(); } catch (failure) {
      error.textContent = failure.code ? friendlyError(failure) : (failure.message || friendlyError(failure));
    } finally {
      delete form.dataset.submitting;
      if (updateButton) updateButton();
      else button.disabled = false;
    }
  });
}

function friendlyError(error) {
  if (error.code === 'resource-exhausted' || error.code === 'auth/too-many-requests') return '요청이 많아요. 잠시 후 다시 시도해 주세요.';
  if (error.code === 'auth/popup-closed-by-user') return '로그인 창이 닫혔어요. 다시 시도해 주세요.';
  if (error.code === 'auth/popup-blocked') return '브라우저에서 팝업을 허용한 뒤 다시 눌러 주세요.';
  return '요청을 완료하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
}

function createForm() {
  const draft = { name: '', background: null, styles: [0, 1], lit: false };
  const back = '<button type="button" class="back" id="back" aria-label="돌아가기"><img src="/art/create-back.svg" alt=""></button>';
  app.innerHTML = '<div class="create-screen"><div class="create-heading">' + back + '<h1>내 트리 만들기</h1><span aria-hidden="true"></span></div>'
    + '<form class="form"><label>트리에 어떤 이름을 붙일까?<input name="name" placeholder="이름이나 별명을 4글자까지 입력해보아요" maxlength="4" required></label>'
    + '<fieldset id="styles"><legend>친구들이 달아줄 장식을 골라줘</legend>'
    + choices([0, 1, 2, 3, 5, 6, 7, 4, 8, 9, 10].map(id => [styles[id], id]), styleNames, draft.styles) + '</fieldset>'
    + '<section class="create-preview" aria-labelledby="preview-title"><div class="preview-heading"><h2 id="preview-title">미리 보기</h2>'
    + '<button type="button" id="choose-background">배경 바꾸기</button></div>'
    + '<div class="preview">' + scene(draft, true) + '</div></section>'
    + '<p class="error" role="alert"></p><button class="primary">내 트리 완성하기</button>'
    + (!store.ownerId() ? '<p class="create-login-note">완성할 때 Google 계정으로 내 트리를 연결해요.</p>' : '') + '</form></div>';
  window.scrollTo(0, 0);
  const form = app.querySelector('form');
  app.querySelector('#back').addEventListener('click', () => tree ? render() : renderHome());
  const preview = app.querySelector('.preview');
  const update = () => { preview.innerHTML = scene(draft, true); };
  form.elements.name.addEventListener('input', event => { draft.name = event.target.value.trim(); update(); });
  app.querySelector('#choose-background').addEventListener('click', () => {
    openSheet('트리와 어울리는 배경을 골라줘', choices(selectableBackgrounds.map(id => [backgrounds[id], id]), backgroundNames, [draft.background], true));
    sheet.querySelector('.choices').addEventListener('click', event => {
      if (!event.target.closest('[data-choice]')) return;
      const [id] = choose(event, [draft.background], false);
      draft.background = id;
      update();
      sheet.close();
    });
  });
  app.querySelector('#styles').addEventListener('click', event => { draft.styles = choose(event, draft.styles, true); });
  submit(form, async () => {
    if (!draft.name) throw new Error('트리 이름을 입력해 주세요.');
    await store.signIn();
    const id = await store.create({ name: draft.name, background: draft.background ?? 0, styles: draft.styles });
    location.assign(treeUrl(id));
  });
}

async function myTree() {
  const button = app.querySelector('#my-tree');
  button.disabled = true;
  try {
    await store.signIn();
    const id = store.ownerId();
    if (id && await store.tree(id)) location.assign(treeUrl(id));
    else createForm();
  } catch (error) { notice(friendlyError(error)); }
  finally { button.disabled = false; }
}

async function toggleLight(event) {
  const input = event.target;
  input.disabled = true;
  try {
    await store.light(treeId, input.checked);
    tree.lit = input.checked;
    app.querySelector('.scene').classList.toggle('is-lit', tree.lit);
  } catch {
    input.checked = tree.lit;
    notice('조명 설정을 저장하지 못했어요.');
  } finally { input.disabled = false; }
}

function treeUrl(id) {
  const url = new URL('/', location.origin);
  url.searchParams.set('tree', id);
  if (isDemo) url.searchParams.set('demo', '1');
  return url.href;
}

async function invite(copyOnly = false) {
  if (isDemo) { notice('Firebase를 연결하면 친구에게 링크를 보낼 수 있어요.'); return; }
  const url = treeUrl(treeId);
  if (!copyOnly && navigator.share) {
    try {
      await navigator.share({ title: tree.name + '의 트리를 꾸며주세요!', text: '오너먼트에 편지를 담아 달아주세요.', url });
      return;
    } catch (error) { if (error.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(url);
    notice('트리 링크를 복사했어요.');
  } catch {
    openSheet('트리 링크 공유', '<div class="form"><label>공유 링크<input readonly value="' + escape(url) + '"></label></div>');
    const input = sheet.querySelector('input');
    input.focus();
    input.select();
  }
}

function art(src) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

async function treePicture() {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1194;
  const ctx = canvas.getContext('2d');
  const backgroundSrc = backgrounds[tree.background];
  const theme = sceneTheme(tree.background);
  const [background, evergreen, ...ornaments] = await Promise.all([
    backgroundSrc ? art(backgroundSrc) : null, art(treeArt), ...letters.map(item => art(styles[item.style])),
  ]);
  ctx.fillStyle = '#fff8ee';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (background) {
    const scale = Math.max(canvas.width / background.width, canvas.height / background.height);
    const width = background.width * scale;
    const height = background.height * scale;
    ctx.drawImage(background, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }
  ctx.save();
  ctx.shadowColor = '#14291d40';
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 14;
  ctx.shadowBlur = 18;
  ctx.drawImage(evergreen, 36, 242, 648, 952);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.subtitle;
  ctx.font = '80px Gaegu, cursive';
  ctx.fillText('Merry Christmas', 360, 138);
  ctx.fillStyle = theme.title;
  ctx.font = (tree.name.length === 4 ? '100px' : '120px') + ' Gaegu, sans-serif';
  ctx.fillText(tree.name + '의 트리', 360, 243, 660);
  if (tree.lit) {
    ctx.fillStyle = '#fff1ba';
    ctx.shadowColor = '#ffc058';
    ctx.shadowBlur = 16;
    for (const [x, y] of lights) {
      ctx.beginPath();
      ctx.arc(36 + 6.48 * x, 242 + 9.52 * y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
  letters.forEach((letter, i) => {
    const image = ornaments[i];
    const ratio = 80 / Math.max(image.width, image.height);
    const w = image.width * ratio;
    const h = image.height * ratio;
    ctx.drawImage(image, 36 + letter.x * 6.48 - w / 2, 242 + letter.y * 9.52 - h / 2, w, h);
  });
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('사진 생성 실패')), 'image/png'));
}

async function imageAction(share) {
  try {
    const file = new File([await treePicture()], tree.name + '의-트리.png', { type: 'image/png' });
    const download = () => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    };
    if (share && navigator.canShare?.({ files: [file] })) {
      openSheet('트리 사진 공유', '<button class="primary" type="button">사진 공유하기</button>');
      sheet.querySelector('.primary').addEventListener('click', async () => {
        try { await navigator.share({ files: [file] }); sheet.close(); }
        catch (error) { if (error.name !== 'AbortError') { download(); sheet.close(); } }
      });
    } else {
      download();
      if (share) notice('사진을 저장했어요. 저장된 사진을 공유해 주세요.');
    }
  } catch { notice('사진을 만들지 못했어요. 다시 시도해 주세요.'); }
}

async function loadLetters() {
  const page = await store.letters(treeId, cursor);
  const existing = new Set(letters.map(item => item.id));
  letters.push(...page.letters.filter(item => !existing.has(item.id)));
  cursor = page.cursor;
  more = page.more;
}

async function openTree(id, knownTree) {
  treeId = id;
  selected = null;
  cursor = undefined;
  letters = [];
  tree = knownTree ?? await store.tree(id);
  if (tree?.deleting) {
    app.innerHTML = '<div class="error-page"><h1>삭제 중인 트리예요</h1><p>이 트리는 새로운 편지를 받을 수 없어요.</p>'
      + (isOwner() ? '<button class="secondary" id="resume-delete">트리 삭제 계속하기</button>' : '') + '</div>';
    app.querySelector('#resume-delete')?.addEventListener('click', deleteTreePrompt);
    return;
  }
  if (!tree) {
    app.innerHTML = '<div class="error-page"><h1>트리를 찾을 수 없어요</h1><p>친구에게 링크를 다시 확인해 주세요.</p></div>';
    return;
  }
  await loadLetters();
  document.title = tree.name + '의 트리 · 소복소복';
  render();
}

function renderHome() {
  app.innerHTML = '<div class="landing"><section class="landing-card" aria-labelledby="landing-title">'
    + '<div class="intro"><h1 id="landing-title">친구들의 한마디가<br>내 트리에 소복소복</h1></div>'
    + '<div class="landing-illustration"><img class="landing-tree" src="' + treeArt + '" alt="핑크 리본을 단 손그림 크리스마스 트리" width="183" height="269">'
    + '<p class="landing-message message-first">⭐ "올해도 고생 많았어!"</p>'
    + '<p class="landing-message message-second">🧦 "우리 연말에 꼭 보자"</p>'
    + '<p class="landing-message message-third">🎄 "내년엔 더 행복하자 우리"</p></div>'
    + '<div class="landing-controls"><button class="landing-create" id="create" type="button">내 트리 만들기</button>'
    + '<button class="landing-find" id="my-tree" type="button">만들어둔 내 트리 찾기</button>'
    + '</div></section>'
    + (isDemo ? '<div class="utilities"><a href="/?demo=1&amp;tree=demo">샘플 트리 둘러보기</a></div>' : '') + '</div>';
  app.querySelector('#create').addEventListener('click', createForm);
  app.querySelector('#my-tree').addEventListener('click', myTree);
}

async function start() {
  try {
    store = await connect();
    const id = new URLSearchParams(location.search).get('tree');
    if (id && /^[\w-]{1,128}$/.test(id)) await openTree(id);
    else if (!isDemo && store.ownerId()) {
      const ownTree = await store.tree(store.ownerId());
      if (ownTree) await openTree(store.ownerId(), ownTree);
      else renderHome();
    }
    else renderHome();
  } catch (error) {
    console.error(error);
    app.innerHTML = '<div class="error-page"><h1>트리를 불러오지 못했어요</h1>'
      + '<p>' + friendlyError(error) + '</p><button class="secondary" id="retry">다시 시도</button></div>';
    app.querySelector('#retry').addEventListener('click', start);
  } finally { app.setAttribute('aria-busy', 'false'); }
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !sheet.open) showLetter(null);
});
start();

