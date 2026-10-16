const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const decode = text => text.replace(/&(amp|lt|gt|quot|#x27);/g, (_, name) => ({amp:'&',lt:'<',gt:'>',quot:'"','#x27':"'"})[name]);

test('every upstream section, question and answer link is present in source order', () => {
  const source = read('blog/source/README.md');
  const provenance = JSON.parse(read('blog/source/provenance.json'));
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), provenance.sha256);
  const bank = source.slice(source.indexOf('### Must Know\n'), source.indexOf('### License\n'));
  const expected = [...bank.matchAll(/^- (.+)$/gm)].map(m => m[1]);
  const expectedSections = [...bank.matchAll(/^### (.+)$/gm)].map(m => m[1]);
  const html = read('blog/en.html');
  const actual = [...html.matchAll(/<details class="question-item"[^>]+>\s*<summary><span class="question-number">\d+<\/span><span lang="en">([^]*?)<\/span><\/summary>/g)].map(m => decode(m[1]));
  const actualSections = [...html.matchAll(/<h2 id="heading-[^"]+" lang="en">([^]*?)<\/h2>/g)].map(m => decode(m[1]));
  assert.equal(expected.length, 572);
  assert.equal(expectedSections.length, 15);
  assert.deepEqual(actual, expected);
  assert.deepEqual(actualSections, expectedSections);
  const sourceSections = bank.split(/^### /m).slice(1);
  const toc = source.split('## Table of Contents')[1].split('### Prepared')[0];
  for (const section of sourceSections) {
    const title = section.split('\n')[0];
    const slug = [...toc.matchAll(/^- \[(.+)\]\(#([^\n)]+)\)/gm)].find(m => m[1] === title)[2];
    const expectedCount = [...section.matchAll(/^- /gm)].length;
    const actualCount = [...html.matchAll(new RegExp(`data-topic="${slug}"`, 'g'))].length;
    assert.equal(actualCount, expectedCount, `Question count in ${title}`);
  }
  const records = [];
  for (const line of bank.split('\n')) {
    if (line.startsWith('- ')) records.push({ question: line.slice(2), links: [] });
    if (line.startsWith('  - Answer: ')) records.at(-1).links.push(...[...line.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map(m => m[1]));
  }
  const renderedEntries = [...html.matchAll(/<details class="question-item"[^>]+>([^]*?)<\/details>/g)];
  records.forEach((record, i) => {
    for (const url of record.links) assert.ok(decode(renderedEntries[i][1]).includes(`href="${url}"`), `Wrong answer resources for ${record.question}`);
  });
  for (const [, url] of bank.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)) {
    const href = url.replaceAll('&', '&amp;');
    assert.ok(html.includes(`href="${href}"`), `Missing source resource: ${url}`);
  }
  assert.match(html, /© 2026 Outcome School/);
  assert.match(read('blog/source/LICENSE'), /Apache License/);
});

test('static blog links and anchors resolve, and explanatory articles remain available', () => {
  const files = ['index.html', ...fs.readdirSync(path.join(root, 'blog')).filter(f => f.endsWith('.html')).map(f => 'blog/' + f)];
  assert.equal(files.length, 10);
  for (const file of files) {
    const html = read(file);
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|data:|mailto:)/.test(href)) continue;
      const [relative, hash] = href.split('#');
      const target = relative ? path.resolve(root, path.dirname(file), relative) : path.join(root, file);
      assert.ok(fs.existsSync(target), `${file}: missing ${href}`);
      if (hash) assert.ok(fs.readFileSync(target, 'utf8').includes(`id="${hash}"`), `${file}: missing anchor ${href}`);
    }
    if (file.startsWith('blog/') && !['blog/index.html', 'blog/en.html', 'blog/ja.html'].includes(file)) {
      assert.equal((html.match(/class="answer"/g) || []).length, 3);
      assert.match(html, /lang="vi"/);
    }
  }
});

test('the complete bank can be rebuilt without changing the output', () => {
  const files = ['blog/index.html', 'blog/en.html', 'blog/ja.html'];
  const before = files.map(read);
  execFileSync('python3', ['scripts/build-question-bank.py'], { cwd: root });
  assert.deepEqual(files.map(read), before);
});

test('search combines topic filters, accents, empty/reset states and deep links', () => {
  function element(props = {}) {
    return { value: '', hidden: false, textContent: '', dataset: {}, events: {}, addEventListener(event, fn) { this.events[event] = fn; }, focus() { this.focused = true; }, ...props };
  }
  const search = element();
  const topicFilter = element({ value: 'all' });
  const questions = [element({ id: 'rag-1', textContent: 'Truy hồi tài liệu chunking', dataset: { topic: 'rag' } }), element({ id: 'agents-1', textContent: 'Điều kiện dừng tool calling', dataset: { topic: 'agents' } })];
  questions.forEach(q => { q.classList = { contains: name => name === 'question-item' }; q.scrollIntoView = () => { q.scrolled = true; }; });
  const sections = ['rag', 'agents'].map(id => element({ id }));
  const toc = sections.map(s => ({ hash: '#' + s.id, parentElement: element() }));
  const ids = { main: element({ dataset: { entryUnit: 'mục', sectionUnit: 'phần' } }), search, 'topic-filter': topicFilter, 'result-count': element(), 'empty-state': element(), 'reset-search': element() };
  for (const el of [...questions, ...sections]) ids[el.id] = el;
  const form = element();
  const windowEvents = {};
  const location = { hash: '' };
  vm.runInNewContext(read('blog/blog.js'), {
    document: { getElementById: id => ids[id], querySelectorAll: selector => ({ '.question-item': questions, '.question-section': sections, '.bank-toc a': toc })[selector] || [], querySelector: () => form },
    window: { addEventListener: (event, fn) => { windowEvents[event] = fn; } }, location,
  });
  search.value = 'TRUY HOI'; search.events.input();
  assert.deepEqual(questions.map(q => q.hidden), [false, true]);
  assert.deepEqual(sections.map(s => s.hidden), [false, true]);
  assert.deepEqual(toc.map(link => link.parentElement.hidden), [false, true]);
  topicFilter.value = 'agents'; topicFilter.events.change();
  assert.ok(questions.every(q => q.hidden));
  assert.equal(ids['empty-state'].hidden, false);
  assert.equal(ids['result-count'].textContent, '0 mục · 0 phần');
  ids['reset-search'].events.click();
  assert.ok(questions.every(q => !q.hidden));
  assert.equal(search.value, '');
  assert.equal(topicFilter.value, 'all');
  assert.equal(search.focused, true);
  search.value = 'dieu kien'; search.events.input();
  assert.deepEqual(questions.map(q => q.hidden), [true, false]);
  Object.assign(ids.main.dataset, { entryUnit: 'items', sectionUnit: 'sections', entrySingular: 'item', sectionSingular: 'section' });
  search.events.input();
  assert.equal(ids['result-count'].textContent, '1 item · 1 section');
  search.value = 'unfindable'; search.events.input();
  location.hash = '#rag-1'; windowEvents.hashchange();
  assert.equal(questions[0].open, true);
  assert.equal(questions[0].scrolled, true);
  assert.ok(questions.every(q => !q.hidden));
  let prevented = false;
  form.events.submit({ preventDefault() { prevented = true; } });
  assert.ok(prevented);
});

test('every question has its own concise Vietnamese answer before reading links', () => {
  const answers = JSON.parse(read('blog/answers.json'));
  const html = read('blog/index.html');
  const rendered = [...html.matchAll(/<details class="question-item" id="([^"]+)"[^>]*>([^]*?)<\/details>/g)];
  assert.equal(Object.keys(answers).length, 572);
  assert.equal(rendered.length, 572);
  const unique = new Set();
  for (const [, id, body] of rendered) {
    const item = answers[id];
    assert.ok(item, `Missing authored answer: ${id}`);
    const answer = body.match(/<p class="quick-answer" lang="vi">([^]*?)<\/p>/);
    assert.ok(answer, `Missing inline answer: ${id}`);
    assert.equal(decode(answer[1]), item.answer);
    assert.ok(item.answer.split(/\s+/).length <= 110, `Answer too long: ${id}`);
    assert.ok(item.answer.length >= 60, `Answer too thin: ${id}`);
    assert.doesNotMatch(item.answer, /TODO|TBD|chưa có đáp án|đang cập nhật|xem link/i);
    assert.ok(!unique.has(item.answer), `Repeated answer: ${id}`);
    unique.add(item.answer);
    if (body.includes('class="answer-reading"')) assert.ok(body.indexOf('class="quick-answer"') < body.indexOf('class="answer-reading"'));
    for (const ref of item.references || []) assert.ok(decode(body).includes(`href="${ref.url}"`));
  }
  assert.ok(!html.includes('class="missing-answer"'));
});

test('builder rejects missing, mismatched, empty answers and unsafe reference URLs', () => {
  const checks = `
import copy, json, runpy
from pathlib import Path
m = runpy.run_path('scripts/build-question-bank.py')
sections = m['read_sections'](Path('blog/source/README.md').read_text())
answers = json.loads(Path('blog/answers.json').read_text())
key = next(iter(answers))
for kind in ['missing', 'mismatched', 'empty', 'unsafe', 'missing_japanese', 'empty_english', 'empty_vietnamese_question']:
    changed = copy.deepcopy(answers)
    if kind == 'missing': del changed[key]
    if kind == 'mismatched': changed[key]['question'] = 'Wrong question'
    if kind == 'empty': changed[key]['answer'] = ' '
    if kind == 'missing_japanese': del changed[key]['answer_ja']
    if kind == 'empty_english': changed[key]['answer_en'] = ''
    if kind == 'empty_vietnamese_question': changed[key]['question_vi'] = ''
    if kind == 'unsafe': changed[key]['references'] = [{'title': 'Bad URL', 'url': 'javascript:alert(1)'}]
    try:
        m['validate_answers'](sections, changed)
    except ValueError:
        continue
    raise AssertionError('Builder accepted ' + kind)
`;
  execFileSync('python3', ['-c', checks], { cwd: root });
});


test('all 572 questions and answers render completely in Vietnamese, English and Japanese', () => {
  const data = JSON.parse(read('blog/answers.json'));
  const locales = JSON.parse(read('blog/locales.json'));
  for (const [lang, ui] of Object.entries(locales)) {
    const html = read('blog/' + ui.file);
    assert.ok(html.includes(`<html lang="${lang}">`));
    assert.equal((html.match(/data-language-link/g) || []).length, 3);
    const entries = [...html.matchAll(/<details class="question-item" id="([^"]+)"[^>]*>([^]*?)<\/details>/g)];
    assert.equal(entries.length, 572);
    assert.deepEqual(entries.map(e => e[1]), Object.keys(data));
    for (const [, id, body] of entries) {
      const question = body.match(new RegExp(`<summary><span class="question-number">\\d+<\\/span><span lang="${lang}">([^]*?)<\\/span>`));
      const answer = body.match(new RegExp(`<p class="quick-answer" lang="${lang}">([^]*?)<\\/p>`));
      assert.ok(question && answer, `${lang}: missing question or answer ${id}`);
      assert.equal(decode(question[1]), data[id][ui.question_field]);
      assert.equal(decode(answer[1]), data[id][ui.answer_field]);
      assert.doesNotMatch(body, /ZXQ\d+QXZ|\[ITEM\d+\]/);
      assert.ok(data[id][ui.answer_field].length > 30);
    }
    for (const section of ui.sections) assert.ok(html.includes(section.replaceAll('&', '&amp;')), `${lang}: missing section ${section}`);
  }
});

test('portfolio question-bank previews follow all three portfolio languages', () => {
  const html = read('index.html');
  const script = html.match(/<script>([^]*?)<\/script>/)[1];
  const languageScript = script.slice(script.indexOf('const T ='), script.indexOf('// ── Lang switcher ──'));
  const section = html.match(/<section id="blog"[^]*?<\/section>/)[0];
  const keys = [...section.matchAll(/data-t="([^"]+)"/g)].map(m => m[1]);
  for (const [lang, file] of [['en', 'en.html'], ['vi', 'index.html'], ['jp', 'ja.html']]) {
    const elements = keys.map(key => ({ getAttribute: () => key, textContent: '' }));
    const links = ['', '#retrieval-augmented-generation-rag', '#ai-agents-and-agentic-systems'].map(hash => ({ dataset: { blogLink: hash } }));
    vm.runInNewContext(languageScript + `\nsetLang('${lang}');`, {
      document: { documentElement: {}, querySelectorAll: selector => selector === '[data-t]' ? elements : links },
      updateDropdownUI() {}, localStorage: { setItem() {} },
    });
    assert.deepEqual(links.map(link => link.href), links.map(link => 'blog/' + file + link.dataset.blogLink));
    assert.ok(elements.every(element => element.textContent.length > 0), `${lang}: missing preview translation`);
    assert.match(elements[keys.indexOf('blogRagCount')].textContent, /42/);
    assert.match(elements[keys.indexOf('blogAgentsCount')].textContent, /54/);
  }
});
