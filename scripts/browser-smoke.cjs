const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');

const root = path.resolve('dist/base-chat-optimus/browser');
const origin = 'http://127.0.0.1:4304';
const browserPath =
  process.env.BROWSER_PATH ||
  [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find((candidate) => fs.existsSync(candidate));
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, origin).pathname));
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  ) {
    file = path.join(root, 'index.html');
  }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser,
  socket,
  sequence = 0;
const pending = new Map();
const errors = [];

function cdp(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('CDP timeout: ' + method));
    }, 15000);
    pending.set(id, {
      resolve: (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      reject,
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression, label = expression) {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error('Timed out: ' + label);
}
async function click(selector) {
  await waitFor(`document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
}
async function fill(selector, value) {
  await waitFor(`document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(
    `(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event('input', {bubbles:true})); })()`,
  );
  await sleep(100);
}
async function clickText(text, scope = 'document') {
  await waitFor(
    `[...(${scope}?.querySelectorAll('button') ?? [])].some(b => b.textContent.trim() === ${JSON.stringify(text)} && !b.disabled)`,
    'Button: ' + text,
  );
  await evaluate(
    `(() => { const button = [...${scope}.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw new Error('Missing button: ' + ${JSON.stringify(text)}); button.click(); })()`,
  );
}
async function navigate(route) {
  await cdp('Page.navigate', { url: origin + route });
  await waitFor('document.querySelector("app-root")?.children.length > 0', 'Angular bootstrap');
}

(async () => {
  assert(browserPath, 'Set BROWSER_PATH to a Chromium, Chrome, or Edge executable');
  assert(
    fs.existsSync(path.join(root, 'index.html')),
    'Run pnpm build before the browser smoke test',
  );
  fs.mkdirSync('tmp', { recursive: true });
  const profile = fs.mkdtempSync(path.resolve('tmp/optimus-browser-'));
  await new Promise((resolve) => server.listen(4304, '127.0.0.1', resolve));
  browser = spawn(
    browserPath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions',
      '--remote-debugging-port=9332',
      '--remote-debugging-address=127.0.0.1',
      '--user-data-dir=' + profile,
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
  let targets;
  for (let i = 0; i < 100; i++) {
    try {
      targets = await (await fetch('http://127.0.0.1:9332/json/list')).json();
      break;
    } catch {
      await sleep(100);
    }
  }
  assert(targets, 'Headless Edge started');
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      message.error
        ? request.reject(new Error(JSON.stringify(message.error)))
        : request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  };
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate('/auth/sign-in');
  await evaluate('localStorage.clear()');
  await navigate('/auth/sign-in');
  await waitFor('document.querySelector("#username")');
  assert(
    await evaluate('document.querySelector("#username").classList.contains("p-inputtext")'),
    'Optimus styles the sign-in inputs',
  );
  assert(
    await evaluate(
      'getComputedStyle(document.querySelector("form button[type=submit]")).backgroundColor !== "rgba(0, 0, 0, 0)"',
    ),
    'Optimus theme loaded',
  );
  const signInScreenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tmp/optimus-sign-in.png', Buffer.from(signInScreenshot.data, 'base64'));
  await fill('#username', 'me');
  await fill('#password', 'password123');
  await click('form button[type="submit"]');
  await waitFor('location.pathname === "/conversations"');
  await navigate('/profile');
  await clickText('Dark');
  await waitFor('document.documentElement.classList.contains("app-dark")');
  await navigate('/profile');
  await waitFor('document.documentElement.classList.contains("app-dark")');
  await waitFor('document.querySelector("#displayName")');
  const darkScreenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tmp/optimus-profile-dark.png', Buffer.from(darkScreenshot.data, 'base64'));
  await clickText('Light');
  await waitFor('!document.documentElement.classList.contains("app-dark")');
  console.log('PASS: Optimus controls, sign-in, and persisted theme toggle');
  await navigate('/contacts');
  await clickText('Add');
  await waitFor('document.querySelector("[role=dialog] input")');
  await waitFor(
    'document.querySelector("[role=dialog]").contains(document.activeElement)',
    'Dialog focus after opening animation',
  );
  assert(
    await evaluate('document.querySelector("[role=dialog]").contains(document.activeElement)'),
    'Dialog focuses its content',
  );
  await cdp('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await cdp('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await waitFor('!document.querySelector("[role=dialog]")');
  await clickText('Add');
  await fill('[role=dialog] input', 'missing-demo-contact');
  await clickText('Add Contact', 'document.querySelector("[role=dialog]")');
  await waitFor('document.querySelector("[role=dialog] p-message")');
  await clickText('Close', 'document.querySelector("[role=dialog]")');
  await waitFor('!document.querySelector("[role=dialog]")');
  await click('[aria-label="Block Alice Nguyen"]');
  await waitFor(`document.querySelector('[aria-label="Unblock Alice Nguyen"]')`);
  await click('[aria-label="Unblock Alice Nguyen"]');
  await waitFor(`document.querySelector('[aria-label="Block Alice Nguyen"]')`);
  console.log('PASS: contacts dialog, Escape dismissal, errors, block and unblock');
  await navigate('/profile');
  await fill('#displayName', 'Optimus Demo');
  await clickText('Update display name');
  await waitFor('document.body.textContent.includes("Display name updated successfully")');
  await navigate('/profile');
  await waitFor('document.querySelector("#displayName")?.value === "Optimus Demo"');
  console.log('PASS: profile update and persistence');
  await navigate('/conversations/conv_alice');
  await waitFor('document.querySelector("app-message-bubble")');
  await fill('textarea[aria-label="Message"]', 'Hello ');
  await click('[aria-label="Insert emoji"]');
  await click('app-emoji-picker button[aria-label="Insert 😀"]');
  await waitFor('document.querySelector("textarea[aria-label=Message]").value === "Hello 😀"');
  assert(
    await evaluate('document.activeElement.getAttribute("aria-label") === "Message"'),
    'Emoji selection restores focus',
  );
  await fill('textarea[aria-label="Message"]', '');
  console.log('PASS: emoji popover, draft insertion, and composer focus');

  const firstId = await evaluate('document.querySelector("[data-message-id]").dataset.messageId');
  await click('app-message-bubble [aria-label="Message actions"]');
  await click('[aria-label="Reply to message"]');
  await waitFor(`document.querySelector('[aria-label="Cancel reply"]')`);
  await fill('textarea[aria-label="Message"]', 'Browser smoke quoted reply');
  await click('[aria-label="Send message"]');
  await waitFor(
    `document.body.textContent.includes('Browser smoke quoted reply') && !document.querySelector('[aria-label="Cancel reply"]')`,
  );
  const reply = await evaluate('JSON.parse(localStorage.getItem("chat_messages")).at(-1)');
  assert.equal(reply.replyToId, firstId);
  await click('button[aria-label^="View original message"]');
  assert.equal(await evaluate('document.activeElement.dataset.messageId'), firstId);
  console.log('PASS: quote composer, persistence, and jump to original');

  await click('[aria-label="Create checklist"]');
  await fill('app-checklist-composer input', 'Weekend supplies');
  await fill('app-checklist-composer textarea', 'Picnic blanket\nTrain tickets');
  await clickText('Send checklist');
  await waitFor('document.querySelector("app-checklist-card")');
  await click('app-checklist-card input[type="checkbox"]');
  await fill('app-checklist-card input[aria-label="New checklist item"]', 'Water bottles');
  await clickText('Add', 'document.querySelector("app-checklist-card")');
  await waitFor(
    'document.querySelector("app-checklist-card").textContent.includes("Water bottles")',
  );
  const checklist = await evaluate('JSON.parse(localStorage.getItem("chat_messages")).at(-1)');
  assert.equal(checklist.checklist.items[0].completed, true);
  assert.equal(checklist.checklist.items.length, 3);
  await click('[aria-label="Remove item: Train tickets"]');
  await waitFor(
    'document.querySelectorAll("app-checklist-card input[type=checkbox]").length === 2',
  );
  console.log('PASS: shared checklist creation, toggle, add, and remove');

  await click(`[data-message-id="${checklist.id}"] [aria-label="Message actions"]`);
  await clickText('Save message');
  await navigate('/bookmarks');
  await waitFor('document.querySelector("article")');
  assert((await evaluate('document.body.textContent')).includes('Weekend supplies'));
  await fill('form input', 'Travel');
  await clickText('Create collection');
  await waitFor('document.body.textContent.includes("Collection created")');
  await click('article p-select [role="combobox"]');
  await waitFor(
    '[...document.querySelectorAll("[role=option]")].some(option => option.textContent.trim() === "Travel")',
  );
  await evaluate(
    '[...document.querySelectorAll("[role=option]")].find(option => option.textContent.trim() === "Travel").click()',
  );
  await waitFor(
    'JSON.parse(localStorage.getItem("chat_bookmarks")).bookmarks[0].collection === "Travel"',
  );
  await navigate('/bookmarks');
  await waitFor('document.querySelector("article p-select")?.textContent.includes("Travel")');
  await click('article a');
  await waitFor(`document.activeElement.dataset.messageId === ${JSON.stringify(checklist.id)}`);
  console.log('PASS: save, collection creation/move, reload, and bookmark deep link');
  await click('aside a[href="/conversations/conv_bob"]');
  await waitFor('location.pathname === "/conversations/conv_bob"');
  await evaluate('history.back()');
  await waitFor(`document.activeElement.dataset.messageId === ${JSON.stringify(checklist.id)}`);
  console.log('PASS: browser back restores saved message focus across conversations');
  const desktopScreenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tmp/optimus-chat-desktop.png', Buffer.from(desktopScreenshot.data, 'base64'));

  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await sleep(300);
  assert(
    await evaluate('document.documentElement.scrollWidth <= innerWidth'),
    'No mobile horizontal overflow',
  );
  const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tmp/features-mobile.png', Buffer.from(screenshot.data, 'base64'));

  // Clear only the isolated test session to exercise the other participant with normal sign-in.
  await evaluate('localStorage.removeItem("chat_session")');
  await navigate('/auth/sign-in');
  await waitFor('document.querySelector("#username")');
  await fill('#username', 'alice');
  await fill('#password', 'pass1');
  await click('form button[type="submit"]');
  await waitFor('location.pathname === "/conversations"');
  await navigate('/bookmarks');
  await waitFor('document.body.textContent.includes("Keep useful messages close")');
  await navigate('/conversations/conv_alice');
  await waitFor('document.querySelector("app-checklist-card")');
  await click('app-checklist-card input[type="checkbox"]');
  const shared = await evaluate('JSON.parse(localStorage.getItem("chat_messages")).at(-1)');
  assert.equal(shared.checklist.items[0].completed, false);
  assert.equal(shared.checklist.items.length, 2);
  assert.deepEqual(errors, [], 'No uncaught browser exceptions');
  console.log(
    'PASS: bookmarks private to each user; recipient can update shared checklist; mobile layout',
  );

  await click('[aria-label="Create checklist"]');
  await fill('app-checklist-composer input', 'x'.repeat(100));
  await fill(
    'app-checklist-composer textarea',
    Array.from({ length: 50 }, (_, i) =>
      i === 0 ? 'x'.repeat(200) : 'Checklist item ' + (i + 1),
    ).join('\n'),
  );
  await clickText('Send checklist');
  await waitFor('document.querySelectorAll("app-checklist-card").length === 2');
  const longId = await evaluate('JSON.parse(localStorage.getItem("chat_messages")).at(-1).id');
  await evaluate(
    `document.querySelector('[data-message-id="${longId}"] [aria-label="Message actions"]').scrollIntoView({block:'center'})`,
  );
  await click(`[data-message-id="${longId}"] [aria-label="Message actions"]`);
  if (!process.argv.includes('--layout-only')) {
    await waitFor(
      `(() => { const button = document.querySelector('[data-message-id="${longId}"] [aria-label="Reply to message"]'); if (!button) return false; const rect = button.getBoundingClientRect(); return rect.top >= 64 && rect.bottom < innerHeight - 120; })()`,
      'Long checklist message actions visible',
    );
  }
  assert(
    await evaluate('document.documentElement.scrollWidth <= innerWidth'),
    'No long checklist mobile overflow',
  );
  assert(
    await evaluate(
      `(() => { const card = document.querySelector('[data-message-id="${longId}"] app-checklist-card section'); return card.scrollWidth <= card.clientWidth + 1; })()`,
    ),
    'Long checklist wraps inside chat card',
  );
  await clickText('Save message');
  await navigate('/bookmarks');
  await waitFor('document.querySelector("article")');
  assert(
    await evaluate('document.documentElement.scrollWidth <= innerWidth'),
    'No saved long checklist mobile overflow',
  );
  assert(
    await evaluate(
      'document.querySelector("article").scrollWidth <= document.querySelector("article").clientWidth',
    ),
    'Saved long checklist wraps inside card',
  );
  const savedScreenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    'tmp/features-bookmarks-mobile.png',
    Buffer.from(savedScreenshot.data, 'base64'),
  );
  console.log('PASS: long checklist actions visible; long content wraps in chat and bookmarks');
  assert.deepEqual(errors, [], 'No uncaught browser exceptions across all smoke scenarios');
})()
  .catch(async (error) => {
    console.error(error);
    if (socket?.readyState === WebSocket.OPEN) {
      console.error('Browser exceptions:', JSON.stringify(errors));
      console.error(
        'Page:',
        await evaluate('({ url: location.href, text: document.body.innerText.slice(-4000) })'),
      );
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('tmp/optimus-failure.png', Buffer.from(screenshot.data, 'base64'));
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    if (socket?.readyState === WebSocket.OPEN) {
      try {
        await cdp('Browser.close');
      } catch {}
      socket.close();
    }
    server.close();
    server.closeAllConnections();
    browser?.kill();
  });
